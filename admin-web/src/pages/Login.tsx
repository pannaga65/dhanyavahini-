import { useState } from 'react';
import { Box, Typography, TextField, Button, CircularProgress, IconButton, InputAdornment } from '@mui/material';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import app from '../firebase';

const auth = getAuth(app);
const db = getFirestore(app);

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Step 1: Authenticate with Firebase Auth
      const credential = await signInWithEmailAndPassword(auth, email, password);

      // Step 2: Check if this user exists in the 'admins' collection
      const adminDoc = await getDoc(doc(db, 'admins', credential.user.uid));

      if (!adminDoc.exists()) {
        // Not an admin — sign them out immediately
        await signOut(auth);
        setError('Access denied. You are not an authorized admin.');
        return;
      }

      // Admin verified — proceed to dashboard
      navigate('/');
    } catch (e: any) {
      console.error('Login error:', e);
      if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)',
        px: 2,
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 420,
          backgroundColor: '#FFF',
          borderRadius: 4,
          border: '1px solid #E2E8F0',
          boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)',
          p: { xs: 3, sm: 5 },
        }}
      >
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/LOGO.png" alt="Logo" style={{ width: 48, height: 48, objectFit: 'contain' }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: '1.5rem', letterSpacing: 0.5, color: '#1B2A4A', lineHeight: 1 }}>
              Dhanyavahini
            </Typography>
            <Typography sx={{ fontWeight: 500, fontSize: '0.7rem', color: '#94A3B8', letterSpacing: 1, mt: 0.3 }}>
              Admin Panel
            </Typography>
          </Box>
        </Box>

        <Box sx={{ borderBottom: '1px solid #E2E8F0', mb: 3, mt: 2 }} />

        <Typography sx={{ fontWeight: 600, fontSize: '1rem', color: '#1A1A2E', mb: 3 }}>
          Sign in to your account
        </Typography>

        {/* Form */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField
            label="Email"
            type="email"
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <TextField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      sx={{ color: '#94A3B8' }}
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          {error && (
            <Box sx={{ p: 1.5, backgroundColor: '#FEF2F2', borderRadius: 2, border: '1px solid #FECACA' }}>
              <Typography sx={{ color: '#DC2626', fontWeight: 600, fontSize: '0.85rem' }}>
                {error}
              </Typography>
            </Box>
          )}

          <Button
            variant="contained"
            fullWidth
            onClick={handleLogin}
            disabled={loading}
            sx={{ 
              py: 1.5, 
              mt: 1, 
              fontSize: '0.9rem', 
              letterSpacing: 0.5,
              backgroundColor: '#0F172A',
              '&:hover': { backgroundColor: '#1E293B' },
            }}
          >
            {loading ? <CircularProgress size={22} color="inherit" /> : 'Sign In'}
          </Button>
        </Box>

        <Typography sx={{ mt: 4, textAlign: 'center', fontSize: '0.75rem', color: '#CBD5E1', letterSpacing: 0.5 }}>
          Authorized personnel only
        </Typography>
      </Box>
    </Box>
  );
}
