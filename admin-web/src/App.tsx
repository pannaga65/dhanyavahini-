import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { Box, Typography, List, ListItem, ListItemButton, ListItemText, Drawer, IconButton, AppBar, Toolbar, Dialog, DialogTitle, DialogActions, Button, Badge } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import NotificationsIcon from '@mui/icons-material/Notifications'
import { getAuth, signOut, onAuthStateChanged } from 'firebase/auth'
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore'
import { useState, useEffect } from 'react'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Products from './pages/Products'
import Orders from './pages/Orders'
import Inquiries from './pages/Inquiries'
import Settings from './pages/Settings'
import Login from './pages/Login'
import app from './firebase'
import './index.css'

const DRAWER_WIDTH = 220;
const auth = getAuth(app);
const db = getFirestore(app);

const NAV_ITEMS = [
  { text: 'DASHBOARD', path: '/' },
  { text: 'PRODUCTS', path: '/products' },
  { text: 'INQUIRIES', path: '/inquiries' },
  { text: 'ORDERS', path: '/orders' },
  { text: 'CUSTOMERS', path: '/customers' },
  { text: 'SETTINGS', path: '/settings' },
];

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [inquiryCount, setInquiryCount] = useState(0);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'orders'), where('status', '==', 'Inquiry'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setInquiryCount(snapshot.size);
    });
    return () => unsubscribe();
  }, [user]);

  const confirmSignOut = () => {
    setSignOutOpen(true);
  };

  const handleSignOut = async () => {
    setSignOutOpen(false);
    await signOut(auth);
    navigate('/login');
  };

  const cancelSignOut = () => {
    setSignOutOpen(false);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Typography sx={{ fontWeight: 900, letterSpacing: 3, fontSize: '1.2rem' }}>LOADING…</Typography>
      </Box>
    );
  }

  // If not logged in, show Login page
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }
  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <Box sx={{ px: 3, pt: 5, pb: 2 }}>
        <Typography sx={{ fontWeight: 900, fontSize: '1.6rem', letterSpacing: 3, lineHeight: 1 }}>
          ADMIN
        </Typography>
        <Typography sx={{ fontWeight: 600, fontSize: '0.65rem', color: '#999', letterSpacing: 2, mt: 0.5 }}>
          DHANYAVAHINI CMS
        </Typography>
      </Box>

      <Box sx={{ borderBottom: '2px solid #000', mx: 3, mb: 3 }} />

      {/* Nav Links */}
      <List disablePadding sx={{ px: 1.5 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => {
                  navigate(item.path);
                  if (mobileOpen) setMobileOpen(false);
                }}
                sx={{
                  py: 1.2,
                  px: 2,
                  backgroundColor: isActive ? '#000' : 'transparent',
                  color: isActive ? '#FFF' : '#000',
                  '&:hover': {
                    backgroundColor: isActive ? '#000' : '#F0F0F0',
                  },
                }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', letterSpacing: 1.2 }}>
                        {item.text}
                      </Typography>
                      {item.text === 'INQUIRIES' && inquiryCount > 0 && (
                        <Box sx={{ backgroundColor: 'red', color: 'white', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 900 }}>
                          {inquiryCount}
                        </Box>
                      )}
                    </Box>
                  }
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Box sx={{ flexGrow: 1 }} />

      {/* Footer */}
      <Box sx={{ borderTop: '2px solid #000', mx: 3 }} />
      <Box sx={{ px: 1.5, py: 2 }}>
        <ListItemButton
          onClick={confirmSignOut}
          sx={{ py: 1.2, px: 2, '&:hover': { backgroundColor: '#F0F0F0' } }}
        >
          <ListItemText
            primary={
              <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', letterSpacing: 1.2 }}>
                ← SIGN OUT
              </Typography>
            }
          />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#FFF', width: '100%' }}>
      
      {/* ── Mobile AppBar ── */}
      <AppBar 
        position="fixed" 
        elevation={0}
        sx={{ 
          display: { md: 'none' }, 
          backgroundColor: '#FFF',
          borderBottom: '2px solid #000',
          color: '#000'
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography sx={{ fontWeight: 900, fontSize: '1.2rem', letterSpacing: 2 }}>
            ADMIN
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton color="inherit" onClick={() => navigate('/inquiries')} sx={{ mr: 1 }}>
            <Badge badgeContent={inquiryCount} color="error" sx={{ '& .MuiBadge-badge': { fontWeight: 900 } }}>
              <NotificationsIcon />
            </Badge>
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* ── Sidebar (Responsive) ── */}
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        {/* Mobile Temporary Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }} // Better open performance on mobile
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH, borderRight: '2px solid #000' },
          }}
        >
          {drawerContent}
        </Drawer>
        {/* Desktop Permanent Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH, borderRight: '2px solid #000', border: 'none', borderRightStyle: 'solid' },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* ── Main Content — FULL WIDTH ── */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { xs: '100%', md: `calc(100% - ${DRAWER_WIDTH}px)` },
          p: { xs: 2, sm: 3, md: 5 },
          pt: { xs: 10, md: 6 }, // Extra padding top on mobile to account for AppBar
        }}
      >
        <Routes>
          <Route path="/" element={<Dashboard userEmail={user.email} />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/inquiries" element={<Inquiries />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/products" element={<Products />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Box>

      {/* ── Sign Out Confirmation Dialog ── */}
      <Dialog 
        open={signOutOpen} 
        onClose={cancelSignOut}
        slotProps={{
          paper: {
            sx: { border: '2px solid #000', borderRadius: 0 }
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 900, fontSize: '1.2rem', pb: 1 }}>
          CONFIRM SIGN OUT
        </DialogTitle>
        <Box sx={{ px: 3, pb: 2 }}>
          <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
            Are you sure you want to end your session and sign out of the CMS?
          </Typography>
        </Box>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button 
            onClick={cancelSignOut} 
            sx={{ color: '#000', fontWeight: 700 }}
          >
            CANCEL
          </Button>
          <Button 
            onClick={handleSignOut} 
            variant="contained" 
            sx={{ backgroundColor: '#000', color: '#FFF', fontWeight: 700, borderRadius: 0, '&:hover': { backgroundColor: '#333' } }}
          >
            SIGN OUT
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default App
