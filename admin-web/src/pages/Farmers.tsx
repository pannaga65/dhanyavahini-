import { useState, useEffect, useMemo } from 'react';
import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, Button, Dialog, DialogActions, TextField, CircularProgress, IconButton, InputAdornment, FormControl, Select, MenuItem } from '@mui/material';
import { collection, getDocs, getFirestore, updateDoc, doc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import app from '../firebase';
import { useUI } from '../context/UIContext';

const db = getFirestore(app);

export default function Farmers() {
  const { showConfirm, showMessage } = useUI();
  const [farmers, setFarmers] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [loanFilter, setLoanFilter] = useState('ALL');

  const [formData, setFormData] = useState({
    farmerId: '', name: '', aadharNumber: '', phoneNumber: '', altPhoneNumber: '',
    accountNumber: '', ifscCode: '', bankName: '', address: '', isActive: true
  });

  useEffect(() => { 
    fetchData(); 
  }, []);

  const fetchData = async () => {
    try {
      const [farmSnap, loanSnap] = await Promise.all([
        getDocs(collection(db, 'farmers')),
        getDocs(collection(db, 'farmer_loans'))
      ]);
      setFarmers(farmSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoans(loanSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      console.log('Error fetching data', e);
    }
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setFormData({
      farmerId: '', name: '', aadharNumber: '', phoneNumber: '', altPhoneNumber: '',
      accountNumber: '', ifscCode: '', bankName: '', address: '', isActive: true
    });
    setOpen(true);
  };

  const handleOpenEdit = (farmer: any) => {
    setEditingId(farmer.id);
    setFormData({
      farmerId: farmer.farmerId || '',
      name: farmer.name || '',
      aadharNumber: farmer.aadharNumber || '',
      phoneNumber: (farmer.phoneNumber || '').replace(/^\+91/, '').replace(/\D/g, ''),
      altPhoneNumber: (farmer.altPhoneNumber || '').replace(/^\+91/, '').replace(/\D/g, ''),
      accountNumber: farmer.accountNumber || '',
      ifscCode: farmer.ifscCode || '',
      bankName: farmer.bankName || '',
      address: farmer.address || '',
      isActive: farmer.isActive !== false
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    showConfirm("Are you sure you want to permanently delete this farmer's profile from the database?", async () => {
      try {
        await deleteDoc(doc(db, 'farmers', id));
        fetchData();
        showMessage("Farmer deleted successfully", "success");
      } catch (e) {
        console.error("Error deleting farmer", e);
        showMessage("Failed to delete farmer.", "error");
      }
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return showMessage('Name is required.', 'error');
    if (!formData.phoneNumber.trim()) return showMessage('Primary Mobile Number is required.', 'error');
    if (formData.aadharNumber.trim() && !/^\d{12}$/.test(formData.aadharNumber.trim())) return showMessage('Aadhar Number must be exactly 12 digits.', 'error');
    if (!/^\d{10}$/.test(formData.phoneNumber.trim())) return showMessage('Primary Mobile Number must be exactly 10 digits.', 'error');
    if (formData.altPhoneNumber.trim() && !/^\d{10}$/.test(formData.altPhoneNumber.trim())) return showMessage('Alternative Mobile Number must be exactly 10 digits.', 'error');
    if (formData.accountNumber.trim() && !/^\d{9,18}$/.test(formData.accountNumber.trim())) return showMessage('Account Number must be between 9 and 18 digits.', 'error');
    if (formData.ifscCode.trim() && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifscCode.trim().toUpperCase())) return showMessage('Invalid IFSC Code format.', 'error');

    setLoading(true);
    try {
      const payload = {
        farmerId: formData.farmerId.trim(),
        name: formData.name.trim(),
        aadharNumber: formData.aadharNumber.trim(),
        phoneNumber: formData.phoneNumber.trim() ? `+91${formData.phoneNumber.trim()}` : '',
        altPhoneNumber: formData.altPhoneNumber.trim() ? `+91${formData.altPhoneNumber.trim()}` : '',
        accountNumber: formData.accountNumber.trim(),
        ifscCode: formData.ifscCode.trim().toUpperCase(),
        bankName: formData.bankName.trim(),
        address: formData.address.trim(),
        isActive: formData.isActive,
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(doc(db, 'farmers', editingId), payload);
      } else {
        await addDoc(collection(db, 'farmers'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      setOpen(false);
      fetchData();
      showMessage("Farmer profile saved successfully", "success");
    } catch (error: any) {
      console.error('Error saving farmer:', error);
      showMessage('Error saving farmer: ' + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const farmerBalances = useMemo(() => {
    const balances: { [key: string]: number } = {};
    loans.forEach(loan => {
      if (loan.farmerId) {
        const amt = Number(loan.amount) || 0;
        const recovered = Number(loan.recoveredAmount) || 0;
        balances[loan.farmerId] = (balances[loan.farmerId] || 0) + (amt - recovered);
      }
    });
    return balances;
  }, [loans]);

  const filteredFarmers = useMemo(() => {
    let result = farmers;
    

    // Loan Filter
    if (loanFilter === 'HAS_LOAN') {
      result = result.filter(f => (farmerBalances[f.id] || 0) > 0);
    } else if (loanFilter === 'NO_LOAN') {
      result = result.filter(f => (farmerBalances[f.id] || 0) <= 0);
    }

    // Search Query
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(farmer =>
        (farmer.name || '').toLowerCase().includes(lowerQuery) ||
        (farmer.farmerId || '').toLowerCase().includes(lowerQuery) ||
        (farmer.phoneNumber || '').includes(lowerQuery) ||
        (farmer.aadharNumber || '').includes(lowerQuery)
      );
    }
    return result;
  }, [farmers, searchQuery, loanFilter, farmerBalances]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '2rem' }, color: '#1E293B', letterSpacing: '-0.5px' }}>
            Farmers
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          onClick={handleOpenNew} 
          sx={{ 
            fontWeight: 700, 
            backgroundColor: '#0F172A', 
            color: '#FFF', 
            borderRadius: 2,
            px: 3,
            boxShadow: 'none',
            '&:hover': { backgroundColor: '#334155', boxShadow: 'none' }
          }}
        >
          + Add Farmer
        </Button>
      </Box>

      {/* Unified Filter Bar */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3, p: 2, backgroundColor: '#F8FAFC', borderRadius: 3, border: '1px solid #E2E8F0' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', color: '#64748B', mr: 1 }}>
          <FilterAltIcon sx={{ mr: 0.5 }} />
          <Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }}>FILTERS</Typography>
        </Box>
        <TextField
          placeholder="Search Name, Phone, Aadhar..."
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ width: { xs: '100%', sm: 250 }, backgroundColor: '#FFF', '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          slotProps={{
            input: {
              startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#94A3B8' }}/></InputAdornment>,
            }
          } as any}
        />
        <FormControl size="small" sx={{ minWidth: 150, backgroundColor: '#FFF' }}>
          <Select value={loanFilter} onChange={(e) => setLoanFilter(e.target.value)} sx={{ borderRadius: 2 }}>
            <MenuItem value="ALL">All Loans</MenuItem>
            <MenuItem value="HAS_LOAN">Has Outstanding Loan</MenuItem>
            <MenuItem value="NO_LOAN">No Active Loans</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <TableContainer sx={{ width: '100%', overflowX: 'auto', backgroundColor: '#FFF', borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#F8FAFC' }}>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748B', borderBottom: '1px solid #E2E8F0' }}>NAME</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748B', borderBottom: '1px solid #E2E8F0' }}>CONTACT</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748B', borderBottom: '1px solid #E2E8F0' }}>BANK DETAILS</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748B', borderBottom: '1px solid #E2E8F0' }}>LOAN BALANCE</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748B', borderBottom: '1px solid #E2E8F0' }}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredFarmers.map((row) => {
              const balance = farmerBalances[row.id] || 0;
              return (
              <TableRow key={row.id} sx={{ '&:hover': { backgroundColor: '#F8FAFC' }, transition: 'all 0.2s' }}>
                <TableCell sx={{ borderBottom: '1px solid #F1F5F9' }}>
                  <Typography sx={{ fontWeight: 700, color: '#0F172A', fontSize: '0.95rem' }}>{row.name}</Typography>
                  {row.farmerId && <Typography sx={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>ID: {row.farmerId}</Typography>}
                </TableCell>
                <TableCell sx={{ borderBottom: '1px solid #F1F5F9' }}>
                  <Typography sx={{ color: '#334155', fontWeight: 500, fontSize: '0.9rem' }}>{row.phoneNumber}</Typography>
                  <Typography sx={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.8rem', color: '#64748B' }}>Aadhar: {row.aadharNumber}</Typography>
                </TableCell>
                <TableCell sx={{ borderBottom: '1px solid #F1F5F9' }}>
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>A/C: {row.accountNumber || '-'}</Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: '#64748B' }}>IFSC: {row.ifscCode || '-'}</Typography>
                </TableCell>
                <TableCell sx={{ borderBottom: '1px solid #F1F5F9' }}>
                  {balance > 0 ? (
                    <Typography sx={{ fontWeight: 700, color: '#DC2626' }}>₹ {balance.toLocaleString()}</Typography>
                  ) : (
                    <Typography sx={{ fontWeight: 600, color: '#94A3B8' }}>Nil</Typography>
                  )}
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap', borderBottom: '1px solid #F1F5F9' }}>
                  <Button 
                    variant="outlined" 
                    size="small" 
                    onClick={() => handleOpenEdit(row)}
                    startIcon={<EditIcon />}
                    sx={{ 
                      color: '#0284C7', borderColor: '#E0F2FE', backgroundColor: '#F0F9FF',
                      fontWeight: 600, borderRadius: 2, textTransform: 'none', mr: 1,
                      '&:hover': { backgroundColor: '#E0F2FE', borderColor: '#BAE6FD' }
                    }}
                  >
                    Edit
                  </Button>
                  <IconButton onClick={() => handleDelete(row.id)} size="small" sx={{ color: '#EF4444' }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            )})}
            {filteredFarmers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 8, color: '#94A3B8', fontWeight: 500, fontSize: '0.9rem' }}>
                  {!navigator.onLine ? "NO INTERNET CONNECTION" : "No farmers found matching filters."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onClose={() => !loading && setOpen(false)} maxWidth="sm" fullWidth sx={{ '& .MuiDialog-paper': { borderRadius: 3 } }}>
        <Box sx={{ p: 4 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: '#0F172A', mb: 3 }}>
            {editingId ? 'Edit Farmer Profile' : 'Add New Farmer'}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Farmer ID / Ledger ID (Optional)"
                fullWidth
                value={formData.farmerId}
                onChange={(e) => setFormData({ ...formData, farmerId: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <TextField
                label="Name (As per Bank/Aadhar)"
                fullWidth
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Box>
            <TextField
              label="Aadhar Number (Optional)"
              fullWidth
              slotProps={{ htmlInput: { maxLength: 12 } } as any}
              value={formData.aadharNumber}
              onChange={(e) => setFormData({ ...formData, aadharNumber: e.target.value.replace(/\D/g, '') })}
              helperText="Must be exactly 12 digits if provided"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Primary Mobile"
                fullWidth
                required
                slotProps={{
                  input: { startAdornment: <InputAdornment position="start">+91</InputAdornment> },
                  htmlInput: { maxLength: 10 }
                } as any}
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value.replace(/\D/g, '') })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <TextField
                label="Alt Mobile (Optional)"
                fullWidth
                slotProps={{
                  input: { startAdornment: <InputAdornment position="start">+91</InputAdornment> },
                  htmlInput: { maxLength: 10 }
                } as any}
                value={formData.altPhoneNumber}
                onChange={(e) => setFormData({ ...formData, altPhoneNumber: e.target.value.replace(/\D/g, '') })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Box>

            <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', mt: 1, color: '#64748B' }}>BANKING DETAILS</Typography>

            <TextField
              label="Bank Account Number"
              fullWidth
              slotProps={{ htmlInput: { maxLength: 18 } } as any}
              value={formData.accountNumber}
              onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value.replace(/\D/g, '') })}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="IFSC Code"
                fullWidth
                slotProps={{ htmlInput: { maxLength: 11, style: { textTransform: 'uppercase' } } } as any}
                value={formData.ifscCode}
                onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <TextField
                label="Bank Name (Optional)"
                fullWidth
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Box>

            <TextField
              label="Village / Address (Optional)"
              fullWidth
              multiline
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            
            
          </Box>
        </Box>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setOpen(false)} disabled={loading} sx={{ fontWeight: 600, color: '#64748B', textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={loading} sx={{ backgroundColor: '#0F172A', color: '#FFF', fontWeight: 600, borderRadius: 2, textTransform: 'none', px: 3, '&:hover': { backgroundColor: '#334155' } }}>
            {loading ? <CircularProgress size={20} color="inherit" /> : 'Save Profile'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
