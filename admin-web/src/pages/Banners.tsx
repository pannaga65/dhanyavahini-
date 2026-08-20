import { useState, useEffect } from 'react';
import { Typography, Table, Menu, MenuItem, InputAdornment, Grid, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, Button, Dialog, DialogActions, TextField, CircularProgress, IconButton, Switch, Card } from '@mui/material';
import { collection, getDocs, getFirestore, updateDoc, doc, addDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, getStorage } from 'firebase/storage';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ImageIcon from '@mui/icons-material/Image';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import app from '../firebase';
import { useUI } from '../context/UIContext';
import imageCompression from 'browser-image-compression';

const db = getFirestore(app);
const storage = getStorage(app);

export default function Banners() {
  const { showConfirm, showMessage } = useUI();
  const [banners, setBanners] = useState<any[]>([]);
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
      const fetched = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
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
    showConfirm('Are you sure you want to delete this banner?', async () => {
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

    if (file.size > 5 * 1024 * 1024) {
      showMessage("Image size must be less than 5MB.", "error");
      return;
    }

    setUploading(true);
    try {
      const options = {
        maxSizeMB: 0.2, // Compress to max 200KB for banners
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(file, options);

      const storageRef = ref(storage, `banners/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, compressedFile);

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
      
      {/* Metrics Row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 2, border: '1px solid #E2E8F0', boxShadow: 'none' }}>
            <Box sx={{ p: 1, borderRadius: 1.5, backgroundColor: '#F3F5F1', color: '#1B4332', display: 'flex' }}><ImageIcon /></Box>
            <Box>
              <Typography sx={{ color: '#64748B', fontSize: '13px', fontWeight: 600 }}>Total Banners</Typography>
              <Typography sx={{ color: '#0F172A', fontSize: '20px', fontWeight: 800 }}>{banners.length}</Typography>
            </Box>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 2, border: '1px solid #E2E8F0', boxShadow: 'none' }}>
            <Box sx={{ p: 1, borderRadius: 1.5, backgroundColor: '#F0FDF4', color: '#16A34A', display: 'flex' }}><CheckCircleIcon /></Box>
            <Box>
              <Typography sx={{ color: '#64748B', fontSize: '13px', fontWeight: 600 }}>Active</Typography>
              <Typography sx={{ color: '#0F172A', fontSize: '20px', fontWeight: 800 }}>{banners.filter((b: any) => b.isActive !== false).length}</Typography>
            </Box>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 2, border: '1px solid #E2E8F0', boxShadow: 'none' }}>
            <Box sx={{ p: 1, borderRadius: 1.5, backgroundColor: '#FEF2F2', color: '#DC2626', display: 'flex' }}><CancelIcon /></Box>
            <Box>
              <Typography sx={{ color: '#64748B', fontSize: '13px', fontWeight: 600 }}>Inactive</Typography>
              <Typography sx={{ color: '#0F172A', fontSize: '20px', fontWeight: 800 }}>{banners.filter((b: any) => b.isActive === false).length}</Typography>
            </Box>
          </Card>
        </Grid>
      </Grid>

      <Card elevation={0} sx={{ borderRadius: '12px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, p: { xs: 2, sm: 3 }, gap: 2, borderBottom: '1px solid #E2E8F0' }}>
        <Box sx={{ display: 'flex', gap: 2, flexGrow: 1, maxWidth: { sm: 400 } }}>
          <TextField 
            placeholder="Search links..." 
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
        <Button variant="contained" onClick={handleOpenNew} sx={{ backgroundColor: '#1B4332', color: '#FFF', fontWeight: 600, borderRadius: '8px', boxShadow: 'none', px: 3, '&:hover': { backgroundColor: '#143325', boxShadow: 'none' } }}>
          + Add Banner
        </Button>
      </Box>

      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table>
          <TableHead sx={{ backgroundColor: '#F3F5F1' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800, color: '#64748B', fontSize: '12px' }}>IMAGE</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#64748B', fontSize: '12px' }}>REDIRECT LINK</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#64748B', fontSize: '12px' }}>ORDER</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#64748B', fontSize: '12px' }}>ACTIVE</TableCell>
              <TableCell sx={{ fontWeight: 800, color: '#64748B', fontSize: '12px' }} align="right">ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {banners.filter((b: any) => (b.redirectLink || '').toLowerCase().includes(searchQuery.toLowerCase())).map((b) => (
              <TableRow key={b.id} sx={{ '& td': { borderBottom: '1px solid #EEE' } }}>
                <TableCell>
                  <Box component="img" loading="lazy" src={b.imageUrl} sx={{ width: 120, height: 60, objectFit: 'cover', borderRadius: 1, border: '1px solid #CCC' }} />
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
                  <IconButton size="small" onClick={(e) => handleMenuClick(e, b)} sx={{ color: '#64748B' }}>
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {banners.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 10 }}>
                  <Typography sx={{ color: '#94A3B8', fontWeight: 600, mb: 2 }}>{!navigator.onLine ? "NO INTERNET CONNECTION" : "No banners found."}</Typography>
                  <Button variant="outlined" onClick={handleOpenNew} sx={{ color: '#1B4332', borderColor: '#E2E8F0', fontWeight: 600, borderRadius: '8px' }}>
                    Create First Banner
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
        <MenuItem onClick={() => { handleEdit(menuRow); handleMenuClose(); }} sx={{ fontSize: '14px', color: '#0F172A' }}>
          <EditIcon fontSize="small" sx={{ mr: 1.5, color: '#64748B' }} /> Edit
        </MenuItem>
        <MenuItem onClick={() => { handleDelete(menuRow.id); handleMenuClose(); }} sx={{ fontSize: '14px', color: '#DC2626' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1.5, color: '#DC2626' }} /> Delete
        </MenuItem>
      </Menu>

      {/* Add / Edit Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <Box sx={{ p: 3, borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
          <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#1A1A2E' }}>
            {editingId ? 'Edit Banner' : 'Add New Banner'}
          </Typography>
        </Box>
        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box>
            <Button
              component="label"
              variant="outlined"
              startIcon={<CloudUploadIcon />}
              disabled={uploading}
              sx={{ width: '100%', height: 100, borderStyle: 'dashed', borderWidth: 2, borderColor: '#CBD5E1', color: '#64748B' }}
            >
              {uploading ? 'UPLOADING...' : 'UPLOAD IMAGE (MAX 2MB)'}
              <input type="file" hidden accept="image/*" onChange={handleImageUpload} />
            </Button>
            {formData.imageUrl && (
              <Box component="img" loading="lazy" src={formData.imageUrl} sx={{ width: '100%', height: 150, objectFit: 'cover', mt: 2, borderRadius: 2, border: '1px solid #E2E8F0' }} />
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
          <Button onClick={() => setOpen(false)} sx={{ color: '#64748B', fontWeight: 600 }}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
