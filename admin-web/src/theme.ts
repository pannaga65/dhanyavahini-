import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#000000', // Pure black
    },
    background: {
      default: '#F4F4F4', // Off-white/light gray
      paper: '#FFFFFF', // Pure white
    },
    text: {
      primary: '#1A1A1A',
      secondary: '#666666',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          '&:hover': {
            boxShadow: '0 6px 12px rgba(0,0,0,0.15)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 8px 30px rgba(0,0,0,0.04), 0 4px 10px rgba(0,0,0,0.02)', // Minimalistic 3D effect
          border: '1px solid #EAEAEA',
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 10px 40px rgba(0,0,0,0.05), 0 2px 10px rgba(0,0,0,0.02)', // 3D floating table
          border: '1px solid #EAEAEA',
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid #F0F0F0',
          padding: '16px',
        },
        head: {
          fontWeight: 600,
          color: '#000000',
          backgroundColor: '#FAFAFA',
          textTransform: 'uppercase',
          fontSize: '0.75rem',
          letterSpacing: '0.05em',
        },
      },
    },
  },
});
