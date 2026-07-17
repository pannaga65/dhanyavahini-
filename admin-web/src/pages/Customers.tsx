import { useState, useEffect } from 'react';
import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, Button, Dialog, DialogActions, TextField, CircularProgress, Chip } from '@mui/material';
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
        <Button variant="contained" onClick={() => setOpen(true)} sx={{ mt: 1 }}>
          + ADD CUSTOMER
        </Button>
      </Box>
      <Box sx={{ borderBottom: '2px solid #000', mb: 4, mt: 2 }} />

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>TRADE NAME</TableCell>
              <TableCell>CONTACT</TableCell>
              <TableCell>EMAIL</TableCell>
              <TableCell>GST</TableCell>
              <TableCell>STATUS</TableCell>
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
              </TableRow>
            ))}
            {customers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 8, color: '#999', fontWeight: 600, letterSpacing: 1 }}>
                  NO CUSTOMERS YET — ADD ONE ABOVE
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add Customer Dialog */}
      <Dialog open={open} onClose={() => !loading && setOpen(false)} maxWidth="sm" fullWidth>
        <Box sx={{ p: 3 }}>
          <Typography sx={{ fontWeight: 900, letterSpacing: 2, fontSize: '1rem', mb: 3 }}>
            ADD NEW CUSTOMER
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField label="Trade Name (Business)" fullWidth value={formData.tradeName} onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })} />
            <TextField label="Contact Name" fullWidth value={formData.displayName} onChange={(e) => setFormData({ ...formData, displayName: e.target.value })} />
            <TextField label="Email Address" type="email" fullWidth value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            <TextField label="GST Number" fullWidth value={formData.gstNumber} onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })} />
          </Box>
        </Box>
        <DialogActions sx={{ borderTop: '2px solid #000', p: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateCustomer} disabled={loading}>
            {loading ? <CircularProgress size={20} color="inherit" /> : 'CREATE CUSTOMER'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
