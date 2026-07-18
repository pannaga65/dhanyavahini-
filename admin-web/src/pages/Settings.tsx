import { useState, useEffect } from 'react';
import { Typography, Box, TextField, Button, CircularProgress } from '@mui/material';
import { doc, getDoc, setDoc, getFirestore } from 'firebase/firestore';
import app from '../firebase';
import { useUI } from '../context/UIContext';

const db = getFirestore(app);

export default function Settings() {
  const [gstRate, setGstRate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showMessage } = useUI();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const docSnap = await getDoc(doc(db, 'settings', 'global'));
      if (docSnap.exists() && docSnap.data().gstRate !== undefined) {
        // Convert from decimal (e.g. 0.05) to percentage (5) for UI
        const rateDecimal = docSnap.data().gstRate;
        setGstRate((rateDecimal * 100).toString());
      } else {
        setGstRate('5'); // default fallback
      }
    } catch (e) {
      console.error(e);
      showMessage('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const rateNum = parseFloat(gstRate);
    if (isNaN(rateNum) || rateNum < 0) {
      showMessage('Please enter a valid GST percentage', 'error');
      return;
    }

    setSaving(true);
    try {
      // Convert back to decimal for database
      const rateDecimal = rateNum / 100;
      await setDoc(doc(db, 'settings', 'global'), {
        gstRate: rateDecimal
      }, { merge: true });
      
      showMessage('Settings saved successfully!', 'success');
    } catch (e) {
      console.error(e);
      showMessage('Failed to save settings', 'error');
    } finally {
      setSaving(false);
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
            GLOBAL CONFIGURATION
          </Typography>
        </Box>
      </Box>
      <Box sx={{ borderBottom: '2px solid #000', mb: 4, mt: 2 }} />
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ p: 4, backgroundColor: '#fff', border: '1px solid #E0E0E0', borderRadius: 2, maxWidth: 600 }}>
          <Typography sx={{ fontWeight: 700, mb: 3, fontSize: '1.2rem' }}>
            Tax Configuration
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <TextField 
              label="GST Rate (%)" 
              variant="outlined" 
              type="number"
              value={gstRate}
              onChange={(e) => setGstRate(e.target.value)}
              sx={{ width: 150 }}
              disabled={saving}
            />
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleSave}
              disabled={saving}
              sx={{ height: 56, fontWeight: 700, px: 4 }}
            >
              {saving ? <CircularProgress size={24} color="inherit" /> : 'SAVE'}
            </Button>
          </Box>
          <Typography sx={{ color: '#999', fontSize: '0.85rem', mt: 2 }}>
            This GST rate will automatically be applied to all new orders placed in the mobile app.
          </Typography>
        </Box>
      )}
    </Box>
  );
}
