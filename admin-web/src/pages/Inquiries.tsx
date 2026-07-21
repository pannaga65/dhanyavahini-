import { useState, useEffect } from 'react';
import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, Button, Dialog, DialogActions, TextField, CircularProgress, IconButton } from '@mui/material';
import { collection, getDocs, query, where, getFirestore, updateDoc, doc, deleteDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import app from '../firebase';
import { useUI } from '../context/UIContext';
import DispatchDialog, { type DispatchData } from '../components/DispatchDialog';

const db = getFirestore(app);

export default function Inquiries() {
  const { showConfirm, showMessage } = useUI();
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [customersMap, setCustomersMap] = useState<Record<string, any>>({});
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
      // Fetch customers for fallback
      const custSnap = await getDocs(collection(db, 'users'));
      const cmap: Record<string, any> = {};
      custSnap.forEach(d => { cmap[d.id] = d.data(); });
      setCustomersMap(cmap);

      setInquiries(data);
    } catch (e) {
      console.log('Error fetching inquiries', e);
    }
  };

  const handleDelete = async (id: string) => {
    showConfirm("Are you sure you want to completely reject and delete this inquiry?", async () => {
      try {
        await deleteDoc(doc(db, 'orders', id));
        fetchInquiries();
        showMessage("Inquiry deleted successfully", "success");
      } catch (e) {
        console.error("Error deleting", e);
        showMessage("Failed to delete.", "error");
      }
    });
  };

  const handleOpenEdit = (inquiry: any) => {
    setEditingId(inquiry.id);
    setNegotiatedPrice(inquiry.totalAmount?.toString() || '');
    setNegotiatedQuantity(inquiry.totalQuantity?.toString() || '');
    setOpen(true);
  };

  const handleApproveConvert = (inquiryId: string) => {
    setApprovingId(inquiryId);
  };

  const handleSkipDispatch = async () => {
    if (!approvingId) return;
    setDispatchLoading(true);
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

        transaction.update(doc(db, 'orders', approvingId), {
          status: 'Confirmed',
          paymentStatus: 'Pending',
          orderNo: orderNo,
          updatedAt: serverTimestamp()
        });
      });
      fetchInquiries();
      showMessage("Inquiry converted to Order", "success");
      setApprovingId(null);
    } catch (e) {
      console.error("Error approving", e);
      showMessage("Failed to approve inquiry.", "error");
    } finally {
      setDispatchLoading(false);
    }
  };

  const handleSaveDispatch = async (data: DispatchData) => {
    if (!approvingId) return;
    setDispatchLoading(true);
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
        
        const orderRef = doc(db, 'orders', approvingId);
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
      fetchInquiries();
      showMessage("Order confirmed and Dispatch Details saved!", "success");
      setApprovingId(null);
    } catch (e) {
      console.error("Error saving dispatch", e);
      showMessage("Failed to save dispatch details.", "error");
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
          <Typography sx={{ fontWeight: 900, fontSize: { xs: '1.8rem', md: '2.2rem' }, letterSpacing: 3 }}>
            INQUIRIES
          </Typography>
          <Typography sx={{ fontWeight: 600, color: '#999', letterSpacing: 1.5, fontSize: '0.8rem', mt: 0.5 }}>
            REVIEW AND NEGOTIATE NEW REQUESTS
          </Typography>
        </Box>
      </Box>
      <Box sx={{ borderBottom: '2px solid #000', mb: 4, mt: 2 }} />

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 900 }}>ORDER ID</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>CUSTOMER NAME</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>ITEMS</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>TOTAL QTY</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>REQUESTED PRICE</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>DATE</TableCell>
              <TableCell sx={{ fontWeight: 900 }} align="right">ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {inquiries.map((row) => (
              <TableRow key={row.id} sx={{ '&:hover': { backgroundColor: '#FAFAFA' } }}>
                <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>ORD-{row.id.substring(0, 6).toUpperCase()}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>
                  {row.customerName || customersMap[row.customerId]?.displayName || customersMap[row.customerId]?.tradeName || 'Unknown Customer'}
                </TableCell>
                <TableCell>
                  {row.items?.map((item: any, i: number) => (
                    <Box key={i} sx={{ fontSize: '0.8rem', color: '#666' }}>
                      {item.quantity} x {item.productName}
                    </Box>
                  ))}
                </TableCell>
                <TableCell>{row.totalQuantity} units</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>₹{row.totalAmount?.toLocaleString()}</TableCell>
                <TableCell sx={{ color: '#666', fontSize: '0.85rem' }}>
                  {row.createdAt?.toDate().toLocaleDateString() || 'N/A'}
                </TableCell>
                <TableCell align="right">
                  <Button 
                    variant="contained" 
                    color="success" 
                    size="small" 
                    startIcon={<CheckIcon />}
                    onClick={() => handleApproveConvert(row.id)}
                    sx={{ mr: 1, fontWeight: 700, borderRadius: 0 }}
                  >
                    APPROVE
                  </Button>
                  <IconButton onClick={() => handleOpenEdit(row)} size="small" sx={{ mr: 1, color: '#000' }}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(row.id)} size="small" sx={{ color: 'red' }}>
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
        <DialogActions sx={{ borderTop: '2px solid #000', p: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={loading} sx={{ fontWeight: 700, color: '#000' }}>CANCEL</Button>
          <Button variant="contained" onClick={handleSaveNegotiation} disabled={loading} sx={{ backgroundColor: '#000', color: '#FFF', fontWeight: 700, borderRadius: 0 }}>
            {loading ? <CircularProgress size={20} color="inherit" /> : 'SAVE CHANGES'}
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
        customer={approvingId ? customersMap[inquiries.find(i => i.id === approvingId)?.customerId || ''] : null}
      />
    </Box>
  );
}
