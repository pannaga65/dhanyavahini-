import { createContext, useContext, useState, type ReactNode } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Snackbar, Alert, Typography } from '@mui/material';

interface UIContextType {
  showConfirm: (message: string, onConfirm: () => void) => void;
  showMessage: (message: string, severity?: 'success' | 'error' | 'info' | 'warning') => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) throw new Error('useUI must be used within UIProvider');
  return context;
};

export const UIProvider = ({ children }: { children: ReactNode }) => {
  // Confirm Dialog State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [onConfirmCallback, setOnConfirmCallback] = useState<(() => void) | null>(null);

  // Snackbar State
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('success');

  const showConfirm = (message: string, onConfirm: () => void) => {
    setConfirmMessage(message);
    setOnConfirmCallback(() => onConfirm);
    setConfirmOpen(true);
  };

  const showMessage = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleConfirm = () => {
    if (onConfirmCallback) onConfirmCallback();
    setConfirmOpen(false);
  };

  return (
    <UIContext.Provider value={{ showConfirm, showMessage }}>
      {children}
      
      {/* Global Confirm Dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#1A1A2E', borderBottom: '1px solid #E2E8F0', pb: 2, mb: 2 }}>
          Confirm Action
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.5 }}>
            {confirmMessage}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1, borderTop: '1px solid #F1F5F9' }}>
          <Button onClick={() => setConfirmOpen(false)} sx={{ fontWeight: 600, color: '#64748B' }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleConfirm} sx={{ backgroundColor: '#E11D48', color: '#FFF', fontWeight: 600, '&:hover': { backgroundColor: '#BE123C' } }}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Global Snackbar */}
      <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={() => setSnackbarOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ width: '100%', fontWeight: 600, borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </UIContext.Provider>
  );
};
