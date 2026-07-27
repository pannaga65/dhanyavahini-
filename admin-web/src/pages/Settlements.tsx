import { useState, useEffect, useMemo } from 'react';
import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, Button, Dialog, DialogActions, TextField, CircularProgress, MenuItem, Select, FormControl, InputLabel, InputAdornment, Autocomplete, IconButton, Chip, Collapse } from '@mui/material';
import { collection, getDocs, getFirestore, addDoc, serverTimestamp, query, orderBy, deleteDoc, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import app from '../firebase';
import { useUI } from '../context/UIContext';

const db = getFirestore(app);

export default function Settlements() {
  const { showConfirm, showMessage } = useUI();
  const [settlements, setSettlements] = useState<any[]>([]);
  const [farmers, setFarmers] = useState<any[]>([]);
  const [openNewBill, setOpenNewBill] = useState(false);
  const [openPayment, setOpenPayment] = useState(false);
  const [selectedSettlementId, setSelectedSettlementId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const [billData, setBillData] = useState({
    farmerId: '',
    otherPayeeName: '',
    date: new Date().toISOString().split('T')[0],
    details: '',
    totalAmount: '',
    initialAdvance: '',
    paymentMode: 'Cash',
    referenceNumber: ''
  });

  const [paymentData, setPaymentData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    mode: 'Bank Transfer',
    reference: ''
  });

  const paymentModes = ['Bank Transfer', 'UPI', 'Cash', 'Cheque'];

  useEffect(() => { 
    fetchSettlements(); 
    fetchFarmers();
  }, []);

  const fetchSettlements = async () => {
    try {
      const q = query(collection(db, 'farmer_settlements'), orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      setSettlements(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      console.error('Error fetching settlements', e);
    }
  };

  const fetchFarmers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'farmers'));
      const activeFarmers = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((f: any) => f.isActive !== false);
      activeFarmers.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
      setFarmers(activeFarmers);
    } catch (e) {
      console.error('Error fetching farmers', e);
    }
  };

  const handleOpenNewBill = () => {
    setBillData({
      farmerId: '',
      otherPayeeName: '',
      date: new Date().toISOString().split('T')[0],
      details: '',
      totalAmount: '',
      initialAdvance: '',
      paymentMode: 'Bank Transfer',
      referenceNumber: ''
    });
    setOpenNewBill(true);
  };

  const handleOpenPayment = (id: string) => {
    setSelectedSettlementId(id);
    setPaymentData({
      amount: '',
      date: new Date().toISOString().split('T')[0],
      mode: 'Bank Transfer',
      reference: ''
    });
    setOpenPayment(true);
  };

  const handleDelete = async (id: string) => {
    showConfirm("Are you sure you want to delete this entire bill and its payments? This action cannot be undone.", async () => {
      try {
        await deleteDoc(doc(db, 'farmer_settlements', id));
        fetchSettlements();
        showMessage("Settlement record deleted", "success");
      } catch (e) {
        console.error("Error deleting", e);
        showMessage("Failed to delete record.", "error");
      }
    });
  };

  const handleSaveBill = async () => {
    if (!billData.farmerId) return showMessage('Please select a farmer.', 'error');
    if (billData.farmerId === 'OTHER' && !billData.otherPayeeName.trim()) return showMessage('Please enter payee name.', 'error');
    if (!billData.totalAmount || isNaN(Number(billData.totalAmount)) || Number(billData.totalAmount) <= 0) return showMessage('Enter a valid total amount.', 'error');

    setLoading(true);
    try {
      let finalFarmerName = 'Unknown Farmer';
      if (billData.farmerId === 'OTHER') {
        finalFarmerName = billData.otherPayeeName.trim();
      } else {
        const selectedFarmer = farmers.find(f => f.id === billData.farmerId);
        finalFarmerName = selectedFarmer?.name || 'Unknown Farmer';
      }

      const total = Number(billData.totalAmount);
      const advance = Number(billData.initialAdvance) || 0;
      const balance = total - advance;

      const payload: any = {
        farmerId: billData.farmerId,
        farmerName: finalFarmerName,
        date: billData.date,
        details: billData.details.trim(),
        totalAmount: total,
        amountPaid: advance,
        balance: balance,
        status: balance <= 0 ? 'Fully Paid' : 'Pending',
        payments: [],
        createdAt: serverTimestamp(),
      };

      if (advance > 0) {
        payload.payments.push({
          id: crypto.randomUUID(),
          date: billData.date,
          amount: advance,
          mode: billData.paymentMode,
          reference: billData.referenceNumber.trim()
        });
      }

      await addDoc(collection(db, 'farmer_settlements'), payload);
      setOpenNewBill(false);
      fetchSettlements();
      showMessage("New bill recorded successfully", "success");
    } catch (error: any) {
      console.error('Error saving bill:', error);
      showMessage('Error saving bill: ' + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePayment = async () => {
    if (!selectedSettlementId) return;
    if (!paymentData.amount || isNaN(Number(paymentData.amount)) || Number(paymentData.amount) <= 0) return showMessage('Enter a valid amount.', 'error');

    const settlement = settlements.find(s => s.id === selectedSettlementId);
    if (!settlement) return;

    setLoading(true);
    try {
      const paymentAmount = Number(paymentData.amount);
      const newPaid = settlement.amountPaid + paymentAmount;
      const newBalance = settlement.totalAmount - newPaid;
      const newStatus = newBalance <= 0 ? 'Fully Paid' : 'Pending';

      const newPaymentObj = {
        id: crypto.randomUUID(),
        date: paymentData.date,
        amount: paymentAmount,
        mode: paymentData.mode,
        reference: paymentData.reference.trim()
      };

      await updateDoc(doc(db, 'farmer_settlements', selectedSettlementId), {
        amountPaid: newPaid,
        balance: newBalance,
        status: newStatus,
        payments: arrayUnion(newPaymentObj)
      });

      setOpenPayment(false);
      fetchSettlements();
      showMessage("Payment added successfully", "success");
    } catch (error: any) {
      console.error('Error saving payment:', error);
      showMessage('Error saving payment: ' + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredSettlements = useMemo(() => {
    if (!searchQuery.trim()) return settlements;
    const lowerQuery = searchQuery.toLowerCase();
    return settlements.filter(s =>
      (s.farmerName || '').toLowerCase().includes(lowerQuery) ||
      (s.details || '').toLowerCase().includes(lowerQuery)
    );
  }, [settlements, searchQuery]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount || 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box>
          <Typography sx={{ fontWeight: 900, fontSize: { xs: '1.8rem', md: '2.2rem' }, letterSpacing: 3 }}>
            SETTLEMENTS
          </Typography>
          <Typography sx={{ fontWeight: 600, color: '#999', letterSpacing: 1.5, fontSize: '0.8rem', mt: 0.5 }}>
            MANAGE FARMER BILLS AND PAYMENTS
          </Typography>
        </Box>
      </Box>
      <Box sx={{ borderBottom: '2px solid #000', mb: 3, mt: 2 }} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <TextField
          placeholder="Search by Farmer, Details..."
          variant="outlined"
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ width: { xs: '100%', sm: 350 }, backgroundColor: '#FFF' }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }
          } as any}
        />
        <Button variant="contained" onClick={handleOpenNewBill} sx={{ fontWeight: 700 }}>
          + NEW BILL
        </Button>
      </Box>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell />
              <TableCell sx={{ fontWeight: 900 }}>DATE</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>FARMER</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>DETAILS</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>TOTAL BILL</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>PAID</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>BALANCE</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>STATUS</TableCell>
              <TableCell sx={{ fontWeight: 900 }} align="right">ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredSettlements.map((row) => (
              <React.Fragment key={row.id}>
                <TableRow sx={{ '&:hover': { backgroundColor: '#FAFAFA' } }}>
                  <TableCell>
                    <IconButton size="small" onClick={() => setExpandedRow(expandedRow === row.id ? null : row.id)}>
                      {expandedRow === row.id ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>
                    {new Date(row.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{row.farmerName}</TableCell>
                  <TableCell sx={{ fontSize: '0.85rem' }}>{row.details || '-'}</TableCell>
                  <TableCell sx={{ fontWeight: 900, color: '#000' }}>{formatCurrency(row.totalAmount)}</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'green' }}>{formatCurrency(row.amountPaid)}</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: row.balance > 0 ? 'red' : 'green' }}>
                    {formatCurrency(row.balance)}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={row.status.toUpperCase()} 
                      size="small" 
                      sx={{ 
                        fontWeight: 800, 
                        letterSpacing: 1, 
                        borderRadius: 1,
                        backgroundColor: row.status === 'Fully Paid' ? '#E8F5E9' : '#FFF3E0',
                        color: row.status === 'Fully Paid' ? '#2E7D32' : '#E65100'
                      }} 
                    />
                  </TableCell>
                  <TableCell align="right">
                    {row.balance > 0 && (
                      <Button size="small" variant="outlined" onClick={() => handleOpenPayment(row.id)} sx={{ mr: 1, fontWeight: 700 }}>
                        PAY
                      </Button>
                    )}
                    <IconButton onClick={() => handleDelete(row.id)} size="small" sx={{ color: 'red' }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={9}>
                    <Collapse in={expandedRow === row.id} timeout="auto" unmountOnExit>
                      <Box sx={{ margin: 2, p: 2, backgroundColor: '#F9F9F9', borderRadius: 1, border: '1px solid #EEE' }}>
                        <Typography sx={{ fontWeight: 800, mb: 2, fontSize: '0.85rem', letterSpacing: 1 }}>PAYMENT HISTORY</Typography>
                        {(!row.payments || row.payments.length === 0) ? (
                          <Typography sx={{ fontSize: '0.8rem', color: '#666' }}>No payments recorded yet.</Typography>
                        ) : (
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>DATE</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>AMOUNT</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>MODE</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>REFERENCE</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {row.payments.map((p: any) => (
                                <TableRow key={p.id}>
                                  <TableCell sx={{ fontSize: '0.8rem' }}>{new Date(p.date).toLocaleDateString('en-IN')}</TableCell>
                                  <TableCell sx={{ fontWeight: 700, color: 'green', fontSize: '0.8rem' }}>{formatCurrency(p.amount)}</TableCell>
                                  <TableCell sx={{ fontSize: '0.8rem' }}>{p.mode}</TableCell>
                                  <TableCell sx={{ fontSize: '0.8rem', color: '#666' }}>{p.reference || '-'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
            {filteredSettlements.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 8, color: '#999', fontWeight: 600, letterSpacing: 1 }}>
                  NO SETTLEMENTS FOUND
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add Bill Dialog */}
      <Dialog open={openNewBill} onClose={() => !loading && setOpenNewBill(false)} maxWidth="sm" fullWidth>
        <Box sx={{ p: 3 }}>
          <Typography sx={{ fontWeight: 900, letterSpacing: 2, fontSize: '1rem', mb: 3 }}>
            RECORD NEW PURCHASE BILL
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Autocomplete
                sx={{ flex: 2 }}
                options={[{ id: 'OTHER', name: 'OTHER (Not in list)' }, ...farmers]}
                getOptionLabel={(option) => option.id === 'OTHER' ? option.name : `${option.name} ${option.farmerId ? `[ID: ${option.farmerId}]` : ''} ${option.phoneNumber ? `(${option.phoneNumber})` : ''}`}
                value={billData.farmerId === 'OTHER' ? { id: 'OTHER', name: 'OTHER (Not in list)' } : farmers.find(f => f.id === billData.farmerId) || null}
                onChange={(e, newValue) => setBillData({ ...billData, farmerId: newValue ? newValue.id : '' })}
                renderInput={(params) => <TextField {...params} label="Select Farmer or OTHER" required />}
              />
              <TextField
                sx={{ flex: 1 }}
                label="Bill Date"
                type="date"
                required
                slotProps={{ inputLabel: { shrink: true } }}
                value={billData.date}
                onChange={(e) => setBillData({ ...billData, date: e.target.value })}
              />
            </Box>

            {billData.farmerId === 'OTHER' && (
              <TextField
                label="Payee Name"
                fullWidth
                required
                value={billData.otherPayeeName}
                onChange={(e) => setBillData({ ...billData, otherPayeeName: e.target.value })}
              />
            )}

            <TextField
              label="Purchase Details / Description"
              fullWidth
              placeholder="e.g. 100 Bags of Tomato"
              value={billData.details}
              onChange={(e) => setBillData({ ...billData, details: e.target.value })}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Total Bill Amount (₹)"
                fullWidth
                required
                type="number"
                value={billData.totalAmount}
                onChange={(e) => setBillData({ ...billData, totalAmount: e.target.value })}
              />
              <TextField
                label="Initial Advance Paid (₹)"
                fullWidth
                type="number"
                placeholder="Optional"
                value={billData.initialAdvance}
                onChange={(e) => setBillData({ ...billData, initialAdvance: e.target.value })}
              />
            </Box>

            {Number(billData.initialAdvance) > 0 && (
              <Box sx={{ display: 'flex', gap: 2, p: 2, backgroundColor: '#F5F5F5', borderRadius: 1 }}>
                <FormControl fullWidth required>
                  <InputLabel>Payment Mode</InputLabel>
                  <Select
                    value={billData.paymentMode}
                    label="Payment Mode"
                    onChange={(e) => setBillData({ ...billData, paymentMode: e.target.value as string })}
                  >
                    {paymentModes.map(mode => (
                      <MenuItem key={mode} value={mode}>{mode}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Reference No. (Optional)"
                  fullWidth
                  placeholder="UPI Ref / Cheque No"
                  value={billData.referenceNumber}
                  onChange={(e) => setBillData({ ...billData, referenceNumber: e.target.value })}
                />
              </Box>
            )}

          </Box>
        </Box>
        <DialogActions sx={{ borderTop: '2px solid #000', p: 2 }}>
          <Button onClick={() => setOpenNewBill(false)} disabled={loading} sx={{ fontWeight: 700, color: '#000' }}>CANCEL</Button>
          <Button variant="contained" onClick={handleSaveBill} disabled={loading} sx={{ backgroundColor: '#000', color: '#FFF', fontWeight: 700, borderRadius: 0 }}>
            {loading ? <CircularProgress size={20} color="inherit" /> : 'SAVE BILL'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Payment Dialog */}
      <Dialog open={openPayment} onClose={() => !loading && setOpenPayment(false)} maxWidth="sm" fullWidth>
        <Box sx={{ p: 3 }}>
          <Typography sx={{ fontWeight: 900, letterSpacing: 2, fontSize: '1rem', mb: 3 }}>
            RECORD PAYMENT
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Payment Amount (₹)"
                fullWidth
                required
                type="number"
                value={paymentData.amount}
                onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
              />
              <TextField
                label="Payment Date"
                type="date"
                fullWidth
                required
                slotProps={{ inputLabel: { shrink: true } }}
                value={paymentData.date}
                onChange={(e) => setPaymentData({ ...paymentData, date: e.target.value })}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth required>
                <InputLabel>Payment Mode</InputLabel>
                <Select
                  value={paymentData.mode}
                  label="Payment Mode"
                  onChange={(e) => setPaymentData({ ...paymentData, mode: e.target.value as string })}
                >
                  {paymentModes.map(mode => (
                    <MenuItem key={mode} value={mode}>{mode}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Reference No. (Optional)"
                fullWidth
                placeholder="UPI Ref / Cheque No"
                value={paymentData.reference}
                onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
              />
            </Box>
          </Box>
        </Box>
        <DialogActions sx={{ borderTop: '2px solid #000', p: 2 }}>
          <Button onClick={() => setOpenPayment(false)} disabled={loading} sx={{ fontWeight: 700, color: '#000' }}>CANCEL</Button>
          <Button variant="contained" onClick={handleSavePayment} disabled={loading} sx={{ backgroundColor: '#000', color: '#FFF', fontWeight: 700, borderRadius: 0 }}>
            {loading ? <CircularProgress size={20} color="inherit" /> : 'SAVE PAYMENT'}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
