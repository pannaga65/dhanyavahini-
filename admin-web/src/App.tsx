import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { Box, Typography, List, ListItem, ListItemButton, ListItemText, ListItemIcon, Drawer, IconButton, AppBar, Toolbar, Dialog, DialogTitle, DialogActions, Button, Badge, Popover, Avatar } from '@mui/material'
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
import { getFirestore, collection, query, where, onSnapshot, updateDoc, doc, getDoc } from 'firebase/firestore'
import { useState, useEffect } from 'react'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Orders from './pages/Orders'
import Inquiries from './pages/Inquiries'
import Farmers from './pages/Farmers'
import Procurement from './pages/Procurement'
import Campaigns from './pages/Campaigns'
import Loans from './pages/Loans'
import PrintBill from './pages/PrintBill'
import Settings from './pages/Settings'
import BusinessProfile from './pages/BusinessProfile'
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
  { text: 'Campaigns', path: '/campaigns', icon: <NotificationsIcon sx={{ fontSize: 20 }} /> },
  { text: 'Loans', path: '/loans', icon: <AccountBalanceOutlinedIcon sx={{ fontSize: 20 }} /> },
  { text: 'Inventory', path: '/inventory', icon: <Inventory2OutlinedIcon sx={{ fontSize: 20 }} /> },
  { text: 'Settings', path: '/settings', icon: <SettingsOutlinedIcon sx={{ fontSize: 20 }} /> },
];

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [adminProfile, setAdminProfile] = useState<any>({ name: 'Admin User', logoUrl: '' });
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [inquiryCount, setInquiryCount] = useState(0);
  const [dismissedCount, setDismissedCount] = useState(0);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleNotificationClick = (event: React.MouseEvent<HTMLElement>) => {
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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const profileDoc = await getDoc(doc(db, 'settings', 'businessProfile'));
          if (profileDoc.exists()) {
            const data = profileDoc.data();
            setAdminProfile({
              name: data.adminName || 'Admin User',
              logoUrl: data.logoUrl || ''
            });
          }
        } catch (e) {
          console.error('Error fetching admin profile:', e);
        }
      }
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
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#FFFFFF' }}>
      {/* Logo */}
      <Box sx={{ px: 2.5, pt: 3, pb: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={adminProfile.logoUrl || "/LOGO.png"} alt="Logo" style={{ width: 32, height: 32, objectFit: 'contain' }} />
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: '1rem', letterSpacing: 0.5, lineHeight: 1, color: '#1A1A2E' }}>
            Dhanyavahini
          </Typography>
          <Typography sx={{ fontWeight: 600, fontSize: '0.6rem', color: '#64748B', letterSpacing: 1, mt: 0.3 }}>
            Admin Panel
          </Typography>
        </Box>
      </Box>

      <Box sx={{ borderBottom: '1px solid #E2E8F0', mx: 2, mb: 1 }} />

      {/* Section Label */}
      <Typography sx={{ px: 2.5, pt: 1.5, pb: 1, fontSize: '0.65rem', fontWeight: 700, color: '#94A3B8', letterSpacing: 1.5, textTransform: 'uppercase' }}>
        Menu
      </Typography>

      {/* Nav Links */}
      <List disablePadding sx={{ px: 1.5 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => {
                  navigate(item.path);
                  if (mobileOpen) setMobileOpen(false);
                }}
                sx={{
                  py: 1,
                  px: 2,
                  borderRadius: 2,
                  backgroundColor: isActive ? '#DCFCE7' : 'transparent',
                  '&:hover': {
                    backgroundColor: isActive ? '#DCFCE7' : '#F1F5F9',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 32, color: isActive ? '#14532D' : '#64748B' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography sx={{ fontWeight: isActive ? 700 : 500, fontSize: '0.84rem', color: isActive ? '#14532D' : '#475569', letterSpacing: 0.2 }}>
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

      {/* Footer */}
      <Box sx={{ borderTop: '1px solid #E2E8F0', mx: 2 }} />
      <Box sx={{ py: 1.5, px: 1.5 }}>
        <ListItemButton
          onClick={confirmSignOut}
          sx={{ py: 1, px: 2, borderRadius: 2, '&:hover': { backgroundColor: '#FEF2F2' } }}
        >
          <ListItemIcon sx={{ minWidth: 32, color: '#64748B' }}>
            <LogoutOutlinedIcon sx={{ fontSize: 20 }} />
          </ListItemIcon>
          <ListItemText
            primary={
              <Typography sx={{ fontWeight: 500, fontSize: '0.84rem', color: '#64748B' }}>
                Sign Out
              </Typography>
            }
          />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F8F9FC', width: '100%', overflowX: 'hidden' }}>

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
          <IconButton color="inherit" onClick={handleNotificationClick} sx={{ mr: 1 }}>
            <Badge badgeContent={Math.max(0, inquiryCount - dismissedCount)} color="error" sx={{ '& .MuiBadge-badge': { fontWeight: 900 } }}>
              <NotificationsIcon sx={{ color: '#1B2A4A' }} />
            </Badge>
          </IconButton>
          <IconButton onClick={() => navigate('/profile')} sx={{ p: 0 }}>
            <Avatar sx={{ width: 32, height: 32, backgroundColor: '#0F172A', fontSize: '0.9rem', fontWeight: 700 }}>
              {user?.email?.charAt(0).toUpperCase() || 'A'}
            </Avatar>
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
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH, border: 'none', borderRight: '1px solid #E2E8F0', borderRadius: 0 },
          }}
        >
          {drawerContent}
        </Drawer>
        {/* Desktop Permanent Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH, border: 'none', borderRight: '1px solid #E2E8F0', borderRadius: 0 },
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
          minWidth: 0,
          width: { xs: '100%', md: `calc(100% - ${DRAWER_WIDTH}px)` },
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Desktop Top Header (Floating Pill) */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, p: { md: 4 }, pb: { md: 0 }, position: 'sticky', top: 0, zIndex: 1100, backgroundColor: '#F8F9FC' }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'flex-end',
            backgroundColor: '#FFF',
            borderRadius: 8,
            boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
            p: 1.2,
            px: 3,
            width: '100%'
          }}>
            {/* Right Side Icons & Profile */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
               
               {/* Notifications */}
               <IconButton onClick={handleNotificationClick} sx={{ backgroundColor: '#F8FAFC', border: '1px solid #F1F5F9', '&:hover': { backgroundColor: '#F1F5F9' } }}>
                 <Badge badgeContent={Math.max(0, inquiryCount - dismissedCount)} color="error" sx={{ '& .MuiBadge-badge': { fontWeight: 800 } }}>
                   <NotificationsIcon sx={{ fontSize: 20, color: '#475569' }} />
                 </Badge>
               </IconButton>

               <Box sx={{ height: 32, width: '1px', backgroundColor: '#E2E8F0', mx: 1 }} />

               {/* Profile Button */}
               <Box 
                 onClick={() => navigate('/profile')}
                 sx={{ 
                   display: 'flex', 
                   alignItems: 'center', 
                   gap: 1.5, 
                   cursor: 'pointer', 
                   p: 0.5, 
                   pr: 1.5, 
                   borderRadius: 10, 
                   border: '1px solid transparent',
                   transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', 
                   '&:hover': { 
                     backgroundColor: '#F8FAFC',
                     borderColor: '#E2E8F0',
                     boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                   } 
                 }}
               >
                 <Avatar 
                    src={adminProfile.logoUrl || undefined}
                    sx={{ width: 38, height: 38, backgroundColor: '#0F172A', fontSize: '1.1rem', fontWeight: 700 }}
                  >
                    {!adminProfile.logoUrl && (adminProfile.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'A')}
                  </Avatar>
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B', lineHeight: 1.2 }}>
                      {adminProfile.name}
                   </Typography>
                   <Typography sx={{ fontSize: '0.75rem', color: '#64748B' }}>
                     {user?.email || 'admin@dhanyavahini.com'}
                   </Typography>
                 </Box>
               </Box>
            </Box>
          </Box>
        </Box>

        <Box sx={{ p: { xs: 2, sm: 3, md: 5 }, pt: { xs: 10, md: 4 } }}>
        <Routes>
          <Route path="/" element={<Dashboard userEmail={user.email} />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/inquiries" element={<Inquiries />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/farmers" element={<Farmers />} />
          <Route path="/procurement" element={<Procurement />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/loans" element={<Loans />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/profile" element={<BusinessProfile />} />
          <Route path="/settings/*" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Box>
      </Box>

      {/* ── Floating Notification Button (Removed as per user request to avoid duplication on mobile) ── */}

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
