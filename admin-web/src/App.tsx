import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { Box, Typography, List, ListItem, ListItemButton, ListItemText, ListItemIcon, Drawer, IconButton, AppBar, Toolbar, Dialog, DialogTitle, DialogActions, Button, Badge, Fab, Popover } from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import NotificationsIcon from '@mui/icons-material/Notifications'
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import QuestionAnswerOutlinedIcon from '@mui/icons-material/QuestionAnswerOutlined'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined'
import AgricultureOutlinedIcon from '@mui/icons-material/AgricultureOutlined'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import { getAuth, signOut, onAuthStateChanged } from 'firebase/auth'
import { getFirestore, collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore'
import { useState, useEffect } from 'react'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Orders from './pages/Orders'
import Inquiries from './pages/Inquiries'
import Farmers from './pages/Farmers'
import Procurement from './pages/Procurement'
import Loans from './pages/Loans'
import PrintBill from './pages/PrintBill'
import Settings from './pages/Settings'
import Login from './pages/Login'
import Inventory from './pages/Inventory'
import app, { messaging } from './firebase'
import { getToken } from 'firebase/messaging'
import './index.css'

const DRAWER_WIDTH = 240;
const auth = getAuth(app);
const db = getFirestore(app);

const NAV_ITEMS = [
  { text: 'Dashboard', path: '/', icon: <DashboardOutlinedIcon sx={{ fontSize: 20 }} /> },
  { text: 'Inquiries', path: '/inquiries', icon: <QuestionAnswerOutlinedIcon sx={{ fontSize: 20 }} /> },
  { text: 'Orders', path: '/orders', icon: <ShoppingCartOutlinedIcon sx={{ fontSize: 20 }} /> },
  { text: 'Customers', path: '/customers', icon: <PeopleOutlinedIcon sx={{ fontSize: 20 }} /> },
  { text: 'Farmers', path: '/farmers', icon: <AgricultureOutlinedIcon sx={{ fontSize: 20 }} /> },
  { text: 'Procurement', path: '/procurement', icon: <ReceiptLongOutlinedIcon sx={{ fontSize: 20 }} /> },
  { text: 'Loans', path: '/loans', icon: <AccountBalanceOutlinedIcon sx={{ fontSize: 20 }} /> },
  { text: 'Inventory', path: '/inventory', icon: <Inventory2OutlinedIcon sx={{ fontSize: 20 }} /> },
  { text: 'Settings', path: '/settings', icon: <SettingsOutlinedIcon sx={{ fontSize: 20 }} /> },
];

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [inquiryCount, setInquiryCount] = useState(0);
  const [dismissedCount, setDismissedCount] = useState(0);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const handleNotificationClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(anchorEl ? null : event.currentTarget);
  };
  const handleNotificationClose = () => {
    setAnchorEl(null);
  };
  const openNotification = Boolean(anchorEl);

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

    // Request Push Notification Permissions & Token
    const setupNotifications = async () => {
      try {
        const msg = await messaging();
        if (msg) {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            const token = await getToken(msg, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY });
            if (token) {
              await updateDoc(doc(db, 'admins', user.uid), { fcmToken: token });
            }
          }
        }
      } catch (e) {
        console.log('Error setting up push notifications:', e);
      }
    };
    setupNotifications();

    const q = query(collection(db, 'orders'), where('status', '==', 'Inquiry'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newCount = snapshot.size;
      setInquiryCount(prev => {
        if (newCount > prev) {
          setDismissedCount(0); // If a NEW inquiry drops, un-dismiss!
        }
        return newCount;
      });
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
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#F8F9FC' }}>
        <Typography sx={{ fontWeight: 700, letterSpacing: 2, fontSize: '1rem', color: '#64748B' }}>Loading…</Typography>
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
  
  // Render Print Bill without the sidebar layout
  if (location.pathname.startsWith('/print-bill')) {
    return (
      <Routes>
        <Route path="/print-bill/:id" element={<PrintBill />} />
      </Routes>
    );
  }

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#0F172A' }}>
      {/* Logo */}
      <Box sx={{ px: 2.5, pt: 3, pb: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ width: 36, height: 36, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <img src="/logo.png" alt="Logo" style={{ width: 28, height: 28, objectFit: 'contain' }} />
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: '1rem', letterSpacing: 0.5, lineHeight: 1, color: '#F1F5F9' }}>
            Dhanyavahini
          </Typography>
          <Typography sx={{ fontWeight: 500, fontSize: '0.6rem', color: '#64748B', letterSpacing: 1, mt: 0.3 }}>
            Admin Panel
          </Typography>
        </Box>
      </Box>

      <Box sx={{ borderBottom: '1px solid rgba(255,255,255,0.08)', mx: 2, mb: 1 }} />

      {/* Section Label */}
      <Typography sx={{ px: 2.5, pt: 1.5, pb: 1, fontSize: '0.65rem', fontWeight: 600, color: '#475569', letterSpacing: 1.5, textTransform: 'uppercase' }}>
        Menu
      </Typography>

      {/* Nav Links */}
      <List disablePadding>
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                onClick={() => {
                  navigate(item.path);
                  if (mobileOpen) setMobileOpen(false);
                }}
                sx={{
                  py: 1.2,
                  px: 2.5,
                  borderRadius: 0,
                  backgroundColor: isActive ? 'rgba(255,255,255,0.04)' : 'transparent',
                  borderLeft: isActive ? '3px solid #4ADE80' : '3px solid transparent',
                  '&:hover': {
                    backgroundColor: isActive ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.04)',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 32, color: isActive ? '#4ADE80' : '#64748B' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography sx={{ fontWeight: isActive ? 600 : 400, fontSize: '0.84rem', color: isActive ? '#F1F5F9' : '#94A3B8', letterSpacing: 0.2 }}>
                        {item.text}
                      </Typography>
                      {item.text === 'Inquiries' && inquiryCount > 0 && (
                        <Box sx={{ backgroundColor: '#EF4444', color: 'white', borderRadius: 10, minWidth: 20, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, px: 0.5 }}>
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
      <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} />
      <Box sx={{ py: 1 }}>
        <ListItemButton
          onClick={confirmSignOut}
          sx={{ py: 1.2, px: 2.5, borderRadius: 0, '&:hover': { backgroundColor: 'rgba(239,68,68,0.1)' } }}
        >
          <ListItemIcon sx={{ minWidth: 32, color: '#64748B' }}>
            <LogoutOutlinedIcon sx={{ fontSize: 20 }} />
          </ListItemIcon>
          <ListItemText
            primary={
              <Typography sx={{ fontWeight: 400, fontSize: '0.84rem', color: '#94A3B8' }}>
                Sign Out
              </Typography>
            }
          />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F8F9FC', width: '100%' }}>

      {/* ── Mobile AppBar ── */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          display: { md: 'none' },
          backgroundColor: '#FFF',
          borderBottom: '1px solid #E2E8F0',
          color: '#1B2A4A'
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={(e) => {
              (e.currentTarget as HTMLElement).blur();
              handleDrawerToggle();
            }}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: 1, color: '#1B2A4A' }}>
            Dhanyavahini
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
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH, border: 'none' },
          }}
        >
          {drawerContent}
        </Drawer>
        {/* Desktop Permanent Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH, border: 'none' },
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
          <Route path="/farmers" element={<Farmers />} />
          <Route path="/procurement" element={<Procurement />} />
          <Route path="/loans" element={<Loans />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/settings/*" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Box>

      {/* ── Floating Notification Button ── */}
      <Fab
        color={inquiryCount - dismissedCount > 0 ? "error" : "primary"}
        aria-label="notifications"
        onClick={handleNotificationClick}
        sx={{
          display: { xs: 'none', md: 'flex' },
          position: 'fixed',
          top: 28,
          right: 28,
          zIndex: 9999,
          backgroundColor: inquiryCount - dismissedCount > 0 ? '#DC2626' : '#1B2A4A',
          '&:hover': { backgroundColor: inquiryCount - dismissedCount > 0 ? '#B91C1C' : '#2D4A7A' }
        }}
      >
        <Badge badgeContent={Math.max(0, inquiryCount - dismissedCount)} color="error" sx={{ '& .MuiBadge-badge': { backgroundColor: '#FFF', color: '#1B2A4A', fontWeight: 700 } }}>
          <NotificationsIcon sx={{ color: '#FFF' }} />
        </Badge>
      </Fab>

      <Popover
        open={openNotification}
        anchorEl={anchorEl}
        onClose={handleNotificationClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { border: '1px solid #E2E8F0', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)', borderRadius: 3, mt: 1, mb: 2, backgroundColor: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(20px)' } } }}
      >
        <Box sx={{ p: 2, minWidth: 250 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography sx={{ fontWeight: 700, letterSpacing: 0.5, color: '#1B2A4A' }}>Notifications</Typography>
            {inquiryCount - dismissedCount > 0 && (
              <Button
                size="small"
                onClick={() => setDismissedCount(inquiryCount)}
                sx={{ fontSize: '0.65rem', color: '#666', minWidth: 'auto', p: 0, '&:hover': { color: '#000', backgroundColor: 'transparent' } }}
              >
                Mark as read
              </Button>
            )}
          </Box>
          <Box sx={{ borderBottom: '1px solid #E2E8F0', mb: 1 }} />
          {inquiryCount > 0 ? (
            <ListItemButton
              onClick={() => {
                handleNotificationClose();
                navigate('/inquiries');
              }}
              sx={{ backgroundColor: inquiryCount - dismissedCount > 0 ? '#FAFAFA' : '#FFF', border: '1px solid #EEE' }}
            >
              <ListItemText
                primary={<Typography sx={{ fontWeight: 700 }}>You have {inquiryCount} pending Inquiries!</Typography>}
                secondary={<Typography sx={{ fontSize: '0.75rem', color: '#666', mt: 0.5 }}>Click here to review and negotiate.</Typography>}
              />
            </ListItemButton>
          ) : (
            <Typography sx={{ fontSize: '0.85rem', color: '#999', py: 2, textAlign: 'center', fontWeight: 600 }}>
              You have no new notifications.
            </Typography>
          )}
        </Box>
      </Popover>

      {/* ── Sign Out Confirmation Dialog ── */}
      <Dialog
        open={signOutOpen}
        onClose={cancelSignOut}
        slotProps={{
          paper: {
            sx: { border: '1px solid #E2E8F0', borderRadius: 3 }
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem', pb: 1 }}>
          Sign Out
        </DialogTitle>
        <Box sx={{ px: 3, pb: 2 }}>
          <Typography sx={{ fontWeight: 500, fontSize: '0.9rem', color: '#64748B' }}>
            Are you sure you want to end your session and sign out?
          </Typography>
        </Box>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            onClick={cancelSignOut}
            sx={{ color: '#64748B', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSignOut}
            variant="contained"
            sx={{ backgroundColor: '#DC2626', color: '#FFF', fontWeight: 600, '&:hover': { backgroundColor: '#B91C1C' } }}
          >
            Sign Out
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default App
