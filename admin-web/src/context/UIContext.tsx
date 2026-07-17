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
        <DialogTitle sx={{ fontWeight: 900 }}>CONFIRM ACTION</DialogTitle>
        <DialogContent>
          <Typography>{confirmMessage}</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmOpen(false)} sx={{ fontWeight: 700, color: '#000' }}>CANCEL</Button>
          <Button variant="contained" onClick={handleConfirm} sx={{ backgroundColor: '#000', color: '#FFF', fontWeight: 700 }}>
            CONFIRM
          </Button>
        </DialogActions>
      </Dialog>

      {/* Global Snackbar */}
      <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={() => setSnackbarOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ width: '100%', fontWeight: 700 }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </UIContext.Provider>
  );
};
