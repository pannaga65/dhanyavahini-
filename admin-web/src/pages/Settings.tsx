import { Typography, Box, Tabs, Tab } from '@mui/material';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import Products from './Products';
import Categories from './Categories';
import Banners from './Banners';
import Godowns from './Godowns';

// Premium Colors
const COLORS = {
  bg: '#F3F5F1',
  primaryText: '#1B4332',
  mutedText: '#64748B',
  accentGold: '#D4A017',
  accentTeal: '#2C6E7F',
  border: '#E2E8F0',
};

export default function Settings() {
  const navigate = useNavigate();
  const location = useLocation();

  const currentTab = () => {
    if (location.pathname.includes('/settings/products')) return 0;
    if (location.pathname.includes('/settings/categories')) return 1;
    if (location.pathname.includes('/settings/banners')) return 2;
    if (location.pathname.includes('/settings/godowns')) return 3;
    return 0;
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    switch (newValue) {
      case 0: navigate('/settings/products'); break;
      case 1: navigate('/settings/categories'); break;
      case 2: navigate('/settings/banners'); break;
      case 3: navigate('/settings/godowns'); break;
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: COLORS.bg, pt: { xs: 4, md: 6 }, pb: 16 }}>
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, sm: 3 } }}>
        <Box sx={{ mb: 4 }}>
          <Typography sx={{ fontWeight: 900, fontSize: '32px', color: COLORS.primaryText, letterSpacing: '-0.5px', lineHeight: 1, mb: 1 }}>
            Catalog & Settings
          </Typography>
          <Typography sx={{ color: COLORS.mutedText, fontSize: '15px', fontWeight: 500 }}>
            Manage your inventory items, categories, and system configuration.
          </Typography>
        </Box>
        
        <Box sx={{ mb: 4, display: 'inline-block', backgroundColor: '#E8ECE4', borderRadius: '12px', p: 0.5 }}>
          <Tabs 
            value={currentTab()} 
            onChange={handleTabChange} 
            sx={{
              minHeight: '44px',
              '& .MuiTabs-indicator': { display: 'none' },
              '& .MuiTab-root': { 
                fontWeight: 700, 
                letterSpacing: 0.5, 
                minHeight: '36px', 
                height: '36px',
                borderRadius: '8px',
                color: COLORS.mutedText,
                textTransform: 'none',
                fontSize: '14px',
                px: 3,
                mx: 0.5,
                transition: 'all 0.2s',
              },
              '& .Mui-selected': { 
                color: '#FFF !important', 
                backgroundColor: COLORS.primaryText,
                boxShadow: '0 2px 8px rgba(27,67,50,0.2)'
              }
            }}
          >
            <Tab label="Products" disableRipple />
            <Tab label="Categories" disableRipple />
            <Tab label="Banners" disableRipple />
            <Tab label="Godowns" disableRipple />
          </Tabs>
        </Box>
        
        <Box>
          <Routes>
            <Route path="products" element={<Products />} />
            <Route path="categories" element={<Categories />} />
            <Route path="banners" element={<Banners />} />
            <Route path="godowns" element={<Godowns />} />
            <Route path="/" element={<Navigate to="products" replace />} />
            <Route path="*" element={<Navigate to="products" replace />} />
          </Routes>
        </Box>
      </Box>
    </Box>
  );
}
