import { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, CircularProgress, Grid, Card, CardContent, Slide } from '@mui/material';
import { doc, getDoc, setDoc, getFirestore } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import StorefrontIcon from '@mui/icons-material/Storefront';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import app from '../firebase';
import { useUI } from '../context/UIContext';

const db = getFirestore(app);
const storage = getStorage(app);

export default function BusinessProfile() {
  const { showMessage, showConfirm } = useUI();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [initialData, setInitialData] = useState<any>(null);
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
    branch: '',
    logoUrl: ''
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const docSnap = await getDoc(doc(db, 'settings', 'businessProfile'));
      if (docSnap.exists()) {
        const data = docSnap.data() as any;
        setFormData(data);
        setInitialData(data);
      } else {
        setInitialData(formData);
      }
    } catch (e) {
      console.error("Error fetching profile", e);
    }
    setFetching(false);
  };

  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialData);

  const handleSave = () => {
    showConfirm("Are you sure you want to save these profile changes? This will immediately affect future invoices.", async () => {
      setLoading(true);
      try {
        await setDoc(doc(db, 'settings', 'businessProfile'), formData);
        setInitialData(formData); // Reset dirty state
        showMessage('Business Profile saved successfully!', 'success');
      } catch (e: any) {
        showMessage(e.message, 'error');
      }
      setLoading(false);
    });
  };

  const handleDiscard = () => {
    showConfirm("Discard all unsaved changes?", () => {
      setFormData(initialData);
    });
  };

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024) {
      showMessage('Logo must be less than 2MB', 'error');
      return;
    }

    setUploadingLogo(true);
    try {
      const storageRef = ref(storage, `settings/business_logo_${Date.now()}`);
      const uploadTask = await uploadBytesResumable(storageRef, file);
      const url = await getDownloadURL(uploadTask.ref);
      setFormData(prev => ({ ...prev, logoUrl: url }));
      showMessage('Logo uploaded! Click Save Profile to apply.', 'success');
    } catch (err: any) {
      showMessage(err.message, 'error');
    }
    setUploadingLogo(false);
  };

  if (fetching) {
    return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ pb: 10, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography sx={{ fontWeight: 900, fontSize: '1.8rem', letterSpacing: 2 }}>
            BUSINESS PROFILE
          </Typography>
          <Typography sx={{ color: '#666', fontWeight: 600, fontSize: '0.9rem' }}>
            Manage your company details, registered address, and billing information.
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Company Details Card */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card elevation={0} sx={{ border: '1px solid #E0E0E0', borderRadius: 3, h: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <StorefrontIcon sx={{ mr: 1.5, color: '#000' }} />
                <Typography sx={{ fontWeight: 800, fontSize: '1.1rem' }}>Company Details</Typography>
              </Box>
              
              {/* Logo Upload */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, p: 2, border: '1px dashed #CCC', borderRadius: 2, backgroundColor: '#FAFAFA' }}>
                <Box sx={{ width: 60, height: 60, borderRadius: '50%', backgroundColor: '#EEE', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {formData.logoUrl ? (
                    <img src={formData.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <StorefrontIcon sx={{ color: '#999' }} />
                  )}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>Business Logo</Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: '#666' }}>Recommended size: 256x256px. Appears on your invoices.</Typography>
                </Box>
                <Button 
                  component="label" 
                  size="small" 
                  variant="outlined" 
                  disabled={uploadingLogo}
                  startIcon={uploadingLogo ? <CircularProgress size={16} /> : <CloudUploadIcon />} 
                  sx={{ fontWeight: 600, borderRadius: 2, textTransform: 'none' }}
                >
                  {uploadingLogo ? 'Uploading...' : (formData.logoUrl ? 'Change Logo' : 'Upload')}
                  <input type="file" hidden accept="image/*" onChange={handleLogoUpload} />
                </Button>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <TextField variant="outlined" label="Company / Trade Name" fullWidth required value={formData.companyName} onChange={(e) => handleChange('companyName', e.target.value)} />
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField variant="outlined" label="GSTIN / UIN" fullWidth value={formData.gstin} onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())} />
                  <TextField variant="outlined" label="UDYAM No." fullWidth value={formData.udyam} onChange={(e) => handleChange('udyam', e.target.value.toUpperCase())} />
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField variant="outlined" label="Email Address" type="email" fullWidth value={formData.email} onChange={(e) => handleChange('email', e.target.value)} />
                  <TextField variant="outlined" label="Phone Number" fullWidth value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Address Details Card */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card elevation={0} sx={{ border: '1px solid #E0E0E0', borderRadius: 3, h: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <LocationOnIcon sx={{ mr: 1.5, color: '#000' }} />
                <Typography sx={{ fontWeight: 800, fontSize: '1.1rem' }}>Registered Address</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <TextField variant="outlined" label="Address Line 1" fullWidth required value={formData.addressLine1} onChange={(e) => handleChange('addressLine1', e.target.value)} />
                <TextField variant="outlined" label="Address Line 2 (Optional)" fullWidth value={formData.addressLine2} onChange={(e) => handleChange('addressLine2', e.target.value)} />
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField variant="outlined" label="City" fullWidth required value={formData.city} onChange={(e) => handleChange('city', e.target.value)} />
                  <TextField variant="outlined" label="Pincode" fullWidth required value={formData.pincode} onChange={(e) => handleChange('pincode', e.target.value)} />
                </Box>
                <TextField variant="outlined" label="State Name & Code (e.g. Andhra Pradesh, Code: 37)" fullWidth required value={formData.state} onChange={(e) => handleChange('state', e.target.value)} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Bank & Invoice Configuration Card */}
        <Grid size={{ xs: 12 }}>
          <Card elevation={0} sx={{ border: '1px solid #E0E0E0', borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <AccountBalanceIcon sx={{ mr: 1.5, color: '#000' }} />
                <Typography sx={{ fontWeight: 800, fontSize: '1.1rem' }}>Bank Details (For Invoicing)</Typography>
              </Box>
              
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField variant="outlined" label="Bank Name" fullWidth value={formData.bankName} onChange={(e) => handleChange('bankName', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField variant="outlined" label="Account Number" fullWidth value={formData.accountNumber} onChange={(e) => handleChange('accountNumber', e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField variant="outlined" label="IFSC Code" fullWidth value={formData.ifscCode} onChange={(e) => handleChange('ifscCode', e.target.value.toUpperCase())} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                  <TextField variant="outlined" label="Branch Name" fullWidth value={formData.branch} onChange={(e) => handleChange('branch', e.target.value)} />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Floating Save Bar */}
      <Slide direction="up" in={isDirty} mountOnEnter unmountOnExit>
        <Box sx={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)', // Centering horizontally
          width: { xs: '90%', sm: 600 },
          backgroundColor: '#000',
          color: '#FFF',
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 3,
          py: 2,
          zIndex: 1000
        }}>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: '0.95rem' }}>Unsaved Changes</Typography>
            <Typography sx={{ fontSize: '0.75rem', color: '#AAA' }}>You have modified your business profile.</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button onClick={handleDiscard} disabled={loading} sx={{ color: '#FFF', fontWeight: 600, textTransform: 'none' }}>
              Discard
            </Button>
            <Button variant="contained" onClick={handleSave} disabled={loading} sx={{ backgroundColor: '#FFF', color: '#000', fontWeight: 800, borderRadius: 2, '&:hover': { backgroundColor: '#F0F0F0' } }}>
              {loading ? <CircularProgress size={20} sx={{ color: '#000' }} /> : 'Save Profile'}
            </Button>
          </Box>
        </Box>
      </Slide>
    </Box>
  );
}
