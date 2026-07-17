import { Routes, Route } from 'react-router-dom'
import { Box, AppBar, Toolbar, Typography, Drawer, List, ListItem, ListItemButton, ListItemText, ListItemIcon } from '@mui/material'
import DashboardIcon from '@mui/icons-material/Dashboard'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import PeopleIcon from '@mui/icons-material/People'
import InventoryIcon from '@mui/icons-material/Inventory'
import GavelIcon from '@mui/icons-material/Gavel'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Products from './pages/Products'
import Orders from './pages/Orders'
import Bids from './pages/Bids'
import { useNavigate, useLocation } from 'react-router-dom'

const drawerWidth = 240;

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, backgroundColor: '#000000' }}>
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700, letterSpacing: 1 }}>
            DHANYAVAHINI ADMIN
          </Typography>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box', borderRight: '1px solid #EAEAEA' },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto', mt: 2 }}>
          <List>
            {[
              { text: 'Dashboard', path: '/', icon: <DashboardIcon /> },
              { text: 'Orders', path: '/orders', icon: <ShoppingCartIcon /> },
              { text: 'Products', path: '/products', icon: <InventoryIcon /> },
              { text: 'Customers', path: '/customers', icon: <PeopleIcon /> },
              { text: 'Live Bids', path: '/bids', icon: <GavelIcon /> },
            ].map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <ListItem key={item.text} disablePadding>
                  <ListItemButton 
                    onClick={() => navigate(item.path)}
                    sx={{ 
                      mx: 1, 
                      borderRadius: 2, 
                      backgroundColor: isActive ? '#000000' : 'transparent',
                      color: isActive ? '#FFFFFF' : '#000000',
                      '&:hover': { backgroundColor: isActive ? '#000000' : '#F4F4F4' } 
                    }}
                  >
                    <ListItemIcon sx={{ color: isActive ? '#FFFFFF' : '#000000', minWidth: 40 }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText primary={<Typography sx={{ fontWeight: 500 }}>{item.text}</Typography>} />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 4, pt: 10, minHeight: '100vh', backgroundColor: '#F9F9F9' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/products" element={<Products />} />
          <Route path="/bids" element={<Bids />} />
        </Routes>
      </Box>
    </Box>
  )
}

export default App
