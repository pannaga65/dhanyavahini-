import { useState, useEffect } from 'react';
import { Typography, Table, Menu, MenuItem, InputAdornment, Grid, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, Button, Dialog, DialogActions, TextField, CircularProgress, IconButton, Switch, FormControlLabel, Card } from '@mui/material';
import { collection, getDocs, getFirestore, addDoc, serverTimestamp, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import StoreIcon from '@mui/icons-material/Store';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import app from '../firebase';
import { useUI } from '../context/UIContext';

const db = getFirestore(app);

export default function Godowns() {
  const { showConfirm, showMessage } = useUI();
  const [godowns, setGodowns] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuRow, setMenuRow] = useState<any | null>(null);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, row: any) => {
    setAnchorEl(event.currentTarget);
    setMenuRow(row);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuRow(null);
  };

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    managerName: '',
    capacity: '',
    isActive: true
  });

  useEffect(() => {
    fetchGodowns();
  }, []);

  const fetchGodowns = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'godowns'));
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
      setGodowns(data);
    } catch (e) {
      console.error('Error fetching godowns', e);
    }
  };

  const handleOpen = (godown: any = null) => {
    if (godown) {
      setEditingId(godown.id);
      setFormData({
        name: godown.name || '',
        location: godown.location || '',
        managerName: godown.managerName || '',
        capacity: godown.capacity ? godown.capacity.toString() : '',
        isActive: godown.isActive !== false
      });
    } else {
      setEditingId(null);
      setFormData({ name: '', location: '', managerName: '', capacity: '', isActive: true });
    }
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    showConfirm("Are you sure you want to delete this godown? Make sure there is no inventory tied to it.", async () => {
      try {
        await deleteDoc(doc(db, 'godowns', id));
        fetchGodowns();
        showMessage("Godown deleted", "success");
      } catch (e) {
        console.error("Error deleting", e);
        showMessage("Failed to delete.", "error");
      }
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return showMessage('Please enter a godown name.', 'error');
    if (!formData.location.trim()) return showMessage('Please enter a location.', 'error');

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        location: formData.location.trim(),
        managerName: formData.managerName.trim(),
        capacity: formData.capacity ? Number(formData.capacity) : null,
        isActive: formData.isActive
      };

      if (editingId) {
        await updateDoc(doc(db, 'godowns', editingId), payload);
        showMessage("Godown updated successfully", "success");
      } else {
        await addDoc(collection(db, 'godowns'), { ...payload, createdAt: serverTimestamp() });
        showMessage("Godown created successfully", "success");
      }
      setOpen(false);
      fetchGodowns();
    } catch (error: any) {
      console.error('Error saving godown:', error);
      showMessage('Error saving godown: ' + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'godowns', id), { isActive: !currentStatus });
      fetchGodowns();
    } catch (error) {
      console.error('Error toggling status:', error);
      showMessage('Failed to update status', 'error');
    }
  };

  return (
    <Box>
      
      {/* Metrics Row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 2, border: '1px solid #E2E8F0', boxShadow: 'none' }}>
            <Box sx={{ p: 1, borderRadius: 1.5, backgroundColor: '#F3F5F1', color: '#1B4332', display: 'flex' }}><StoreIcon /></Box>
            <Box>
              <Typography sx={{ color: '#64748B', fontSize: '13px', fontWeight: 600 }}>Total Godowns</Typography>
              <Typography sx={{ color: '#0F172A', fontSize: '20px', fontWeight: 800 }}>{godowns.length}</Typography>
            </Box>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 2, border: '1px solid #E2E8F0', boxShadow: 'none' }}>
            <Box sx={{ p: 1, borderRadius: 1.5, backgroundColor: '#F0FDF4', color: '#16A34A', display: 'flex' }}><CheckCircleIcon /></Box>
            <Box>
              <Typography sx={{ color: '#64748B', fontSize: '13px', fontWeight: 600 }}>Active</Typography>
              <Typography sx={{ color: '#0F172A', fontSize: '20px', fontWeight: 800 }}>{godowns.filter((g: any) => g.isActive !== false).length}</Typography>
            </Box>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 2, border: '1px solid #E2E8F0', boxShadow: 'none' }}>
            <Box sx={{ p: 1, borderRadius: 1.5, backgroundColor: '#FEF2F2', color: '#DC2626', display: 'flex' }}><CancelIcon /></Box>
            <Box>
              <Typography sx={{ color: '#64748B', fontSize: '13px', fontWeight: 600 }}>Inactive</Typography>
              <Typography sx={{ color: '#0F172A', fontSize: '20px', fontWeight: 800 }}>{godowns.filter((g: any) => g.isActive === false).length}</Typography>
            </Box>
          </Card>
        </Grid>
      </Grid>

      <Card elevation={0} sx={{ borderRadius: '12px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, p: { xs: 2, sm: 3 }, gap: 2, borderBottom: '1px solid #E2E8F0' }}>
        <Box sx={{ display: 'flex', gap: 2, flexGrow: 1, maxWidth: { sm: 400 } }}>
          <TextField 
            placeholder="Search godowns..." 
            size="small" 
            fullWidth
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{ input: {
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: '#94A3B8' }} /></InputAdornment>,
              sx: { borderRadius: '8px', backgroundColor: '#F8FAFC', '& fieldset': { borderColor: '#E2E8F0' } }
            } }}
          />
          <Button variant="outlined" sx={{ minWidth: 0, px: 2, borderColor: '#E2E8F0', color: '#64748B', borderRadius: '8px' }}>
            <FilterListIcon fontSize="small" />
          </Button>
        </Box>
        <Button variant="contained" onClick={() => handleOpen()} sx={{ backgroundColor: '#1B4332', color: '#FFF', fontWeight: 600, borderRadius: '8px', boxShadow: 'none', px: 3, '&:hover': { backgroundColor: '#143325', boxShadow: 'none' } }}>
          + Add Godown
        </Button>
      </Box>

      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table>
          <TableHead sx={{ backgroundColor: '#F3F5F1' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800, color: '#64748B', fontSize: '12px' }}>NAME</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#64748B', fontSize: '12px' }}>LOCATION</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#64748B', fontSize: '12px' }}>MANAGER</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#64748B', fontSize: '12px' }}>CAPACITY</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#64748B', fontSize: '12px' }}>STATUS</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#64748B', fontSize: '12px' }} align="right">ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {godowns.filter((g: any) => g.name.toLowerCase().includes(searchQuery.toLowerCase()) || g.location.toLowerCase().includes(searchQuery.toLowerCase())).map((row) => (
              <TableRow key={row.id} sx={{ '&:hover': { backgroundColor: '#FAFAFA' }, opacity: row.isActive === false ? 0.6 : 1 }}>
                <TableCell sx={{ fontWeight: 900 }}>{row.name}</TableCell>
                <TableCell>{row.location}</TableCell>
                <TableCell>{row.managerName || '-'}</TableCell>
                <TableCell>{row.capacity ? `${row.capacity} Bags` : '-'}</TableCell>
                <TableCell>
                  <FormControlLabel
                    control={<Switch size="small" checked={row.isActive !== false} onChange={() => handleToggleStatus(row.id, row.isActive !== false)} color="success" />}
                    label={row.isActive !== false ? "Active" : "Inactive"}
                    sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.8rem', fontWeight: 700 } }}
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={(e) => handleMenuClick(e, row)} sx={{ color: '#64748B' }}>
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {godowns.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                  <Typography sx={{ color: '#94A3B8', fontWeight: 600, mb: 2 }}>{!navigator.onLine ? "NO INTERNET CONNECTION" : "No godowns found."}</Typography>
                  <Button variant="outlined" onClick={() => handleOpen()} sx={{ color: '#1B4332', borderColor: '#E2E8F0', fontWeight: 600, borderRadius: '8px' }}>
                    Create First Godown
                  </Button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        slotProps={{ paper: { sx: { boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', border: '1px solid #E2E8F0', borderRadius: '8px', minWidth: 150 } } }}
      >
        <MenuItem onClick={() => { handleOpen(menuRow); handleMenuClose(); }} sx={{ fontSize: '14px', color: '#0F172A' }}>
          <EditIcon fontSize="small" sx={{ mr: 1.5, color: '#64748B' }} /> Edit
        </MenuItem>
        <MenuItem onClick={() => { handleDelete(menuRow.id); handleMenuClose(); }} sx={{ fontSize: '14px', color: '#DC2626' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1.5, color: '#DC2626' }} /> Delete
        </MenuItem>
      </Menu>

      <Dialog open={open} onClose={() => !loading && setOpen(false)} maxWidth="sm" fullWidth>
        <Box sx={{ p: 3 }}>
          <Typography sx={{ fontWeight: 900, letterSpacing: 2, fontSize: '1rem', mb: 3 }}>
            {editingId ? 'EDIT GODOWN' : 'CREATE GODOWN'}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="Godown Name"
              fullWidth
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <TextField
              label="Location / Address"
              fullWidth
              required
              multiline
              rows={2}
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Manager Name (Optional)"
                fullWidth
                value={formData.managerName}
                onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
              />
              <TextField
                label="Capacity in Bags (Optional)"
                fullWidth
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              />
            </Box>
            <FormControlLabel
              control={<Switch checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} color="success" />}
              label="Active Status"
              sx={{ '& .MuiFormControlLabel-label': { fontWeight: 700 } }}
            />
          </Box>
        </Box>
        <DialogActions sx={{ borderTop: '1px solid #E2E8F0', p: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={loading} sx={{ fontWeight: 700, color: '#000' }}>CANCEL</Button>
          <Button variant="contained" onClick={handleSave} disabled={loading} sx={{ backgroundColor: '#1B2A4A', color: '#FFF', fontWeight: 700, borderRadius: 0 }}>
            {loading ? <CircularProgress size={20} color="inherit" /> : 'SAVE'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
