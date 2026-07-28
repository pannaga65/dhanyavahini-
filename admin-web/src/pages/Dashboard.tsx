import { useState, useEffect } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { collection, getCountFromServer, query, where, getFirestore } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import app from '../firebase';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import QuestionAnswerOutlinedIcon from '@mui/icons-material/QuestionAnswerOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';

const db = getFirestore(app);

interface CardProps {
  title: string;
  count: number;
  subtitle: string;
  icon: React.ReactNode;
  accent: string;
  accentLight: string;
  onClick: () => void;
}

function StatCard({ title, count, subtitle, icon, accent, accentLight, onClick }: CardProps) {
  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        p: { xs: 3, lg: 4 },
        minHeight: { xs: 180, md: 200 },
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': { 
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Typography sx={{ fontWeight: 700, letterSpacing: 0.5, fontSize: '0.85rem', color: '#475569' }}>
          {title}
        </Typography>
        <Box sx={{ 
          width: 40, height: 40, borderRadius: 2, 
          backgroundColor: accentLight, 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: accent,
        }}>
          {icon}
        </Box>
      </Box>

      <Typography
        sx={{
          fontWeight: 800,
          fontSize: { xs: '3.5rem', md: '4.5rem' },
          lineHeight: 1,
          color: '#1A1A2E',
          my: 2,
        }}
      >
        {count}
      </Typography>

      <Typography
        sx={{
          fontWeight: 600,
          color: accent,
          fontSize: '0.75rem',
          letterSpacing: 0.5,
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
  const [stats, setStats] = useState({ orders: 0, products: 0, customers: 0, inquiries: 0, procurement: 0 });

  useEffect(() => {
    (async () => {
      try {
        const [o, p, c, i, a] = await Promise.all([
          getCountFromServer(collection(db, 'orders')),
          getCountFromServer(collection(db, 'products')),
          getCountFromServer(collection(db, 'users')),
          getCountFromServer(query(collection(db, 'orders'), where('status', '==', 'Inquiry'))),
          getCountFromServer(collection(db, 'farmer_settlements')),
        ]);
        setStats({
          orders: o.data().count,
          products: p.data().count,
          customers: c.data().count,
          inquiries: i.data().count,
          procurement: a.data().count,
        });
      } catch (e) {
        console.error('Error fetching live dashboard stats:', e);
      }
    })();
  }, []);

  return (
    <Box>
      {/* Header */}
      <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.8rem', md: '2.2rem' }, letterSpacing: 0.5, lineHeight: 1, color: '#1A1A2E' }}>
        Overview
      </Typography>
      <Typography sx={{ fontWeight: 500, color: '#94A3B8', letterSpacing: 0.5, mt: 1, mb: 4, fontSize: '0.9rem' }}>
        Welcome back, {userEmail || 'Admin'}
      </Typography>

      <Box sx={{ borderBottom: '1px solid #E2E8F0', mb: 4 }} />

      {/* Cards Grid */}
      <Box 
        sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, 
          gap: 3 
        }}
      >
        <StatCard
          title="Products"
          count={stats.products}
          subtitle="Manage Catalog →"
          icon={<Inventory2OutlinedIcon sx={{ fontSize: 22 }} />}
          accent="#2563EB"
          accentLight="#DBEAFE"
          onClick={() => navigate('/settings/products')}
        />
        <StatCard
          title="Customers"
          count={stats.customers}
          subtitle="Manage Profiles →"
          icon={<PeopleOutlinedIcon sx={{ fontSize: 22 }} />}
          accent="#7C3AED"
          accentLight="#EDE9FE"
          onClick={() => navigate('/customers')}
        />
        <StatCard
          title="Inquiries"
          count={stats.inquiries}
          subtitle="Review & Negotiate →"
          icon={<QuestionAnswerOutlinedIcon sx={{ fontSize: 22 }} />}
          accent="#D97706"
          accentLight="#FEF3C7"
          onClick={() => navigate('/inquiries')}
        />
        <StatCard
          title="Orders"
          count={stats.orders}
          subtitle="Manage Dispatches →"
          icon={<ShoppingCartOutlinedIcon sx={{ fontSize: 22 }} />}
          accent="#16A34A"
          accentLight="#DCFCE7"
          onClick={() => navigate('/orders')}
        />
        <StatCard
          title="Procurement"
          count={stats.procurement}
          subtitle="Farmer Bills →"
          icon={<ReceiptLongOutlinedIcon sx={{ fontSize: 22 }} />}
          accent="#0891B2"
          accentLight="#CFFAFE"
          onClick={() => navigate('/procurement')}
        />
      </Box>
    </Box>
  );
}
