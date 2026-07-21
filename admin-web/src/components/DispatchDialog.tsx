import { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, CircularProgress, Dialog, DialogActions, Grid } from '@mui/material';

export interface DispatchData {
  deliveryNote?: string;
  paymentTerms?: string;
  referenceNo?: string;
  buyerOrderNo?: string;
  dispatchDocNo?: string;
  dispatchedThrough?: string;
  destination?: string;
  lrNumber?: string;
  motorVehicleNo?: string;
  termsOfDelivery?: string;
}

interface DispatchDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: DispatchData) => void;
  onSkip?: () => void;
  loading: boolean;
  initialData?: DispatchData;
  isApprovalMode?: boolean;
}

export default function DispatchDialog({ open, onClose, onSave, onSkip, loading, initialData, isApprovalMode }: DispatchDialogProps) {
  const [formData, setFormData] = useState<DispatchData>({});

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({});
    }
  }, [initialData, open]);

  const handleChange = (field: keyof DispatchData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onClose={() => !loading && onClose()} maxWidth="sm" fullWidth>
      <Box sx={{ p: 3 }}>
        <Typography sx={{ fontWeight: 900, letterSpacing: 1, fontSize: '1.2rem', mb: 1 }}>
          {isApprovalMode ? 'DISPATCH DETAILS (OPTIONAL)' : 'EDIT DISPATCH DETAILS'}
        </Typography>
        <Typography sx={{ fontSize: '0.8rem', color: '#666', mb: 3 }}>
          {isApprovalMode 
            ? 'Fill these now to generate an invoice, or skip and fill them later.'
            : 'Update dispatch information to regenerate the correct invoice.'}
        </Typography>
        
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Delivery Note" fullWidth value={formData.deliveryNote || ''} onChange={(e) => handleChange('deliveryNote', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Mode/Terms of Payment" fullWidth value={formData.paymentTerms || ''} onChange={(e) => handleChange('paymentTerms', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Reference No. & Date" fullWidth value={formData.referenceNo || ''} onChange={(e) => handleChange('referenceNo', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Buyer's Order No. & Date" fullWidth value={formData.buyerOrderNo || ''} onChange={(e) => handleChange('buyerOrderNo', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Dispatch Doc No. / Date" fullWidth value={formData.dispatchDocNo || ''} onChange={(e) => handleChange('dispatchDocNo', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Dispatched Through" fullWidth value={formData.dispatchedThrough || ''} onChange={(e) => handleChange('dispatchedThrough', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Destination" fullWidth value={formData.destination || ''} onChange={(e) => handleChange('destination', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Bill of Lading / LR-RR No." fullWidth value={formData.lrNumber || ''} onChange={(e) => handleChange('lrNumber', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Motor Vehicle No." fullWidth value={formData.motorVehicleNo || ''} onChange={(e) => handleChange('motorVehicleNo', e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Terms of Delivery" fullWidth value={formData.termsOfDelivery || ''} onChange={(e) => handleChange('termsOfDelivery', e.target.value)} />
          </Grid>
        </Grid>
      </Box>
      <DialogActions sx={{ borderTop: '1px solid #E0E0E0', p: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={onClose} disabled={loading} sx={{ color: '#666', fontWeight: 600 }}>CANCEL</Button>
        <Box>
          {isApprovalMode && onSkip && (
            <Button onClick={onSkip} disabled={loading} sx={{ color: '#000', fontWeight: 700, mr: 2 }}>
              SKIP FOR NOW
            </Button>
          )}
          <Button variant="contained" onClick={() => onSave(formData)} disabled={loading} sx={{ backgroundColor: '#000', color: '#FFF', fontWeight: 700, borderRadius: 0 }}>
            {loading ? <CircularProgress size={20} color="inherit" /> : (isApprovalMode ? 'SAVE & APPROVE' : 'SAVE DETAILS')}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}
