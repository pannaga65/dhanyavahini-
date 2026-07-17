import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#000000',
    },
    background: {
      default: '#FFFFFF',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#000000',
      secondary: '#666666',
    },
  },
  typography: {
    fontFamily: '"Inter", "Helvetica Neue", "Arial", sans-serif',
    button: {
      textTransform: 'none',
      fontWeight: 700,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          boxShadow: 'none',
          border: '2px solid #000',
          fontWeight: 800,
          letterSpacing: 0.5,
          '&:hover': {
            boxShadow: 'none',
          },
        },
        contained: {
          backgroundColor: '#000',
          color: '#FFF',
          '&:hover': {
            backgroundColor: '#333',
          },
        },
        outlined: {
          borderColor: '#000',
          color: '#000',
          '&:hover': {
            backgroundColor: '#F5F5F5',
            borderColor: '#000',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          boxShadow: 'none',
          border: '2px solid #000',
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          boxShadow: 'none',
          border: '2px solid #000',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid #E0E0E0',
          padding: '14px 20px',
          fontSize: '0.9rem',
        },
        head: {
          fontWeight: 800,
          color: '#000000',
          backgroundColor: '#F5F5F5',
          textTransform: 'uppercase',
          fontSize: '0.75rem',
          letterSpacing: '0.08em',
          borderBottom: '2px solid #000',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 0,
          border: '2px solid #000',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontWeight: 900,
          letterSpacing: 1,
          textTransform: 'uppercase',
          fontSize: '1.1rem',
          borderBottom: '2px solid #000',
          padding: '20px 24px',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 0,
            '& fieldset': {
              borderWidth: 2,
              borderColor: '#000',
            },
            '&:hover fieldset': {
              borderColor: '#000',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#000',
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          fontWeight: 700,
          letterSpacing: 0.5,
        },
      },
    },
  },
});
