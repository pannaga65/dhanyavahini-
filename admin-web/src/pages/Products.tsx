import { useState, useEffect } from 'react';
import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, Button, Dialog, DialogActions, TextField, CircularProgress, Select, MenuItem, FormControl, InputLabel, IconButton } from '@mui/material';
import { collection, getDocs, addDoc, serverTimestamp, setDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import app from '../firebase';
import { useUI } from '../context/UIContext';

const db = getFirestore(app);
const storage = getStorage(app);

interface Product {
  id: string;
  name: string;
  category?: string;
  basePriceKg: number;
  moqKg: number;
  imageUrl: string;
  availableStockKg?: number; // Fetched from inventory collection
}

export default function Products() {
  const { showConfirm, showMessage } = useUI();
  const [products, setProducts] = useState<Product[]>([]);
  const [dbCategories, setDbCategories] = useState<{id: string, name: string}[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [inputUnit, setInputUnit] = useState('Quintal'); // Kg, Quintal, Ton
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [moqInUnit, setMoqInUnit] = useState('');
  const [stockInUnit, setStockInUnit] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState('');

  // Unit Multipliers to convert to KG
  const getMultiplier = (unit: string) => {
    if (unit === 'Ton') return 1000;
    if (unit === 'Quintal') return 100;
    return 1; // Kg
  };

  useEffect(() => { fetchProducts(); fetchCategories(); }, []);

  const fetchCategories = async () => {
    try {
      const snap = await getDocs(collection(db, 'categories'));
      setDbCategories(snap.docs.map(d => ({ id: d.id, name: d.data().name })));
    } catch (e) {
      console.log(e);
    }
  };

  const fetchProducts = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'products'));
      
      const productsData = await Promise.all(snapshot.docs.map(async (productDoc) => {
        const product = { id: productDoc.id, ...productDoc.data() } as Product;
        
        // Fetch inventory for this product
        try {
          const invSnapshot = await getDocs(collection(db, 'inventory'));
          const invDoc = invSnapshot.docs.find(d => d.id === product.id);
          if (invDoc) {
            product.availableStockKg = invDoc.data().availableStockKg;
          } else {
            product.availableStockKg = 0;
          }
        } catch (e) {
          product.availableStockKg = 0;
        }

        return product;
      }));
      
      setProducts(productsData);
    } catch (e) {
      console.error('Error fetching products', e);
    }
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setName(''); setCategory(''); setPricePerUnit(''); setMoqInUnit(''); setStockInUnit(''); setImageFile(null); setExistingImageUrl('');
    setOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingId(product.id);
    setName(product.name);
    setCategory(product.category || '');
    setInputUnit('Kg'); // Default to Kg for editing to show exact values
    setPricePerUnit(product.basePriceKg.toString());
    setMoqInUnit(product.moqKg.toString());
    setStockInUnit((product.availableStockKg || 0).toString());
    setExistingImageUrl(product.imageUrl);
    setImageFile(null);
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    showConfirm("Are you sure you want to permanently delete this product and its inventory ledger?", async () => {
      try {
        await deleteDoc(doc(db, 'products', id));
        await deleteDoc(doc(db, 'inventory', id));
        fetchProducts();
        showMessage("Product deleted", "success");
      } catch (e) {
        console.error("Error deleting", e);
        showMessage("Failed to delete. Check console.", "error");
      }
    });
  };

  const handleSave = async () => {
    if (!name || !category) {
      showMessage('Please enter a product name and category.', "error");
      return;
    }
    setLoading(true);
    try {
      const multiplier = getMultiplier(inputUnit);
      const basePriceKg = pricePerUnit ? Number(pricePerUnit) / multiplier : 0;
      const moqKg = moqInUnit ? Number(moqInUnit) * multiplier : 0;
      const stockKg = stockInUnit ? Number(stockInUnit) * multiplier : 0;

      let downloadUrl = existingImageUrl;
      if (imageFile) {
        const storageRef = ref(storage, `products/${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(storageRef, imageFile);
        downloadUrl = await getDownloadURL(snapshot.ref);
      }

      if (editingId) {
        // Update Product
        await updateDoc(doc(db, 'products', editingId), {
          name,
          category,
          basePriceKg,
          moqKg,
          ...(imageFile ? { imageUrl: downloadUrl } : {})
        });
        // Update Inventory (overwrite total available for now)
        await updateDoc(doc(db, 'inventory', editingId), {
          availableStockKg: stockKg,
          lastUpdated: serverTimestamp()
        });
      } else {
        // Create Product
        const productRef = await addDoc(collection(db, 'products'), {
          name,
          category,
          basePriceKg,
          moqKg,
          imageUrl: downloadUrl,
          createdAt: serverTimestamp(),
        });
        // Create Initial Inventory Ledger
        await setDoc(doc(db, 'inventory', productRef.id), {
          totalStockKg: stockKg,
          allocatedStockKg: 0,
          availableStockKg: stockKg,
          lastUpdated: serverTimestamp()
        });
      }

      setOpen(false);
      fetchProducts();
      showMessage("Product saved successfully", "success");
    } catch (e) {
      console.error('Error saving product', e);
      showMessage('Error saving product. Check rules or console.', "error");
    } finally {
      setLoading(false);
    }
  };

  // Helper to format KG back into readable units for display
  const formatKg = (kg: number | undefined) => {
    if (kg === undefined) return '0 Kg';
    if (kg >= 1000 && kg % 1000 === 0) return `${kg / 1000} Tons`;
    if (kg >= 100 && kg % 100 === 0) return `${kg / 100} Quintals`;
    return `${kg} Kg`;
  };

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box>
          <Typography sx={{ fontWeight: 900, fontSize: { xs: '1.8rem', md: '2.2rem' }, letterSpacing: 3 }}>
            PRODUCTS & INVENTORY
          </Typography>
          <Typography sx={{ fontWeight: 600, color: '#999', letterSpacing: 1.5, fontSize: '0.8rem', mt: 0.5 }}>
            MANAGE CATEGORIES, CATALOG, AND LIVE STOCK
          </Typography>
        </Box>
        <Button variant="contained" onClick={handleOpenNew} sx={{ mt: 1, mr: { xs: 0, md: 10 }, fontWeight: 700 }}>
          + ADD PRODUCT
        </Button>
      </Box>
      <Box sx={{ borderBottom: '2px solid #000', mb: 4, mt: 2 }} />

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 900 }}>IMAGE</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>CATEGORY</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>PRODUCT NAME</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>PRICE (PER KG)</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>AVAILABLE STOCK</TableCell>
              <TableCell sx={{ fontWeight: 900 }} align="right">ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((row) => (
              <TableRow key={row.id} sx={{ '&:hover': { backgroundColor: '#FAFAFA' } }}>
                <TableCell>
                  {row.imageUrl ? (
                    <img
                      src={row.imageUrl}
                      alt={row.name}
                      style={{ width: 48, height: 48, objectFit: 'cover', border: '2px solid #000' }}
                    />
                  ) : (
                    <Box sx={{ width: 48, height: 48, border: '2px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F0F0' }}>
                      <Typography sx={{ fontSize: '0.5rem', fontWeight: 700, color: '#999' }}>NO IMG</Typography>
                    </Box>
                  )}
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#666', textTransform: 'uppercase' }}>{row.category}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{row.name}</TableCell>
                <TableCell>₹{row.basePriceKg?.toLocaleString()} / Kg</TableCell>
                <TableCell sx={{ fontWeight: 700, color: row.availableStockKg && row.availableStockKg > 0 ? 'green' : 'red' }}>
                  {formatKg(row.availableStockKg)}
                </TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => handleOpenEdit(row)} size="small" sx={{ mr: 1, color: '#000' }}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(row.id)} size="small" sx={{ color: 'red' }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {products.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 8, color: '#999', fontWeight: 600, letterSpacing: 1 }}>
                  NO PRODUCTS YET — ADD ONE ABOVE
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Product Dialog */}
      <Dialog open={open} onClose={() => !loading && setOpen(false)} maxWidth="sm" fullWidth>
        <Box sx={{ p: 3 }}>
          <Typography sx={{ fontWeight: 900, letterSpacing: 2, fontSize: '1.2rem', mb: 3 }}>
            {editingId ? 'EDIT PRODUCT' : 'ADD PRODUCT & INVENTORY'}
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Button
              variant="outlined"
              component="label"
              sx={{ height: 60, borderStyle: 'dashed', fontWeight: 700, letterSpacing: 1 }}
            >
              {imageFile ? imageFile.name : (existingImageUrl ? 'CHANGE IMAGE' : 'UPLOAD IMAGE (PNG / JPG)')}
              <input type="file" hidden accept="image/*" onChange={(e) => {
                if (e.target.files && e.target.files[0]) setImageFile(e.target.files[0]);
              }} />
            </Button>
            
            <FormControl fullWidth required>
              <InputLabel>Category</InputLabel>
              <Select
                value={category}
                label="Category"
                onChange={(e) => setCategory(e.target.value)}
              >
                {dbCategories.map(cat => (
                  <MenuItem key={cat.id} value={cat.name}>{cat.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField label="Product Name (e.g. Sona Masoori)" fullWidth required value={name} onChange={e => setName(e.target.value)} />

            {/* Unit Selector */}
            <FormControl fullWidth>
              <InputLabel>Measurement Unit (For Data Entry)</InputLabel>
              <Select
                value={inputUnit}
                label="Measurement Unit (For Data Entry)"
                onChange={(e) => setInputUnit(e.target.value)}
              >
                <MenuItem value="Kg">Kilograms (Kg)</MenuItem>
                <MenuItem value="Quintal">Quintals (100 Kg)</MenuItem>
                <MenuItem value="Ton">Tons (1000 Kg)</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField 
                label={`Price (₹ per ${inputUnit})`} 
                type="number" 
                fullWidth 
                required
                value={pricePerUnit} 
                onChange={e => setPricePerUnit(e.target.value)} 
              />
              <TextField 
                label={`MOQ (in ${inputUnit}s)`} 
                type="number" 
                fullWidth 
                value={moqInUnit} 
                onChange={e => setMoqInUnit(e.target.value)} 
              />
            </Box>

            <TextField 
              label={editingId ? `Update Total Stock (in ${inputUnit}s)` : `Initial Stock (in ${inputUnit}s)`} 
              type="number" 
              fullWidth 
              required
              value={stockInUnit} 
              onChange={e => setStockInUnit(e.target.value)} 
            />

            <Typography sx={{ fontSize: '0.75rem', color: '#666', fontStyle: 'italic', mt: -1 }}>
              * Data will be automatically converted and stored in Base Units (Kg) in the database.
            </Typography>
          </Box>
        </Box>
        
        <DialogActions sx={{ borderTop: '2px solid #000', p: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={loading} sx={{ fontWeight: 700, color: '#000' }}>CANCEL</Button>
          <Button variant="contained" onClick={handleSave} disabled={loading} sx={{ backgroundColor: '#000', color: '#FFF', fontWeight: 700, borderRadius: 0 }}>
            {loading ? <CircularProgress size={20} color="inherit" /> : 'SAVE'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
