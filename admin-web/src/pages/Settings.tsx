import { Typography, Box, Button } from '@mui/material';
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

  const SETTINGS_NAV = [
    { label: 'Products', path: '/settings/products' },
    { label: 'Categories', path: '/settings/categories' },
    { label: 'Banners', path: '/settings/banners' },
    { label: 'Godowns', path: '/settings/godowns' }
  ];

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
        
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: { xs: 3, md: 5 } }}>
          {/* Settings Sidebar */}
          <Box sx={{ width: { xs: '100%', md: 220, lg: 240 }, flexShrink: 0 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {SETTINGS_NAV.map((item) => {
                const isActive = location.pathname.includes(item.path);
                return (
                  <Button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    disableElevation
                    sx={{
                      justifyContent: 'flex-start',
                      px: 2,
                      py: 1.25,
                      borderRadius: '8px',
                      color: isActive ? COLORS.primaryText : COLORS.mutedText,
                      backgroundColor: isActive ? '#E8ECE4' : 'transparent',
                      fontWeight: isActive ? 700 : 500,
                      textTransform: 'none',
                      fontSize: '14px',
                      transition: 'all 0.2s',
                      '&:hover': {
                        backgroundColor: isActive ? '#E8ECE4' : 'rgba(0,0,0,0.03)'
                      }
                    }}
                  >
                    {item.label}
                  </Button>
                );
              })}
            </Box>
          </Box>
          
          {/* Settings Content */}
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
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
      </Box>
    </Box>
  );
}
