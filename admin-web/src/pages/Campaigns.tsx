import { useState, useEffect } from 'react';
import { Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, FormControl, InputLabel, CircularProgress, Chip, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CampaignIcon from '@mui/icons-material/Campaign';
import { collection, query, orderBy, onSnapshot, getFirestore } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '../firebase';
import { useUI } from '../context/UIContext';

const db = getFirestore(app);
const functions = getFunctions(app);

export default function Campaigns() {
  const { showConfirm, showMessage } = useUI();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('general');
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'campaigns'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCampaigns(data);
    });
    return () => unsubscribe();
  }, []);

  const handlePublish = async () => {
    if (!title || !body) {
      showMessage("Title and body are required.", "error");
      return;
    }
    setLoading(true);
    try {
      const publishCampaignFn = httpsCallable(functions, 'publishCampaign');
      const result: any = await publishCampaignFn({ title, body, type, imageUrl });
      showMessage(`Campaign published! Sent to ${result.data.notifiedCount} customers.`, "success");
      setOpen(false);
      setTitle('');
      setBody('');
      setType('general');
      setImageUrl('');
    } catch (e) {
      console.error("Error publishing campaign", e);
      showMessage("Failed to publish campaign.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    showConfirm("Are you sure you want to stop this campaign?", async () => {
      try {
        const deleteCampaignFn = httpsCallable(functions, 'deleteCampaign');
        await deleteCampaignFn({ campaignId: id });
        showMessage("Campaign stopped successfully.", "success");
      } catch (e) {
        console.error("Error stopping campaign", e);
        showMessage("Failed to stop campaign.", "error");
      }
    });
  };

  const getTypeLabel = (t: string) => {
    switch (t) {
      case 'alert': return 'Alert';
      case 'new_arrival': return 'New Arrival';
      case 'price_drop': return 'Price Drop';
      case 'moving_fast': return 'Moving Fast';
      default: return 'General';
    }
  };

  const getTypeColor = (t: string): any => {
    switch (t) {
      case 'alert': return 'error';
      case 'new_arrival': return 'success';
      case 'price_drop': return 'info';
      case 'moving_fast': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.8rem', md: '2.2rem' }, letterSpacing: 0.5, color: '#1A1A2E' }}>
            Marketing Campaigns
          </Typography>
          <Typography sx={{ fontWeight: 500, color: '#94A3B8', letterSpacing: 0.3, fontSize: '0.9rem', mt: 0.5 }}>
            Publish real-time alerts and stock updates to customers
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
          sx={{ backgroundColor: '#14532D', '&:hover': { backgroundColor: '#064E3B' }, fontWeight: 600, px: 3 }}
        >
          New Campaign
        </Button>
      </Box>
      <Box sx={{ borderBottom: '1px solid #E2E8F0', mb: 4, mt: 2 }} />

      <TableContainer sx={{ width: '100%', overflowX: 'auto', backgroundColor: 'white', borderRadius: 2, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <Table sx={{ minWidth: 800 }}>
          <TableHead sx={{ backgroundColor: '#F8FAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, color: '#475569' }}>CAMPAIGN</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569' }}>TYPE</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569' }}>STATUS</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#475569' }}>DATE</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: '#475569' }}>ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {campaigns.map((row) => (
              <TableRow key={row.id} sx={{ '&:hover': { backgroundColor: '#F1F5F9' } }}>
                <TableCell>
                  <Typography sx={{ fontWeight: 700, color: '#1E293B' }}>{row.title}</Typography>
                  <Typography sx={{ fontSize: '0.8rem', color: '#64748B', maxWidth: 300, noWrap: true }}>{row.body}</Typography>
                </TableCell>
                <TableCell>
                  <Chip size="small" label={getTypeLabel(row.type)} color={getTypeColor(row.type)} sx={{ fontWeight: 600 }} />
                </TableCell>
                <TableCell>
                  {row.isActive ? (
                    <Chip size="small" label="Active" sx={{ backgroundColor: '#DCFCE7', color: '#166534', fontWeight: 600 }} />
                  ) : (
                    <Chip size="small" label="Stopped" sx={{ backgroundColor: '#F1F5F9', color: '#64748B', fontWeight: 600 }} />
                  )}
                </TableCell>
                <TableCell sx={{ color: '#64748B', fontSize: '0.9rem' }}>
                  {row.createdAt?.toDate().toLocaleString() || 'N/A'}
                </TableCell>
                <TableCell align="right">
                  {row.isActive && (
                    <IconButton onClick={() => handleDelete(row.id)} size="small" sx={{ color: '#EF4444', '&:hover': { backgroundColor: '#FEF2F2' } }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {campaigns.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                  <CampaignIcon sx={{ fontSize: 48, color: '#CBD5E1', mb: 2 }} />
                  <Typography sx={{ color: '#64748B', fontWeight: 600 }}>No campaigns found.</Typography>
                  <Typography sx={{ color: '#94A3B8', fontSize: '0.9rem', mt: 1 }}>Create a campaign to notify your customers.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => !loading && setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#1E293B', pb: 1 }}>Publish New Campaign</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: '20px !important' }}>
          <Typography sx={{ fontSize: '0.9rem', color: '#64748B', mb: -1 }}>
            This will send a push notification to all customers and display in the app's live ticker.
          </Typography>
          <TextField 
            label="Campaign Title" 
            fullWidth 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            placeholder="e.g. Tomato Price Dropped!"
          />
          <TextField 
            label="Message Body" 
            fullWidth 
            multiline 
            rows={3} 
            value={body} 
            onChange={(e) => setBody(e.target.value)} 
            placeholder="e.g. Tomatoes are now available at a discounted rate. Order now!"
          />
          <FormControl fullWidth>
            <InputLabel>Campaign Type</InputLabel>
            <Select value={type} label="Campaign Type" onChange={(e) => setType(e.target.value)}>
              <MenuItem value="general">General</MenuItem>
              <MenuItem value="alert">Alert</MenuItem>
              <MenuItem value="new_arrival">New Arrival</MenuItem>
              <MenuItem value="price_drop">Price Drop</MenuItem>
              <MenuItem value="moving_fast">Moving Fast</MenuItem>
            </Select>
          </FormControl>
          <TextField 
            label="Image URL (Optional)" 
            fullWidth 
            value={imageUrl} 
            onChange={(e) => setImageUrl(e.target.value)} 
            placeholder="https://..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setOpen(false)} disabled={loading} sx={{ color: '#64748B', fontWeight: 600 }}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handlePublish} 
            disabled={loading}
            sx={{ backgroundColor: '#14532D', '&:hover': { backgroundColor: '#064E3B' }, fontWeight: 600 }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Publish Now'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
