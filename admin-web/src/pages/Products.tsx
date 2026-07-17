import { useState, useEffect } from 'react';
import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, Button, Dialog, DialogActions, TextField, CircularProgress, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { collection, getDocs, addDoc, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';
import app from '../firebase';

const db = getFirestore(app);
const storage = getStorage(app);

interface Product {
  id: string;
  name: string;
  basePriceKg: number;
  moqKg: number;
  imageUrl: string;
  availableStockKg?: number; // Fetched from inventory collection
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [inputUnit, setInputUnit] = useState('Quintal'); // Kg, Quintal, Ton
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [moqInUnit, setMoqInUnit] = useState('');
  const [stockInUnit, setStockInUnit] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Unit Multipliers to convert to KG
  const getMultiplier = (unit: string) => {
    if (unit === 'Ton') return 1000;
    if (unit === 'Quintal') return 100;
    return 1; // Kg
  };

  useEffect(() => { fetchProducts(); }, []);

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

  const handleSave = async () => {
    if (!name) {
      alert('Please enter a product name.');
      return;
    }
    setLoading(true);
    try {
      const multiplier = getMultiplier(inputUnit);
      const basePriceKg = pricePerUnit ? Number(pricePerUnit) / multiplier : 0;
      const moqKg = moqInUnit ? Number(moqInUnit) * multiplier : 0;
      const initialStockKg = stockInUnit ? Number(stockInUnit) * multiplier : 0;

      let downloadUrl = '';
      if (imageFile) {
        const storageRef = ref(storage, `products/${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(storageRef, imageFile);
        downloadUrl = await getDownloadURL(snapshot.ref);
      }

      // 1. Create Product
      const productRef = await addDoc(collection(db, 'products'), {
        name,
        basePriceKg,
        moqKg,
        imageUrl: downloadUrl,
        createdAt: serverTimestamp(),
      });

      // 2. Create Initial Inventory Ledger
      await setDoc(doc(db, 'inventory', productRef.id), {
        totalStockKg: initialStockKg,
        allocatedStockKg: 0,
        availableStockKg: initialStockKg,
        lastUpdated: serverTimestamp()
      });

      setOpen(false);
      setName(''); setPricePerUnit(''); setMoqInUnit(''); setStockInUnit(''); setImageFile(null);
      fetchProducts();
    } catch (e) {
      console.error('Error creating product', e);
      alert('Error uploading product. Make sure Storage Rules allow writes.');
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
            MANAGE CATALOG AND LIVE STOCK
          </Typography>
        </Box>
        <Button variant="contained" onClick={() => setOpen(true)} sx={{ mt: 1, fontWeight: 700 }}>
          + ADD PRODUCT
        </Button>
      </Box>
      <Box sx={{ borderBottom: '2px solid #000', mb: 4, mt: 2 }} />

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 900 }}>IMAGE</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>PRODUCT NAME</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>BASE PRICE (PER KG)</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>MOQ</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>AVAILABLE STOCK</TableCell>
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
                      style={{ width: 56, height: 56, objectFit: 'cover', border: '2px solid #000' }}
                    />
                  ) : (
                    <Box sx={{ width: 56, height: 56, border: '2px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F0F0' }}>
                      <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: '#999' }}>NO IMG</Typography>
                    </Box>
                  )}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{row.name}</TableCell>
                <TableCell>₹{row.basePriceKg?.toLocaleString()} / Kg</TableCell>
                <TableCell>{formatKg(row.moqKg)}</TableCell>
                <TableCell sx={{ fontWeight: 700, color: row.availableStockKg && row.availableStockKg > 0 ? 'green' : 'red' }}>
                  {formatKg(row.availableStockKg)}
                </TableCell>
              </TableRow>
            ))}
            {products.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 8, color: '#999', fontWeight: 600, letterSpacing: 1 }}>
                  NO PRODUCTS YET — ADD ONE ABOVE
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add Product Dialog */}
      <Dialog open={open} onClose={() => !loading && setOpen(false)} maxWidth="sm" fullWidth>
        <Box sx={{ p: 3 }}>
          <Typography sx={{ fontWeight: 900, letterSpacing: 2, fontSize: '1.2rem', mb: 3 }}>
            ADD PRODUCT & INVENTORY
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Button
              variant="outlined"
              component="label"
              sx={{ height: 80, borderStyle: 'dashed', fontWeight: 700, letterSpacing: 1 }}
            >
              {imageFile ? imageFile.name : 'UPLOAD IMAGE (PNG / JPG)'}
              <input type="file" hidden accept="image/*" onChange={(e) => {
                if (e.target.files && e.target.files[0]) setImageFile(e.target.files[0]);
              }} />
            </Button>
            
            <TextField label="Product Name (e.g. Sona Masoori)" fullWidth value={name} onChange={e => setName(e.target.value)} />

            {/* Unit Selector */}
            <FormControl fullWidth>
              <InputLabel>Measurement Unit</InputLabel>
              <Select
                value={inputUnit}
                label="Measurement Unit"
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
              label={`Initial Stock (in ${inputUnit}s)`} 
              type="number" 
              fullWidth 
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
            {loading ? <CircularProgress size={20} color="inherit" /> : 'SAVE INVENTORY'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
