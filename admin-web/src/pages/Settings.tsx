import { Typography, Box, Button } from '@mui/material';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import Products from './Products';
import Categories from './Categories';
import Banners from './Banners';
import Godowns from './Godowns';

// Enterprise SaaS Colors
const COLORS = {
  bg: '#F8FAFC',
  primaryText: '#0F172A',
  mutedText: '#64748B',
  primaryAccent: '#1B4332',
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
        
        <Box sx={{ mb: 4, display: 'inline-flex', backgroundColor: '#F1F5F9', borderRadius: '12px', p: 0.5, overflowX: 'auto', maxWidth: '100%' }}>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {SETTINGS_NAV.map((item) => {
              const isActive = location.pathname.includes(item.path);
              return (
                <Button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  disableElevation
                  sx={{
                    justifyContent: 'center',
                    px: 3,
                    py: 1,
                    borderRadius: '8px',
                    color: isActive ? COLORS.primaryAccent : COLORS.mutedText,
                    backgroundColor: isActive ? '#FFFFFF' : 'transparent',
                    fontWeight: isActive ? 600 : 500,
                    textTransform: 'none',
                    fontSize: '14px',
                    boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                    '&:hover': {
                      backgroundColor: isActive ? '#FFFFFF' : 'rgba(0,0,0,0.03)'
                    }
                  }}
                >
                  {item.label}
                </Button>
              );
            })}
          </Box>
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
