import { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, CircularProgress, Grid } from '@mui/material';
import { doc, getDoc, setDoc, getFirestore } from 'firebase/firestore';
import app from '../firebase';
import { useUI } from '../context/UIContext';

const db = getFirestore(app);

export default function BusinessProfile() {
  const { showMessage } = useUI();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [formData, setFormData] = useState({
    companyName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    email: '',
    phone: '',
    gstin: '',
    udyam: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    branch: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const docSnap = await getDoc(doc(db, 'settings', 'businessProfile'));
      if (docSnap.exists()) {
        setFormData(docSnap.data() as any);
      }
    } catch (e) {
      console.error("Error fetching profile", e);
    }
    setFetching(false);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, 'settings', 'businessProfile'), formData);
      showMessage('Business Profile saved successfully', 'success');
    } catch (e: any) {
      showMessage(e.message, 'error');
    }
    setLoading(false);
  };

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  if (fetching) {
    return <Box sx={{ p: 4 }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, backgroundColor: '#FFF', border: '1px solid #E0E0E0', borderRadius: 2 }}>
      <Typography sx={{ fontWeight: 900, fontSize: '1.2rem', mb: 3, letterSpacing: 1 }}>
        BUSINESS & INVOICE PROFILE
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', color: '#666', mb: 2 }}>BASIC DETAILS</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Company Name" fullWidth required value={formData.companyName} onChange={(e) => handleChange('companyName', e.target.value)} />
            <TextField label="GSTIN / UIN" fullWidth value={formData.gstin} onChange={(e) => handleChange('gstin', e.target.value)} />
            <TextField label="UDYAM Registration No." fullWidth value={formData.udyam} onChange={(e) => handleChange('udyam', e.target.value)} />
            <TextField label="Email Address" type="email" fullWidth value={formData.email} onChange={(e) => handleChange('email', e.target.value)} />
            <TextField label="Phone Number" fullWidth value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} />
          </Box>
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', color: '#666', mb: 2 }}>ADDRESS DETAILS</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Address Line 1" fullWidth required value={formData.addressLine1} onChange={(e) => handleChange('addressLine1', e.target.value)} />
            <TextField label="Address Line 2" fullWidth value={formData.addressLine2} onChange={(e) => handleChange('addressLine2', e.target.value)} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="City" fullWidth required value={formData.city} onChange={(e) => handleChange('city', e.target.value)} />
              <TextField label="Pincode" fullWidth required value={formData.pincode} onChange={(e) => handleChange('pincode', e.target.value)} />
            </Box>
            <TextField label="State Name & Code (e.g. Andhra Pradesh, Code: 37)" fullWidth required value={formData.state} onChange={(e) => handleChange('state', e.target.value)} />
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', color: '#666', mb: 2, mt: 2 }}>BANK DETAILS (FOR INVOICE)</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField label="Bank Name" sx={{ flex: 1, minWidth: 200 }} value={formData.bankName} onChange={(e) => handleChange('bankName', e.target.value)} />
            <TextField label="Account Number" sx={{ flex: 1, minWidth: 200 }} value={formData.accountNumber} onChange={(e) => handleChange('accountNumber', e.target.value)} />
            <TextField label="IFSC Code" sx={{ flex: 1, minWidth: 200 }} value={formData.ifscCode} onChange={(e) => handleChange('ifscCode', e.target.value.toUpperCase())} />
            <TextField label="Branch" sx={{ flex: 1, minWidth: 200 }} value={formData.branch} onChange={(e) => handleChange('branch', e.target.value)} />
          </Box>
        </Grid>
      </Grid>

      <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid #E0E0E0', display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" onClick={handleSave} disabled={loading} sx={{ backgroundColor: '#000', color: '#FFF', fontWeight: 700, px: 4, py: 1.5, borderRadius: 0, '&:hover': { backgroundColor: '#333' } }}>
          {loading ? <CircularProgress size={24} color="inherit" /> : 'SAVE PROFILE'}
        </Button>
      </Box>
    </Box>
  );
}
