import { useState, useEffect } from 'react';
import { Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, Button, Chip } from '@mui/material';
import { collection, getDocs } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../firebase';
import { getFirestore } from 'firebase/firestore';

const db = getFirestore(app);
const functions = getFunctions(app);

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'orders'));
      const data = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setOrders(data);
    } catch (e) {
      console.log('Error fetching orders', e);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const updateOrderFn = httpsCallable(functions, 'updateOrderStatus');
      await updateOrderFn({ orderId, newStatus });
      fetchOrders();
    } catch (error: any) {
      console.error('Error updating status', error);
      alert('Failed to update status: ' + error.message);
    }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight="700" mb={4}>
        Orders Management
      </Typography>

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell>Order ID</TableCell>
              <TableCell>Customer ID</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map((row) => (
              <TableRow key={row.id}>
                <TableCell sx={{ fontWeight: 600 }}>{row.id}</TableCell>
                <TableCell>{row.customerId}</TableCell>
                <TableCell>
                  <Chip 
                    label={row.status} 
                    size="small"
                    sx={{ 
                      fontWeight: 600, 
                      backgroundColor: row.status === 'confirmed' ? '#000000' : '#EAEAEA',
                      color: row.status === 'confirmed' ? '#FFFFFF' : '#000000',
                      borderRadius: 1
                    }} 
                  />
                </TableCell>
                <TableCell>
                  {row.status === 'pending' && (
                    <Button size="small" variant="outlined" onClick={() => handleUpdateStatus(row.id, 'confirmed')} sx={{ mr: 1, borderColor: '#000000', color: '#000000' }}>Confirm</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  No orders found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
