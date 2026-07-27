import { useState, useEffect, useMemo } from 'react';
import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, Button, Dialog, DialogActions, TextField, CircularProgress, MenuItem, Select, FormControl, InputLabel, InputAdornment, Autocomplete, IconButton } from '@mui/material';
import { collection, getDocs, getFirestore, addDoc, serverTimestamp, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import app from '../firebase';
import { useUI } from '../context/UIContext';

const db = getFirestore(app);

export default function Inventory() {
  const { showConfirm, showMessage } = useUI();
  const [ledger, setLedger] = useState<any[]>([]);
  const [godowns, setGodowns] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [farmers, setFarmers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    godownId: '',
    date: new Date().toISOString().split('T')[0],
    productId: '',
    farmerId: '',
    otherFarmerName: '',
    slipNo: '',
    lotNo: '',
    weight: '',
    totalBags: '',
    liftedBags: '0',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [ledgerSnap, godownSnap, prodSnap, farmSnap] = await Promise.all([
        getDocs(query(collection(db, 'inventory_ledger'), orderBy('date', 'desc'))),
        getDocs(collection(db, 'godowns')),
        getDocs(collection(db, 'products')),
        getDocs(collection(db, 'farmers'))
      ]);

      setLedger(ledgerSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      const activeGodowns = godownSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter((g: any) => g.isActive !== false);
      activeGodowns.sort((a: any, b: any) => a.name.localeCompare(b.name));
      setGodowns(activeGodowns);
      
      const activeProds = prodSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      activeProds.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
      setProducts(activeProds);
      
      const activeFarmers = farmSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter((f: any) => f.isActive !== false);
      activeFarmers.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
      setFarmers(activeFarmers);
    } catch (e) {
      console.error('Error fetching inventory data', e);
    }
  };

  const handleOpen = (item: any = null) => {
    if (item) {
      setEditingId(item.id);
      setFormData({
        godownId: item.godownId || '',
        date: item.date || new Date().toISOString().split('T')[0],
        productId: item.productId || '',
        farmerId: item.farmerId || '',
        otherFarmerName: item.farmerId === 'OTHER' ? item.farmerName : '',
        slipNo: item.slipNo || '',
        lotNo: item.lotNo || '',
        weight: item.weight?.toString() || '',
        totalBags: item.totalBags?.toString() || '',
        liftedBags: item.liftedBags?.toString() || '0'
      });
    } else {
      setEditingId(null);
      setFormData({
        godownId: '',
        date: new Date().toISOString().split('T')[0],
        productId: '',
        farmerId: '',
        otherFarmerName: '',
        slipNo: '',
        lotNo: '',
        weight: '',
        totalBags: '',
        liftedBags: '0'
      });
    }
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    showConfirm("Are you sure you want to delete this inventory record?", async () => {
      try {
        await deleteDoc(doc(db, 'inventory_ledger', id));
        fetchData();
        showMessage("Record deleted", "success");
      } catch (e) {
        console.error("Error deleting", e);
        showMessage("Failed to delete.", "error");
      }
    });
  };

  const handleSave = async () => {
    if (!formData.godownId) return showMessage('Please select a Godown.', 'error');
    if (!formData.productId) return showMessage('Please select an Item.', 'error');
    if (!formData.farmerId) return showMessage('Please select a Farmer.', 'error');
    if (formData.farmerId === 'OTHER' && !formData.otherFarmerName.trim()) return showMessage('Please enter the Farmer name.', 'error');
    if (!formData.totalBags || isNaN(Number(formData.totalBags)) || Number(formData.totalBags) <= 0) return showMessage('Enter valid Total Bags.', 'error');

    setLoading(true);
    try {
      const selectedGodown = godowns.find(g => g.id === formData.godownId);
      const selectedProduct = products.find(p => p.id === formData.productId);
      
      let finalFarmerName = 'Unknown Farmer';
      if (formData.farmerId === 'OTHER') {
        finalFarmerName = formData.otherFarmerName.trim();
      } else {
        const selectedFarmer = farmers.find(f => f.id === formData.farmerId);
        finalFarmerName = selectedFarmer?.name || 'Unknown Farmer';
      }

      const totalBags = Number(formData.totalBags);
      const liftedBags = Number(formData.liftedBags) || 0;
      const balanceBags = totalBags - liftedBags;

      const payload = {
        godownId: formData.godownId,
        godownName: selectedGodown?.name || 'Unknown Godown',
        date: formData.date,
        productId: formData.productId,
        productName: selectedProduct?.name || 'Unknown Item',
        farmerId: formData.farmerId,
        farmerName: finalFarmerName,
        slipNo: formData.slipNo.trim(),
        lotNo: formData.lotNo.trim(),
        weight: formData.weight ? Number(formData.weight) : 0,
        totalBags: totalBags,
        liftedBags: liftedBags,
        balanceBags: balanceBags,
      };

      if (editingId) {
        await updateDoc(doc(db, 'inventory_ledger', editingId), payload);
        showMessage("Inventory updated successfully", "success");
      } else {
        await addDoc(collection(db, 'inventory_ledger'), { ...payload, createdAt: serverTimestamp() });
        showMessage("Inventory added successfully", "success");
      }
      setOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving inventory:', error);
      showMessage('Error saving inventory: ' + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredLedger = useMemo(() => {
    if (!searchQuery.trim()) return ledger;
    const lowerQuery = searchQuery.toLowerCase();
    return ledger.filter(item =>
      (item.farmerName || '').toLowerCase().includes(lowerQuery) ||
      (item.productName || '').toLowerCase().includes(lowerQuery) ||
      (item.godownName || '').toLowerCase().includes(lowerQuery) ||
      (item.slipNo || '').toLowerCase().includes(lowerQuery) ||
      (item.lotNo || '').toLowerCase().includes(lowerQuery)
    );
  }, [ledger, searchQuery]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box>
          <Typography sx={{ fontWeight: 900, fontSize: { xs: '1.8rem', md: '2.2rem' }, letterSpacing: 3 }}>
            INVENTORY LEDGER
          </Typography>
          <Typography sx={{ fontWeight: 600, color: '#999', letterSpacing: 1.5, fontSize: '0.8rem', mt: 0.5 }}>
            MANAGE WAREHOUSE STOCK AND LOTS
          </Typography>
        </Box>
      </Box>
      <Box sx={{ borderBottom: '2px solid #000', mb: 3, mt: 2 }} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <TextField
          placeholder="Search by Farmer, Item, Slip, Lot..."
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ width: { xs: '100%', sm: 350 }, backgroundColor: '#FFF' }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }
          } as any}
        />
        <Button variant="contained" onClick={() => handleOpen()} sx={{ fontWeight: 700, backgroundColor: '#000', color: '#FFF' }}>
          + ADD INVENTORY
        </Button>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#F5F5F5' }}>
              <TableCell sx={{ fontWeight: 900, fontSize: '0.75rem' }}>DATE</TableCell>
              <TableCell sx={{ fontWeight: 900, fontSize: '0.75rem' }}>GODOWN</TableCell>
              <TableCell sx={{ fontWeight: 900, fontSize: '0.75rem' }}>ITEM</TableCell>
              <TableCell sx={{ fontWeight: 900, fontSize: '0.75rem' }}>FARMER</TableCell>
              <TableCell sx={{ fontWeight: 900, fontSize: '0.75rem' }}>SLIP NO</TableCell>
              <TableCell sx={{ fontWeight: 900, fontSize: '0.75rem' }}>LOT NO</TableCell>
              <TableCell sx={{ fontWeight: 900, fontSize: '0.75rem' }}>WEIGHT</TableCell>
              <TableCell sx={{ fontWeight: 900, fontSize: '0.75rem' }}>TOTAL BAGS</TableCell>
              <TableCell sx={{ fontWeight: 900, fontSize: '0.75rem', color: '#1976d2' }}>LIFTED</TableCell>
              <TableCell sx={{ fontWeight: 900, fontSize: '0.75rem', color: '#d32f2f' }}>BALANCE</TableCell>
              <TableCell sx={{ fontWeight: 900, fontSize: '0.75rem' }} align="right">ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredLedger.map((row) => (
              <TableRow key={row.id} sx={{ '&:hover': { backgroundColor: '#FAFAFA' } }}>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
                  {new Date(row.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                </TableCell>
                <TableCell sx={{ fontSize: '0.8rem' }}>{row.godownName}</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>{row.productName}</TableCell>
                <TableCell sx={{ fontSize: '0.8rem' }}>{row.farmerName}</TableCell>
                <TableCell sx={{ fontSize: '0.8rem' }}>{row.slipNo || '-'}</TableCell>
                <TableCell sx={{ fontSize: '0.8rem' }}>{row.lotNo || '-'}</TableCell>
                <TableCell sx={{ fontSize: '0.8rem' }}>{row.weight ? `${row.weight}` : '-'}</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: '0.85rem' }}>{row.totalBags}</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#1976d2', fontSize: '0.85rem' }}>{row.liftedBags}</TableCell>
                <TableCell sx={{ fontWeight: 900, color: row.balanceBags === 0 ? 'green' : '#d32f2f', fontSize: '0.9rem' }}>
                  {row.balanceBags}
                </TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => handleOpen(row)} size="small" sx={{ mr: 0.5 }}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(row.id)} size="small" sx={{ color: 'red' }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {filteredLedger.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} align="center" sx={{ py: 8, color: '#999', fontWeight: 600, letterSpacing: 1 }}>
                  NO INVENTORY FOUND
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => !loading && setOpen(false)} maxWidth="sm" fullWidth>
        <Box sx={{ p: 3 }}>
          <Typography sx={{ fontWeight: 900, letterSpacing: 2, fontSize: '1rem', mb: 3 }}>
            {editingId ? 'EDIT INVENTORY / UPDATE LIFTED BAGS' : 'ADD INVENTORY'}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth required>
                <InputLabel>Godown</InputLabel>
                <Select
                  value={formData.godownId}
                  label="Godown"
                  onChange={(e) => setFormData({ ...formData, godownId: e.target.value as string })}
                >
                  {godowns.map(g => (
                    <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
                  ))}
                  {godowns.length === 0 && <MenuItem disabled>No Godowns Found (Add in Settings)</MenuItem>}
                </Select>
              </FormControl>
              <TextField
                label="Date"
                type="date"
                fullWidth
                required
                slotProps={{ inputLabel: { shrink: true } }}
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth required>
                <InputLabel>Item / Crop</InputLabel>
                <Select
                  value={formData.productId}
                  label="Item / Crop"
                  onChange={(e) => setFormData({ ...formData, productId: e.target.value as string })}
                >
                  {products.map(p => (
                    <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Autocomplete
              fullWidth
              options={[{ id: 'OTHER', name: 'OTHER (Not in list)' }, ...farmers]}
              getOptionLabel={(option) => option.id === 'OTHER' ? option.name : `${option.name} ${option.farmerId ? `[ID: ${option.farmerId}]` : ''} ${option.phoneNumber ? `(${option.phoneNumber})` : ''}`}
              value={formData.farmerId === 'OTHER' ? { id: 'OTHER', name: 'OTHER (Not in list)' } : farmers.find(f => f.id === formData.farmerId) || null}
              onChange={(_, newValue) => setFormData({ ...formData, farmerId: newValue ? newValue.id : '' })}
              renderInput={(params) => <TextField {...params} label="Select Farmer or OTHER" required />}
            />
            
            {formData.farmerId === 'OTHER' && (
              <TextField
                label="Custom Farmer Name"
                fullWidth
                required
                value={formData.otherFarmerName}
                onChange={(e) => setFormData({ ...formData, otherFarmerName: e.target.value })}
              />
            )}

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Slip No"
                fullWidth
                value={formData.slipNo}
                onChange={(e) => setFormData({ ...formData, slipNo: e.target.value })}
              />
              <TextField
                label="Lot No"
                fullWidth
                value={formData.lotNo}
                onChange={(e) => setFormData({ ...formData, lotNo: e.target.value })}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Weight"
                fullWidth
                type="number"
                placeholder="e.g. 1000"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
              />
              <TextField
                label="Total Bags"
                fullWidth
                required
                type="number"
                value={formData.totalBags}
                onChange={(e) => setFormData({ ...formData, totalBags: e.target.value })}
              />
            </Box>

            <Box sx={{ p: 2, backgroundColor: '#F0F8FF', borderRadius: 1, border: '1px solid #90CAF9' }}>
              <Typography sx={{ fontWeight: 800, mb: 2, fontSize: '0.8rem', color: '#1565C0' }}>UPDATE LIFTS</Typography>
              <TextField
                label="Lifted Bags (Removed/Sold)"
                fullWidth
                type="number"
                value={formData.liftedBags}
                onChange={(e) => setFormData({ ...formData, liftedBags: e.target.value })}
              />
              <Typography sx={{ mt: 1, fontSize: '0.75rem', color: '#666' }}>
                Balance Bags will automatically update to: <strong>{(Number(formData.totalBags) || 0) - (Number(formData.liftedBags) || 0)}</strong>
              </Typography>
            </Box>
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
