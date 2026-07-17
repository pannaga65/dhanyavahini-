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
        backgroundColor: '#FFF',
      }}
    >
      <Box
        sx={{
          width: 440,
          border: '2px solid #000',
          p: 5,
        }}
      >
        {/* Header */}
        <Typography sx={{ fontWeight: 900, fontSize: '2rem', letterSpacing: 3, mb: 0.5 }}>
          ADMIN
        </Typography>
        <Typography sx={{ fontWeight: 600, fontSize: '0.7rem', color: '#999', letterSpacing: 2, mb: 4 }}>
          DHANYAVAHINI CMS
        </Typography>

        <Box sx={{ borderBottom: '2px solid #000', mb: 4 }} />

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
                      sx={{ color: '#000' }}
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          {error && (
            <Typography sx={{ color: '#C00', fontWeight: 700, fontSize: '0.85rem' }}>
              {error}
            </Typography>
          )}

          <Button
            variant="contained"
            fullWidth
            onClick={handleLogin}
            disabled={loading}
            sx={{ py: 1.5, mt: 1, fontSize: '0.9rem', letterSpacing: 1 }}
          >
            {loading ? <CircularProgress size={22} color="inherit" /> : 'SIGN IN'}
          </Button>
        </Box>

        <Typography sx={{ mt: 4, textAlign: 'center', fontSize: '0.75rem', color: '#999', letterSpacing: 1 }}>
          AUTHORIZED PERSONNEL ONLY
        </Typography>
      </Box>
    </Box>
  );
}
