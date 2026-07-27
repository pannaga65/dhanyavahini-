import { useState, useEffect, useMemo } from 'react';
import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, Button, Dialog, DialogActions, TextField, CircularProgress, MenuItem, Select, FormControl, InputLabel, InputAdornment } from '@mui/material';
import { collection, getDocs, getFirestore, addDoc, serverTimestamp, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import app from '../firebase';
import { useUI } from '../context/UIContext';

const db = getFirestore(app);

export default function Advances() {
  const { showConfirm, showMessage } = useUI();
  const [advances, setAdvances] = useState<any[]>([]);
  const [farmers, setFarmers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    farmerId: '',
    amount: '',
    paymentMode: 'Bank Transfer',
    paymentDate: new Date().toISOString().split('T')[0],
    referenceNumber: '',
    notes: ''
  });

  const paymentModes = ['Bank Transfer', 'UPI', 'Cash', 'Cheque'];

  useEffect(() => { 
    fetchAdvances(); 
    fetchFarmers();
  }, []);

  const fetchAdvances = async () => {
    try {
      const q = query(collection(db, 'farmer_advances'), orderBy('paymentDate', 'desc'));
      const querySnapshot = await getDocs(q);
      setAdvances(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      console.error('Error fetching advances', e);
    }
  };

  const fetchFarmers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'farmers'));
      // Only show active farmers in the dropdown
      const activeFarmers = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((f: any) => f.isActive !== false);
      
      // Sort alphabetically
      activeFarmers.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
      setFarmers(activeFarmers);
    } catch (e) {
      console.error('Error fetching farmers', e);
    }
  };

  const handleOpenNew = () => {
    setFormData({
      farmerId: '',
      amount: '',
      paymentMode: 'Bank Transfer',
      paymentDate: new Date().toISOString().split('T')[0],
      referenceNumber: '',
      notes: ''
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    showConfirm("Are you sure you want to delete this advance record? This action cannot be undone.", async () => {
      try {
        await deleteDoc(doc(db, 'farmer_advances', id));
        fetchAdvances();
        showMessage("Advance record deleted", "success");
      } catch (e) {
        console.error("Error deleting", e);
        showMessage("Failed to delete record.", "error");
      }
    });
  };

  const handleSave = async () => {
    if (!formData.farmerId) {
      showMessage('Please select a farmer.', 'error');
      return;
    }

    if (!formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      showMessage('Please enter a valid amount.', 'error');
      return;
    }

    if (!formData.paymentDate) {
      showMessage('Please select a payment date.', 'error');
      return;
    }

    setLoading(true);
    try {
      const selectedFarmer = farmers.find(f => f.id === formData.farmerId);
      
      const payload = {
        farmerId: formData.farmerId,
        farmerName: selectedFarmer?.name || 'Unknown Farmer',
        amount: Number(formData.amount),
        paymentMode: formData.paymentMode,
        paymentDate: formData.paymentDate, // Storing as YYYY-MM-DD string for simplicity, or could use Timestamp
        referenceNumber: formData.referenceNumber.trim(),
        notes: formData.notes.trim(),
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'farmer_advances'), payload);
      
      setOpen(false);
      fetchAdvances();
      showMessage("Advance recorded successfully", "success");
    } catch (error: any) {
      console.error('Error saving advance:', error);
      showMessage('Error saving advance: ' + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredAdvances = useMemo(() => {
    if (!searchQuery.trim()) return advances;
    const lowerQuery = searchQuery.toLowerCase();
    return advances.filter(adv =>
      (adv.farmerName || '').toLowerCase().includes(lowerQuery) ||
      (adv.paymentMode || '').toLowerCase().includes(lowerQuery) ||
      (adv.referenceNumber || '').toLowerCase().includes(lowerQuery) ||
      (adv.amount?.toString() || '').includes(lowerQuery)
    );
  }, [advances, searchQuery]);

  // Number formatting
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount || 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box>
          <Typography sx={{ fontWeight: 900, fontSize: { xs: '1.8rem', md: '2.2rem' }, letterSpacing: 3 }}>
            ADVANCES
          </Typography>
          <Typography sx={{ fontWeight: 600, color: '#999', letterSpacing: 1.5, fontSize: '0.8rem', mt: 0.5 }}>
            TRACK PAYMENTS & DISBURSEMENTS TO FARMERS
          </Typography>
        </Box>
      </Box>
      <Box sx={{ borderBottom: '2px solid #000', mb: 3, mt: 2 }} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <TextField
          placeholder="Search by Farmer, Mode, Amount..."
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
        <Button variant="contained" onClick={handleOpenNew} sx={{ fontWeight: 700 }}>
          + RECORD ADVANCE
        </Button>
      </Box>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 900 }}>DATE</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>FARMER</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>AMOUNT</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>MODE & REF</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>NOTES</TableCell>
              <TableCell sx={{ fontWeight: 900 }} align="right">ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAdvances.map((row) => (
              <TableRow key={row.id} sx={{ '&:hover': { backgroundColor: '#FAFAFA' } }}>
                <TableCell sx={{ fontWeight: 700 }}>
                  {new Date(row.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{row.farmerName}</TableCell>
                <TableCell sx={{ fontWeight: 900, color: '#000' }}>{formatCurrency(row.amount)}</TableCell>
                <TableCell>
                  <Typography sx={{ fontSize: '0.8rem', fontWeight: 700 }}>{row.paymentMode}</Typography>
                  {row.referenceNumber && (
                    <Typography sx={{ fontSize: '0.75rem', color: '#666' }}>Ref: {row.referenceNumber}</Typography>
                  )}
                </TableCell>
                <TableCell sx={{ color: '#666', fontSize: '0.85rem' }}>{row.notes || '-'}</TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => handleDelete(row.id)} size="small" sx={{ color: 'red' }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {filteredAdvances.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 8, color: '#999', fontWeight: 600, letterSpacing: 1 }}>
                  {searchQuery ? 'NO RECORDS FOUND MATCHING SEARCH' : 'NO ADVANCES RECORDED YET'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add Advance Dialog */}
      <Dialog open={open} onClose={() => !loading && setOpen(false)} maxWidth="sm" fullWidth>
        <Box sx={{ p: 3 }}>
          <Typography sx={{ fontWeight: 900, letterSpacing: 2, fontSize: '1rem', mb: 3 }}>
            RECORD NEW ADVANCE
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            
            <FormControl fullWidth required>
              <InputLabel>Select Farmer</InputLabel>
              <Select
                value={formData.farmerId}
                label="Select Farmer"
                onChange={(e) => setFormData({ ...formData, farmerId: e.target.value as string })}
              >
                {farmers.map(f => (
                  <MenuItem key={f.id} value={f.id}>
                    {f.name} {f.phoneNumber ? `(${f.phoneNumber})` : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Amount (₹)"
                fullWidth
                required
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
              <TextField
                label="Payment Date"
                type="date"
                fullWidth
                required
                slotProps={{ inputLabel: { shrink: true } }}
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth required>
                <InputLabel>Payment Mode</InputLabel>
                <Select
                  value={formData.paymentMode}
                  label="Payment Mode"
                  onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value as string })}
                >
                  {paymentModes.map(mode => (
                    <MenuItem key={mode} value={mode}>{mode}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Reference No. (Optional)"
                fullWidth
                placeholder="UPI Ref / Cheque No"
                value={formData.referenceNumber}
                onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
              />
            </Box>

            <TextField
              label="Additional Notes (Optional)"
              fullWidth
              multiline
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />

          </Box>
        </Box>
        <DialogActions sx={{ borderTop: '2px solid #000', p: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={loading} sx={{ fontWeight: 700, color: '#000' }}>CANCEL</Button>
          <Button variant="contained" onClick={handleSave} disabled={loading} sx={{ backgroundColor: '#000', color: '#FFF', fontWeight: 700, borderRadius: 0 }}>
            {loading ? <CircularProgress size={20} color="inherit" /> : 'SAVE RECORD'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
