import React, { useState, useEffect, useMemo } from 'react';
import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, Button, Dialog, DialogActions, TextField, CircularProgress, MenuItem, Select, FormControl, InputLabel, InputAdornment, Autocomplete, IconButton, Chip, Collapse, DialogTitle, DialogContent } from '@mui/material';
import { collection, getDocs, getFirestore, addDoc, serverTimestamp, query, orderBy, deleteDoc, doc, updateDoc, arrayUnion, where } from 'firebase/firestore';
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
  loans: any[];
  totalLoanAmount: number;
  totalRecovered: number;
  totalBalance: number;
  status: string;
}

export default function Loans() {
  const { showConfirm, showMessage } = useUI();
  const [loansList, setLoansList] = useState<any[]>([]);
  const [farmers, setFarmers] = useState<any[]>([]);
  
  // Dialog States
  const [openNewLoan, setOpenNewLoan] = useState(false);
  const [openRecovery, setOpenRecovery] = useState(false);
  const [selectedFarmerIdForPopup, setSelectedFarmerIdForPopup] = useState<string | null>(null);

  // Edit / Action States
  const [editingLoanId, setEditingLoanId] = useState<string | null>(null);
  const [selectedLoanIdForRecovery, setSelectedLoanIdForRecovery] = useState<string | null>(null);
  const [expandedLoan, setExpandedLoan] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [loanData, setLoanData] = useState({
    farmerId: '',
    otherPayeeName: '',
    date: new Date().toISOString().split('T')[0],
    amount: '',
    notes: '',
  });

  const [recoveryData, setRecoveryData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    mode: 'Bank Transfer',
    reference: '',
    notes: ''
  });

  const paymentModes = ['Bank Transfer', 'UPI', 'Cash', 'Cheque', 'Deducted from Procurement'];

  useEffect(() => {
    fetchLoans();
    fetchFarmers();
  }, []);

  const fetchLoans = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dateStr = thirtyDaysAgo.toISOString().split('T')[0];
      
      const q = query(
        collection(db, 'farmer_loans'), 
        where('date', '>=', dateStr),
        orderBy('date', 'desc')
      );
      const querySnapshot = await getDocs(q);
      setLoansList(querySnapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e: any) {
      // If collection doesn't exist yet or index is missing, try without orderBy
      console.warn('Falling back to unordered fetch for farmer_loans', e.message);
      try {
        const querySnapshot = await getDocs(collection(db, 'farmer_loans'));
        const docs = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        docs.sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''));
        setLoansList(docs);
      } catch (e2) {
        console.error('Error fetching loans', e2);
        setLoansList([]);
      }
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

  // Group all loans by farmer
  const farmerGroups: FarmerGroup[] = useMemo(() => {
    const groupMap = new Map<string, FarmerGroup>();

    for (const l of loansList) {
      const key = l.farmerId || l.farmerName;
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          farmerId: l.farmerId,
          farmerName: l.farmerName,
          loans: [],
          totalLoanAmount: 0,
          totalRecovered: 0,
          totalBalance: 0,
          status: 'Recovered'
        });
      }
      const group = groupMap.get(key)!;
      group.loans.push(l);
      group.totalLoanAmount += l.amount || 0;
      group.totalRecovered += l.amountRecovered || 0;
      group.totalBalance += l.balance || 0;
      if (group.totalBalance > 0) group.status = 'Active';
    }

    const groups = Array.from(groupMap.values());
    groups.sort((a, b) => {
      if (a.status !== b.status) return a.status === 'Active' ? -1 : 1;
      return a.farmerName.localeCompare(b.farmerName);
    });
    return groups;
  }, [loansList]);

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return farmerGroups;
    const lowerQuery = searchQuery.toLowerCase();
    return farmerGroups.filter(g =>
      g.farmerName.toLowerCase().includes(lowerQuery) ||
      g.loans.some(l => (l.notes || '').toLowerCase().includes(lowerQuery))
    );
  }, [farmerGroups, searchQuery]);

  const selectedFarmerGroup = useMemo(() => {
    if (!selectedFarmerIdForPopup) return null;
    return farmerGroups.find(g => g.farmerId === selectedFarmerIdForPopup) || null;
  }, [selectedFarmerIdForPopup, farmerGroups]);


  const handleOpenNewLoan = (prefillFarmerId = '') => {
    setEditingLoanId(null);
    setLoanData({
      farmerId: prefillFarmerId,
      otherPayeeName: '',
      date: new Date().toISOString().split('T')[0],
      amount: '',
      notes: '',
    });
    setOpenNewLoan(true);
  };

  const handleOpenEditLoan = (row: any) => {
    setEditingLoanId(row.id);
    setLoanData({
      farmerId: row.farmerId,
      otherPayeeName: row.farmerId === 'OTHER' ? row.farmerName : '',
      date: row.date,
      amount: row.amount.toString(),
      notes: row.notes || '',
    });
    setOpenNewLoan(true);
  };

  const handleOpenRecovery = (id: string) => {
    setSelectedLoanIdForRecovery(id);
    setRecoveryData({
      amount: '',
      date: new Date().toISOString().split('T')[0],
      mode: 'Bank Transfer',
      reference: '',
      notes: ''
    });
    setOpenRecovery(true);
  };

  const handleDelete = async (id: string) => {
    showConfirm("Are you sure you want to delete this loan and its recovery history? This action cannot be undone.", async () => {
      try {
        await deleteDoc(doc(db, 'farmer_loans', id));
        fetchLoans();
        showMessage("Loan deleted", "success");
      } catch (e) {
        console.error("Error deleting", e);
        showMessage("Failed to delete.", "error");
      }
    });
  };

  const handleSaveLoan = async () => {
    if (!loanData.farmerId) return showMessage('Please select a farmer.', 'error');
    if (loanData.farmerId === 'OTHER' && !loanData.otherPayeeName.trim()) return showMessage('Please enter payee name.', 'error');
    if (!loanData.amount || isNaN(Number(loanData.amount)) || Number(loanData.amount) <= 0) return showMessage('Enter a valid amount.', 'error');

    setLoading(true);
    try {
      let finalFarmerName = 'Unknown Farmer';
      if (loanData.farmerId === 'OTHER') {
        finalFarmerName = loanData.otherPayeeName.trim();
      } else {
        const selectedFarmer = farmers.find(f => f.id === loanData.farmerId);
        finalFarmerName = selectedFarmer?.name || 'Unknown Farmer';
      }

      const loanAmount = Number(loanData.amount);

      if (editingLoanId) {
        const existingLoan = loansList.find(l => l.id === editingLoanId);
        if (!existingLoan) throw new Error("Loan not found.");
        
        const balance = loanAmount - existingLoan.amountRecovered;
        let newStatus = 'Active';
        if (balance <= 0) {
          newStatus = 'Recovered';
        } else if (existingLoan.amountRecovered > 0) {
          newStatus = 'Partially Recovered';
        }

        await updateDoc(doc(db, 'farmer_loans', editingLoanId), {
          farmerId: loanData.farmerId,
          farmerName: finalFarmerName,
          date: loanData.date,
          amount: loanAmount,
          notes: loanData.notes.trim(),
          balance: balance,
          status: newStatus,
        });
        showMessage("Loan updated successfully", "success");
      } else {
        let nextLoanId = 1;
        if (loanData.farmerId !== 'OTHER') {
          const existingFarmerLoans = loansList.filter(l => l.farmerId === loanData.farmerId);
          const maxId = existingFarmerLoans.reduce((max, l) => Math.max(max, l.loanId || 0), 0);
          nextLoanId = maxId + 1;
        }

        const payload = {
          farmerId: loanData.farmerId,
          farmerName: finalFarmerName,
          loanId: nextLoanId,
          date: loanData.date,
          amount: loanAmount,
          notes: loanData.notes.trim(),
          amountRecovered: 0,
          balance: loanAmount,
          status: 'Active',
          recoveries: [],
          createdAt: serverTimestamp(),
        };
        
        await addDoc(collection(db, 'farmer_loans'), payload);
        showMessage("New loan recorded successfully", "success");
        
        if (!selectedFarmerIdForPopup && loanData.farmerId !== 'OTHER') {
          setSelectedFarmerIdForPopup(loanData.farmerId);
        }
      }

      setOpenNewLoan(false);
      fetchLoans();
    } catch (error: any) {
      console.error('Error saving loan:', error);
      showMessage('Error saving loan: ' + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRecovery = async () => {
    if (!selectedLoanIdForRecovery) return;
    if (!recoveryData.amount || isNaN(Number(recoveryData.amount)) || Number(recoveryData.amount) <= 0) return showMessage('Enter a valid amount.', 'error');

    const loan = loansList.find(l => l.id === selectedLoanIdForRecovery);
    if (!loan) return;

    setLoading(true);
    try {
      const recoveryAmount = Number(recoveryData.amount);
      const newRecovered = loan.amountRecovered + recoveryAmount;
      const newBalance = loan.amount - newRecovered;
      
      let newStatus = 'Active';
      if (newBalance <= 0) {
        newStatus = 'Recovered';
      } else if (newRecovered > 0) {
        newStatus = 'Partially Recovered';
      }

      const newRecoveryObj = {
        id: crypto.randomUUID(),
        date: recoveryData.date,
        amount: recoveryAmount,
        mode: recoveryData.mode,
        reference: recoveryData.reference.trim(),
        notes: recoveryData.notes.trim()
      };

      await updateDoc(doc(db, 'farmer_loans', selectedLoanIdForRecovery), {
        amountRecovered: newRecovered,
        balance: newBalance,
        status: newStatus,
        recoveries: arrayUnion(newRecoveryObj)
      });

      setOpenRecovery(false);
      fetchLoans();
      showMessage("Recovery added successfully", "success");
    } catch (error: any) {
      console.error('Error saving recovery:', error);
      showMessage('Error saving recovery: ' + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount || 0);

  // Close the popup if there are no more loans for this farmer
  useEffect(() => {
    if (selectedFarmerIdForPopup && selectedFarmerGroup?.loans.length === 0) {
      setSelectedFarmerIdForPopup(null);
    }
  }, [selectedFarmerGroup, selectedFarmerIdForPopup]);


  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box>
          <Typography sx={{ fontWeight: 900, fontSize: { xs: '1.8rem', md: '2.2rem' }, letterSpacing: 3 }}>
            LOANS & ADVANCES
          </Typography>
          <Typography sx={{ fontWeight: 600, color: '#999', letterSpacing: 1.5, fontSize: '0.8rem', mt: 0.5 }}>
            MANAGE FINANCIAL ADVANCES ISSUED TO FARMERS
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
        <Button variant="contained" onClick={() => handleOpenNewLoan()} sx={{ fontWeight: 700 }}>
          + ISSUE LOAN
        </Button>
      </Box>

      {/* ── MAIN VIEW: FARMERS LIST ── */}
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 900 }}>FARMER</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>TOTAL LOANS</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>GIVEN</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>RECOVERED</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>OUTSTANDING</TableCell>
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
                  <Chip label={`${group.loans.length} LOAN${group.loans.length > 1 ? 'S' : ''}`} size="small" sx={{ fontWeight: 700, letterSpacing: 0.5, borderRadius: 1 }} />
                </TableCell>
                <TableCell sx={{ fontWeight: 900 }}>{formatCurrency(group.totalLoanAmount)}</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'green' }}>{formatCurrency(group.totalRecovered)}</TableCell>
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
                      backgroundColor: group.status === 'Recovered' ? '#E8F5E9' : '#FFF3E0',
                      color: group.status === 'Recovered' ? '#2E7D32' : '#E65100'
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
                  NO LOANS FOUND
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── POP-UP: FARMER DETAILS & LOANS ── */}
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
                    Total Given: <Box component="span" sx={{ color: '#000' }}>{formatCurrency(selectedFarmerGroup.totalLoanAmount)}</Box>
                  </Typography>
                  <Typography sx={{ fontWeight: 700, color: '#555' }}>
                    Total Recovered: <Box component="span" sx={{ color: 'green' }}>{formatCurrency(selectedFarmerGroup.totalRecovered)}</Box>
                  </Typography>
                  <Typography sx={{ fontWeight: 900, color: '#000' }}>
                    Outstanding: <Box component="span" sx={{ color: selectedFarmerGroup.totalBalance > 0 ? 'red' : 'green' }}>{formatCurrency(selectedFarmerGroup.totalBalance)}</Box>
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="contained" onClick={() => handleOpenNewLoan(selectedFarmerGroup.farmerId)} sx={{ fontWeight: 700, backgroundColor: '#000' }}>
                  + ISSUE LOAN
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
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem', letterSpacing: 0.5 }}>LOAN ID</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem', letterSpacing: 0.5 }}>DATE</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem', letterSpacing: 0.5 }}>NOTES</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem', letterSpacing: 0.5 }}>AMOUNT</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem', letterSpacing: 0.5 }}>RECOVERED</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem', letterSpacing: 0.5 }}>BALANCE</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem', letterSpacing: 0.5 }}>STATUS</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.8rem', letterSpacing: 0.5 }} align="right">ACTIONS</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedFarmerGroup.loans.map((loan) => (
                      <React.Fragment key={loan.id}>
                        <TableRow sx={{ '&:hover': { backgroundColor: '#FAFAFA' } }}>
                          <TableCell>
                            <IconButton size="small" onClick={() => setExpandedLoan(expandedLoan === loan.id ? null : loan.id)}>
                              {expandedLoan === loan.id ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                            </IconButton>
                          </TableCell>
                          <TableCell sx={{ fontWeight: 900, color: '#555', fontSize: '0.85rem' }}>
                            {loan.loanId ? `#${loan.loanId}` : '-'}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>
                            {new Date(loan.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </TableCell>
                          <TableCell>{loan.notes || '-'}</TableCell>
                          <TableCell sx={{ fontWeight: 900 }}>{formatCurrency(loan.amount)}</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: 'green' }}>{formatCurrency(loan.amountRecovered)}</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: loan.balance > 0 ? 'red' : 'green' }}>
                            {formatCurrency(loan.balance)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={loan.status.toUpperCase()}
                              size="small"
                              sx={{
                                fontWeight: 800,
                                fontSize: '0.7rem',
                                letterSpacing: 0.5,
                                borderRadius: 1,
                                backgroundColor: loan.status === 'Recovered' ? '#E8F5E9' : (loan.status === 'Active' ? '#FFF3E0' : '#E3F2FD'),
                                color: loan.status === 'Recovered' ? '#2E7D32' : (loan.status === 'Active' ? '#E65100' : '#1565C0')
                              }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Button size="small" variant="outlined" onClick={() => handleOpenRecovery(loan.id)} sx={{ mr: 1, fontWeight: 700 }}>
                              RECOVER
                            </Button>
                            <IconButton onClick={() => handleOpenEditLoan(loan)} size="small" sx={{ mr: 1 }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton onClick={() => handleDelete(loan.id)} size="small" sx={{ color: 'red' }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>

                        {/* ── RECOVERY HISTORY INSIDE POPUP ── */}
                        <TableRow>
                          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={9}>
                            <Collapse in={expandedLoan === loan.id} timeout="auto" unmountOnExit>
                              <Box sx={{ m: 2, p: 2, backgroundColor: '#F9F9F9', borderRadius: 1, border: '1px solid #E0E0E0' }}>
                                <Typography sx={{ fontWeight: 800, mb: 1.5, fontSize: '0.8rem', letterSpacing: 1, color: '#333' }}>RECOVERY HISTORY</Typography>
                                {(!loan.recoveries || loan.recoveries.length === 0) ? (
                                  <Typography sx={{ fontSize: '0.8rem', color: '#999' }}>No recoveries recorded yet.</Typography>
                                ) : (
                                  <Table size="small">
                                    <TableHead>
                                      <TableRow>
                                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>DATE</TableCell>
                                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>AMOUNT</TableCell>
                                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>MODE</TableCell>
                                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>REFERENCE</TableCell>
                                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>NOTES</TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {loan.recoveries.map((r: any) => (
                                        <TableRow key={r.id}>
                                          <TableCell sx={{ fontSize: '0.8rem' }}>{new Date(r.date).toLocaleDateString('en-IN')}</TableCell>
                                          <TableCell sx={{ fontWeight: 800, color: 'green', fontSize: '0.8rem' }}>{formatCurrency(r.amount)}</TableCell>
                                          <TableCell sx={{ fontSize: '0.8rem' }}>{r.mode}</TableCell>
                                          <TableCell sx={{ fontSize: '0.8rem', color: '#666' }}>{r.reference || '-'}</TableCell>
                                          <TableCell sx={{ fontSize: '0.8rem', color: '#666' }}>{r.notes || '-'}</TableCell>
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

      {/* Add / Edit Loan Dialog */}
      <Dialog open={openNewLoan} onClose={() => !loading && setOpenNewLoan(false)} maxWidth="sm" fullWidth>
        <Box sx={{ p: 3 }}>
          <Typography sx={{ fontWeight: 900, letterSpacing: 2, fontSize: '1rem', mb: 3 }}>
            {editingLoanId ? 'EDIT LOAN' : 'ISSUE NEW LOAN'}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Autocomplete
                sx={{ flex: 2 }}
                disabled={!!editingLoanId}
                options={[{ id: 'OTHER', name: 'OTHER (Not in list)' }, ...farmers]}
                getOptionLabel={(option) => option.id === 'OTHER' ? option.name : `${option.name} ${option.farmerId ? `[ID: ${option.farmerId}]` : ''} ${option.phoneNumber ? `(${option.phoneNumber})` : ''}`}
                value={loanData.farmerId === 'OTHER' ? { id: 'OTHER', name: 'OTHER (Not in list)' } : farmers.find(f => f.id === loanData.farmerId) || null}
                onChange={(_, newValue) => setLoanData({ ...loanData, farmerId: newValue ? newValue.id : '' })}
                renderInput={(params) => <TextField {...params} label="Select Farmer or OTHER" required />}
              />
              <TextField
                sx={{ flex: 1 }}
                label="Date Issued"
                type="date"
                required
                slotProps={{ inputLabel: { shrink: true } }}
                value={loanData.date}
                onChange={(e) => setLoanData({ ...loanData, date: e.target.value })}
              />
            </Box>

            {loanData.farmerId === 'OTHER' && (
              <TextField
                label="Payee Name"
                fullWidth
                required
                disabled={!!editingLoanId}
                value={loanData.otherPayeeName}
                onChange={(e) => setLoanData({ ...loanData, otherPayeeName: e.target.value })}
              />
            )}

            <TextField
              label="Loan Amount (₹)"
              fullWidth
              required
              type="number"
              value={loanData.amount}
              onChange={(e) => setLoanData({ ...loanData, amount: e.target.value })}
            />

            <TextField
              label="Notes / Reason (Optional)"
              fullWidth
              multiline
              minRows={2}
              placeholder="e.g. Advance for seeds and fertilizers..."
              value={loanData.notes}
              onChange={(e) => setLoanData({ ...loanData, notes: e.target.value })}
            />
          </Box>
        </Box>
        <DialogActions sx={{ borderTop: '2px solid #000', p: 2 }}>
          <Button onClick={() => setOpenNewLoan(false)} disabled={loading} sx={{ fontWeight: 700, color: '#000' }}>CANCEL</Button>
          <Button variant="contained" onClick={handleSaveLoan} disabled={loading} sx={{ backgroundColor: '#000', color: '#FFF', fontWeight: 700, borderRadius: 0 }}>
            {loading ? <CircularProgress size={20} color="inherit" /> : (editingLoanId ? 'UPDATE LOAN' : 'SAVE LOAN')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Record Recovery Dialog */}
      <Dialog open={openRecovery} onClose={() => !loading && setOpenRecovery(false)} maxWidth="sm" fullWidth>
        <Box sx={{ p: 3 }}>
          <Typography sx={{ fontWeight: 900, letterSpacing: 2, fontSize: '1rem', mb: 3 }}>
            RECORD RECOVERY
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Recovery Amount (₹)"
                fullWidth
                required
                type="number"
                value={recoveryData.amount}
                onChange={(e) => setRecoveryData({ ...recoveryData, amount: e.target.value })}
              />
              <TextField
                label="Recovery Date"
                type="date"
                fullWidth
                required
                slotProps={{ inputLabel: { shrink: true } }}
                value={recoveryData.date}
                onChange={(e) => setRecoveryData({ ...recoveryData, date: e.target.value })}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth required>
                <InputLabel>Mode</InputLabel>
                <Select
                  value={recoveryData.mode}
                  label="Mode"
                  onChange={(e) => setRecoveryData({ ...recoveryData, mode: e.target.value as string })}
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
                value={recoveryData.reference}
                onChange={(e) => setRecoveryData({ ...recoveryData, reference: e.target.value })}
              />
            </Box>
            <TextField
              label="Notes (Optional)"
              fullWidth
              multiline
              minRows={2}
              placeholder="Any additional details..."
              value={recoveryData.notes}
              onChange={(e) => setRecoveryData({ ...recoveryData, notes: e.target.value })}
            />
          </Box>
        </Box>
        <DialogActions sx={{ borderTop: '2px solid #000', p: 2 }}>
          <Button onClick={() => setOpenRecovery(false)} disabled={loading} sx={{ fontWeight: 700, color: '#000' }}>CANCEL</Button>
          <Button variant="contained" onClick={handleSaveRecovery} disabled={loading} sx={{ backgroundColor: '#000', color: '#FFF', fontWeight: 700, borderRadius: 0 }}>
            {loading ? <CircularProgress size={20} color="inherit" /> : 'SAVE RECOVERY'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
