import { useState, useEffect, useMemo } from 'react';
import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, Button, Dialog, DialogActions, TextField, CircularProgress, IconButton, InputAdornment } from '@mui/material';
import { collection, getDocs, getFirestore, updateDoc, doc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import app from '../firebase';
import { useUI } from '../context/UIContext';

const db = getFirestore(app);

export default function Farmers() {
  const { showConfirm, showMessage } = useUI();
  const [farmers, setFarmers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    farmerId: '', name: '', aadharNumber: '', phoneNumber: '', altPhoneNumber: '',
    accountNumber: '', ifscCode: '', bankName: '', address: ''
  });

  useEffect(() => { fetchFarmers(); }, []);

  const fetchFarmers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'farmers'));
      setFarmers(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      console.log('Error fetching farmers', e);
    }
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setFormData({
      farmerId: '', name: '', aadharNumber: '', phoneNumber: '', altPhoneNumber: '',
      accountNumber: '', ifscCode: '', bankName: '', address: ''
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
      address: farmer.address || ''
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    showConfirm("Are you sure you want to permanently delete this farmer's profile from the database?", async () => {
      try {
        await deleteDoc(doc(db, 'farmers', id));
        fetchFarmers();
        showMessage("Farmer deleted successfully", "success");
      } catch (e) {
        console.error("Error deleting farmer", e);
        showMessage("Failed to delete farmer.", "error");
      }
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showMessage('Name is required.', 'error');
      return;
    }

    if (!formData.phoneNumber.trim()) {
      showMessage('Primary Mobile Number is required.', 'error');
      return;
    }

    if (!formData.aadharNumber.trim()) {
      showMessage('Aadhar Number is required.', 'error');
      return;
    }

    // Aadhar Validation (Exactly 12 digits)
    if (!/^\d{12}$/.test(formData.aadharNumber.trim())) {
      showMessage('Aadhar Number must be exactly 12 digits.', 'error');
      return;
    }

    // Phone Number Validation (Exactly 10 digits)
    if (!/^\d{10}$/.test(formData.phoneNumber.trim())) {
      showMessage('Primary Mobile Number must be exactly 10 digits.', 'error');
      return;
    }

    // Alt Phone Number Validation (Optional, but if present must be 10 digits)
    if (formData.altPhoneNumber.trim() && !/^\d{10}$/.test(formData.altPhoneNumber.trim())) {
      showMessage('Alternative Mobile Number must be exactly 10 digits.', 'error');
      return;
    }

    // Bank Account Validation (9 to 18 digits is standard in India)
    if (formData.accountNumber.trim() && !/^\d{9,18}$/.test(formData.accountNumber.trim())) {
      showMessage('Account Number must be between 9 and 18 digits.', 'error');
      return;
    }

    // IFSC Code Validation (4 letters, 1 zero, 6 alphanumeric)
    if (formData.ifscCode.trim() && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifscCode.trim().toUpperCase())) {
      showMessage('Invalid IFSC Code format. Must be 11 characters (e.g., SBIN0001234).', 'error');
      return;
    }

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
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        // Edit existing farmer profile
        await updateDoc(doc(db, 'farmers', editingId), payload);
      } else {
        // Create new farmer
        await addDoc(collection(db, 'farmers'), {
          ...payload,
          isActive: true,
          createdAt: serverTimestamp(),
        });
      }
      setOpen(false);
      fetchFarmers();
      showMessage("Farmer profile saved successfully", "success");
    } catch (error: any) {
      console.error('Error saving farmer:', error);
      showMessage('Error saving farmer: ' + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Filter farmers based on search query
  const filteredFarmers = useMemo(() => {
    if (!searchQuery.trim()) return farmers;
    const lowerQuery = searchQuery.toLowerCase();
    return farmers.filter(farmer =>
      (farmer.name || '').toLowerCase().includes(lowerQuery) ||
      (farmer.farmerId || '').toLowerCase().includes(lowerQuery) ||
      (farmer.phoneNumber || '').includes(lowerQuery) ||
      (farmer.aadharNumber || '').includes(lowerQuery)
    );
  }, [farmers, searchQuery]);

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box>
          <Typography sx={{ fontWeight: 900, fontSize: { xs: '1.8rem', md: '2.2rem' }, letterSpacing: 3 }}>
            FARMERS
          </Typography>
          <Typography sx={{ fontWeight: 500, color: '#94A3B8', letterSpacing: 0.3, fontSize: '0.9rem', mt: 0.5 }}>
            MANAGE FARMER PROFILES & BANK DETAILS
          </Typography>
        </Box>
      </Box>
      <Box sx={{ borderBottom: '1px solid #E2E8F0', mb: 3, mt: 2 }} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <TextField
          placeholder="Search by Name, Phone, or Aadhar..."
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
          + ADD FARMER
        </Button>
      </Box>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 900 }}>NAME</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>MOBILE</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>AADHAR</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>BANK DETAILS</TableCell>
              <TableCell sx={{ fontWeight: 900 }} align="right">ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredFarmers.map((row) => (
              <TableRow key={row.id} sx={{ '&:hover': { backgroundColor: '#FAFAFA' } }}>
                <TableCell>
                  <Typography sx={{ fontWeight: 700 }}>{row.name}</Typography>
                  {row.farmerId && (
                    <Typography sx={{ fontSize: '0.75rem', color: '#666', fontWeight: 600 }}>ID: {row.farmerId}</Typography>
                  )}
                </TableCell>
                <TableCell>{row.phoneNumber}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{row.aadharNumber}</TableCell>
                <TableCell>
                  <Typography sx={{ fontSize: '0.8rem', fontWeight: 600 }}>A/C: {row.accountNumber}</Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: '#666' }}>IFSC: {row.ifscCode}</Typography>
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
            {filteredFarmers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 8, color: '#999', fontWeight: 600, letterSpacing: 1 }}>
                  {searchQuery ? 'NO FARMERS FOUND MATCHING SEARCH' : 'NO FARMERS YET — ADD ONE ABOVE'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Farmer Dialog */}
      <Dialog open={open} onClose={() => !loading && setOpen(false)} maxWidth="sm" fullWidth>
        <Box sx={{ p: 3 }}>
          <Typography sx={{ fontWeight: 900, letterSpacing: 2, fontSize: '1rem', mb: 3 }}>
            {editingId ? 'EDIT FARMER' : 'ADD NEW FARMER'}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Farmer ID / Ledger ID (Optional)"
                fullWidth
                value={formData.farmerId}
                onChange={(e) => setFormData({ ...formData, farmerId: e.target.value })}
              />
              <TextField
                label="Name (As per Bank/Aadhar)"
                fullWidth
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Box>
            <TextField
              label="Aadhar Number"
              fullWidth
              slotProps={{ htmlInput: { maxLength: 12 } } as any}
              value={formData.aadharNumber}
              onChange={(e) => setFormData({ ...formData, aadharNumber: e.target.value.replace(/\D/g, '') })}
              helperText="Must be exactly 12 digits"
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Primary Mobile"
                fullWidth
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">+91</InputAdornment>,
                  },
                  htmlInput: { maxLength: 10 }
                } as any}
                value={formData.phoneNumber.replace('+91', '')}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value.replace(/\D/g, '') })}
              />
              <TextField
                label="Alt Mobile (Optional)"
                fullWidth
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">+91</InputAdornment>,
                  },
                  htmlInput: { maxLength: 10 }
                } as any}
                value={formData.altPhoneNumber.replace('+91', '')}
                onChange={(e) => setFormData({ ...formData, altPhoneNumber: e.target.value.replace(/\D/g, '') })}
              />
            </Box>

            <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', mt: 1, color: '#333' }}>BANKING DETAILS</Typography>

            <TextField
              label="Bank Account Number"
              fullWidth
              slotProps={{ htmlInput: { maxLength: 18 } } as any}
              value={formData.accountNumber}
              onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value.replace(/\D/g, '') })}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="IFSC Code"
                fullWidth
                slotProps={{ htmlInput: { maxLength: 11, style: { textTransform: 'uppercase' } } } as any}
                value={formData.ifscCode}
                onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
              />
              <TextField
                label="Bank Name (Optional)"
                fullWidth
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
              />
            </Box>

            <TextField
              label="Village / Address (Optional)"
              fullWidth
              multiline
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />

          </Box>
        </Box>
        <DialogActions sx={{ borderTop: '1px solid #E2E8F0', p: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={loading} sx={{ fontWeight: 700, color: '#000' }}>CANCEL</Button>
          <Button variant="contained" onClick={handleSave} disabled={loading} sx={{ backgroundColor: '#1B2A4A', color: '#FFF', fontWeight: 700, borderRadius: 0 }}>
            {loading ? <CircularProgress size={20} color="inherit" /> : 'SAVE'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
