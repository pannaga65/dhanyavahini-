import { useState, useEffect } from 'react';
import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, Button, Dialog, DialogActions, TextField, CircularProgress, Chip, IconButton } from '@mui/material';
import { collection, getDocs, query, where, getFirestore, updateDoc, doc, deleteDoc } from 'firebase/firestore';
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
  
  const [formData, setFormData] = useState({ email: '', displayName: '', tradeName: '', gstNumber: '' });

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
    setFormData({ email: '', displayName: '', tradeName: '', gstNumber: '' });
    setOpen(true);
  };

  const handleOpenEdit = (customer: any) => {
    setEditingId(customer.id);
    setFormData({ email: customer.email || '', displayName: customer.displayName || '', tradeName: customer.tradeName || '', gstNumber: customer.gstNumber || '' });
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    showConfirm("Are you sure you want to completely delete this customer profile?", async () => {
      try {
        await deleteDoc(doc(db, 'users', id));
        fetchCustomers();
        showMessage("Customer deleted", "success");
      } catch (e) {
        console.error("Error deleting", e);
        showMessage("Failed to delete customer.", "error");
      }
    });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      if (editingId) {
        // Edit existing customer profile
        await updateDoc(doc(db, 'users', editingId), {
          displayName: formData.displayName,
          tradeName: formData.tradeName,
          gstNumber: formData.gstNumber
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
        <Button variant="contained" onClick={handleOpenNew} sx={{ mt: 1, fontWeight: 700 }}>
          + ADD CUSTOMER
        </Button>
      </Box>
      <Box sx={{ borderBottom: '2px solid #000', mb: 4, mt: 2 }} />

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 900 }}>TRADE NAME</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>CONTACT</TableCell>
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
                    label={row.active ? 'ACTIVE' : 'INACTIVE'}
                    size="small"
                    sx={{
                      backgroundColor: row.active ? '#000' : '#E0E0E0',
                      color: row.active ? '#FFF' : '#000',
                    }}
                  />
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
            <TextField label="Contact Name" fullWidth value={formData.displayName} onChange={(e) => setFormData({ ...formData, displayName: e.target.value })} />
            <TextField label="Email Address" type="email" fullWidth disabled={!!editingId} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            <TextField label="GST Number" fullWidth value={formData.gstNumber} onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })} />
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
