import { useState, useEffect } from 'react';
import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, Button, Dialog, DialogActions, TextField, CircularProgress, IconButton } from '@mui/material';
import { collection, getDocs, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { getFirestore } from 'firebase/firestore';
import app from '../firebase';
import { useUI } from '../context/UIContext';

const db = getFirestore(app);

interface Category {
  id: string;
  name: string;
  sortOrder: number;
}

export default function Settings() {
  const { showConfirm, showMessage } = useUI();
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState('0');

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'categories'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Category[];
      data.sort((a, b) => a.sortOrder - b.sortOrder);
      setCategories(data);
    } catch (e) {
      console.log('Error fetching categories', e);
    }
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setName('');
    setSortOrder((categories.length * 10).toString());
    setOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingId(cat.id);
    setName(cat.name);
    setSortOrder(cat.sortOrder.toString());
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    showConfirm("Are you sure you want to permanently delete this category? (Products assigned to it will keep the text, but won't show in the mobile app grouping).", async () => {
      try {
        await deleteDoc(doc(db, 'categories', id));
        fetchCategories();
        showMessage("Category deleted", "success");
      } catch (e) {
        console.error("Error deleting", e);
        showMessage("Failed to delete category.", "error");
      }
    });
  };

  const handleSave = async () => {
    if (!name) {
      showMessage('Please enter a category name.', 'error');
      return;
    }
    setLoading(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'categories', editingId), {
          name,
          sortOrder: Number(sortOrder)
        });
        showMessage("Category updated", "success");
      } else {
        await addDoc(collection(db, 'categories'), {
          name,
          sortOrder: Number(sortOrder)
        });
        showMessage("Category created", "success");
      }
      setOpen(false);
      fetchCategories();
    } catch (e) {
      console.error('Error saving category', e);
      showMessage('Error saving category.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box>
          <Typography sx={{ fontWeight: 900, fontSize: { xs: '1.8rem', md: '2.2rem' }, letterSpacing: 3 }}>
            SETTINGS
          </Typography>
          <Typography sx={{ fontWeight: 600, color: '#999', letterSpacing: 1.5, fontSize: '0.8rem', mt: 0.5 }}>
            MANAGE CATEGORIES & CONFIGURATION
          </Typography>
        </Box>
      </Box>
      <Box sx={{ borderBottom: '2px solid #000', mb: 3, mt: 2 }} />
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <Button variant="contained" onClick={handleOpenNew} sx={{ fontWeight: 700 }}>
          + ADD CATEGORY
        </Button>
      </Box>

      <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', mb: 2 }}>PRODUCT CATEGORIES</Typography>
      
      <TableContainer sx={{ maxWidth: 600 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 900 }}>SORT ORDER</TableCell>
              <TableCell sx={{ fontWeight: 900 }}>CATEGORY NAME</TableCell>
              <TableCell sx={{ fontWeight: 900 }} align="right">ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {categories.map((row) => (
              <TableRow key={row.id} sx={{ '&:hover': { backgroundColor: '#FAFAFA' } }}>
                <TableCell>{row.sortOrder}</TableCell>
                <TableCell sx={{ fontWeight: 700, textTransform: 'uppercase' }}>{row.name}</TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => handleOpenEdit(row)} size="small" sx={{ mr: 1, color: '#000' }}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(row.id)} size="small" sx={{ color: 'red' }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {categories.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 4, color: '#999', fontWeight: 600 }}>
                  NO CATEGORIES YET
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => !loading && setOpen(false)} maxWidth="xs" fullWidth>
        <Box sx={{ p: 3 }}>
          <Typography sx={{ fontWeight: 900, letterSpacing: 2, fontSize: '1rem', mb: 3 }}>
            {editingId ? 'EDIT CATEGORY' : 'ADD NEW CATEGORY'}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField label="Category Name (e.g. Rice, Pulses)" fullWidth required value={name} onChange={e => setName(e.target.value)} />
            <TextField label="Sort Order (Lower appears first)" type="number" fullWidth value={sortOrder} onChange={e => setSortOrder(e.target.value)} />
          </Box>
        </Box>
        <DialogActions sx={{ borderTop: '2px solid #000', p: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={loading} sx={{ fontWeight: 700, color: '#000' }}>CANCEL</Button>
          <Button variant="contained" onClick={handleSave} disabled={loading} sx={{ backgroundColor: '#000', color: '#FFF', fontWeight: 700, borderRadius: 0 }}>
            {loading ? <CircularProgress size={20} color="inherit" /> : 'SAVE'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
