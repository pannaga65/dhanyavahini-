import { useState, useEffect } from 'react';
import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, Button, Dialog, DialogActions, TextField, CircularProgress, IconButton } from '@mui/material';
import { collection, getDocs, query, where, getFirestore, updateDoc, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../firebase';
import { useUI } from '../context/UIContext';
import DispatchDialog, { type DispatchData } from '../components/DispatchDialog';

const db = getFirestore(app);
const functions = getFunctions(app);

export default function Inquiries() {
  const { showConfirm, showMessage } = useUI();
  const [inquiries, setInquiries] = useState<any[]>([]);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Negotiation Form Data
  const [negotiatedPrice, setNegotiatedPrice] = useState('');
  const [negotiatedQuantity, setNegotiatedQuantity] = useState('');

  // Dispatch Dialog State
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [dispatchLoading, setDispatchLoading] = useState(false);

  useEffect(() => { fetchInquiries(); }, []);

  const fetchInquiries = async () => {
    try {
      const q = query(collection(db, 'orders'), where('status', '==', 'Inquiry'));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by latest (client side for now)
      data.sort((a: any, b: any) => b.createdAt?.toMillis() - a.createdAt?.toMillis());

      setInquiries(data);
    } catch (e) {
      console.log('Error fetching inquiries', e);
    }
  };

  const handleDelete = async (id: string) => {
    showConfirm("Are you sure you want to completely delete this inquiry? This cannot be undone.", async () => {
      // Optimistic update
      const previousInquiries = [...inquiries];
      setInquiries(inquiries.filter(i => i.id !== id));

      try {
        const deleteOrderFn = httpsCallable(functions, 'deleteOrder');
        await deleteOrderFn({ orderId: id });
        showMessage("Inquiry deleted successfully", "success");
      } catch (e) {
        console.error("Error deleting", e);
        setInquiries(previousInquiries);
        showMessage("Failed to delete inquiry.", "error");
      }
    });
  };

  const handleOpenEdit = (inquiry: any) => {
    setEditingId(inquiry.id);
    setNegotiatedPrice(inquiry.totalAmount?.toString() || '');
    const calculatedTotalQty = inquiry.totalQuantity || inquiry.items?.reduce((sum: number, item: any) => sum + (item.quantityKg || 0), 0) || 0;
    setNegotiatedQuantity(calculatedTotalQty.toString() || '');
    setOpen(true);
  };

  const handleApproveConvert = (inquiryId: string) => {
    setApprovingId(inquiryId);
  };

  const handleSkipDispatch = async () => {
    if (!approvingId) return;
    setDispatchLoading(true);

    // Optimistic update
    const previousInquiries = [...inquiries];
    const targetId = approvingId;
    setInquiries(inquiries.filter(i => i.id !== targetId));
    setApprovingId(null);

    try {
      await runTransaction(db, async (transaction) => {
        const orderCounterRef = doc(db, 'settings', 'orderCounter');
        const orderCounterSnap = await transaction.get(orderCounterRef);
        let nextOrderSeq = 1;
        if (orderCounterSnap.exists()) {
          nextOrderSeq = orderCounterSnap.data().seq + 1;
        }
        transaction.set(orderCounterRef, { seq: nextOrderSeq }, { merge: true });
        const orderNo = `ORD-${nextOrderSeq.toString().padStart(3, '0')}`;

        const orderRef = doc(db, 'orders', targetId);
        transaction.update(orderRef, {
          status: 'Confirmed',
          paymentStatus: 'Pending',
          orderNo: orderNo,
          updatedAt: serverTimestamp()
        });
      });
      showMessage("Order confirmed! You can add dispatch details later.", "info");
    } catch (error) {
      console.error('Error skipping dispatch:', error);
      setInquiries(previousInquiries);
      showMessage("Failed to approve order.", "error");
    } finally {
      setDispatchLoading(false);
    }
  };

  const handleSaveDispatch = async (data: DispatchData) => {
    if (!approvingId) return;
    setDispatchLoading(true);

    // Optimistic update
    const previousInquiries = [...inquiries];
    const targetId = approvingId;
    setInquiries(inquiries.filter(i => i.id !== targetId));
    setApprovingId(null); // Close instantly

    try {
      await runTransaction(db, async (transaction) => {
        const counterRef = doc(db, 'settings', 'invoiceCounter');
        const counterSnap = await transaction.get(counterRef);
        let nextSeq = 1;
        if (counterSnap.exists()) {
          nextSeq = counterSnap.data().seq + 1;
        }
        transaction.set(counterRef, { seq: nextSeq }, { merge: true });
        const invoiceNo = `INV-${nextSeq.toString().padStart(3, '0')}`;
        
        const orderCounterRef = doc(db, 'settings', 'orderCounter');
        const orderCounterSnap = await transaction.get(orderCounterRef);
        let nextOrderSeq = 1;
        if (orderCounterSnap.exists()) {
          nextOrderSeq = orderCounterSnap.data().seq + 1;
        }
        transaction.set(orderCounterRef, { seq: nextOrderSeq }, { merge: true });
        const orderNo = `ORD-${nextOrderSeq.toString().padStart(3, '0')}`;
        
        const orderRef = doc(db, 'orders', targetId);
        transaction.update(orderRef, {
          status: 'Confirmed',
          paymentStatus: 'Pending',
          orderNo: orderNo,
          invoiceNo,
          invoiceDate: serverTimestamp(),
          dispatchDetails: data,
          updatedAt: serverTimestamp()
        });
      });
      showMessage("Order confirmed and Dispatch Details saved!", "success");
    } catch (error) {
      console.error('Error in handleSaveDispatch:', error);
      setInquiries(previousInquiries);
      showMessage("Failed to approve order.", "error");
    } finally {
      setDispatchLoading(false);
    }
  };

  const handleSaveNegotiation = async () => {
    if (!editingId) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'orders', editingId), {
        totalAmount: Number(negotiatedPrice),
        totalQuantity: Number(negotiatedQuantity),
        updatedAt: new Date()
      });
      setOpen(false);
      fetchInquiries();
      showMessage("Negotiation saved", "success");
    } catch (e) {
      console.error('Error updating inquiry:', e);
      showMessage('Error updating inquiry.', "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.8rem', md: '2.2rem' }, letterSpacing: 0.5, color: '#1A1A2E' }}>
            Inquiries
          </Typography>
          <Typography sx={{ fontWeight: 500, color: '#94A3B8', letterSpacing: 0.3, fontSize: '0.9rem', mt: 0.5 }}>
            Review and negotiate new requests
          </Typography>
        </Box>
      </Box>
      <Box sx={{ borderBottom: '1px solid #E2E8F0', mb: 4, mt: 2 }} />

      <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
        <Table sx={{ minWidth: 800 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 900 }}>ORDER ID</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>CUSTOMER NAME</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>ITEMS</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>TOTAL QTY</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>REQUESTED PRICE</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>DATE</TableCell>
              <TableCell align="right" sx={{  fontWeight: 900 , whiteSpace: 'nowrap' }}>ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {inquiries.map((row) => (
              <TableRow key={row.id} sx={{ '&:hover': { backgroundColor: '#FAFAFA' } }}>
                <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>ORD-{row.id.substring(0, 6).toUpperCase()}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  <Box>{row.customerName || 'Unknown Customer'}</Box>
                  {row.location && row.location.lat && (
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${row.location.lat},${row.location.lng}`} 
                      target="_blank" 
                      rel="noreferrer"
                      style={{ color: '#0055CC', fontWeight: 600, fontSize: '0.75rem', textDecoration: 'none', display: 'flex', alignItems: 'center', marginTop: '4px' }}
                    >
                      📍 View Map
                    </a>
                  )}
                </TableCell>
                <TableCell>
                  {row.items?.map((item: any, i: number) => (
                    <Box key={i} sx={{ fontSize: '0.8rem', color: '#666' }}>
                      {item.quantityKg || item.quantity} x {item.name || item.productName}
                    </Box>
                  ))}
                </TableCell>
                <TableCell>{row.totalQuantity || row.items?.reduce((sum: number, item: any) => sum + (item.quantityKg || item.quantity || 0), 0) || 0} units</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>₹{row.totalAmount?.toLocaleString()}</TableCell>
                <TableCell sx={{ color: '#666', fontSize: '0.85rem' }}>
                  {row.createdAt?.toDate().toLocaleDateString() || 'N/A'}
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  <Button 
                    variant="contained" 
                    color="success" 
                    size="small" 
                    startIcon={<CheckIcon />}
                    onClick={() => handleApproveConvert(row.id)}
                    sx={{ mr: 1, fontWeight: 600 }}
                  >
                    APPROVE
                  </Button>
                  <IconButton onClick={() => handleOpenEdit(row)} size="small" sx={{ mr: 1, color: '#64748B' }}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(row.id)} size="small" sx={{ color: '#DC2626' }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {inquiries.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 8, color: '#999', fontWeight: 600, letterSpacing: 1 }}>
                  NO PENDING INQUIRIES
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Edit Negotiation Dialog */}
      <Dialog open={open} onClose={() => !loading && setOpen(false)} maxWidth="xs" fullWidth>
        <Box sx={{ p: 3 }}>
          <Typography sx={{ fontWeight: 900, letterSpacing: 2, fontSize: '1rem', mb: 3 }}>
            NEGOTIATE INQUIRY
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField label="Negotiated Total Amount (₹)" type="number" fullWidth value={negotiatedPrice} onChange={(e) => setNegotiatedPrice(e.target.value)} />
            <TextField label="Negotiated Total Quantity" type="number" fullWidth value={negotiatedQuantity} onChange={(e) => setNegotiatedQuantity(e.target.value)} />
            <Typography sx={{ fontSize: '0.8rem', color: '#666', fontStyle: 'italic' }}>
              Update these values before approving the order if you have negotiated a different rate with the customer.
            </Typography>
          </Box>
        </Box>
        <DialogActions sx={{ borderTop: '1px solid #E2E8F0', p: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={loading} sx={{ fontWeight: 600, color: '#64748B' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveNegotiation} disabled={loading}>
            {loading ? <CircularProgress size={20} color="inherit" /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dispatch Dialog on Approval */}
      <DispatchDialog 
        open={!!approvingId}
        onClose={() => setApprovingId(null)}
        loading={dispatchLoading}
        onSave={handleSaveDispatch}
        onSkip={handleSkipDispatch}
        isApprovalMode={true}
        customer={{ 
          billingAddress: inquiries.find(i => i.id === approvingId)?.billingAddress,
          mailingAddresses: [inquiries.find(i => i.id === approvingId)?.shippingAddress].filter(Boolean),
          location: inquiries.find(i => i.id === approvingId)?.location
        }}
      />
    </Box>
  );
}
