import { useState, useEffect } from 'react';
import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, Button, Chip, Dialog, DialogActions, Stepper, Step, StepLabel, IconButton, TextField, CircularProgress, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import app from '../firebase';
import { getFirestore, runTransaction, serverTimestamp } from 'firebase/firestore';
import { useUI } from '../context/UIContext';
import DispatchDialog, { type DispatchData } from '../components/DispatchDialog';

const db = getFirestore(app);
const functions = getFunctions(app);

interface Order {
  id: string;
  customerId: string;
  status: string;
  paymentStatus?: string;
  totalAmount: number;
  invoiceNo?: string;
  dispatchDetails?: DispatchData;
}

export default function Orders() {
  const { showConfirm, showMessage } = useUI();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // Edit Mode
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editStatus, setEditStatus] = useState('');
  const [editPaymentStatus, setEditPaymentStatus] = useState('');
  const [editTotal, setEditTotal] = useState('');

  // Dispatch Edit State
  const [editDispatchOrder, setEditDispatchOrder] = useState<Order | null>(null);
  const [dispatchLoading, setDispatchLoading] = useState(false);

  const statusSteps = ['Confirmed', 'Dispatched', 'Delivered'];

  const getStepIndex = (status: string) => {
    const idx = statusSteps.indexOf(status);
    return idx >= 0 ? idx : 0;
  };

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'orders'));
      let data = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Order[];
      // Filter out Inquiries, we only want Approved orders here
      data = data.filter(o => o.status !== 'Inquiry');
      setOrders(data);
    } catch (e) {
      console.log('Error fetching orders', e);
    }
  };

  const handleUpdateDeliveryStatus = async (orderId: string, newStatus: string) => {
    try {
      const updateOrderStatusFn = httpsCallable(functions, 'updateOrderStatus');
      await updateOrderStatusFn({ orderId, newStatus });
      fetchOrders();
      if (selectedOrder) setSelectedOrder({ ...selectedOrder, status: newStatus });
      showMessage(`Delivery status updated to ${newStatus}`, "success");
    } catch (error: any) {
      console.error('Error updating status', error);
      showMessage('Failed to update status', "error");
    }
  };

  const handleUpdatePaymentStatus = async (orderId: string, newPaymentStatus: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { paymentStatus: newPaymentStatus, updatedAt: new Date() });
      fetchOrders();
      if (selectedOrder) setSelectedOrder({ ...selectedOrder, paymentStatus: newPaymentStatus });
      showMessage(`Payment status updated to ${newPaymentStatus}`, "success");
    } catch (error: any) {
      console.error('Error updating payment', error);
      showMessage('Failed to update payment', "error");
    }
  };

  const handleDelete = async (id: string) => {
    showConfirm("Are you sure you want to delete this order?", async () => {
      try {
        const updateOrderStatusFn = httpsCallable(functions, 'updateOrderStatus');
        await updateOrderStatusFn({ orderId: id, newStatus: 'cancelled' });
        fetchOrders();
        showMessage("Order cancelled", "success");
      } catch (e) {
        console.error("Error cancelling", e);
        showMessage("Failed to cancel order.", "error");
      }
    });
  };

  const handleOpenEdit = (order: Order) => {
    setEditingId(order.id);
    setEditStatus(order.status || 'Confirmed');
    setEditPaymentStatus(order.paymentStatus || 'Pending');
    setEditTotal(order.totalAmount?.toString() || '');
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setEditLoading(true);
    try {
      const updateOrderStatusFn = httpsCallable(functions, 'updateOrderStatus');
      await updateOrderStatusFn({ orderId: editingId, newStatus: editStatus });
      // Update payment status separately (direct update is fine for this non-financial field)
      await updateDoc(doc(db, 'orders', editingId), {
        paymentStatus: editPaymentStatus,
        updatedAt: new Date()
      });
      setEditingId(null);
      fetchOrders();
      showMessage("Order updated", "success");
    } catch (e) {
      console.error('Error updating order:', e);
      showMessage('Error updating order.', "error");
    } finally {
      setEditLoading(false);
    }
  };

  const handleSaveDispatch = async (data: DispatchData) => {
    if (!editDispatchOrder) return;
    setDispatchLoading(true);
    try {
      await runTransaction(db, async (transaction) => {
        const orderRef = doc(db, 'orders', editDispatchOrder.id);
        
        let invoiceNo = editDispatchOrder.invoiceNo;
        // If they skipped generating an invoice previously, generate it now
        if (!invoiceNo) {
          const counterRef = doc(db, 'settings', 'invoiceCounter');
          const counterSnap = await transaction.get(counterRef);
          let nextSeq = 1;
          if (counterSnap.exists()) {
            nextSeq = counterSnap.data().seq + 1;
          }
          transaction.set(counterRef, { seq: nextSeq }, { merge: true });
          invoiceNo = `INV-${nextSeq.toString().padStart(3, '0')}`;
          
          transaction.update(orderRef, {
            invoiceNo,
            invoiceDate: serverTimestamp(),
            dispatchDetails: data,
            updatedAt: serverTimestamp()
          });
        } else {
          // Just update the dispatch details
          transaction.update(orderRef, {
            dispatchDetails: data,
            updatedAt: serverTimestamp()
          });
        }
      });
      fetchOrders();
      showMessage("Dispatch details updated successfully", "success");
      setEditDispatchOrder(null);
    } catch (e) {
      console.error("Error saving dispatch details:", e);
      showMessage("Failed to update dispatch details", "error");
    } finally {
      setDispatchLoading(false);
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
        ORDERS & PAYMENTS
      </Typography>
      <Typography sx={{ fontWeight: 600, color: '#999', letterSpacing: 1.5, fontSize: '0.8rem', mb: 3 }}>
        MANAGE DISPATCHES AND FINANCES
      </Typography>
      <Box sx={{ borderBottom: '2px solid #000', mb: 4 }} />

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 900 }}>ORDER ID</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>CUSTOMER</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>AMOUNT</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>DELIVERY STATUS</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>PAYMENT STATUS</TableCell>
              <TableCell sx={{ fontWeight: 900 }} align="right">ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map((row) => {
              const sc = statusColor(row.status);
              const pStatus = row.paymentStatus || 'Pending';
              return (
                <TableRow key={row.id} sx={{ '&:hover': { backgroundColor: '#FAFAFA' } }}>
                  <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>ORD-{row.id.substring(0, 6).toUpperCase()}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{row.customerName || 'Unknown Customer'}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>₹{row.totalAmount?.toLocaleString() || '—'}</TableCell>
                  <TableCell>
                    <Chip label={row.status} size="small" sx={{ backgroundColor: sc.bg, color: sc.fg, fontWeight: 700 }} />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={pStatus.toUpperCase()} 
                      size="small" 
                      color={pStatus === 'Done' ? 'success' : 'warning'} 
                      sx={{ fontWeight: 700 }} 
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    {row.paymentStatus === 'Done' && row.invoiceNo && (
                      <Button 
                        variant="contained" 
                        size="small" 
                        onClick={() => {
                          const isLocal = window.location.hostname === 'localhost';
                          const projectId = app.options.projectId;
                          const url = isLocal 
                            ? `http://127.0.0.1:5001/${projectId}/us-central1/downloadInvoice?orderId=${row.id}`
                            : `https://us-central1-${projectId}.cloudfunctions.net/downloadInvoice?orderId=${row.id}`;
                          window.open(url, '_blank');
                        }} 
                        sx={{ mr: 1, backgroundColor: '#000', color: '#FFF', fontSize: '0.7rem' }}
                      >
                        Print Invoice
                      </Button>
                    )}
                    <Button variant="outlined" size="small" onClick={() => setEditDispatchOrder(row)} sx={{ mr: 1, borderColor: '#000', color: '#000', fontSize: '0.7rem' }}>
                      Dispatch Info
                    </Button>
                    <Button variant="outlined" size="small" onClick={() => setSelectedOrder(row)} sx={{ mr: 1 }}>
                      Details
                    </Button>
                    <IconButton onClick={() => handleOpenEdit(row)} size="small" sx={{ mr: 1, color: '#000' }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(row.id)} size="small" sx={{ color: 'red' }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
            {orders.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 8, color: '#999', fontWeight: 600, letterSpacing: 1 }}>
                  NO APPROVED ORDERS YET
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Order Detail & Action Dialog */}
      <Dialog open={!!selectedOrder} onClose={() => setSelectedOrder(null)} maxWidth="md" fullWidth>
        <Box sx={{ p: 3 }}>
          <Typography sx={{ fontWeight: 900, letterSpacing: 2, fontSize: '1.2rem', mb: 3 }}>
            ORDER: ORD-{selectedOrder?.id.substring(0, 6).toUpperCase()}
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
                <Typography sx={{ fontWeight: 700 }}>{selectedOrder?.customerName || 'Unknown Customer'}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: '0.7rem', letterSpacing: 1, color: '#999', mb: 0.5 }}>TOTAL AMOUNT</Typography>
                <Typography sx={{ fontWeight: 900, fontSize: '1.5rem' }}>₹{selectedOrder?.totalAmount?.toLocaleString()}</Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ borderTop: '2px solid #000', pt: 3, display: 'flex', justifyContent: 'space-between' }}>
            <Box>
              <Typography sx={{ fontWeight: 800, letterSpacing: 1, fontSize: '0.8rem', mb: 2 }}>DELIVERY ACTIONS</Typography>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <Button variant="contained" size="small" onClick={() => handleUpdateDeliveryStatus(selectedOrder!.id, 'Dispatched')} disabled={selectedOrder?.status !== 'Confirmed'}>
                  Dispatch
                </Button>
                <Button variant="contained" size="small" onClick={() => handleUpdateDeliveryStatus(selectedOrder!.id, 'Delivered')} disabled={selectedOrder?.status !== 'Dispatched'}>
                  Deliver
                </Button>
              </Box>
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 800, letterSpacing: 1, fontSize: '0.8rem', mb: 2 }}>PAYMENT ACTIONS</Typography>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <Button 
                  variant="outlined" 
                  color="warning" 
                  size="small" 
                  onClick={() => handleUpdatePaymentStatus(selectedOrder!.id, 'Pending')} 
                  disabled={selectedOrder?.paymentStatus === 'Pending'}
                >
                  Mark Pending
                </Button>
                <Button 
                  variant="contained" 
                  color="success" 
                  size="small" 
                  onClick={() => handleUpdatePaymentStatus(selectedOrder!.id, 'Done')} 
                  disabled={selectedOrder?.paymentStatus === 'Done'}
                >
                  Mark Done
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
        <DialogActions sx={{ borderTop: '1px solid #E0E0E0', p: 2 }}>
          <Button onClick={() => setSelectedOrder(null)} sx={{ fontWeight: 700, color: '#000' }}>CLOSE</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Order Form Dialog (For manual override) */}
      <Dialog open={!!editingId} onClose={() => !editLoading && setEditingId(null)} maxWidth="xs" fullWidth>
        <Box sx={{ p: 3 }}>
          <Typography sx={{ fontWeight: 900, letterSpacing: 2, fontSize: '1rem', mb: 3 }}>
            EDIT ORDER DATA
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <FormControl fullWidth>
              <InputLabel>Delivery Status</InputLabel>
              <Select value={editStatus} label="Delivery Status" onChange={(e) => setEditStatus(e.target.value)}>
                <MenuItem value="Confirmed">Confirmed</MenuItem>
                <MenuItem value="Dispatched">Dispatched</MenuItem>
                <MenuItem value="Delivered">Delivered</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Payment Status</InputLabel>
              <Select value={editPaymentStatus} label="Payment Status" onChange={(e) => setEditPaymentStatus(e.target.value)}>
                <MenuItem value="Pending">Pending</MenuItem>
                <MenuItem value="Done">Done</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Total Amount (₹)" type="number" fullWidth value={editTotal} disabled
              slotProps={{ input: { readOnly: true } }}
              helperText="Amount is calculated server-side and cannot be manually edited"
            />
          </Box>
        </Box>
        <DialogActions sx={{ borderTop: '2px solid #000', p: 2 }}>
          <Button onClick={() => setEditingId(null)} disabled={editLoading} sx={{ fontWeight: 700, color: '#000' }}>CANCEL</Button>
          <Button variant="contained" onClick={handleSaveEdit} disabled={editLoading} sx={{ backgroundColor: '#000', color: '#FFF', fontWeight: 700, borderRadius: 0 }}>
            {editLoading ? <CircularProgress size={20} color="inherit" /> : 'SAVE CHANGES'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dispatch Dialog */}
      <DispatchDialog 
        open={!!editDispatchOrder}
        onClose={() => setEditDispatchOrder(null)}
        loading={dispatchLoading}
        onSave={handleSaveDispatch}
        isApprovalMode={false}
        initialData={editDispatchOrder?.dispatchDetails}
      />
    </Box>
  );
}
