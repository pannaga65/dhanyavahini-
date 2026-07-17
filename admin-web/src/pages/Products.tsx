import { useState, useEffect } from 'react';
import { Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress } from '@mui/material';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import app from '../firebase';
import { getFirestore } from 'firebase/firestore';

const db = getFirestore(app);

export default function Products() {
  const [products, setProducts] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', price: '', stockQuantity: '' });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'products'));
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(data);
    } catch (e) {
      console.log('Error fetching products', e);
    }
  };

  const handleCreateProduct = async () => {
    setLoading(true);
    try {
      await addDoc(collection(db, 'products'), {
        name: formData.name,
        price: Number(formData.price),
        stockQuantity: Number(formData.stockQuantity),
        active: true,
      });
      setOpen(false);
      setFormData({ name: '', price: '', stockQuantity: '' });
      fetchProducts();
    } catch (error: any) {
      console.error('Error creating product:', error);
      alert('Error creating product: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" fontWeight="700">
          Products Inventory
        </Typography>
        <Button variant="contained" color="primary" onClick={() => setOpen(true)}>
          + Add Product
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell>Product Name</TableCell>
              <TableCell>Price (per unit)</TableCell>
              <TableCell>Stock Quantity</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((row) => (
              <TableRow key={row.id}>
                <TableCell sx={{ fontWeight: 600 }}>{row.name}</TableCell>
                <TableCell>₹{row.price}</TableCell>
                <TableCell>{row.stockQuantity}</TableCell>
                <TableCell>{row.active ? 'Active' : 'Inactive'}</TableCell>
              </TableRow>
            ))}
            {products.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  No products in inventory.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Add New Product</DialogTitle>
        <DialogContent>
          <TextField margin="dense" label="Product Name" fullWidth value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
          <TextField margin="dense" label="Price" type="number" fullWidth value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} />
          <TextField margin="dense" label="Initial Stock Quantity" type="number" fullWidth value={formData.stockQuantity} onChange={(e) => setFormData({...formData, stockQuantity: e.target.value})} />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleCreateProduct} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Create Product'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
