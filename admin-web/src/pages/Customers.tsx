import { useState, useEffect } from 'react';
import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, Button, Dialog, DialogActions, TextField, CircularProgress, Chip, IconButton } from '@mui/material';
import { collection, getDocs, query, where, getFirestore, updateDoc, doc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import app from '../firebase';
import { useUI } from '../context/UIContext';

const db = getFirestore(app);
const functions = getFunctions(app);

export default function Customers() {
  const { showConfirm, showMessage } = useUI();
  const [customers, setCustomers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({ 
    email: '', displayName: '', tradeName: '', gstNumber: '', 
    panNumber: '', phoneNumber: '', billingAddress: '', shippingAddress: '' 
  });

  useEffect(() => { fetchCustomers(); }, []);

  const fetchCustomers = async () => {
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'customer'));
      const querySnapshot = await getDocs(q);
      setCustomers(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      console.log('Error fetching customers', e);
    }
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setFormData({ 
      email: '', displayName: '', tradeName: '', gstNumber: '', 
      panNumber: '', phoneNumber: '', billingAddress: '', shippingAddress: '' 
    });
    setOpen(true);
  };

  const handleOpenEdit = (customer: any) => {
    setEditingId(customer.id);
    setFormData({ 
      email: customer.email || '', 
      displayName: customer.displayName || '', 
      tradeName: customer.tradeName || '', 
      gstNumber: customer.gstNumber || '',
      panNumber: customer.panNumber || '',
      phoneNumber: customer.phoneNumber || '',
      billingAddress: customer.billingAddress || '',
      shippingAddress: customer.shippingAddress || ''
    });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    showConfirm("Are you sure you want to deactivate this customer?", async () => {
      try {
        await updateDoc(doc(db, 'users', id), { isActive: false });
        fetchCustomers();
        showMessage("Customer deactivated", "success");
      } catch (e) {
        console.error("Error deactivating", e);
        showMessage("Failed to deactivate customer.", "error");
      }
    });
  };

  const handleRestore = async (id: string) => {
    try {
      await updateDoc(doc(db, 'users', id), { isActive: true });
      fetchCustomers();
      showMessage("Customer restored", "success");
    } catch (e) {
      console.error("Error restoring", e);
      showMessage("Failed to restore customer.", "error");
    }
  };

  const handleSave = async () => {
    // Client-side validation
    if (!editingId) {
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(formData.email.trim())) {
        showMessage('Please enter a valid email address.', 'error');
        return;
      }
    }
    if (formData.gstNumber && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.gstNumber.trim().toUpperCase())) {
      showMessage('Invalid GST number format (must be 15 characters).', 'error');
      return;
    }
    if (formData.panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.panNumber.trim().toUpperCase())) {
      showMessage('Invalid PAN number format (must be 10 characters).', 'error');
      return;
    }
    setLoading(true);
    try {
      if (editingId) {
        // Edit existing customer profile
        await updateDoc(doc(db, 'users', editingId), {
          displayName: formData.displayName,
          tradeName: formData.tradeName,
          gstNumber: formData.gstNumber,
          panNumber: formData.panNumber,
          phoneNumber: formData.phoneNumber,
          billingAddress: formData.billingAddress,
          shippingAddress: formData.shippingAddress
          // email is not updated here because it requires Auth update
        });
        setOpen(false);
        fetchCustomers();
      } else {
        // Create new customer via Cloud Function
        const createCustomerFn = httpsCallable(functions, 'createCustomer');
        await createCustomerFn(formData);
        setOpen(false);
        fetchCustomers();
      }
      showMessage("Customer saved successfully", "success");
    } catch (error: any) {
      console.error('Error saving customer:', error);
      showMessage('Error saving customer: ' + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box>
          <Typography sx={{ fontWeight: 900, fontSize: { xs: '1.8rem', md: '2.2rem' }, letterSpacing: 3 }}>
            CUSTOMERS
          </Typography>
          <Typography sx={{ fontWeight: 600, color: '#999', letterSpacing: 1.5, fontSize: '0.8rem', mt: 0.5 }}>
            MANAGE PROFILES
          </Typography>
        </Box>
      </Box>
      <Box sx={{ borderBottom: '2px solid #000', mb: 3, mt: 2 }} />
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <Button variant="contained" onClick={handleOpenNew} sx={{ fontWeight: 700 }}>
          + ADD CUSTOMER
        </Button>
      </Box>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 900 }}>TRADE NAME</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>CUSTOMER NAME</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>EMAIL</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>GST</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>STATUS</TableCell>
              <TableCell sx={{ fontWeight: 900 }} align="right">ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {customers.map((row) => (
              <TableRow key={row.id} sx={{ '&:hover': { backgroundColor: '#FAFAFA' } }}>
                <TableCell sx={{ fontWeight: 700 }}>{row.tradeName}</TableCell>
                <TableCell>{row.displayName}</TableCell>
                <TableCell>{row.email}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{row.gstNumber}</TableCell>
                <TableCell>
                  <Chip
                    label={row.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                    size="small"
                    sx={{
                      backgroundColor: row.isActive !== false ? '#000' : '#E0E0E0',
                      color: row.isActive !== false ? '#FFF' : '#000',
                    }}
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => handleOpenEdit(row)} size="small" sx={{ mr: 1, color: '#000' }}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  {row.isActive !== false ? (
                    <IconButton onClick={() => handleDelete(row.id)} size="small" sx={{ color: 'red' }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  ) : (
                    <Button size="small" onClick={() => handleRestore(row.id)} sx={{ fontWeight: 700, fontSize: '0.7rem' }}>RESTORE</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {customers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 8, color: '#999', fontWeight: 600, letterSpacing: 1 }}>
                  NO CUSTOMERS YET — ADD ONE ABOVE
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Customer Dialog */}
      <Dialog open={open} onClose={() => !loading && setOpen(false)} maxWidth="sm" fullWidth>
        <Box sx={{ p: 3 }}>
          <Typography sx={{ fontWeight: 900, letterSpacing: 2, fontSize: '1rem', mb: 3 }}>
            {editingId ? 'EDIT CUSTOMER' : 'ADD NEW CUSTOMER'}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField label="Trade Name (Business)" fullWidth value={formData.tradeName} onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })} />
            <TextField label="Customer Name" fullWidth value={formData.displayName} onChange={(e) => setFormData({ ...formData, displayName: e.target.value })} />
            <TextField label="Email Address" type="email" fullWidth disabled={!!editingId} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            <TextField label="Phone Number" fullWidth value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="GST Number" fullWidth value={formData.gstNumber} onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })} />
              <TextField label="PAN Number" fullWidth value={formData.panNumber} onChange={(e) => setFormData({ ...formData, panNumber: e.target.value })} />
            </Box>
            <TextField label="Billing Address (Registered)" fullWidth multiline rows={2} value={formData.billingAddress} onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })} />
            <TextField label="Shipping Address (Consignee)" fullWidth multiline rows={2} value={formData.shippingAddress} onChange={(e) => setFormData({ ...formData, shippingAddress: e.target.value })} />
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
