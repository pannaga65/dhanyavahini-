import { useState, useEffect } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { collection, getCountFromServer } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import app from '../firebase';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import GavelIcon from '@mui/icons-material/Gavel';

const db = getFirestore(app);

interface CardProps {
  title: string;
  count: number;
  subtitle: string;
  icon: React.ReactNode;
  onClick: () => void;
}

function BrutalistCard({ title, count, subtitle, icon, onClick }: CardProps) {
  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        p: { xs: 3, lg: 4 },
        aspectRatio: { xs: 'auto', md: '4 / 5' },
        minHeight: { xs: 200, md: 'auto' },
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'pointer',
        transition: 'background-color 0.15s ease',
        '&:hover': { backgroundColor: '#F5F5F5' },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Typography sx={{ fontWeight: 900, letterSpacing: 2, fontSize: { xs: '0.85rem', md: '1rem' } }}>
          {title}
        </Typography>
        {icon}
      </Box>

      <Typography
        sx={{
          fontWeight: 900,
          fontSize: { xs: '4rem', md: '7rem' },
          lineHeight: 1,
          color: '#000',
          my: 2,
        }}
      >
        {count}
      </Typography>

      <Typography
        sx={{
          fontWeight: 700,
          color: '#999',
          fontSize: '0.75rem',
          letterSpacing: 1.5,
          textTransform: 'uppercase',
        }}
      >
        {subtitle}
      </Typography>
    </Paper>
  );
}

interface DashboardProps {
  userEmail: string;
}

export default function Dashboard({ userEmail }: DashboardProps) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ orders: 0, products: 0, customers: 0, tenders: 0 });

  useEffect(() => {
    (async () => {
      try {
        const [o, p, c, t] = await Promise.all([
          getCountFromServer(collection(db, 'orders')),
          getCountFromServer(collection(db, 'products')),
          getCountFromServer(collection(db, 'users')),
          getCountFromServer(collection(db, 'bids')),
        ]);
        setStats({
          orders: o.data().count,
          products: p.data().count,
          customers: c.data().count,
          tenders: t.data().count,
        });
      } catch (e) {
        console.error('Error fetching live dashboard stats:', e);
      }
    })();
  }, []);

  const iconSx = { fontSize: 28, color: '#999' };

  return (
    <Box>
      {/* Header */}
      <Typography sx={{ fontWeight: 900, fontSize: { xs: '2rem', md: '2.8rem' }, letterSpacing: 3, lineHeight: 1 }}>
        OVERVIEW
      </Typography>
      <Typography sx={{ fontWeight: 600, color: '#999', letterSpacing: 1.5, mt: 1.5, mb: 4, textTransform: 'uppercase', fontSize: '0.8rem' }}>
        WELCOME BACK, {userEmail?.toUpperCase() || 'ADMIN'}
      </Typography>

      <Box sx={{ borderBottom: '2px solid #000', mb: 5 }} />

      {/* Cards Grid — Strict 4-column layout on Desktop */}
      <Box 
        sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, 
          gap: 3 
        }}
      >
        <BrutalistCard
          title="PRODUCTS"
          count={stats.products}
          subtitle="MANAGE CATALOG"
          icon={<Inventory2OutlinedIcon sx={iconSx} />}
          onClick={() => navigate('/products')}
        />
        <BrutalistCard
          title="CUSTOMERS"
          count={stats.customers}
          subtitle="MANAGE PROFILES"
          icon={<PeopleOutlinedIcon sx={iconSx} />}
          onClick={() => navigate('/customers')}
        />
        <BrutalistCard
          title="TENDERS"
          count={stats.tenders}
          subtitle="MANAGE ACTIVE SESSIONS"
          icon={<GavelIcon sx={iconSx} />}
          onClick={() => navigate('/bids')}
        />
        <BrutalistCard
          title="ORDERS"
          count={stats.orders}
          subtitle="MANAGE DISPATCHES"
          icon={<ShoppingCartOutlinedIcon sx={iconSx} />}
          onClick={() => navigate('/orders')}
        />
      </Box>
    </Box>
  );
}
