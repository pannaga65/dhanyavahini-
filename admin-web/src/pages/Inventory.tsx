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

  const [formData, setFormData] = useState({
    godownId: '',
    date: new Date().toISOString().split('T')[0],
    productId: '',
    farmerId: '',
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
      farmerId: '',
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
    if (!formData.farmerId) return showMessage('Please select a Farmer.', 'error');
    if (formData.farmerId === 'OTHER' && !formData.otherFarmerName.trim()) return showMessage('Please enter the Farmer name.', 'error');
    if (!formData.totalBags || isNaN(Number(formData.totalBags)) || Number(formData.totalBags) <= 0) return showMessage('Enter valid Total Bags.', 'error');

    setLoading(true);
    try {
      const selectedGodown = godowns.find(g => g.id === formData.godownId);
      const selectedProduct = products.find(p => p.id === formData.productId);
      
      let finalFarmerName = 'Unknown Farmer';
      if (formData.farmerId === 'OTHER') {
        finalFarmerName = formData.otherFarmerName.trim();
      } else {
        const selectedFarmer = farmers.find(f => f.id === formData.farmerId);
        finalFarmerName = selectedFarmer?.name || 'Unknown Farmer';
      }

      const payload = {
        type: 'IN', // Manual Add is always IN
        godownId: formData.godownId,
        godownName: selectedGodown?.name || 'Unknown Godown',
        date: formData.date,
        productId: formData.productId,
        productName: selectedProduct?.name || 'Unknown Item',
        farmerId: formData.farmerId,
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
        if (!searchQuery.trim()) return true;
        return (g.godownName || '').toLowerCase().includes(lowerQuery) ||
               (g.productName || '').toLowerCase().includes(lowerQuery);
      });
  }, [ledger, searchQuery]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box>
          <Typography sx={{ fontWeight: 900, fontSize: { xs: '1.8rem', md: '2.2rem' }, letterSpacing: 3 }}>
            GODOWN INVENTORY
          </Typography>
          <Typography sx={{ fontWeight: 500, color: '#94A3B8', letterSpacing: 0.3, fontSize: '0.9rem', mt: 0.5 }}>
            AGGREGATED RAW STOCK & B2B TRANSFERS
          </Typography>
        </Box>
      </Box>
      <Box sx={{ borderBottom: '1px solid #E2E8F0', mb: 3, mt: 2 }} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <TextField
          placeholder="Search Godown, Item..."
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
        <Button variant="contained" onClick={handleOpen} sx={{ fontWeight: 700, backgroundColor: '#1B2A4A', color: '#FFF' }}>
          + MANUAL INTAKE (IN)
        </Button>
      </Box>

      <TableContainer sx={{ width: '100%', overflowX: 'auto', backgroundColor: '#FFF', borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#F8FAFC' }}>
              <TableCell sx={{ width: 40 }}></TableCell>
              <TableCell sx={{ fontWeight: 900, fontSize: '0.75rem', color: '#475569' }}>GODOWN</TableCell>
              <TableCell sx={{ fontWeight: 900, fontSize: '0.75rem', color: '#475569' }}>ITEM</TableCell>
              <TableCell sx={{ fontWeight: 900, fontSize: '0.75rem', color: '#059669' }}>TOTAL IN</TableCell>
              <TableCell sx={{ fontWeight: 900, fontSize: '0.75rem', color: '#DC2626' }}>TOTAL OUT</TableCell>
              <TableCell sx={{ fontWeight: 900, fontSize: '0.75rem', color: '#1E293B' }}>BALANCE WEIGHT</TableCell>
              <TableCell sx={{ fontWeight: 900, fontSize: '0.75rem', color: '#1E293B' }}>BALANCE BAGS</TableCell>
              <TableCell align="right" sx={{ fontWeight: 900, fontSize: '0.75rem', color: '#475569' }}>ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groupedLedger.map((group) => (
              <React.Fragment key={group.id}>
                <TableRow sx={{ '&:hover': { backgroundColor: '#F1F5F9' }, transition: '0.2s', borderBottom: '2px solid #E2E8F0' }}>
                  <TableCell>
                    <IconButton size="small" onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}>
                      {expandedGroup === group.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#334155' }}>{group.godownName}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: '#0F172A', fontSize: '1rem' }}>{group.productName}</TableCell>
                  <TableCell sx={{ color: '#059669', fontWeight: 600 }}>{group.totalWeightIn.toFixed(1)} kg ({group.totalBagsIn} bags)</TableCell>
                  <TableCell sx={{ color: '#DC2626', fontWeight: 600 }}>{group.totalWeightOut.toFixed(1)} kg ({group.totalBagsOut} bags)</TableCell>
                  <TableCell sx={{ fontWeight: 900, fontSize: '1.1rem', color: group.balanceWeight <= 0 ? '#DC2626' : '#1E293B' }}>
                    {group.balanceWeight.toFixed(1)} kg
                  </TableCell>
                  <TableCell sx={{ fontWeight: 900, fontSize: '1.1rem', color: group.balanceBags <= 0 ? '#DC2626' : '#1E293B' }}>
                    {group.balanceBags}
                  </TableCell>
                  <TableCell align="right">
                    <Button 
                      variant="contained" 
                      size="small" 
                      startIcon={<SwapHorizIcon />}
                      onClick={() => handleOpenTransfer(group)}
                      sx={{ backgroundColor: '#0284C7', color: '#FFF', fontWeight: 700, borderRadius: 1 }}
                    >
                      TRANSFER TO B2B
                    </Button>
                  </TableCell>
                </TableRow>
                
                {/* Expandable History Drawer */}
                <TableRow>
                  <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
                    <Collapse in={expandedGroup === group.id} timeout="auto" unmountOnExit>
                      <Box sx={{ margin: 2, p: 2, backgroundColor: '#F8FAFC', borderRadius: 2, border: '1px solid #E2E8F0' }}>
                        <Typography sx={{ fontWeight: 800, mb: 1, color: '#475569', fontSize: '0.85rem' }}>HISTORY & CONTRIBUTORS</Typography>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem' }}>TYPE</TableCell>
                              <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem' }}>DATE</TableCell>
                              <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem' }}>FARMER / EVENT</TableCell>
                              <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem' }}>SLIP NO</TableCell>
                              <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem' }}>WEIGHT</TableCell>
                              <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem' }}>BAGS</TableCell>
                              <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem' }}></TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {group.history.map((h: any) => {
                              const isOut = h.type === 'OUT';
                              return (
                                <TableRow key={h.id}>
                                  <TableCell>
                                    <Box sx={{ 
                                      display: 'inline-block', px: 1, py: 0.2, borderRadius: 1, fontSize: '0.7rem', fontWeight: 800,
                                      backgroundColor: isOut ? '#FEE2E2' : '#D1FAE5',
                                      color: isOut ? '#DC2626' : '#059669'
                                    }}>
                                      {isOut ? 'OUT' : 'IN'}
                                    </Box>
                                  </TableCell>
                                  <TableCell>{new Date(h.date).toLocaleDateString('en-IN')}</TableCell>
                                  <TableCell sx={{ fontWeight: 600 }}>{h.farmerName}</TableCell>
                                  <TableCell sx={{ fontSize: '0.8rem' }}>{h.slipNo || '-'}</TableCell>
                                  <TableCell sx={{ fontWeight: 700, color: isOut ? '#DC2626' : '#059669' }}>
                                    {isOut ? '-' : '+'}{h.weight} kg
                                  </TableCell>
                                  <TableCell sx={{ fontWeight: 700 }}>
                                    {isOut ? '-' : '+'}{h.totalBags}
                                  </TableCell>
                                  <TableCell align="right">
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
                <TableCell colSpan={8} align="center" sx={{ py: 8, color: '#94A3B8', fontWeight: 600, letterSpacing: 1 }}>
                  NO INVENTORY FOUND
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Manual IN Dialog */}
      <Dialog open={open} onClose={() => !loading && setOpen(false)} maxWidth="sm" fullWidth>
        <Box sx={{ p: 3 }}>
          <Typography sx={{ fontWeight: 900, letterSpacing: 2, fontSize: '1rem', mb: 3 }}>
            ADD MANUAL INVENTORY (IN)
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth required>
                <InputLabel>Godown</InputLabel>
                <Select
                  value={formData.godownId}
                  label="Godown"
                  onChange={(e) => setFormData({ ...formData, godownId: e.target.value as string })}
                >
                  {godowns.map(g => (
                    <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
                  ))}
                  {godowns.length === 0 && <MenuItem disabled>No Godowns Found (Add in Settings)</MenuItem>}
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
              />
            </Box>

            <FormControl fullWidth required>
              <InputLabel>Item / Crop</InputLabel>
              <Select
                value={formData.productId}
                label="Item / Crop"
                onChange={(e) => setFormData({ ...formData, productId: e.target.value as string })}
              >
                {products.map(p => (
                  <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Autocomplete
              fullWidth
              options={[{ id: 'OTHER', name: 'OTHER (Not in list)' }, ...farmers]}
              getOptionLabel={(option) => option.id === 'OTHER' ? option.name : `${option.name} ${option.farmerId ? `[ID: ${option.farmerId}]` : ''} ${option.phoneNumber ? `(${option.phoneNumber})` : ''}`}
              value={formData.farmerId === 'OTHER' ? { id: 'OTHER', name: 'OTHER (Not in list)' } : farmers.find(f => f.id === formData.farmerId) || null}
              onChange={(_, newValue) => setFormData({ ...formData, farmerId: newValue ? newValue.id : '' })}
              renderInput={(params) => <TextField {...params} label="Select Farmer or OTHER" required />}
            />
            
            {formData.farmerId === 'OTHER' && (
              <TextField
                label="Custom Farmer Name"
                fullWidth
                required
                value={formData.otherFarmerName}
                onChange={(e) => setFormData({ ...formData, otherFarmerName: e.target.value })}
              />
            )}

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Slip No (Optional)"
                fullWidth
                value={formData.slipNo}
                onChange={(e) => setFormData({ ...formData, slipNo: e.target.value })}
              />
              <TextField
                label="Lot No (Optional)"
                fullWidth
                value={formData.lotNo}
                onChange={(e) => setFormData({ ...formData, lotNo: e.target.value })}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Weight (kg)"
                fullWidth
                required
                type="number"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
              />
              <TextField
                label="Total Bags"
                fullWidth
                required
                type="number"
                value={formData.totalBags}
                onChange={(e) => setFormData({ ...formData, totalBags: e.target.value })}
              />
            </Box>
          </Box>
        </Box>
        <DialogActions sx={{ borderTop: '1px solid #E2E8F0', p: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={loading} sx={{ fontWeight: 700, color: '#000' }}>CANCEL</Button>
          <Button variant="contained" onClick={handleSave} disabled={loading} sx={{ backgroundColor: '#1B2A4A', color: '#FFF', fontWeight: 700, borderRadius: 0 }}>
            {loading ? <CircularProgress size={20} color="inherit" /> : 'SAVE INVENTORY'}
          </Button>
        </DialogActions>
      </Dialog>


      {/* Transfer to B2B Catalog Dialog */}
      <Dialog open={openTransfer} onClose={() => !loading && setOpenTransfer(false)} maxWidth="sm" fullWidth>
        <Box sx={{ p: 3 }}>
          <Typography sx={{ fontWeight: 900, letterSpacing: 2, fontSize: '1rem', mb: 1, color: '#0284C7' }}>
            TRANSFER TO B2B CATALOG
          </Typography>
          <Typography sx={{ color: '#475569', fontSize: '0.85rem', mb: 3 }}>
            Transferring stock for <strong>{transferData.groupName}</strong>. This will reduce Godown balance and increase live Product stock.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="Date"
              type="date"
              fullWidth
              required
              slotProps={{ inputLabel: { shrink: true } }}
              value={transferData.date}
              onChange={(e) => setTransferData({ ...transferData, date: e.target.value })}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Transfer Weight (kg)"
                fullWidth
                required
                type="number"
                value={transferData.weight}
                onChange={(e) => setTransferData({ ...transferData, weight: e.target.value })}
              />
              <TextField
                label="Transfer Bags"
                fullWidth
                required
                type="number"
                value={transferData.totalBags}
                onChange={(e) => setTransferData({ ...transferData, totalBags: e.target.value })}
              />
            </Box>
            
            <TextField
              label="Notes (Optional)"
              fullWidth
              multiline
              rows={2}
              value={transferData.notes}
              onChange={(e) => setTransferData({ ...transferData, notes: e.target.value })}
            />
          </Box>
        </Box>
        <DialogActions sx={{ borderTop: '1px solid #E2E8F0', p: 2 }}>
          <Button onClick={() => setOpenTransfer(false)} disabled={loading} sx={{ fontWeight: 700, color: '#000' }}>CANCEL</Button>
          <Button variant="contained" onClick={handleTransfer} disabled={loading} sx={{ backgroundColor: '#0284C7', color: '#FFF', fontWeight: 700, borderRadius: 0 }}>
            {loading ? <CircularProgress size={20} color="inherit" /> : 'CONFIRM TRANSFER'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
