import { useState, useEffect } from 'react';
import { Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions, Stepper, Step, StepLabel, Divider } from '@mui/material';
import { collection, getDocs } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../firebase';
import { getFirestore } from 'firebase/firestore';

const db = getFirestore(app);
const functions = getFunctions(app);

interface Order {
  id: string;
  customerId: string;
  status: string;
  totalAmount: number;
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const statusSteps = ['Pending', 'Confirmed', 'Dispatched', 'Delivered'];

  const getStepIndex = (status: string) => {
    switch (status) {
      case 'Pending': return 0;
      case 'Confirmed': return 1;
      case 'Dispatched': return 2;
      case 'Delivered': return 3;
      default: return 0;
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'orders'));
      const data = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Order[];
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
      setSelectedOrder(null);
    } catch (error: any) {
      console.error('Error updating status', error);
      alert('Failed to update status: ' + error.message);
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 4 }}>
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
                      backgroundColor: row.status === 'Confirmed' ? '#000000' : '#EAEAEA',
                      color: row.status === 'Confirmed' ? '#FFFFFF' : '#000000',
                      borderRadius: 1
                    }} 
                  />
                </TableCell>
                <TableCell>
                  <Button 
                    variant="outlined" 
                    size="small"
                    onClick={() => setSelectedOrder(row)}
                  >
                    View Details
                  </Button>
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

      {/* Order Details & Timeline Dialog */}
      <Dialog open={!!selectedOrder} onClose={() => setSelectedOrder(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Order Details: {selectedOrder?.id}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 4, mt: 2 }}>
            <Stepper activeStep={selectedOrder ? getStepIndex(selectedOrder.status) : 0} alternativeLabel>
              {statusSteps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Order Summary</Typography>
          <Typography variant="body1"><b>Customer:</b> {selectedOrder?.customerId}</Typography>
          <Typography variant="body1"><b>Total Amount:</b> ₹{selectedOrder?.totalAmount?.toLocaleString()}</Typography>
          
          <Box sx={{ mt: 4, p: 2, backgroundColor: '#F9F9F9', borderRadius: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Admin Actions</Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="contained" color="primary" onClick={() => handleUpdateStatus(selectedOrder!.id, 'Confirmed')} disabled={selectedOrder?.status === 'Confirmed' || selectedOrder?.status === 'Dispatched' || selectedOrder?.status === 'Delivered'}>Mark Confirmed</Button>
              <Button variant="contained" color="secondary" onClick={() => handleUpdateStatus(selectedOrder!.id, 'Dispatched')} disabled={selectedOrder?.status !== 'Confirmed'}>Mark Dispatched</Button>
              <Button variant="contained" sx={{ backgroundColor: '#000', color: '#fff' }} onClick={() => handleUpdateStatus(selectedOrder!.id, 'Delivered')} disabled={selectedOrder?.status !== 'Dispatched'}>Mark Delivered</Button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" color="primary">Download Invoice PDF</Button>
          <Button onClick={() => setSelectedOrder(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
