import React, { useState, useEffect, useMemo } from 'react';
import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, Button, Dialog, DialogActions, TextField, CircularProgress, MenuItem, Select, FormControl, InputLabel, InputAdornment, Autocomplete, IconButton, Collapse } from '@mui/material';
import { collection, getDocs, getFirestore, addDoc, serverTimestamp, query, orderBy, deleteDoc, doc, setDoc, increment } from 'firebase/firestore';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import app from '../firebase';
import { useUI } from '../context/UIContext';

const db = getFirestore(app);

export default function Inventory() {
  const { showConfirm, showMessage } = useUI();
  const [ledger, setLedger] = useState<any[]>([]);
  const [godowns, setGodowns] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [farmers, setFarmers] = useState<any[]>([]);
  
  const [open, setOpen] = useState(false);
  const [openTransfer, setOpenTransfer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  // Filters
  const [stockFilter, setStockFilter] = useState('ALL');
  const [godownFilter, setGodownFilter] = useState('ALL');
  const [productFilter, setProductFilter] = useState('ALL');

  const [formData, setFormData] = useState({
    godownId: '',
    date: new Date().toISOString().split('T')[0],
    productId: '',
    selectedFarmers: [] as any[], // Array of selected farmer objects
    otherFarmerName: '',
    slipNo: '',
    lotNo: '',
    weight: '',
    totalBags: '',
  });

  const [transferData, setTransferData] = useState({
    godownId: '',
    productId: '',
    groupName: '',
    date: new Date().toISOString().split('T')[0],
    weight: '',
    totalBags: '',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [ledgerSnap, godownSnap, prodSnap, farmSnap] = await Promise.all([
        getDocs(query(collection(db, 'inventory_ledger'), orderBy('date', 'desc'))),
        getDocs(collection(db, 'godowns')),
        getDocs(collection(db, 'products')),
        getDocs(collection(db, 'farmers'))
      ]);

      setLedger(ledgerSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      const activeGodowns = godownSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter((g: any) => g.isActive !== false);
      activeGodowns.sort((a: any, b: any) => a.name.localeCompare(b.name));
      setGodowns(activeGodowns);
      
      const activeProds = prodSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      activeProds.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
      setProducts(activeProds);
      
      const activeFarmers = farmSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter((f: any) => f.isActive !== false);
      activeFarmers.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
      setFarmers(activeFarmers);
    } catch (e) {
      console.error('Error fetching inventory data', e);
    }
  };

  const handleOpen = () => {
    setFormData({
      godownId: '',
      date: new Date().toISOString().split('T')[0],
      productId: '',
      selectedFarmers: [],
      otherFarmerName: '',
      slipNo: '',
      lotNo: '',
      weight: '',
      totalBags: '',
    });
    setOpen(true);
  };

  const handleOpenTransfer = (group: any) => {
    setTransferData({
      godownId: group.godownId,
      productId: group.productId,
      groupName: `${group.godownName} - ${group.productName}`,
      date: new Date().toISOString().split('T')[0],
      weight: '',
      totalBags: '',
      notes: '',
    });
    setOpenTransfer(true);
  };

  const handleDelete = async (id: string, itemType: string) => {
    showConfirm(`Are you sure you want to delete this ${itemType} entry?`, async () => {
      try {
        await deleteDoc(doc(db, 'inventory_ledger', id));
        fetchData();
        showMessage("Record deleted", "success");
      } catch (e) {
        console.error("Error deleting", e);
        showMessage("Failed to delete.", "error");
      }
    });
  };

  const handleSave = async () => {
    if (!formData.godownId) return showMessage('Please select a Godown.', 'error');
    if (!formData.productId) return showMessage('Please select an Item.', 'error');
    if (formData.selectedFarmers.length === 0) return showMessage('Please select at least one Farmer.', 'error');
    
    const hasOther = formData.selectedFarmers.some(f => f.id === 'OTHER');
    if (hasOther && !formData.otherFarmerName.trim()) return showMessage('Please enter Custom Farmer Name(s).', 'error');
    
    if (!formData.totalBags || isNaN(Number(formData.totalBags)) || Number(formData.totalBags) <= 0) return showMessage('Enter valid Total Bags.', 'error');

    setLoading(true);
    try {
      const selectedGodown = godowns.find(g => g.id === formData.godownId);
      const selectedProduct = products.find(p => p.id === formData.productId);
      
      const farmerNames = formData.selectedFarmers.map(f => {
        if (f.id === 'OTHER') return formData.otherFarmerName.trim();
        return f.name;
      });
      
      const finalFarmerName = farmerNames.join(', ');

      const payload = {
        type: 'IN', // Manual Add is always IN
        godownId: formData.godownId,
        godownName: selectedGodown?.name || 'Unknown Godown',
        date: formData.date,
        productId: formData.productId,
        productName: selectedProduct?.name || 'Unknown Item',
        farmerId: formData.selectedFarmers.map(f => f.id).join(','),
        farmerName: finalFarmerName,
        slipNo: formData.slipNo.trim(),
        lotNo: formData.lotNo.trim(),
        weight: formData.weight ? Number(formData.weight) : 0,
        totalBags: Number(formData.totalBags),
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'inventory_ledger'), payload);
      showMessage("Inventory IN added successfully", "success");
      setOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving inventory:', error);
      showMessage('Error saving inventory: ' + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferData.weight || isNaN(Number(transferData.weight)) || Number(transferData.weight) <= 0) return showMessage('Enter valid Weight.', 'error');
    if (!transferData.totalBags || isNaN(Number(transferData.totalBags)) || Number(transferData.totalBags) <= 0) return showMessage('Enter valid Bags.', 'error');

    setLoading(true);
    try {
      const selectedGodown = godowns.find(g => g.id === transferData.godownId);
      const selectedProduct = products.find(p => p.id === transferData.productId);

      const payload = {
        type: 'OUT', // Transfer is OUT of Godown
        godownId: transferData.godownId,
        godownName: selectedGodown?.name || 'Unknown Godown',
        date: transferData.date,
        productId: transferData.productId,
        productName: selectedProduct?.name || 'Unknown Item',
        farmerId: 'INTERNAL',
        farmerName: 'B2B Catalog Transfer',
        slipNo: `TRANSFER-${Math.floor(Math.random()*10000)}`,
        lotNo: '',
        weight: Number(transferData.weight),
        totalBags: Number(transferData.totalBags),
        notes: transferData.notes.trim(),
        createdAt: serverTimestamp()
      };

      // 1. Add OUT ledger entry
      await addDoc(collection(db, 'inventory_ledger'), payload);
      
      // 2. Increment Product Stock (Visible to B2B)
      await setDoc(doc(db, 'inventory', transferData.productId), {
        availableStockKg: increment(Number(transferData.weight))
      }, { merge: true });

      showMessage("Successfully transferred to B2B Catalog!", "success");
      setOpenTransfer(false);
      fetchData();
    } catch (error: any) {
      console.error('Error transferring inventory:', error);
      showMessage('Error transferring inventory: ' + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const groupedLedger = useMemo(() => {
    const groups: { [key: string]: any } = {};
    const lowerQuery = searchQuery.toLowerCase();

    ledger.forEach(item => {
      const isOut = item.type === 'OUT';
      
      const key = `${item.godownId}_${item.productId}`;
      
      if (!groups[key]) {
        groups[key] = {
          id: key,
          godownId: item.godownId,
          godownName: item.godownName,
          productId: item.productId,
          productName: item.productName,
          totalWeightIn: 0,
          totalWeightOut: 0,
          totalBagsIn: 0,
          totalBagsOut: 0,
          history: []
        };
      }
      
      if (isOut) {
        groups[key].totalWeightOut += Number(item.weight) || 0;
        groups[key].totalBagsOut += Number(item.totalBags) || 0;
      } else {
        groups[key].totalWeightIn += Number(item.weight) || 0;
        groups[key].totalBagsIn += Number(item.totalBags) || 0;
      }
      groups[key].history.push(item);
    });

    return Object.values(groups)
      .map(g => ({
        ...g,
        balanceWeight: g.totalWeightIn - g.totalWeightOut,
        balanceBags: g.totalBagsIn - g.totalBagsOut
      }))
      .filter(g => {
        // Search Filter
        if (searchQuery.trim()) {
          const match = (g.godownName || '').toLowerCase().includes(lowerQuery) ||
                        (g.productName || '').toLowerCase().includes(lowerQuery);
          if (!match) return false;
        }

        // Godown Filter
        if (godownFilter !== 'ALL' && g.godownId !== godownFilter) return false;

        // Product Filter
        if (productFilter !== 'ALL' && g.productId !== productFilter) return false;

        // Stock Filter
        if (stockFilter === 'IN_STOCK' && g.balanceWeight <= 0) return false;
        if (stockFilter === 'EMPTY' && g.balanceWeight > 0) return false;

        return true;
      });
  }, [ledger, searchQuery, godownFilter, stockFilter, productFilter]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.5rem', md: '2rem' }, color: '#1E293B', letterSpacing: '-0.5px' }}>
            Godown Inventory
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            placeholder="Search..."
            variant="outlined"
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ width: { xs: '100%', sm: 300 }, backgroundColor: '#FFF', '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#94A3B8' }} />
                  </InputAdornment>
                ),
              }
            } as any}
          />
          
          <FormControl size="small" sx={{ minWidth: 150, backgroundColor: '#FFF' }}>
            <Select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} sx={{ borderRadius: 2 }}>
              <MenuItem value="ALL">All Stock Levels</MenuItem>
              <MenuItem value="IN_STOCK">In Stock (&gt; 0)</MenuItem>
              <MenuItem value="EMPTY">Out of Stock</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 150, backgroundColor: '#FFF' }}>
            <Select value={godownFilter} onChange={(e) => setGodownFilter(e.target.value)} sx={{ borderRadius: 2 }}>
              <MenuItem value="ALL">All Godowns</MenuItem>
              {godowns.map(g => (
                <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 150, backgroundColor: '#FFF' }}>
            <Select value={productFilter} onChange={(e) => setProductFilter(e.target.value)} sx={{ borderRadius: 2 }}>
              <MenuItem value="ALL">All Crops</MenuItem>
              {products.map(p => (
                <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button 
            variant="contained" 
            onClick={handleOpen} 
            sx={{ 
              fontWeight: 700, 
              backgroundColor: '#0F172A', 
              color: '#FFF', 
              borderRadius: 2,
              px: 3,
              boxShadow: 'none',
              '&:hover': { backgroundColor: '#334155', boxShadow: 'none' }
            }}
          >
            + Manual Intake
          </Button>
        </Box>
      </Box>

      <TableContainer sx={{ width: '100%', overflowX: 'auto', backgroundColor: '#FFF', borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#F8FAFC' }}>
              <TableCell sx={{ width: 40, borderBottom: '1px solid #E2E8F0' }}></TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748B', borderBottom: '1px solid #E2E8F0' }}>GODOWN</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748B', borderBottom: '1px solid #E2E8F0' }}>ITEM</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748B', borderBottom: '1px solid #E2E8F0' }}>IN (KG / BAGS)</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748B', borderBottom: '1px solid #E2E8F0' }}>OUT (KG / BAGS)</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: '#0F172A', borderBottom: '1px solid #E2E8F0' }}>BALANCE WEIGHT</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: '#0F172A', borderBottom: '1px solid #E2E8F0' }}>BALANCE BAGS</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem', color: '#64748B', borderBottom: '1px solid #E2E8F0' }}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groupedLedger.map((group) => (
              <React.Fragment key={group.id}>
                <TableRow sx={{ '&:hover': { backgroundColor: '#F8FAFC' }, transition: 'all 0.2s', borderBottom: '1px solid #E2E8F0' }}>
                  <TableCell sx={{ borderBottom: 'none' }}>
                    <IconButton size="small" onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)} sx={{ color: '#64748B' }}>
                      {expandedGroup === group.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#475569', borderBottom: 'none' }}>{group.godownName}</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#0F172A', fontSize: '0.95rem', borderBottom: 'none' }}>{group.productName}</TableCell>
                  <TableCell sx={{ color: '#059669', fontWeight: 500, borderBottom: 'none' }}>
                    {group.totalWeightIn.toFixed(1)} kg <Box component="span" sx={{ color: '#94A3B8', fontSize: '0.8rem' }}>({group.totalBagsIn})</Box>
                  </TableCell>
                  <TableCell sx={{ color: '#DC2626', fontWeight: 500, borderBottom: 'none' }}>
                    {group.totalWeightOut.toFixed(1)} kg <Box component="span" sx={{ color: '#94A3B8', fontSize: '0.8rem' }}>({group.totalBagsOut})</Box>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '1rem', color: group.balanceWeight <= 0 ? '#DC2626' : '#0F172A', borderBottom: 'none' }}>
                    {group.balanceWeight.toFixed(1)} kg
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '1rem', color: group.balanceBags <= 0 ? '#DC2626' : '#0F172A', borderBottom: 'none' }}>
                    {group.balanceBags}
                  </TableCell>
                  <TableCell align="right" sx={{ borderBottom: 'none' }}>
                    <Button 
                      variant="outlined" 
                      size="small" 
                      startIcon={<SwapHorizIcon />}
                      onClick={() => handleOpenTransfer(group)}
                      sx={{ 
                        color: '#0284C7', 
                        borderColor: '#E0F2FE', 
                        backgroundColor: '#F0F9FF',
                        fontWeight: 600, 
                        borderRadius: 2,
                        textTransform: 'none',
                        '&:hover': { backgroundColor: '#E0F2FE', borderColor: '#BAE6FD' }
                      }}
                    >
                      Transfer
                    </Button>
                  </TableCell>
                </TableRow>
                
                {/* Expandable History Drawer */}
                <TableRow>
                  <TableCell style={{ paddingBottom: 0, paddingTop: 0, borderBottom: expandedGroup === group.id ? '1px solid #E2E8F0' : 'none' }} colSpan={8}>
                    <Collapse in={expandedGroup === group.id} timeout="auto" unmountOnExit>
                      <Box sx={{ margin: 2, ml: 6, p: 2, backgroundColor: '#F8FAFC', borderRadius: 2, border: '1px solid #F1F5F9' }}>
                        <Typography sx={{ fontWeight: 700, mb: 1, color: '#64748B', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ledger History</Typography>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 600, fontSize: '0.7rem', color: '#94A3B8', borderBottom: '1px solid #F1F5F9' }}>TYPE</TableCell>
                              <TableCell sx={{ fontWeight: 600, fontSize: '0.7rem', color: '#94A3B8', borderBottom: '1px solid #F1F5F9' }}>DATE</TableCell>
                              <TableCell sx={{ fontWeight: 600, fontSize: '0.7rem', color: '#94A3B8', borderBottom: '1px solid #F1F5F9' }}>CONTRIBUTOR / EVENT</TableCell>
                              <TableCell sx={{ fontWeight: 600, fontSize: '0.7rem', color: '#94A3B8', borderBottom: '1px solid #F1F5F9' }}>SLIP NO</TableCell>
                              <TableCell sx={{ fontWeight: 600, fontSize: '0.7rem', color: '#94A3B8', borderBottom: '1px solid #F1F5F9' }}>WEIGHT</TableCell>
                              <TableCell sx={{ fontWeight: 600, fontSize: '0.7rem', color: '#94A3B8', borderBottom: '1px solid #F1F5F9' }}>BAGS</TableCell>
                              <TableCell sx={{ fontWeight: 600, fontSize: '0.7rem', color: '#94A3B8', borderBottom: '1px solid #F1F5F9' }}></TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {group.history.map((h: any) => {
                              const isOut = h.type === 'OUT';
                              return (
                                <TableRow key={h.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                  <TableCell sx={{ borderBottom: '1px solid #F1F5F9' }}>
                                    <Box sx={{ 
                                      display: 'inline-block', px: 1, py: 0.2, borderRadius: 1, fontSize: '0.65rem', fontWeight: 700,
                                      backgroundColor: isOut ? '#FEE2E2' : '#D1FAE5',
                                      color: isOut ? '#DC2626' : '#059669'
                                    }}>
                                      {isOut ? 'OUT' : 'IN'}
                                    </Box>
                                  </TableCell>
                                  <TableCell sx={{ borderBottom: '1px solid #F1F5F9', color: '#64748B', fontSize: '0.8rem' }}>{new Date(h.date).toLocaleDateString('en-IN')}</TableCell>
                                  <TableCell sx={{ fontWeight: 500, color: '#334155', borderBottom: '1px solid #F1F5F9', fontSize: '0.85rem' }}>{h.farmerName}</TableCell>
                                  <TableCell sx={{ fontSize: '0.8rem', color: '#94A3B8', borderBottom: '1px solid #F1F5F9' }}>{h.slipNo || '-'}</TableCell>
                                  <TableCell sx={{ fontWeight: 600, color: isOut ? '#DC2626' : '#059669', borderBottom: '1px solid #F1F5F9', fontSize: '0.85rem' }}>
                                    {isOut ? '-' : '+'}{h.weight} kg
                                  </TableCell>
                                  <TableCell sx={{ fontWeight: 600, color: '#475569', borderBottom: '1px solid #F1F5F9', fontSize: '0.85rem' }}>
                                    {isOut ? '-' : '+'}{h.totalBags}
                                  </TableCell>
                                  <TableCell align="right" sx={{ borderBottom: '1px solid #F1F5F9' }}>
                                    {!h.linkedProcurement && (
                                      <IconButton onClick={() => handleDelete(h.id, isOut ? 'Transfer OUT' : 'Manual IN')} size="small" sx={{ color: '#EF4444' }}>
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    )}
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
            {groupedLedger.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 8, color: '#94A3B8', fontWeight: 500, fontSize: '0.9rem' }}>
                  No inventory found. Add manual intake to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Manual IN Dialog */}
      <Dialog open={open} onClose={() => !loading && setOpen(false)} maxWidth="sm" fullWidth sx={{ '& .MuiDialog-paper': { borderRadius: 3 } }}>
        <Box sx={{ p: 4 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: '#0F172A', mb: 3 }}>
            Manual Godown Intake
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth required>
                <InputLabel>Godown</InputLabel>
                <Select
                  value={formData.godownId}
                  label="Godown"
                  onChange={(e) => setFormData({ ...formData, godownId: e.target.value as string })}
                  sx={{ borderRadius: 2 }}
                >
                  {godowns.map(g => (
                    <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
                  ))}
                  {godowns.length === 0 && <MenuItem disabled>No Godowns Found</MenuItem>}
                </Select>
              </FormControl>
              <TextField
                label="Date"
                type="date"
                fullWidth
                required
                slotProps={{ inputLabel: { shrink: true } }}
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Box>

            <FormControl fullWidth required>
              <InputLabel>Item / Crop</InputLabel>
              <Select
                value={formData.productId}
                label="Item / Crop"
                onChange={(e) => setFormData({ ...formData, productId: e.target.value as string })}
                sx={{ borderRadius: 2 }}
              >
                {products.map(p => (
                  <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Autocomplete
              multiple
              fullWidth
              options={[{ id: 'OTHER', name: 'OTHER (Not in list)' }, ...farmers]}
              getOptionLabel={(option) => option.id === 'OTHER' ? option.name : `${option.name} ${option.farmerId ? `[ID: ${option.farmerId}]` : ''}`}
              value={formData.selectedFarmers}
              onChange={(_, newValue) => setFormData({ ...formData, selectedFarmers: newValue })}
              renderInput={(params) => <TextField {...params} label="Select Farmer(s) or OTHER" required />}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            
            {formData.selectedFarmers.some(f => f.id === 'OTHER') && (
              <TextField
                label="Custom Farmer Name(s) (comma separated)"
                fullWidth
                required
                value={formData.otherFarmerName}
                onChange={(e) => setFormData({ ...formData, otherFarmerName: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                placeholder="e.g. Guest A, Guest B"
              />
            )}

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Slip No (Optional)"
                fullWidth
                value={formData.slipNo}
                onChange={(e) => setFormData({ ...formData, slipNo: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <TextField
                label="Lot No (Optional)"
                fullWidth
                value={formData.lotNo}
                onChange={(e) => setFormData({ ...formData, lotNo: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
              <TextField
                label="Total Weight (kg)"
                fullWidth
                required
                type="number"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: '#F8FAFC' } }}
              />
              <TextField
                label="Total Bags"
                fullWidth
                required
                type="number"
                value={formData.totalBags}
                onChange={(e) => setFormData({ ...formData, totalBags: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: '#F8FAFC' } }}
              />
            </Box>
          </Box>
        </Box>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setOpen(false)} disabled={loading} sx={{ fontWeight: 600, color: '#64748B', textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={loading} sx={{ backgroundColor: '#0F172A', color: '#FFF', fontWeight: 600, borderRadius: 2, textTransform: 'none', px: 3, '&:hover': { backgroundColor: '#334155' } }}>
            {loading ? <CircularProgress size={20} color="inherit" /> : 'Save Intake'}
          </Button>
        </DialogActions>
      </Dialog>


      {/* Transfer to B2B Catalog Dialog */}
      <Dialog open={openTransfer} onClose={() => !loading && setOpenTransfer(false)} maxWidth="sm" fullWidth sx={{ '& .MuiDialog-paper': { borderRadius: 3 } }}>
        <Box sx={{ p: 4 }}>
          <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: '#0284C7', mb: 1 }}>
            Transfer to B2B Catalog
          </Typography>
          <Typography sx={{ color: '#64748B', fontSize: '0.9rem', mb: 4 }}>
            Move stock from <strong>{transferData.groupName}</strong> to the live B2B product catalog.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="Date"
              type="date"
              fullWidth
              required
              slotProps={{ inputLabel: { shrink: true } }}
              value={transferData.date}
              onChange={(e) => setTransferData({ ...transferData, date: e.target.value })}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Transfer Weight (kg)"
                fullWidth
                required
                type="number"
                value={transferData.weight}
                onChange={(e) => setTransferData({ ...transferData, weight: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: '#F0F9FF' } }}
              />
              <TextField
                label="Transfer Bags"
                fullWidth
                required
                type="number"
                value={transferData.totalBags}
                onChange={(e) => setTransferData({ ...transferData, totalBags: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: '#F0F9FF' } }}
              />
            </Box>
            
            <TextField
              label="Notes (Optional)"
              fullWidth
              multiline
              rows={2}
              value={transferData.notes}
              onChange={(e) => setTransferData({ ...transferData, notes: e.target.value })}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Box>
        </Box>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setOpenTransfer(false)} disabled={loading} sx={{ fontWeight: 600, color: '#64748B', textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={handleTransfer} disabled={loading} sx={{ backgroundColor: '#0284C7', color: '#FFF', fontWeight: 600, borderRadius: 2, textTransform: 'none', px: 3, boxShadow: 'none', '&:hover': { backgroundColor: '#0369A1', boxShadow: 'none' } }}>
            {loading ? <CircularProgress size={20} color="inherit" /> : 'Confirm Transfer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
