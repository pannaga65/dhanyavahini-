import { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, CircularProgress, Grid, Card, CardContent, Slide, IconButton, Tooltip } from '@mui/material';
import { doc, getDoc, setDoc, getFirestore } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import StorefrontIcon from '@mui/icons-material/Storefront';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import imageCompression from 'browser-image-compression';
import app from '../firebase';
import { useUI } from '../context/UIContext';

const db = getFirestore(app);
const storage = getStorage(app);

const emptyProfile = {
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
};

// --- Theme Colors ---
const COLORS = {
  bg: '#F3F5F1',
  cardBg: '#FAFAF7',
  primaryText: '#1B4332',
  mutedText: '#64748B',
  accentTeal: '#2C6E7F',
  accentGold: '#D4A017',
  badgeBg: '#E8F5E9',
  badgeText: '#2E7D32',
  navy: '#1E3A5F',
  border: '#E2E8F0',
};

export default function BusinessProfile() {
  const { showMessage, showConfirm } = useUI();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [initialData, setInitialData] = useState<any>(emptyProfile);
  const [draftData, setDraftData] = useState<any>(emptyProfile);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const docSnap = await getDoc(doc(db, 'settings', 'businessProfile'));
      if (docSnap.exists()) {
        const data = docSnap.data() as any;
        setInitialData(data);
        setDraftData(data);
      } else {
        setInitialData(emptyProfile);
        setDraftData(emptyProfile);
      }
    } catch (e) {
      console.error("Error fetching profile", e);
    }
    setFetching(false);
  };

  const isDirty = JSON.stringify(draftData) !== JSON.stringify(initialData);

  const handleSave = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setEditingField(null); // Close any open edits
    showConfirm("Are you sure you want to save these profile changes? This will immediately affect future invoices.", async () => {
      setLoading(true);
      try {
        await setDoc(doc(db, 'settings', 'businessProfile'), draftData);
        setInitialData(draftData);
        showMessage('Business Profile saved successfully!', 'success');
      } catch (e: any) {
        showMessage(e.message, 'error');
      }
      setLoading(false);
    });
  };

  const handleDiscard = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    showConfirm("Discard all unsaved changes?", () => {
      setDraftData(initialData);
      setEditingField(null);
    });
  };

  const handleChange = (field: string, value: string) => {
    setDraftData({ ...draftData, [field]: value });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      showMessage('Logo must be less than 5MB', 'error');
      return;
    }

    setUploadingLogo(true);
    try {
      const options = {
        maxSizeMB: 0.1, // Compress to max 100KB
        maxWidthOrHeight: 800,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(file, options);

      const storageRef = ref(storage, `settings/business_logo_${Date.now()}`);
      const uploadTask = await uploadBytesResumable(storageRef, compressedFile);
      const url = await getDownloadURL(uploadTask.ref);
      setDraftData((prev: any) => ({ ...prev, logoUrl: url }));
      showMessage('Logo uploaded successfully!', 'success');
    } catch (err: any) {
      showMessage(err.message, 'error');
    }
    setUploadingLogo(false);
  };

  if (fetching) {
    return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress sx={{ color: COLORS.primaryText }} /></Box>;
  }

  // --- Reusable Components ---

  const SettingsCard = ({ accentColor, icon: Icon, title, description, children, titleColor = COLORS.primaryText }: any) => {
    return (
      <Card 
        elevation={0} 
        sx={{ 
          borderRadius: '12px', 
          backgroundColor: COLORS.cardBg, 
          mb: 4,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          border: `1px solid ${COLORS.border}`,
          position: 'relative',
          overflow: 'visible',
          '&::before': {
            content: '""',
            position: 'absolute',
            left: -1,
            top: 24,
            bottom: 24,
            width: '4px',
            backgroundColor: accentColor,
            borderRadius: '0 4px 4px 0',
          }
        }}
      >
        <Box sx={{ p: { xs: 3, sm: 4 }, pb: { xs: 1, sm: 2 }, borderBottom: `1px dashed ${COLORS.border}` }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: '8px', backgroundColor: `${accentColor}15`, color: accentColor, flexShrink: 0, mt: 0.5 }}>
              <Icon sx={{ fontSize: 22 }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: '18px', color: titleColor, lineHeight: 1.2, mb: 0.5 }}>
                {title}
              </Typography>
              <Typography sx={{ fontSize: '13px', color: COLORS.mutedText, lineHeight: 1.4 }}>
                {description}
              </Typography>
            </Box>
          </Box>
        </Box>
        <CardContent sx={{ p: { xs: 3, sm: 4 }, '&:last-child': { pb: { xs: 3, sm: 4 } } }}>
          {children}
        </CardContent>
      </Card>
    );
  };

  const EditableField = ({ 
    label, 
    fieldKey, 
    value, 
    isMasked = false, 
    type = 'text',
    gridProps = { xs: 12, sm: 6 }
  }: any) => {
    const isEditing = editingField === fieldKey;
    const [showMask, setShowMask] = useState(isMasked);

    const handleCopy = () => {
      navigator.clipboard.writeText(value);
      showMessage(`${label} copied`, 'success');
    };

    const getMaskedValue = (val: string) => {
      if (!val) return '';
      if (val.length <= 4) return '••••';
      return `••••••••${val.slice(-4)}`;
    };

    return (
      <Grid size={gridProps}>
        <Box 
          sx={{ 
            position: 'relative',
            px: 1.5,
            py: 1,
            borderRadius: '6px',
            border: '1px solid transparent',
            transition: 'all 0.2s',
            minHeight: '64px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            '&:hover': {
              backgroundColor: isEditing ? 'transparent' : 'rgba(0,0,0,0.02)',
              borderColor: isEditing ? 'transparent' : 'rgba(0,0,0,0.04)',
              '& .field-actions': { opacity: 1 }
            }
          }}
        >
          <Typography sx={{ fontSize: '11px', fontWeight: 700, color: COLORS.accentTeal, mb: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {label}
          </Typography>
          
          {isEditing ? (
            <TextField
              fullWidth
              size="small"
              autoFocus
              variant="outlined"
              type={type}
              value={value}
              onChange={(e) => handleChange(fieldKey, e.target.value)}
              onBlur={() => setEditingField(null)}
              onKeyDown={(e) => { if (e.key === 'Enter') setEditingField(null); }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#FFF',
                  borderRadius: '4px',
                  height: '32px',
                  '& fieldset': { borderColor: COLORS.accentTeal },
                  '&.Mui-focused fieldset': { borderColor: COLORS.primaryText, borderWidth: '2px' }
                },
                '& .MuiInputBase-input': { py: 0, px: 1, fontSize: '15px', color: COLORS.primaryText, fontWeight: 600 }
              }}
            />
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', minHeight: '32px', gap: 1 }}>
              <Typography sx={{ fontSize: '15px', fontWeight: 600, color: value ? COLORS.primaryText : '#94A3B8', fontStyle: value ? 'normal' : 'italic', wordBreak: 'break-word', mt: 0.5 }}>
                {value 
                  ? (showMask ? getMaskedValue(value) : value) 
                  : 'Not provided'}
              </Typography>
              
              <Box className="field-actions" sx={{ opacity: 0, transition: 'opacity 0.2s', display: 'flex', gap: 0.5 }}>
                {isMasked && value && (
                  <Tooltip title={showMask ? "Reveal" : "Hide"}>
                    <IconButton size="small" onClick={() => setShowMask(!showMask)} sx={{ color: COLORS.accentTeal, p: 0.5 }}>
                      {showMask ? <VisibilityOutlinedIcon sx={{ fontSize: 16 }} /> : <VisibilityOffOutlinedIcon sx={{ fontSize: 16 }} />}
                    </IconButton>
                  </Tooltip>
                )}
                {isMasked && value && (
                  <Tooltip title="Copy">
                    <IconButton size="small" onClick={handleCopy} sx={{ color: COLORS.accentTeal, p: 0.5 }}>
                      <ContentCopyOutlinedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title="Edit">
                  <IconButton size="small" onClick={() => setEditingField(fieldKey)} sx={{ color: COLORS.accentGold, p: 0.5, backgroundColor: `${COLORS.accentGold}15`, '&:hover': { backgroundColor: `${COLORS.accentGold}25` } }}>
                    <EditOutlinedIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          )}
        </Box>
      </Grid>
    );
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: COLORS.bg, pb: 16 }}>
      <Box sx={{ maxWidth: 1000, mx: 'auto', pt: { xs: 4, md: 6 }, px: { xs: 2, sm: 3 } }}>
        
        {/* Page Header */}
        <Box sx={{ mb: { xs: 4, md: 8 }, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 2, sm: 3 } }}>
             <Box sx={{ 
               width: { xs: 56, sm: 72 }, height: { xs: 56, sm: 72 }, borderRadius: '12px', backgroundColor: COLORS.primaryText, 
               display: 'flex', alignItems: 'center', justifyContent: 'center',
               boxShadow: '0 4px 12px rgba(27, 67, 50, 0.15)',
               border: `2px solid ${COLORS.accentGold}`,
               overflow: 'hidden',
               flexShrink: 0
             }}>
                {draftData.logoUrl ? (
                  <img src={draftData.logoUrl} alt="Logo" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#FFF' }} />
                ) : (
                  <StorefrontIcon sx={{ color: '#FFF', fontSize: { xs: 24, sm: 32 } }} />
                )}
             </Box>
             <Box>
               <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                 <Typography sx={{ fontWeight: 800, fontSize: { xs: '24px', sm: '32px' }, color: COLORS.primaryText, letterSpacing: '-0.5px', lineHeight: 1 }}>
                   {draftData.companyName || 'Company Profile'}
                 </Typography>
               </Box>
               <Typography sx={{ color: COLORS.mutedText, fontSize: { xs: '13px', sm: '14px' }, fontWeight: 500, mt: 0.5 }}>
                 Manage your enterprise identity and billing configuration.
               </Typography>
             </Box>
          </Box>
        </Box>

        {/* Identity Section */}
        <SettingsCard 
          accentColor={COLORS.primaryText} // Deep forest green
          icon={StorefrontIcon} 
          title="Company Identity" 
          description="Publicly displayed information on your invoices and trade documents."
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2, px: 1.5 }}>
             <Box sx={{ width: 48, height: 48, borderRadius: '8px', backgroundColor: '#FFF', border: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {draftData.logoUrl ? (
                  <img src={draftData.logoUrl} alt="Logo" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <StorefrontIcon sx={{ color: '#94A3B8', fontSize: 24 }} />
                )}
             </Box>
             <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Button component="label" variant="outlined" size="small" disabled={uploadingLogo} startIcon={uploadingLogo ? <CircularProgress size={14} color="inherit" /> : <CloudUploadIcon />} sx={{ fontWeight: 600, borderColor: COLORS.border, color: COLORS.primaryText, borderRadius: '6px', '&:hover': { backgroundColor: COLORS.bg } }}>
                    {uploadingLogo ? 'Uploading...' : 'Update Logo'}
                    <input type="file" hidden accept="image/*" onChange={handleLogoUpload} />
                  </Button>
                  {draftData.logoUrl && (
                    <Button size="small" onClick={() => setDraftData((prev: any) => ({ ...prev, logoUrl: '' }))} sx={{ fontWeight: 600, color: '#DC2626', '&:hover': { backgroundColor: '#FEF2F2' } }}>
                      Remove
                    </Button>
                  )}
                </Box>
             </Box>
          </Box>

          <Grid container rowSpacing={0.5} columnSpacing={1}>
            <EditableField label="Legal Company Name" fieldKey="companyName" value={draftData.companyName} gridProps={{ xs: 12 }} />
            <EditableField label="GSTIN / Tax ID" fieldKey="gstin" value={draftData.gstin} />
            <EditableField label="UDYAM / Registration No." fieldKey="udyam" value={draftData.udyam} />
            <EditableField label="Support Email" type="email" fieldKey="email" value={draftData.email} />
            <EditableField label="Support Phone" fieldKey="phone" value={draftData.phone} />
          </Grid>
        </SettingsCard>

        {/* Location Section */}
        <SettingsCard 
          accentColor={COLORS.accentTeal} // Muted teal
          icon={LocationOnOutlinedIcon} 
          title="Registered Location" 
          description="Your primary place of business used for communications and tax calculations."
        >
          <Grid container rowSpacing={0.5} columnSpacing={1}>
            <EditableField label="Address Line 1" fieldKey="addressLine1" value={draftData.addressLine1} gridProps={{ xs: 12 }} />
            <EditableField label="Address Line 2 (Optional)" fieldKey="addressLine2" value={draftData.addressLine2} gridProps={{ xs: 12 }} />
            <EditableField label="City" fieldKey="city" value={draftData.city} gridProps={{ xs: 12, sm: 4 }} />
            <EditableField label="State Name & Code" fieldKey="state" value={draftData.state} gridProps={{ xs: 12, sm: 4 }} />
            <EditableField label="Postal Code" fieldKey="pincode" value={draftData.pincode} gridProps={{ xs: 12, sm: 4 }} />
          </Grid>
        </SettingsCard>

        {/* Banking Section */}
        <SettingsCard 
          accentColor={COLORS.navy} // Navy blue
          icon={AccountBalanceOutlinedIcon} 
          title="Banking & Settlement" 
          titleColor={COLORS.navy}
          description="Secure bank details appended to invoices for direct NEFT/RTGS transfers."
        >
          <Grid container rowSpacing={0.5} columnSpacing={1}>
            <EditableField label="Bank Name" fieldKey="bankName" value={draftData.bankName} />
            <EditableField label="Branch Name" fieldKey="branch" value={draftData.branch} />
            <EditableField label="Account Number" fieldKey="accountNumber" value={draftData.accountNumber} isMasked />
            <EditableField label="IFSC Code" fieldKey="ifscCode" value={draftData.ifscCode} isMasked />
          </Grid>
        </SettingsCard>

      </Box>

      {/* Sticky Bottom Action Bar */}
      <Slide direction="up" in={isDirty} mountOnEnter unmountOnExit>
        <Box sx={{
          position: 'fixed',
          bottom: { xs: 16, sm: 32 },
          left: 0,
          right: 0,
          mx: 'auto',
          width: { xs: '92%', sm: 600 },
          backgroundColor: COLORS.primaryText, 
          color: '#FFF',
          borderRadius: '12px', 
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2), 0 8px 10px -6px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: { xs: 2, sm: 4 },
          py: { xs: 1.5, sm: 2.5 },
          zIndex: 1000,
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            <Typography sx={{ fontWeight: 700, fontSize: '15px' }}>Unsaved Changes</Typography>
            <Typography sx={{ fontSize: '13px', color: '#94A3B8', fontWeight: 500, mt: 0.2 }}>Please save your modifications.</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: { xs: 1.5, sm: 2 }, width: { xs: '100%', sm: 'auto' } }}>
            <Button onClick={handleDiscard} disabled={loading} sx={{ flex: { xs: 1, sm: 'none' }, color: '#F1F5F9', fontWeight: 600, px: 2, borderRadius: '8px', border: { xs: '1px solid rgba(255,255,255,0.2)', sm: 'none' }, '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' } }}>
              Discard
            </Button>
            <Button variant="contained" onClick={handleSave} disabled={loading} sx={{ flex: { xs: 1, sm: 'none' }, backgroundColor: COLORS.accentGold, color: COLORS.primaryText, fontWeight: 700, px: 3, borderRadius: '8px', boxShadow: 'none', '&:hover': { backgroundColor: '#B8860B', boxShadow: 'none' } }}>
              {loading ? <CircularProgress size={20} sx={{ color: COLORS.primaryText }} /> : 'Save Profile'}
            </Button>
          </Box>
        </Box>
      </Slide>
    </Box>
  );
}
