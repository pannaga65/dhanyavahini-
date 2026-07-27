import React, { useState, useEffect, useMemo } from 'react';
import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, Button, Dialog, DialogActions, TextField, CircularProgress, MenuItem, Select, FormControl, InputLabel, InputAdornment, Autocomplete, IconButton, Chip, Collapse, DialogTitle, DialogContent } from '@mui/material';
import { collection, getDocs, getFirestore, addDoc, serverTimestamp, query, orderBy, deleteDoc, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import app from '../firebase';
import { useUI } from '../context/UIContext';

const db = getFirestore(app);

interface FarmerGroup {
  farmerId: string;
  farmerName: string;
  orders: any[];
  totalBill: number;
  totalPaid: number;
  totalBalance: number;
  status: string;
}

export default function Procurement() {
  const { showConfirm, showMessage } = useUI();
  const [settlements, setSettlements] = useState<any[]>([]);
  const [farmers, setFarmers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  // Dialog States
  const [openNewBill, setOpenNewBill] = useState(false);
  const [openPayment, setOpenPayment] = useState(false);
  const [selectedFarmerIdForPopup, setSelectedFarmerIdForPopup] = useState<string | null>(null);

  // Edit / Action States
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [selectedSettlementId, setSelectedSettlementId] = useState<string | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [billData, setBillData] = useState({
    farmerId: '',
    otherPayeeName: '',
    date: new Date().toISOString().split('T')[0],
    categoryId: '',
    productId: '',
    grossWeight: '',
    wastagePercent: '',
    ratePerKg: '',
    initialAdvance: '',
    paymentMode: 'Cash',
    referenceNumber: '',
    // For legacy edits
    details: '',
    totalAmount: '',
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
    fetchCategoriesAndProducts();
  }, []);

  const fetchSettlements = async () => {
    try {
      const q = query(collection(db, 'farmer_settlements'), orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      setSettlements(querySnapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('Error fetching settlements', e);
    }
  };

  const fetchFarmers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'farmers'));
      const activeFarmers = querySnapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((f: any) => f.isActive !== false);
      activeFarmers.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
      setFarmers(activeFarmers);
    } catch (e) {
      console.error('Error fetching farmers', e);
    }
  };

  const fetchCategoriesAndProducts = async () => {
    try {
      const catSnap = await getDocs(collection(db, 'categories'));
      setCategories(catSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      const prodSnap = await getDocs(collection(db, 'products'));
      setProducts(prodSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('Error fetching catalogs', e);
    }
  };

  // Group all settlements by farmer
  const farmerGroups: FarmerGroup[] = useMemo(() => {
    const groupMap = new Map<string, FarmerGroup>();

    for (const s of settlements) {
      const key = s.farmerId || s.farmerName;
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          farmerId: s.farmerId,
          farmerName: s.farmerName,
          orders: [],
          totalBill: 0,
          totalPaid: 0,
          totalBalance: 0,
          status: 'Fully Paid'
        });
      }
      const group = groupMap.get(key)!;
      group.orders.push(s);
      group.totalBill += s.totalAmount || 0;
      group.totalPaid += s.amountPaid || 0;
      group.totalBalance += s.balance || 0;
      if (s.balance > 0) group.status = 'Pending';
    }

    const groups = Array.from(groupMap.values());
    groups.sort((a, b) => {
      // Pending farmers first, then alphabetical
      if (a.status !== b.status) return a.status === 'Pending' ? -1 : 1;
      return a.farmerName.localeCompare(b.farmerName);
    });
    return groups;
  }, [settlements]);

  // Filter groups by search
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return farmerGroups;
    const lowerQuery = searchQuery.toLowerCase();
    return farmerGroups.filter(g =>
      g.farmerName.toLowerCase().includes(lowerQuery) ||
      g.orders.some(o => (o.details || '').toLowerCase().includes(lowerQuery))
    );
  }, [farmerGroups, searchQuery]);

  const selectedFarmerGroup = useMemo(() => {
    if (!selectedFarmerIdForPopup) return null;
    return farmerGroups.find(g => g.farmerId === selectedFarmerIdForPopup) || null;
  }, [selectedFarmerIdForPopup, farmerGroups]);


  const handleOpenNewBill = (prefillFarmerId = '') => {
    setEditingBillId(null);
    setBillData({
      farmerId: prefillFarmerId,
      otherPayeeName: '',
      date: new Date().toISOString().split('T')[0],
      categoryId: '',
      productId: '',
      grossWeight: '',
      wastagePercent: '',
      ratePerKg: '',
      initialAdvance: '',
      paymentMode: 'Bank Transfer',
      referenceNumber: '',
      details: '',
      totalAmount: '',
    });
    setOpenNewBill(true);
  };

  const handleOpenEditBill = (row: any) => {
    setEditingBillId(row.id);
    setBillData({
      farmerId: row.farmerId,
      otherPayeeName: row.farmerId === 'OTHER' ? row.farmerName : '',
      date: row.date,
      categoryId: row.categoryId || '',
      productId: row.productId || '',
      grossWeight: row.grossWeight ? row.grossWeight.toString() : '',
      wastagePercent: row.wastagePercent ? row.wastagePercent.toString() : '',
      ratePerKg: row.ratePerKg ? row.ratePerKg.toString() : '',
      initialAdvance: '',
      paymentMode: 'Bank Transfer',
      referenceNumber: '',
      details: row.details || '',
      totalAmount: row.totalAmount.toString(),
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
    showConfirm("Are you sure you want to delete this order and its payments? This action cannot be undone.", async () => {
      try {
        await deleteDoc(doc(db, 'farmer_settlements', id));
        fetchSettlements();
        showMessage("Order deleted", "success");
      } catch (e) {
        console.error("Error deleting", e);
        showMessage("Failed to delete.", "error");
      }
    });
  };

  const netWeightCalculated = useMemo(() => {
    const gross = Number(billData.grossWeight) || 0;
    const wastage = Number(billData.wastagePercent) || 0;
    return gross - (gross * wastage / 100);
  }, [billData.grossWeight, billData.wastagePercent]);

  const totalAmountCalculated = useMemo(() => {
    // If it's a legacy edit with no new fields, use the old totalAmount
    if (editingBillId && !billData.productId && billData.totalAmount) {
      return Number(billData.totalAmount) || 0;
    }
    const rate = Number(billData.ratePerKg) || 0;
    return netWeightCalculated * rate;
  }, [netWeightCalculated, billData.ratePerKg, editingBillId, billData.productId, billData.totalAmount]);

  const handleSaveBill = async () => {
    if (!billData.farmerId) return showMessage('Please select a farmer.', 'error');
    if (billData.farmerId === 'OTHER' && !billData.otherPayeeName.trim()) return showMessage('Please enter payee name.', 'error');
    
    // Require new fields unless it's a legacy edit
    if (!editingBillId || billData.categoryId) {
      if (!billData.categoryId) return showMessage('Please select a category.', 'error');
      if (netWeightCalculated <= 0) return showMessage('Net weight must be greater than 0.', 'error');
      if (!billData.ratePerKg || Number(billData.ratePerKg) <= 0) return showMessage('Enter a valid rate per kg.', 'error');
    } else {
      if (!billData.totalAmount || isNaN(Number(billData.totalAmount)) || Number(billData.totalAmount) <= 0) return showMessage('Enter a valid total amount.', 'error');
    }

    setLoading(true);
    try {
      let finalFarmerName = 'Unknown Farmer';
      if (billData.farmerId === 'OTHER') {
        finalFarmerName = billData.otherPayeeName.trim();
      } else {
        const selectedFarmer = farmers.find(f => f.id === billData.farmerId);
        finalFarmerName = selectedFarmer?.name || 'Unknown Farmer';
      }

      const total = totalAmountCalculated;
      const selectedCategory = categories.find(c => c.id === billData.categoryId);
      const categoryName = selectedCategory?.name || '';
      const productName = billData.productId ? (products.find(p => p.id === billData.productId)?.name || '') : '';
      
      let details = billData.details;
      if (billData.categoryId) {
        const label = productName || categoryName;
        details = `${netWeightCalculated.toFixed(2)} kg of ${label}`;
      }

      if (editingBillId) {
        const existingBill = settlements.find(s => s.id === editingBillId);
        if (!existingBill) throw new Error("Bill not found.");
        const balance = total - existingBill.amountPaid;
        
        const updatePayload: any = {
          farmerId: billData.farmerId,
          farmerName: finalFarmerName,
          date: billData.date,
          details: details.trim(),
          totalAmount: total,
          balance: balance,
          status: balance <= 0 ? 'Fully Paid' : 'Pending',
        };
        
        if (billData.productId) {
          updatePayload.categoryId = billData.categoryId;
          updatePayload.categoryName = categoryName;
          updatePayload.productId = billData.productId;
          updatePayload.productName = productName;
          updatePayload.grossWeight = Number(billData.grossWeight);
          updatePayload.wastagePercent = Number(billData.wastagePercent);
          updatePayload.netWeight = netWeightCalculated;
          updatePayload.ratePerKg = Number(billData.ratePerKg);
        }

        await updateDoc(doc(db, 'farmer_settlements', editingBillId), updatePayload);
        showMessage("Bill updated successfully", "success");
      } else {
        const advance = Number(billData.initialAdvance) || 0;
        const balance = total - advance;
        const payload: any = {
          farmerId: billData.farmerId,
          farmerName: finalFarmerName,
          date: billData.date,
          details: details.trim(),
          categoryId: billData.categoryId,
          categoryName: categoryName,
          productId: billData.productId,
          productName: productName,
          grossWeight: Number(billData.grossWeight),
          wastagePercent: Number(billData.wastagePercent),
          netWeight: netWeightCalculated,
          ratePerKg: Number(billData.ratePerKg),
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
        showMessage("New order recorded successfully", "success");
        
        if (!selectedFarmerIdForPopup && billData.farmerId !== 'OTHER') {
          setSelectedFarmerIdForPopup(billData.farmerId);
        }
      }

      setOpenNewBill(false);
      fetchSettlements();
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

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount || 0);

  // Close the popup if there are no more orders for this farmer
  useEffect(() => {
    if (selectedFarmerIdForPopup && selectedFarmerGroup?.orders.length === 0) {
      setSelectedFarmerIdForPopup(null);
    }
  }, [selectedFarmerGroup, selectedFarmerIdForPopup]);


  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box>
          <Typography sx={{ fontWeight: 900, fontSize: { xs: '1.8rem', md: '2.2rem' }, letterSpacing: 3 }}>
            PROCUREMENT
          </Typography>
          <Typography sx={{ fontWeight: 600, color: '#999', letterSpacing: 1.5, fontSize: '0.8rem', mt: 0.5 }}>
            MANAGE FARMER BILLS AND PAYMENTS
          </Typography>
        </Box>
      </Box>
      <Box sx={{ borderBottom: '2px solid #000', mb: 3, mt: 2 }} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <TextField
          placeholder="Search Farmers..."
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
        <Button variant="contained" onClick={() => handleOpenNewBill()} sx={{ fontWeight: 700 }}>
          + NEW ORDER
        </Button>
      </Box>

      {/* ── MAIN VIEW: FARMERS LIST ── */}
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 900 }}>FARMER</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>ORDERS</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>TOTAL BILL</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>TOTAL PAID</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>BALANCE</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>STATUS</TableCell>
              <TableCell sx={{ fontWeight: 900 }} align="right">ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredGroups.map((group) => (
              <TableRow
                key={group.farmerId}
                sx={{
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: '#F5F5F5' },
                }}
                onClick={() => setSelectedFarmerIdForPopup(group.farmerId)}
              >
                <TableCell sx={{ fontWeight: 900, fontSize: '0.95rem' }}>{group.farmerName}</TableCell>
                <TableCell>
                  <Chip label={`${group.orders.length} ORDER${group.orders.length > 1 ? 'S' : ''}`} size="small" sx={{ fontWeight: 700, letterSpacing: 0.5, borderRadius: 1 }} />
                </TableCell>
                <TableCell sx={{ fontWeight: 900 }}>{formatCurrency(group.totalBill)}</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'green' }}>{formatCurrency(group.totalPaid)}</TableCell>
                <TableCell sx={{ fontWeight: 900, color: group.totalBalance > 0 ? 'red' : 'green' }}>
                  {formatCurrency(group.totalBalance)}
                </TableCell>
                <TableCell>
                  <Chip
                    label={group.status.toUpperCase()}
                    size="small"
                    sx={{
                      fontWeight: 800,
                      letterSpacing: 1,
                      borderRadius: 1,
                      backgroundColor: group.status === 'Fully Paid' ? '#E8F5E9' : '#FFF3E0',
                      color: group.status === 'Fully Paid' ? '#2E7D32' : '#E65100'
                    }}
                  />
                </TableCell>
                <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                  <Button size="small" variant="contained" onClick={() => setSelectedFarmerIdForPopup(group.farmerId)} sx={{ fontWeight: 700, backgroundColor: '#000', color: '#FFF' }}>
                    VIEW DETAILS
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filteredGroups.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 8, color: '#999', fontWeight: 600, letterSpacing: 1 }}>
                  NO PROCUREMENT RECORDS FOUND
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>


      {/* ── POP-UP: FARMER DETAILS & ORDERS ── */}
      <Dialog
        open={!!selectedFarmerIdForPopup && !!selectedFarmerGroup}
        onClose={() => setSelectedFarmerIdForPopup(null)}
        maxWidth="lg"
        fullWidth
        sx={{ '& .MuiDialog-paper': { minHeight: '80vh', backgroundColor: '#FAFAFA' } }}
      >
        {selectedFarmerGroup && (
          <>
            <DialogTitle sx={{ p: 3, pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #000' }}>
              <Box>
                <Typography sx={{ fontWeight: 900, fontSize: '1.5rem', letterSpacing: 1, textTransform: 'uppercase' }}>
                  {selectedFarmerGroup.farmerName}
                </Typography>
                <Box sx={{ display: 'flex', gap: 3, mt: 1 }}>
                  <Typography sx={{ fontWeight: 700, color: '#555' }}>
                    Total Bill: <Box component="span" sx={{ color: '#000' }}>{formatCurrency(selectedFarmerGroup.totalBill)}</Box>
                  </Typography>
                  <Typography sx={{ fontWeight: 700, color: '#555' }}>
                    Paid: <Box component="span" sx={{ color: 'green' }}>{formatCurrency(selectedFarmerGroup.totalPaid)}</Box>
                  </Typography>
                  <Typography sx={{ fontWeight: 900, color: '#000' }}>
                    Balance: <Box component="span" sx={{ color: selectedFarmerGroup.totalBalance > 0 ? 'red' : 'green' }}>{formatCurrency(selectedFarmerGroup.totalBalance)}</Box>
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" onClick={() => handleOpenNewBill(selectedFarmerGroup.farmerId)} sx={{ fontWeight: 700, backgroundColor: '#000' }}>
                  + ADD ORDER
                </Button>
                <IconButton onClick={() => setSelectedFarmerIdForPopup(null)}>
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            
            <DialogContent sx={{ p: 0 }}>
              <TableContainer sx={{ backgroundColor: '#FFF' }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#F0F0F0' }}>
                      <TableCell sx={{ width: 40 }} />
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem', letterSpacing: 0.5 }}>DATE</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem', letterSpacing: 0.5 }}>DETAILS</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem', letterSpacing: 0.5 }}>BILL</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem', letterSpacing: 0.5 }}>PAID</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem', letterSpacing: 0.5 }}>BALANCE</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem', letterSpacing: 0.5 }}>STATUS</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem', letterSpacing: 0.5 }} align="right">ACTIONS</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedFarmerGroup.orders.map((order) => (
                      <React.Fragment key={order.id}>
                        <TableRow sx={{ '&:hover': { backgroundColor: '#FAFAFA' } }}>
                          <TableCell>
                            <IconButton size="small" onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}>
                              {expandedOrder === order.id ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                            </IconButton>
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>
                            {new Date(order.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </TableCell>
                          <TableCell>{order.details || '-'}</TableCell>
                          <TableCell sx={{ fontWeight: 900 }}>{formatCurrency(order.totalAmount)}</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: 'green' }}>{formatCurrency(order.amountPaid)}</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: order.balance > 0 ? 'red' : 'green' }}>
                            {formatCurrency(order.balance)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={order.status.toUpperCase()}
                              size="small"
                              sx={{
                                fontWeight: 800,
                                fontSize: '0.7rem',
                                letterSpacing: 0.5,
                                borderRadius: 1,
                                backgroundColor: order.status === 'Fully Paid' ? '#E8F5E9' : '#FFF3E0',
                                color: order.status === 'Fully Paid' ? '#2E7D32' : '#E65100'
                              }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Button size="small" variant="outlined" onClick={() => handleOpenPayment(order.id)} sx={{ mr: 1, fontWeight: 700 }}>
                              PAY
                            </Button>
                            <IconButton onClick={() => handleOpenEditBill(order)} size="small" sx={{ mr: 1 }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton onClick={() => handleDelete(order.id)} size="small" sx={{ color: 'red' }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>

                        {/* ── PAYMENT HISTORY INSIDE POPUP ── */}
                        <TableRow>
                          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
                            <Collapse in={expandedOrder === order.id} timeout="auto" unmountOnExit>
                              <Box sx={{ m: 2, p: 2, backgroundColor: '#F9F9F9', borderRadius: 1, border: '1px solid #E0E0E0' }}>
                                <Typography sx={{ fontWeight: 800, mb: 1.5, fontSize: '0.8rem', letterSpacing: 1, color: '#333' }}>PAYMENT HISTORY</Typography>
                                {(!order.payments || order.payments.length === 0) ? (
                                  <Typography sx={{ fontSize: '0.8rem', color: '#999' }}>No payments recorded yet.</Typography>
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
                                      {order.payments.map((p: any) => (
                                        <TableRow key={p.id}>
                                          <TableCell sx={{ fontSize: '0.8rem' }}>{new Date(p.date).toLocaleDateString('en-IN')}</TableCell>
                                          <TableCell sx={{ fontWeight: 800, color: 'green', fontSize: '0.8rem' }}>{formatCurrency(p.amount)}</TableCell>
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
                  </TableBody>
                </Table>
              </TableContainer>
            </DialogContent>
          </>
        )}
      </Dialog>


      {/* Add / Edit Bill Dialog */}
      <Dialog open={openNewBill} onClose={() => !loading && setOpenNewBill(false)} maxWidth="md" fullWidth>
        <Box sx={{ p: 3 }}>
          <Typography sx={{ fontWeight: 900, letterSpacing: 2, fontSize: '1rem', mb: 3 }}>
            {editingBillId ? 'EDIT ORDER' : 'RECORD NEW ORDER'}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Autocomplete
                sx={{ flex: 2 }}
                disabled={!!editingBillId}
                options={[{ id: 'OTHER', name: 'OTHER (Not in list)' }, ...farmers]}
                getOptionLabel={(option) => option.id === 'OTHER' ? option.name : `${option.name} ${option.farmerId ? `[ID: ${option.farmerId}]` : ''} ${option.phoneNumber ? `(${option.phoneNumber})` : ''}`}
                value={billData.farmerId === 'OTHER' ? { id: 'OTHER', name: 'OTHER (Not in list)' } : farmers.find(f => f.id === billData.farmerId) || null}
                onChange={(_, newValue) => setBillData({ ...billData, farmerId: newValue ? newValue.id : '' })}
                renderInput={(params) => <TextField {...params} label="Select Farmer or OTHER" required />}
              />
              <TextField
                sx={{ flex: 1 }}
                label="Order Date"
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
                disabled={!!editingBillId}
                value={billData.otherPayeeName}
                onChange={(e) => setBillData({ ...billData, otherPayeeName: e.target.value })}
              />
            )}

            {(!editingBillId || billData.categoryId) ? (
              <>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <FormControl fullWidth required>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={billData.categoryId}
                      label="Category"
                      onChange={(e) => setBillData({ ...billData, categoryId: e.target.value as string, productId: '' })}
                    >
                      {categories.map(c => (
                        <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth disabled={!billData.categoryId}>
                    <InputLabel>Product (Optional)</InputLabel>
                    <Select
                      value={billData.productId}
                      label="Product (Optional)"
                      onChange={(e) => setBillData({ ...billData, productId: e.target.value as string })}
                    >
                      <MenuItem value=""><em>None</em></MenuItem>
                      {products.filter(p => {
                        const selectedCatName = categories.find(c => c.id === billData.categoryId)?.name || '';
                        return p.category === selectedCatName;
                      }).map(p => (
                        <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="Gross Weight (kg)"
                    fullWidth
                    required
                    type="number"
                    value={billData.grossWeight}
                    onChange={(e) => setBillData({ ...billData, grossWeight: e.target.value })}
                  />
                  <TextField
                    label="Allowance / Wastage (%)"
                    fullWidth
                    required
                    type="number"
                    value={billData.wastagePercent}
                    onChange={(e) => setBillData({ ...billData, wastagePercent: e.target.value })}
                  />
                  <TextField
                    label="Net Weight (kg)"
                    fullWidth
                    disabled
                    value={netWeightCalculated.toFixed(2)}
                    sx={{ backgroundColor: '#F9F9F9' }}
                  />
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="Rate per Kg (₹)"
                    fullWidth
                    required
                    type="number"
                    value={billData.ratePerKg}
                    onChange={(e) => setBillData({ ...billData, ratePerKg: e.target.value })}
                  />
                  <TextField
                    label="Total Bill Amount (₹)"
                    fullWidth
                    disabled
                    value={totalAmountCalculated.toFixed(2)}
                    sx={{ backgroundColor: '#E8F5E9', '& .MuiInputBase-input': { fontWeight: 900, color: 'green' } }}
                  />
                </Box>
              </>
            ) : (
              // Legacy Edit View
              <>
                <TextField
                  label="Purchase Details / Description"
                  fullWidth
                  value={billData.details}
                  onChange={(e) => setBillData({ ...billData, details: e.target.value })}
                />
                <TextField
                  label="Total Bill Amount (₹)"
                  fullWidth
                  required
                  type="number"
                  value={billData.totalAmount}
                  onChange={(e) => setBillData({ ...billData, totalAmount: e.target.value })}
                />
              </>
            )}

            {!editingBillId && (
              <Box sx={{ p: 2, backgroundColor: '#F5F5F5', borderRadius: 1, border: '1px solid #E0E0E0' }}>
                <Typography sx={{ fontWeight: 800, mb: 2, fontSize: '0.85rem' }}>INITIAL PAYMENT (OPTIONAL)</Typography>
                <Box sx={{ display: 'flex', gap: 2, mb: Number(billData.initialAdvance) > 0 ? 2 : 0 }}>
                  <TextField
                    label="Initial Advance Paid (₹)"
                    fullWidth
                    type="number"
                    value={billData.initialAdvance}
                    onChange={(e) => setBillData({ ...billData, initialAdvance: e.target.value })}
                  />
                </Box>
                {Number(billData.initialAdvance) > 0 && (
                  <Box sx={{ display: 'flex', gap: 2 }}>
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
            )}
          </Box>
        </Box>
        <DialogActions sx={{ borderTop: '2px solid #000', p: 2 }}>
          <Button onClick={() => setOpenNewBill(false)} disabled={loading} sx={{ fontWeight: 700, color: '#000' }}>CANCEL</Button>
          <Button variant="contained" onClick={handleSaveBill} disabled={loading} sx={{ backgroundColor: '#000', color: '#FFF', fontWeight: 700, borderRadius: 0 }}>
            {loading ? <CircularProgress size={20} color="inherit" /> : (editingBillId ? 'UPDATE ORDER' : 'SAVE ORDER')}
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
