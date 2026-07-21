import { useState, useEffect } from 'react';
import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, Button, Chip, Dialog, DialogActions, IconButton, TextField, CircularProgress, Select, MenuItem, FormControl, InputLabel, Divider, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import app from '../firebase';
import { getFirestore, runTransaction, serverTimestamp } from 'firebase/firestore';
import { useUI } from '../context/UIContext';
import DispatchDialog, { type DispatchData } from '../components/DispatchDialog';

const db = getFirestore(app);
const functions = getFunctions(app);

interface Order {
  id: string;
  orderNo?: string;
  customerId: string;
  customerName?: string;
  status: string;
  paymentStatus?: string;
  totalAmount: number;
  invoiceNo?: string;
  dispatchDetails?: DispatchData;
  shippingAddress?: string;
  billingAddress?: string;
  items?: any[];
  subtotal?: number;
  gstAmount?: number;
  createdAt?: any;
}

export default function Orders() {
  const { showConfirm, showMessage } = useUI();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customersMap, setCustomersMap] = useState<Record<string, any>>({});
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDelivery, setFilterDelivery] = useState('All');
  const [filterPayment, setFilterPayment] = useState('All');
  const [filterDate, setFilterDate] = useState('All');
  
  // Edit Mode
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editStatus, setEditStatus] = useState('');
  const [editPaymentStatus, setEditPaymentStatus] = useState('');
  const [editTotal, setEditTotal] = useState('');

  // Dispatch Edit State
  const [editDispatchOrder, setEditDispatchOrder] = useState<Order | null>(null);
  const [dispatchLoading, setDispatchLoading] = useState(false);

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'orders'));
      let data = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Order[];
      // Filter out Inquiries, we only want Approved orders here
      data = data.filter(o => o.status !== 'Inquiry');
      // Fetch customers for fallback
      const custSnap = await getDocs(collection(db, 'users'));
      const cmap: Record<string, any> = {};
      custSnap.forEach(d => { cmap[d.id] = d.data(); });
      setCustomersMap(cmap);

      setOrders(data);
    } catch (e) {
      console.log('Error fetching orders', e);
    }
  };

  const filteredOrders = orders.filter(o => {
    if (filterDelivery !== 'All' && o.status !== filterDelivery) return false;
    if (filterPayment !== 'All' && (o.paymentStatus || 'Pending') !== filterPayment) return false;
    if (filterDate !== 'All' && o.createdAt) {
      const date = o.createdAt.toDate();
      const now = new Date();
      if (filterDate === 'Today' && date.toDateString() !== now.toDateString()) return false;
      if (filterDate === '7 Days' && (now.getTime() - date.getTime()) > 7 * 24 * 60 * 60 * 1000) return false;
      if (filterDate === '30 Days' && (now.getTime() - date.getTime()) > 30 * 24 * 60 * 60 * 1000) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const cName = (o.customerName || customersMap[o.customerId]?.displayName || customersMap[o.customerId]?.tradeName || '').toLowerCase();
      const oId = (o.orderNo || o.id).toLowerCase();
      if (!cName.includes(q) && !oId.includes(q)) return false;
    }
    return true;
  }).sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

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

      {/* Filter Bar */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 4, p: 2, backgroundColor: '#FAFAFA', borderRadius: 2, border: '1px solid #E0E0E0' }}>
        <TextField 
          placeholder="Search by ID or Customer..." 
          size="small" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ flex: 1, minWidth: 250, backgroundColor: '#FFF' }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }
          }}
        />
        <FormControl size="small" sx={{ minWidth: 150, backgroundColor: '#FFF' }}>
          <InputLabel>Delivery Filter</InputLabel>
          <Select value={filterDelivery} label="Delivery Filter" onChange={(e) => setFilterDelivery(e.target.value)}>
            <MenuItem value="All">All Statuses</MenuItem>
            <MenuItem value="Confirmed">Confirmed</MenuItem>
            <MenuItem value="Dispatched">Dispatched</MenuItem>
            <MenuItem value="Delivered">Delivered</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 150, backgroundColor: '#FFF' }}>
          <InputLabel>Payment Filter</InputLabel>
          <Select value={filterPayment} label="Payment Filter" onChange={(e) => setFilterPayment(e.target.value)}>
            <MenuItem value="All">All Payments</MenuItem>
            <MenuItem value="Pending">Pending</MenuItem>
            <MenuItem value="Done">Done</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 150, backgroundColor: '#FFF' }}>
          <InputLabel>Date Range</InputLabel>
          <Select value={filterDate} label="Date Range" onChange={(e) => setFilterDate(e.target.value)}>
            <MenuItem value="All">All Time</MenuItem>
            <MenuItem value="Today">Today</MenuItem>
            <MenuItem value="7 Days">Last 7 Days</MenuItem>
            <MenuItem value="30 Days">Last 30 Days</MenuItem>
          </Select>
        </FormControl>
      </Box>

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
            {filteredOrders.map((row) => {
              const sc = statusColor(row.status);
              const pStatus = row.paymentStatus || 'Pending';
              return (
                <TableRow key={row.id} sx={{ '&:hover': { backgroundColor: '#FAFAFA' } }}>
                  <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{row.orderNo || `ORD-${row.id.substring(0, 6).toUpperCase()}`}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>
                    {row.customerName || customersMap[row.customerId]?.displayName || customersMap[row.customerId]?.tradeName || 'Unknown Customer'}
                  </TableCell>
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
            {filteredOrders.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 8, color: '#999', fontWeight: 600, letterSpacing: 1 }}>
                  NO ORDERS FOUND MATCHING FILTERS
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Order Detail & Action Dialog (The "Dispatch Ticket") */}
      <Dialog open={!!selectedOrder} onClose={() => setSelectedOrder(null)} maxWidth="lg" fullWidth>
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Header */}
          <Box sx={{ p: 3, borderBottom: '1px solid #E0E0E0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FAFAFA' }}>
            <Box>
              <Typography sx={{ fontWeight: 900, letterSpacing: 1, fontSize: '1.4rem' }}>
                ORDER: {selectedOrder?.orderNo || `ORD-${selectedOrder?.id.substring(0, 6).toUpperCase()}`}
              </Typography>
              <Typography sx={{ color: '#666', fontSize: '0.85rem', fontWeight: 600 }}>
                {selectedOrder?.createdAt ? new Date(selectedOrder.createdAt.toDate()).toLocaleString() : 'Date Unknown'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box>
                  <Typography sx={{ fontSize: '0.7rem', color: '#999', fontWeight: 700, mb: 0.5 }}>DELIVERY</Typography>
                  <Chip label={selectedOrder?.status || 'Unknown'} size="small" sx={{ backgroundColor: statusColor(selectedOrder?.status || '').bg, color: statusColor(selectedOrder?.status || '').fg, fontWeight: 800 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.7rem', color: '#999', fontWeight: 700, mb: 0.5 }}>PAYMENT</Typography>
                  <Chip label={(selectedOrder?.paymentStatus || 'Pending').toUpperCase()} size="small" color={selectedOrder?.paymentStatus === 'Done' ? 'success' : 'warning'} sx={{ fontWeight: 800 }} />
                </Box>
              </Box>
              <IconButton onClick={() => setSelectedOrder(null)} sx={{ color: '#000' }}>
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>

          <Box sx={{ p: 3, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
            
            {/* Left Column: Customer & Address */}
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 800, fontSize: '1rem', mb: 2, borderBottom: '2px solid #000', pb: 1 }}>
                CUSTOMER & DISPATCH DETAILS
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#999' }}>CUSTOMER NAME</Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: '1.1rem' }}>
                    {selectedOrder?.customerName || (selectedOrder ? (customersMap[selectedOrder.customerId]?.displayName || customersMap[selectedOrder.customerId]?.tradeName) : '') || 'Unknown Customer'}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#999' }}>SHIPPING ADDRESS</Typography>
                  <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    {selectedOrder?.shippingAddress || selectedOrder?.billingAddress || 'Address not provided by customer'}
                  </Typography>
                </Box>

                {selectedOrder?.dispatchDetails?.lrNumber && (
                  <Box sx={{ p: 2, backgroundColor: '#F0F7FF', border: '1px solid #CCE3FF', borderRadius: 2 }}>
                    <Typography sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#0055CC' }}>DISPATCHED VIA</Typography>
                    <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: '#003399' }}>
                      {selectedOrder.dispatchDetails.dispatchedThrough || 'Courier'} - LR: {selectedOrder.dispatchDetails.lrNumber}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>

            {/* Right Column: Order Items */}
            <Box sx={{ flex: 2 }}>
              <Typography sx={{ fontWeight: 800, fontSize: '1rem', mb: 2, borderBottom: '2px solid #000', pb: 1 }}>
                ORDER ITEMS
              </Typography>
              
              <TableContainer sx={{ border: '1px solid #E0E0E0', borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ backgroundColor: '#FAFAFA' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>ITEM</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="center">QTY (KG)</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">RATE</TableCell>
                      <TableCell sx={{ fontWeight: 800 }} align="right">TOTAL</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(selectedOrder?.items || []).map((item: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell sx={{ fontWeight: 600 }}>{item.name}</TableCell>
                        <TableCell align="center">{item.quantityKg}</TableCell>
                        <TableCell align="right">₹{item.basePriceKg}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>₹{item.lineTotal?.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    {(!selectedOrder?.items || selectedOrder.items.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 3, color: '#999' }}>No item details found</TableCell>
                      </TableRow>
                    )}
                    
                    {/* Totals */}
                    <TableRow>
                      <TableCell colSpan={3} align="right" sx={{ borderBottom: 'none', pt: 3, fontWeight: 700, color: '#666' }}>Subtotal:</TableCell>
                      <TableCell align="right" sx={{ borderBottom: 'none', pt: 3, fontWeight: 700 }}>₹{selectedOrder?.subtotal?.toLocaleString() || 0}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={3} align="right" sx={{ borderBottom: 'none', fontWeight: 700, color: '#666' }}>GST Amount:</TableCell>
                      <TableCell align="right" sx={{ borderBottom: 'none', fontWeight: 700 }}>₹{selectedOrder?.gstAmount?.toLocaleString() || 0}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={3} align="right" sx={{ fontWeight: 900, fontSize: '1.1rem' }}>GRAND TOTAL:</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 900, fontSize: '1.2rem', color: '#000' }}>₹{selectedOrder?.totalAmount?.toLocaleString() || 0}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
            
          </Box>
        </Box>

        {/* Action Footer */}
        <DialogActions sx={{ borderTop: '2px solid #000', p: 3, backgroundColor: '#FAFAFA', display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Typography sx={{ fontWeight: 800, fontSize: '0.75rem', color: '#999', mr: 1 }}>DELIVERY:</Typography>
              <Select 
                size="small" 
                value={selectedOrder?.status || ''} 
                onChange={(e) => {
                  const val = e.target.value as string;
                  showConfirm(`Are you sure you want to mark this order as ${val}?`, () => {
                    handleUpdateDeliveryStatus(selectedOrder!.id, val);
                  });
                }}
                sx={{ backgroundColor: '#FFF', minWidth: 140, fontWeight: 700 }}
              >
                <MenuItem value="Confirmed">Confirmed</MenuItem>
                <MenuItem value="Dispatched">Dispatched</MenuItem>
                <MenuItem value="Delivered">Delivered</MenuItem>
              </Select>
            </Box>
            
            <Divider orientation="vertical" flexItem />

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Typography sx={{ fontWeight: 800, fontSize: '0.75rem', color: '#999', mr: 1 }}>PAYMENT:</Typography>
              <Select 
                size="small" 
                value={selectedOrder?.paymentStatus || 'Pending'} 
                onChange={(e) => {
                  const val = e.target.value as string;
                  showConfirm(`Are you sure you want to mark payment as ${val}?`, () => {
                    handleUpdatePaymentStatus(selectedOrder!.id, val);
                  });
                }}
                sx={{ backgroundColor: '#FFF', minWidth: 120, fontWeight: 700 }}
              >
                <MenuItem value="Pending">Pending</MenuItem>
                <MenuItem value="Done">Done</MenuItem>
              </Select>
            </Box>
          </Box>
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
        customer={editDispatchOrder ? customersMap[editDispatchOrder.customerId] : null}
      />
    </Box>
  );
}
