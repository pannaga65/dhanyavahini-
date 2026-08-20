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
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const db = getFirestore(app);

interface CardProps {
  title: string;
  count: number;
  subtitle: string;
  icon: React.ReactNode;
  accent: string;
  gradient?: string;
  onClick: () => void;
}

function StatCard({ title, count, subtitle, icon, accent, gradient, onClick }: CardProps) {
  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'pointer',
        background: gradient || accent,
        color: '#FFFFFF',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        border: 'none',
        overflow: 'hidden',
        '&:hover': { 
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 24px -8px rgba(0,0,0,0.15), 0 4px 12px -4px rgba(0,0,0,0.1)',
          '& .action-arrow': {
            transform: 'translateX(4px)',
          },
        },
      }}
    >
      <Box sx={{ p: { xs: 2.5, lg: 3 }, flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography sx={{ fontWeight: 600, letterSpacing: 0.5, fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase' }}>
              {title}
            </Typography>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: { xs: '2.5rem', md: '2.75rem' },
                lineHeight: 1,
                color: '#FFFFFF',
                mt: 1.5,
              }}
            >
              {count}
            </Typography>
          </Box>
          <Box sx={{ 
            width: 48, height: 48, borderRadius: 3, 
            background: 'rgba(255,255,255,0.2)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#FFFFFF',
          }}>
            {icon}
          </Box>
        </Box>
      </Box>

      <Box 
        sx={{ 
          px: { xs: 2.5, lg: 3 }, 
          py: 1.5, 
          backgroundColor: 'rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Typography
          className="action-text"
          sx={{
            fontWeight: 600,
            color: 'rgba(255,255,255,0.9)',
            fontSize: '0.75rem',
            letterSpacing: 0.5,
          }}
        >
          {subtitle.replace(' →', '')}
        </Typography>
        <ArrowForwardIcon 
          className="action-arrow" 
          sx={{ 
            fontSize: 16, 
            color: 'rgba(255,255,255,0.9)', 
            transition: 'all 0.2s',
          }} 
        />
      </Box>
    </Paper>
  );
}

interface DashboardProps {
  userEmail: string;
}

export default function Dashboard({ userEmail }: DashboardProps) {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ orders: 0, products: 0, customers: 0, inquiries: 0, procurement: 0, campaigns: 0 });

  useEffect(() => {
    (async () => {
      try {
        const [o, p, c, i, a, camp] = await Promise.all([
          getCountFromServer(collection(db, 'orders')),
          getCountFromServer(collection(db, 'products')),
          getCountFromServer(collection(db, 'users')),
          getCountFromServer(query(collection(db, 'orders'), where('status', '==', 'Inquiry'))),
          getCountFromServer(collection(db, 'farmer_settlements')),
          getCountFromServer(query(collection(db, 'campaigns'), where('isActive', '==', true))),
        ]);
        setStats({
          orders: o.data().count,
          products: p.data().count,
          customers: c.data().count,
          inquiries: i.data().count,
          procurement: a.data().count,
          campaigns: camp.data().count,
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
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' }, 
          gap: 3 
        }}
      >
        <StatCard
          title="Products"
          count={stats.products}
          subtitle="Manage Catalog →"
          icon={<Inventory2OutlinedIcon sx={{ fontSize: 24 }} />}
          accent="#3B82F6"
          gradient="linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)"
          onClick={() => navigate('/settings/products')}
        />
        <StatCard
          title="Customers"
          count={stats.customers}
          subtitle="Manage Profiles →"
          icon={<PeopleOutlinedIcon sx={{ fontSize: 24 }} />}
          accent="#8B5CF6"
          gradient="linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)"
          onClick={() => navigate('/customers')}
        />
        <StatCard
          title="Inquiries"
          count={stats.inquiries}
          subtitle="Review & Negotiate →"
          icon={<QuestionAnswerOutlinedIcon sx={{ fontSize: 24 }} />}
          accent="#F59E0B"
          gradient="linear-gradient(135deg, #F59E0B 0%, #D97706 100%)"
          onClick={() => navigate('/inquiries')}
        />
        <StatCard
          title="Orders"
          count={stats.orders}
          subtitle="Manage Dispatches →"
          icon={<ShoppingCartOutlinedIcon sx={{ fontSize: 24 }} />}
          accent="#10B981"
          gradient="linear-gradient(135deg, #10B981 0%, #059669 100%)"
          onClick={() => navigate('/orders')}
        />
        <StatCard
          title="Procurement"
          count={stats.procurement}
          subtitle="Farmer Bills →"
          icon={<ReceiptLongOutlinedIcon sx={{ fontSize: 24 }} />}
          accent="#06B6D4"
          gradient="linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)"
          onClick={() => navigate('/procurement')}
        />
        <StatCard
          title="Campaigns"
          count={stats.campaigns}
          subtitle="Active Campaigns →"
          icon={<CampaignOutlinedIcon sx={{ fontSize: 24 }} />}
          accent="#EC4899"
          gradient="linear-gradient(135deg, #EC4899 0%, #BE185D 100%)"
          onClick={() => navigate('/campaigns')}
        />
      </Box>
    </Box>
  );
}
