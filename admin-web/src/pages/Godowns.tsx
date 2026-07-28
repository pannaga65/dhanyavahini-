import { useState, useEffect } from 'react';
import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, Button, Dialog, DialogActions, TextField, CircularProgress, IconButton, Switch, FormControlLabel, Card } from '@mui/material';
import { collection, getDocs, getFirestore, addDoc, serverTimestamp, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import app from '../firebase';
import { useUI } from '../context/UIContext';

const db = getFirestore(app);

export default function Godowns() {
  const { showConfirm, showMessage } = useUI();
  const [godowns, setGodowns] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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
      <Card elevation={0} sx={{ borderRadius: '12px', border: '1px solid #E2E8F0', backgroundColor: '#FAFAF7', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: { xs: 2, sm: 3 }, borderBottom: '1px solid #E2E8F0' }}>
        <Typography sx={{ fontWeight: 800, fontSize: '18px', color: '#1B4332' }}>Godowns</Typography>
        <Button variant="contained" onClick={() => handleOpen()} sx={{ backgroundColor: '#1B4332', color: '#FFF', fontWeight: 700, borderRadius: '8px', boxShadow: 'none', px: 3, '&:hover': { backgroundColor: '#143325', boxShadow: 'none' } }}>
          + Add Godown
        </Button>
      </Box>

      <TableContainer>
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
            {godowns.map((row) => (
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
                  <IconButton onClick={() => handleOpen(row)} size="small" sx={{ mr: 1 }}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(row.id)} size="small" sx={{ color: 'red' }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {godowns.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                  <Typography sx={{ color: '#94A3B8', fontWeight: 600, mb: 2 }}>No godowns found.</Typography>
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
