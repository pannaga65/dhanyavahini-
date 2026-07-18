import { useState, useEffect } from 'react';
import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, Button, Dialog, DialogActions, TextField, CircularProgress, IconButton, Switch } from '@mui/material';
import { collection, getDocs, getFirestore, updateDoc, doc, addDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, getStorage } from 'firebase/storage';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import app from '../firebase';
import { useUI } from '../context/UIContext';

const db = getFirestore(app);
const storage = getStorage(app);

export default function Banners() {
  const { showConfirm, showMessage } = useUI();
  const [banners, setBanners] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState({ 
    imageUrl: '', 
    redirectLink: '', 
    isActive: true,
    order: 0
  });

  useEffect(() => { fetchBanners(); }, []);

  const fetchBanners = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'banners'));
      const fetched = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetched.sort((a, b) => (a.order || 0) - (b.order || 0));
      setBanners(fetched);
    } catch (e) {
      console.log('Error fetching banners', e);
    }
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setFormData({ imageUrl: '', redirectLink: '', isActive: true, order: banners.length });
    setOpen(true);
  };

  const handleEdit = (b: any) => {
    setEditingId(b.id);
    setFormData({ 
      imageUrl: b.imageUrl || '', 
      redirectLink: b.redirectLink || '', 
      isActive: b.isActive !== false,
      order: b.order || 0
    });
    setOpen(true);
  };

  const handleDelete = (id: string) => {
    showConfirm('Delete Banner', 'Are you sure you want to delete this banner?', async () => {
      try {
        await deleteDoc(doc(db, 'banners', id));
        showMessage('Banner deleted successfully!', 'success');
        fetchBanners();
      } catch (e: any) {
        showMessage(e.message, 'error');
      }
    });
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'banners', id), { isActive: !currentStatus });
      fetchBanners();
    } catch (e: any) {
      showMessage(e.message, 'error');
    }
  };

  const handleSave = async () => {
    if (!formData.imageUrl) {
      showMessage('Image URL is required', 'error');
      return;
    }
    setLoading(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'banners', editingId), formData);
        showMessage('Banner updated successfully!', 'success');
      } else {
        await addDoc(collection(db, 'banners'), formData);
        showMessage('Banner added successfully!', 'success');
      }
      setOpen(false);
      fetchBanners();
    } catch (e: any) {
      showMessage(e.message, 'error');
    }
    setLoading(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showMessage("Image size must be less than 2MB.", "error");
      return;
    }

    setUploading(true);
    try {
      const storageRef = ref(storage, `banners/${Date.now()}_${file.name}`);
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
          setFormData({ ...formData, imageUrl: downloadURL });
          setUploading(false);
          showMessage('Image uploaded successfully', 'success');
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
          BANNERS
        </Typography>
        <Button variant="contained" onClick={handleOpenNew} sx={{ mr: { md: 8 }, backgroundColor: '#000', color: '#FFF', borderRadius: 0, fontWeight: 700, px: 3, '&:hover': { backgroundColor: '#333' } }}>
          + ADD BANNER
        </Button>
      </Box>

      <TableContainer sx={{ border: '2px solid #000', borderRadius: 0, backgroundColor: '#FFF' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#F5F5F5', '& th': { borderBottom: '2px solid #000', fontWeight: 900, color: '#000' } }}>
              <TableCell>IMAGE</TableCell>
              <TableCell>REDIRECT LINK</TableCell>
              <TableCell>ORDER</TableCell>
              <TableCell>ACTIVE</TableCell>
              <TableCell align="right">ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {banners.map((b) => (
              <TableRow key={b.id} sx={{ '& td': { borderBottom: '1px solid #EEE' } }}>
                <TableCell>
                  <Box component="img" src={b.imageUrl} sx={{ width: 120, height: 60, objectFit: 'cover', borderRadius: 1, border: '1px solid #CCC' }} />
                </TableCell>
                <TableCell>{b.redirectLink || 'None'}</TableCell>
                <TableCell>{b.order}</TableCell>
                <TableCell>
                  <Switch 
                    checked={b.isActive !== false}
                    onChange={() => handleToggleActive(b.id, b.isActive !== false)}
                    color="primary"
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton onClick={() => handleEdit(b)}><EditIcon /></IconButton>
                  <IconButton onClick={() => handleDelete(b.id)} color="error"><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
            {banners.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 3, color: '#666' }}>
                  No banners found. Add some to display on the mobile app home screen.
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
            {editingId ? 'EDIT BANNER' : 'ADD NEW BANNER'}
          </Typography>
        </Box>
        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box>
            <Button
              component="label"
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              disabled={uploading}
              sx={{ width: '100%', height: 100, borderStyle: 'dashed', borderWidth: 2, borderColor: '#000', color: '#000' }}
            >
              {uploading ? 'UPLOADING...' : 'UPLOAD IMAGE (MAX 2MB)'}
              <input type="file" hidden accept="image/*" onChange={handleImageUpload} />
            </Button>
            {formData.imageUrl && (
              <Box component="img" src={formData.imageUrl} sx={{ width: '100%', height: 150, objectFit: 'cover', mt: 2, border: '1px solid #000' }} />
            )}
          </Box>
          <TextField
            label="Redirect Link (e.g. /product/123)"
            fullWidth
            variant="outlined"
            value={formData.redirectLink}
            onChange={(e) => setFormData({ ...formData, redirectLink: e.target.value })}
          />
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
