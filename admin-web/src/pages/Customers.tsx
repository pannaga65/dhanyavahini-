import { useState, useEffect } from 'react';
import { Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress } from '@mui/material';
import { collection, getDocs, query, where, getFirestore } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../firebase';

const db = getFirestore(app);
const functions = getFunctions(app);

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', displayName: '', tradeName: '', gstNumber: '' });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'customer'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCustomers(data);
    } catch (e) {
      console.log('Error fetching customers, likely need to login first.', e);
    }
  };

  const handleCreateCustomer = async () => {
    setLoading(true);
    try {
      const createCustomerFn = httpsCallable(functions, 'createCustomer');
      await createCustomerFn(formData);
      setOpen(false);
      setFormData({ email: '', displayName: '', tradeName: '', gstNumber: '' });
      fetchCustomers();
    } catch (error: any) {
      console.error('Error creating customer:', error);
      alert('Error creating customer: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" fontWeight="700">
          Customers
        </Typography>
        <Button variant="contained" color="primary" onClick={() => setOpen(true)}>
          + Add Customer
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell>Trade Name</TableCell>
              <TableCell>Contact Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>GST Number</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {customers.map((row) => (
              <TableRow key={row.id}>
                <TableCell sx={{ fontWeight: 600 }}>{row.tradeName}</TableCell>
                <TableCell>{row.displayName}</TableCell>
                <TableCell>{row.email}</TableCell>
                <TableCell>{row.gstNumber}</TableCell>
                <TableCell>{row.active ? 'Active' : 'Inactive'}</TableCell>
              </TableRow>
            ))}
            {customers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  No customers found. Click "Add Customer" to create one.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Add New Customer</DialogTitle>
        <DialogContent>
          <TextField margin="dense" label="Trade Name (Business Name)" fullWidth value={formData.tradeName} onChange={(e) => setFormData({...formData, tradeName: e.target.value})} />
          <TextField margin="dense" label="Contact Name" fullWidth value={formData.displayName} onChange={(e) => setFormData({...formData, displayName: e.target.value})} />
          <TextField margin="dense" label="Email Address" type="email" fullWidth value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
          <TextField margin="dense" label="GST Number" fullWidth value={formData.gstNumber} onChange={(e) => setFormData({...formData, gstNumber: e.target.value})} />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleCreateCustomer} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Create Customer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
