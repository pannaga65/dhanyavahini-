import { Typography, Box, Tabs, Tab } from '@mui/material';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import Products from './Products';
import Categories from './Categories';
import Banners from './Banners';
import Godowns from './Godowns';

export default function Settings() {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine which tab is active based on the URL path
  const currentTab = () => {
    if (location.pathname.includes('/settings/products')) return 0;
    if (location.pathname.includes('/settings/categories')) return 1;
    if (location.pathname.includes('/settings/banners')) return 2;
    if (location.pathname.includes('/settings/godowns')) return 3;
    return 0; // Default to products
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    switch (newValue) {
      case 0:
        navigate('/settings/products');
        break;
      case 1:
        navigate('/settings/categories');
        break;
      case 2:
        navigate('/settings/banners');
        break;
      case 3:
        navigate('/settings/godowns');
        break;
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.8rem', md: '2.2rem' }, letterSpacing: 0.5, color: '#1A1A2E' }}>
            Settings
          </Typography>
          <Typography sx={{ fontWeight: 500, color: '#94A3B8', letterSpacing: 0.3, fontSize: '0.9rem', mt: 0.5 }}>
            Manage app configuration and content
          </Typography>
        </Box>
      </Box>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 3, mb: 3 }}>
        <Tabs 
          value={currentTab()} 
          onChange={handleTabChange} 
          textColor="inherit"
          indicatorColor="primary"
          sx={{
            '& .MuiTab-root': { fontWeight: 600, letterSpacing: 0.5 },
            '& .Mui-selected': { color: '#1B2A4A' },
            '& .MuiTabs-indicator': { backgroundColor: '#1B2A4A', height: 3 }
          }}
        >
          <Tab label="PRODUCTS" />
          <Tab label="CATEGORIES" />
          <Tab label="BANNERS" />
          <Tab label="GODOWNS" />
        </Tabs>
      </Box>
      
      <Box sx={{ pt: 1 }}>
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
  );
}
