import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, GlobalStyles, Paper } from '@mui/material';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import app from '../firebase';

const db = getFirestore(app);

export default function PrintBill() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [bill, setBill] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        // Fetch Order
        const billSnap = await getDoc(doc(db, 'farmer_settlements', id));
        if (billSnap.exists()) {
          setBill(billSnap.data());
        }

        // Fetch Business Profile
        const profileSnap = await getDoc(doc(db, 'settings', 'businessProfile'));
        if (profileSnap.exists()) {
          setProfile(profileSnap.data());
        }
      } catch (error) {
        console.error("Error fetching data for print", error);
      }
      setLoading(false);
    };

    fetchData();
  }, [id]);

  useEffect(() => {
    if (!loading && bill) {
      // Small delay to ensure images/fonts load before printing
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [loading, bill]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!bill) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h5" color="error">Order not found.</Typography>
      </Box>
    );
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount || 0);

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <Box sx={{ 
      p: { xs: 2, sm: 4 }, 
      minHeight: '100vh',
      backgroundColor: '#F5F5F5',
      '@media print': {
        p: 0,
        backgroundColor: '#FFF',
      }
    }}>
      <GlobalStyles styles={{
        '@media print': {
          '@page': {
            size: 'A4',
            margin: '10mm',
          },
          'body': {
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
          }
        }
      }} />

      <Paper elevation={3} sx={{
        maxWidth: '800px',
        margin: '0 auto',
        backgroundColor: '#FFF',
        p: { xs: 3, sm: 5 },
        borderRadius: { xs: 0, sm: 2 },
        '@media print': {
          boxShadow: 'none',
          maxWidth: '100%',
          p: 2,
          m: 0,
          borderRadius: 0,
        }
      }}>
      
      {/* ── HEADER ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, borderBottom: '2px solid #000', pb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {profile?.logoUrl && (
            <img src={profile.logoUrl} alt="Logo" style={{ width: 80, height: 80, objectFit: 'contain' }} />
          )}
          <Box>
            <Typography sx={{ fontWeight: 900, fontSize: '1.5rem', textTransform: 'uppercase' }}>
              {profile?.companyName || 'COMPANY NAME'}
            </Typography>
            <Typography sx={{ fontSize: '0.85rem', color: '#333' }}>
              {profile?.addressLine1} {profile?.addressLine2 ? `, ${profile.addressLine2}` : ''}
            </Typography>
            <Typography sx={{ fontSize: '0.85rem', color: '#333' }}>
              {profile?.city}, {profile?.state} - {profile?.pincode}
            </Typography>
            {profile?.gstin && (
              <Typography sx={{ fontSize: '0.85rem', color: '#333', fontWeight: 600 }}>
                GSTIN: {profile.gstin}
              </Typography>
            )}
          </Box>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography sx={{ fontWeight: 900, fontSize: '1.8rem', letterSpacing: 1 }}>INVOICE</Typography>
          <Typography sx={{ fontSize: '0.85rem', fontWeight: 700 }}>PROCUREMENT BILL</Typography>
        </Box>
      </Box>

      {/* ── META INFO ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
        <Box>
          <Typography sx={{ fontSize: '0.75rem', color: '#666', fontWeight: 700, mb: 0.5 }}>ISSUED TO (FARMER)</Typography>
          <Typography sx={{ fontWeight: 800, fontSize: '1.1rem', textTransform: 'uppercase' }}>{bill.farmerName}</Typography>
          {bill.farmerId && bill.farmerId !== 'OTHER' && (
            <Typography sx={{ fontSize: '0.85rem', color: '#333' }}>Farmer ID: {bill.farmerId}</Typography>
          )}
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mb: 0.5 }}>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#666' }}>Order No:</Typography>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 900 }}>{bill.orderId ? `#${bill.orderId}` : '-'}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#666' }}>Date:</Typography>
            <Typography sx={{ fontSize: '0.85rem', fontWeight: 900 }}>{formatDate(bill.date)}</Typography>
          </Box>
        </Box>
      </Box>

      {/* ── PROCUREMENT DETAILS ── */}
      <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', mb: 1, backgroundColor: '#F0F0F0', p: 1 }}>ORDER DETAILS</Typography>
      <TableContainer sx={{ mb: 4, border: '1px solid #E0E0E0' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#FAFAFA' }}>
              <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>ITEM / DESCRIPTION</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }} align="right">GROSS WT.</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }} align="right">WASTAGE</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }} align="right">NET WT.</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }} align="right">RATE/KG</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }} align="right">TOTAL</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
                {bill.productName ? `${bill.productName} (${bill.categoryName})` : (bill.categoryName || bill.details || '-')}
              </TableCell>
              <TableCell align="right" sx={{ fontSize: '0.85rem' }}>{bill.grossWeight ? `${bill.grossWeight} kg` : '-'}</TableCell>
              <TableCell align="right" sx={{ fontSize: '0.85rem' }}>{bill.wastagePercent ? `${bill.wastagePercent}%` : '-'}</TableCell>
              <TableCell align="right" sx={{ fontSize: '0.85rem', fontWeight: 700 }}>{bill.netWeight ? `${bill.netWeight.toFixed(2)} kg` : '-'}</TableCell>
              <TableCell align="right" sx={{ fontSize: '0.85rem' }}>{bill.ratePerKg ? formatCurrency(bill.ratePerKg) : '-'}</TableCell>
              <TableCell align="right" sx={{ fontSize: '0.9rem', fontWeight: 900 }}>{formatCurrency(bill.totalAmount)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── PAYMENTS & ADVANCES ── */}
      {bill.payments && bill.payments.length > 0 && (
        <>
          <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', mb: 1, backgroundColor: '#F0F0F0', p: 1 }}>PAYMENT HISTORY & ADVANCES</Typography>
          <TableContainer sx={{ mb: 4, border: '1px solid #E0E0E0' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#FAFAFA' }}>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>DATE</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>MODE</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>REFERENCE</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>NOTES</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }} align="right">AMOUNT</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bill.payments.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell sx={{ fontSize: '0.85rem' }}>{formatDate(p.date)}</TableCell>
                    <TableCell sx={{ fontSize: '0.85rem' }}>{p.mode}</TableCell>
                    <TableCell sx={{ fontSize: '0.85rem' }}>{p.reference || '-'}</TableCell>
                    <TableCell sx={{ fontSize: '0.85rem' }}>{p.notes || '-'}</TableCell>
                    <TableCell align="right" sx={{ fontSize: '0.85rem', fontWeight: 700 }}>{formatCurrency(p.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* ── SUMMARY SECTION ── */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 4 }}>
        <Box sx={{ width: '300px' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>Gross Total:</Typography>
            <Typography sx={{ fontWeight: 900, fontSize: '0.9rem' }}>{formatCurrency(bill.totalAmount)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, color: 'green' }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>Total Paid:</Typography>
            <Typography sx={{ fontWeight: 900, fontSize: '0.9rem' }}>{formatCurrency(bill.amountPaid)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, pt: 1, borderTop: '2px solid #000' }}>
            <Typography sx={{ fontWeight: 900, fontSize: '1.1rem' }}>BALANCE DUE:</Typography>
            <Typography sx={{ fontWeight: 900, fontSize: '1.1rem', color: bill.balance > 0 ? 'red' : 'green' }}>
              {formatCurrency(bill.balance)}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* ── FOOTER NOTES ── */}
      <Box sx={{ borderTop: '1px dashed #CCC', pt: 3, display: 'flex', justifyContent: 'space-between' }}>
        <Box sx={{ maxWidth: '60%' }}>
          {bill.notes && (
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 800, color: '#666' }}>ORDER NOTES:</Typography>
              <Typography sx={{ fontSize: '0.85rem' }}>{bill.notes}</Typography>
            </Box>
          )}
          <Typography sx={{ fontSize: '0.75rem', color: '#666' }}>
            Printed on: {new Date().toLocaleString('en-IN')}
          </Typography>
        </Box>
        
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Box sx={{ borderBottom: '1px solid #000', width: '150px', mb: 0.5 }} />
          <Typography sx={{ fontSize: '0.8rem', fontWeight: 700 }}>Authorized Signature</Typography>
        </Box>
      </Box>

      </Paper>
    </Box>
  );
}
