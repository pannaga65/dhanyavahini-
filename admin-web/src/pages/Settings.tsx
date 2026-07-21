import { Typography, Box, Tabs, Tab } from '@mui/material';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import Products from './Products';
import Categories from './Categories';
import Banners from './Banners';

export default function Settings() {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine which tab is active based on the URL path
  const currentTab = () => {
    if (location.pathname.includes('/settings/categories')) return 1;
    if (location.pathname.includes('/settings/banners')) return 2;
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
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box>
          <Typography sx={{ fontWeight: 900, fontSize: { xs: '1.8rem', md: '2.2rem' }, letterSpacing: 3 }}>
            SETTINGS HUB
          </Typography>
          <Typography sx={{ fontWeight: 600, color: '#999', letterSpacing: 1.5, fontSize: '0.8rem', mt: 0.5 }}>
            MANAGE APP CONFIGURATION AND CONTENT
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
            '& .MuiTab-root': { fontWeight: 700, letterSpacing: 1 },
            '& .Mui-selected': { color: '#000' },
            '& .MuiTabs-indicator': { backgroundColor: '#000', height: 3 }
          }}
        >
          <Tab label="PRODUCTS" />
          <Tab label="CATEGORIES" />
          <Tab label="BANNERS" />
        </Tabs>
      </Box>
      
      <Box sx={{ pt: 1 }}>
        <Routes>
          <Route path="products" element={<Products />} />
          <Route path="categories" element={<Categories />} />
          <Route path="banners" element={<Banners />} />
          <Route path="/" element={<Navigate to="products" replace />} />
          <Route path="*" element={<Navigate to="products" replace />} />
        </Routes>
      </Box>
    </Box>
  );
}
