import { useState, useEffect } from 'react';
import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, Button, Dialog, DialogActions, TextField, Chip } from '@mui/material';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../firebase';
import { getFirestore } from 'firebase/firestore';

const db = getFirestore(app);

interface BidSession {
  id: string;
  productName: string;
  basePrice: number;
  status: string;
}

interface Tender {
  id: string;
  retailerId: string;
  proposedPrice: number;
  volumeRequested: number;
  status: string;
}

export default function Bids() {
  const [bids, setBids] = useState<BidSession[]>([]);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [selectedBid, setSelectedBid] = useState<BidSession | null>(null);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ productName: '', basePrice: '', durationMinutes: '60' });
  const functions = getFunctions(app);

  useEffect(() => { fetchBids(); }, []);

  const fetchBids = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'bids'));
      setBids(querySnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as BidSession[]);
    } catch (e) {
      console.log('Error fetching bids', e);
    }
  };

  const handleCreateBid = async () => {
    try {
      await addDoc(collection(db, 'bids'), {
        productName: formData.productName,
        basePrice: Number(formData.basePrice),
        durationMinutes: Number(formData.durationMinutes),
        status: 'Active',
        createdAt: serverTimestamp(),
      });
      setOpen(false);
      setFormData({ productName: '', basePrice: '', durationMinutes: '60' });
      fetchBids();
    } catch (error) {
      console.error('Error creating bid', error);
    }
  };

  const handleViewTenders = async (bid: BidSession) => {
    setSelectedBid(bid);
    try {
      const querySnapshot = await getDocs(collection(db, `bids/${bid.id}/tenders`));
      setTenders(querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Tender)));
    } catch (e) {
      console.log('Error fetching tenders', e);
    }
  };

  const handleApproveTender = async (tenderId: string) => {
    try {
      const approveFn = httpsCallable(functions, 'approveTender');
      await approveFn({ bidId: selectedBid?.id, tenderId });
      alert('Tender Approved! Order has been created automatically.');
      setSelectedBid(null);
      fetchBids();
    } catch (error: any) {
      console.error(error);
      alert('Failed to approve tender: ' + error.message);
    }
  };

  return (
    <Box>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box>
          <Typography sx={{ fontWeight: 900, fontSize: { xs: '1.8rem', md: '2.2rem' }, letterSpacing: 3 }}>
            TENDERS
          </Typography>
          <Typography sx={{ fontWeight: 600, color: '#999', letterSpacing: 1.5, fontSize: '0.8rem', mt: 0.5 }}>
            MANAGE ACTIVE SESSIONS
          </Typography>
        </Box>
        <Button variant="contained" onClick={() => setOpen(true)} sx={{ mt: 1 }}>
          + CREATE SESSION
        </Button>
      </Box>
      <Box sx={{ borderBottom: '2px solid #000', mb: 4, mt: 2 }} />

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>PRODUCT</TableCell>
              <TableCell>REFERENCE PRICE</TableCell>
              <TableCell>STATUS</TableCell>
              <TableCell>ACTION</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {bids.map((row) => (
              <TableRow key={row.id} sx={{ '&:hover': { backgroundColor: '#FAFAFA' } }}>
                <TableCell sx={{ fontWeight: 700 }}>{row.productName}</TableCell>
                <TableCell>₹{row.basePrice.toLocaleString()}</TableCell>
                <TableCell>
                  <Chip
                    label={row.status}
                    size="small"
                    sx={{
                      backgroundColor: row.status === 'Active' ? '#000' : '#E0E0E0',
                      color: row.status === 'Active' ? '#FFF' : '#000',
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Button variant="outlined" size="small" onClick={() => handleViewTenders(row)}>
                    View Tenders
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {bids.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 8, color: '#999', fontWeight: 600, letterSpacing: 1 }}>
                  NO TENDER SESSIONS YET
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Tender Review Dialog */}
      <Dialog open={!!selectedBid} onClose={() => setSelectedBid(null)} maxWidth="md" fullWidth>
        <Box sx={{ p: 3 }}>
          <Typography sx={{ fontWeight: 900, letterSpacing: 2, fontSize: '1rem', mb: 1 }}>
            TENDERS FOR: {selectedBid?.productName}
          </Typography>
          <Typography sx={{ fontWeight: 600, color: '#999', letterSpacing: 1, fontSize: '0.75rem', mb: 3 }}>
            REFERENCE PRICE: ₹{selectedBid?.basePrice.toLocaleString()}
          </Typography>

          {tenders.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography sx={{ color: '#999', fontWeight: 600, letterSpacing: 1 }}>NO TENDERS SUBMITTED YET</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>RETAILER</TableCell>
                    <TableCell>PROPOSED PRICE</TableCell>
                    <TableCell>VOLUME</TableCell>
                    <TableCell>ACTION</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tenders.map((tender) => (
                    <TableRow key={tender.id}>
                      <TableCell>{tender.retailerId}</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: tender.proposedPrice >= (selectedBid?.basePrice || 0) ? '#000' : '#C00' }}>
                        ₹{tender.proposedPrice.toLocaleString()}
                      </TableCell>
                      <TableCell>{tender.volumeRequested} Qtl</TableCell>
                      <TableCell>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleApproveTender(tender.id)}
                          disabled={selectedBid?.status === 'Completed' || tender.status === 'Approved'}
                        >
                          {tender.status === 'Approved' ? '✓ WINNER' : 'APPROVE'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
        <DialogActions sx={{ borderTop: '2px solid #000', p: 2 }}>
          <Button onClick={() => setSelectedBid(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Create Bid Session Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <Box sx={{ p: 3 }}>
          <Typography sx={{ fontWeight: 900, letterSpacing: 2, fontSize: '1rem', mb: 3 }}>
            CREATE NEW SESSION
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField label="Product Name" fullWidth value={formData.productName} onChange={e => setFormData({ ...formData, productName: e.target.value })} />
            <TextField label="Base Price (₹ per Quintal)" type="number" fullWidth value={formData.basePrice} onChange={e => setFormData({ ...formData, basePrice: e.target.value })} />
            <TextField label="Duration (Minutes)" type="number" fullWidth value={formData.durationMinutes} onChange={e => setFormData({ ...formData, durationMinutes: e.target.value })} />
          </Box>
        </Box>
        <DialogActions sx={{ borderTop: '2px solid #000', p: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateBid}>START SESSION</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
