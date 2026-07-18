import { useState, useEffect } from 'react';
import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, Button, Dialog, DialogActions, TextField, CircularProgress, IconButton } from '@mui/material';
import { collection, getDocs, getFirestore, updateDoc, doc, addDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, getStorage } from 'firebase/storage';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import app from '../firebase';
import { useUI } from '../context/UIContext';

const db = getFirestore(app);
const storage = getStorage(app);

export default function Categories() {
  const { showConfirm, showMessage } = useUI();
  const [categories, setCategories] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({ 
    name: '',
    iconUrl: '',
    order: 0
  });

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'categories'));
      const fetched = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      fetched.sort((a, b) => (a.order || 0) - (b.order || 0));
      setCategories(fetched);
    } catch (e) {
      console.log('Error fetching categories', e);
    }
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setFormData({ name: '', iconUrl: '', order: categories.length });
    setOpen(true);
  };

  const handleEdit = (c: any) => {
    setEditingId(c.id);
    setFormData({ 
      name: c.name || '',
      iconUrl: c.iconUrl || '', 
      order: c.order || 0
    });
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    showConfirm('Delete Category', 'Are you sure you want to delete this category?', async () => {
      try {
        await deleteDoc(doc(db, 'categories', id));
        showMessage('Category deleted successfully!', 'success');
        fetchCategories();
      } catch (e: any) {
        showMessage(e.message, 'error');
      }
    });
  };

  const handleSave = async () => {
    if (!formData.name) {
      showMessage('Name is required', 'error');
      return;
    }
    setLoading(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'categories', editingId), formData);
        showMessage('Category updated successfully!', 'success');
      } else {
        await addDoc(collection(db, 'categories'), formData);
        showMessage('Category added successfully!', 'success');
      }
      setOpen(false);
      fetchCategories();
    } catch (e: any) {
      showMessage(e.message, 'error');
    }
    setLoading(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showMessage("Icon size must be less than 2MB.", "error");
      return;
    }

    setUploading(true);
    try {
      const storageRef = ref(storage, `categories/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log('Upload is ' + progress + '% done');
        }, 
        (error) => {
          showMessage(error.message, 'error');
          setUploading(false);
        }, 
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setFormData({ ...formData, iconUrl: downloadURL });
          setUploading(false);
          showMessage('Icon uploaded successfully', 'success');
        }
      );
    } catch (error: any) {
      showMessage(error.message, 'error');
      setUploading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography sx={{ fontWeight: 900, fontSize: '1.5rem', letterSpacing: 1 }}>
          CATEGORIES
        </Typography>
        <Button variant="contained" onClick={handleOpenNew} sx={{ mr: { md: 8 }, backgroundColor: '#000', color: '#FFF', borderRadius: 0, fontWeight: 700, px: 3, '&:hover': { backgroundColor: '#333' } }}>
          + ADD CATEGORY
        </Button>
      </Box>

      <TableContainer sx={{ border: '2px solid #000', borderRadius: 0, backgroundColor: '#FFF' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#F5F5F5', '& th': { borderBottom: '2px solid #000', fontWeight: 900, color: '#000' } }}>
              <TableCell>ICON</TableCell>
              <TableCell>NAME</TableCell>
              <TableCell>ORDER</TableCell>
              <TableCell align="right">ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {categories.map((c) => (
              <TableRow key={c.id} sx={{ '& td': { borderBottom: '1px solid #EEE' } }}>
                <TableCell>
                  {c.iconUrl ? (
                    <Box component="img" src={c.iconUrl} sx={{ width: 40, height: 40, objectFit: 'cover', borderRadius: '50%', border: '1px solid #CCC' }} />
                  ) : (
                    <Box sx={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#F5F5F5', border: '1px solid #CCC' }} />
                  )}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{c.name}</TableCell>
                <TableCell>{c.order}</TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => handleEdit(c)}><EditIcon /></IconButton>
                  <IconButton onClick={() => handleDelete(c.id)} color="error"><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {categories.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 3, color: '#666' }}>
                  No categories found. Add some to display on the mobile app home screen.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add / Edit Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { border: '2px solid #000', borderRadius: 0 } } }}>
        <Box sx={{ p: 3, borderBottom: '2px solid #000', backgroundColor: '#F5F5F5' }}>
          <Typography sx={{ fontWeight: 900, fontSize: '1.2rem', letterSpacing: 1 }}>
            {editingId ? 'EDIT CATEGORY' : 'ADD NEW CATEGORY'}
          </Typography>
        </Box>
        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            label="Category Name (e.g. Grains, Spices)"
            fullWidth
            variant="outlined"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Box>
            <Button
              component="label"
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              disabled={uploading}
              sx={{ width: '100%', height: 100, borderStyle: 'dashed', borderWidth: 2, borderColor: '#000', color: '#000' }}
            >
              {uploading ? 'UPLOADING...' : 'UPLOAD ICON (PNG, MAX 2MB)'}
              <input type="file" hidden accept="image/*" onChange={handleImageUpload} />
            </Button>
            {formData.iconUrl && (
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                <Box component="img" src={formData.iconUrl} sx={{ width: 80, height: 80, objectFit: 'cover', borderRadius: '50%', border: '2px solid #000' }} />
              </Box>
            )}
          </Box>
          <TextField
            label="Order / Priority"
            type="number"
            fullWidth
            variant="outlined"
            value={formData.order}
            onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
          />
        </Box>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setOpen(false)} sx={{ color: '#000', fontWeight: 700 }}>CANCEL</Button>
          <Button onClick={handleSave} variant="contained" disabled={loading} sx={{ backgroundColor: '#000', color: '#FFF', fontWeight: 700, borderRadius: 0, '&:hover': { backgroundColor: '#333' } }}>
            {loading ? <CircularProgress size={24} color="inherit" /> : 'SAVE'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
