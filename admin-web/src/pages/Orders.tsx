import { useState, useEffect } from 'react';
import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, Button, Chip, Dialog, DialogActions, Stepper, Step, StepLabel } from '@mui/material';
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
    const idx = statusSteps.indexOf(status);
    return idx >= 0 ? idx : 0;
  };

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'orders'));
      setOrders(querySnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Order[]);
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

  const statusColor = (status: string) => {
    switch (status) {
      case 'Confirmed': return { bg: '#000', fg: '#FFF' };
      case 'Dispatched': return { bg: '#333', fg: '#FFF' };
      case 'Delivered': return { bg: '#666', fg: '#FFF' };
      default: return { bg: '#E0E0E0', fg: '#000' };
    }
  };

  return (
    <Box>
      {/* Page Header */}
      <Typography sx={{ fontWeight: 900, fontSize: { xs: '1.8rem', md: '2.2rem' }, letterSpacing: 3, mb: 1 }}>
        ORDERS
      </Typography>
      <Typography sx={{ fontWeight: 600, color: '#999', letterSpacing: 1.5, fontSize: '0.8rem', mb: 3 }}>
        MANAGE DISPATCHES
      </Typography>
      <Box sx={{ borderBottom: '2px solid #000', mb: 4 }} />

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ORDER ID</TableCell>
              <TableCell>CUSTOMER</TableCell>
              <TableCell>AMOUNT</TableCell>
              <TableCell>STATUS</TableCell>
              <TableCell>ACTION</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map((row) => {
              const sc = statusColor(row.status);
              return (
                <TableRow key={row.id} sx={{ '&:hover': { backgroundColor: '#FAFAFA' } }}>
                  <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{row.id.substring(0, 8)}…</TableCell>
                  <TableCell>{row.customerId}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>₹{row.totalAmount?.toLocaleString() || '—'}</TableCell>
                  <TableCell>
                    <Chip label={row.status} size="small" sx={{ backgroundColor: sc.bg, color: sc.fg }} />
                  </TableCell>
                  <TableCell>
                    <Button variant="outlined" size="small" onClick={() => setSelectedOrder(row)}>
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 8, color: '#999', fontWeight: 600, letterSpacing: 1 }}>
                  NO ORDERS YET
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onClose={() => setSelectedOrder(null)} maxWidth="md" fullWidth>
        <Box sx={{ p: 3 }}>
          <Typography sx={{ fontWeight: 900, letterSpacing: 2, fontSize: '1rem', mb: 3 }}>
            ORDER: {selectedOrder?.id.substring(0, 8)}…
          </Typography>

          <Box sx={{ mb: 4 }}>
            <Stepper activeStep={selectedOrder ? getStepIndex(selectedOrder.status) : 0} alternativeLabel>
              {statusSteps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>

          <Box sx={{ borderTop: '1px solid #E0E0E0', pt: 3, mb: 3 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: '0.7rem', letterSpacing: 1, color: '#999', mb: 0.5 }}>CUSTOMER</Typography>
                <Typography sx={{ fontWeight: 700 }}>{selectedOrder?.customerId}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: '0.7rem', letterSpacing: 1, color: '#999', mb: 0.5 }}>TOTAL</Typography>
                <Typography sx={{ fontWeight: 900, fontSize: '1.5rem' }}>₹{selectedOrder?.totalAmount?.toLocaleString()}</Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ borderTop: '2px solid #000', pt: 3 }}>
            <Typography sx={{ fontWeight: 800, letterSpacing: 1, fontSize: '0.8rem', mb: 2 }}>ADMIN ACTIONS</Typography>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Button variant="contained" size="small" onClick={() => handleUpdateStatus(selectedOrder!.id, 'Confirmed')} disabled={selectedOrder?.status !== 'Pending'}>
                Confirm
              </Button>
              <Button variant="contained" size="small" onClick={() => handleUpdateStatus(selectedOrder!.id, 'Dispatched')} disabled={selectedOrder?.status !== 'Confirmed'}>
                Dispatch
              </Button>
              <Button variant="contained" size="small" onClick={() => handleUpdateStatus(selectedOrder!.id, 'Delivered')} disabled={selectedOrder?.status !== 'Dispatched'}>
                Deliver
              </Button>
              <Button variant="outlined" size="small">
                Download Invoice
              </Button>
            </Box>
          </Box>
        </Box>
        <DialogActions sx={{ borderTop: '1px solid #E0E0E0', p: 2 }}>
          <Button onClick={() => setSelectedOrder(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
