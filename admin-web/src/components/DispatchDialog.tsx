import { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, CircularProgress, Dialog, DialogActions, Grid, FormControl, InputLabel, Select, MenuItem } from '@mui/material';

export interface DispatchData {
  paymentTerms?: string;
  dispatchedThrough?: string;
  destination?: string;
  lrNumber?: string;
  motorVehicleNo?: string;
  shippingAddress?: string;
}

interface DispatchDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: DispatchData) => void;
  onSkip?: () => void;
  loading: boolean;
  initialData?: DispatchData;
  isApprovalMode?: boolean;
  customer?: any;
}

export default function DispatchDialog({ open, onClose, onSave, onSkip, loading, initialData, isApprovalMode, customer }: DispatchDialogProps) {
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

  // Build the list of available addresses for the dropdown
  const availableAddresses: { label: string; value: string }[] = [];
  if (customer) {
    if (customer.billingAddress && customer.billingAddress.trim() !== '') {
      availableAddresses.push({ label: 'Billing Address', value: customer.billingAddress });
    }
    if (customer.mailingAddresses) {
      customer.mailingAddresses.forEach((addr: string, idx: number) => {
        if (addr && addr.trim() !== '') {
          availableAddresses.push({ label: `Shipping Address${customer.mailingAddresses.length > 1 ? ` ${idx + 1}` : ''}`, value: addr });
        }
      });
    }
  }

  // Ensure the Select value matches an available MenuItem
  const currentSelectValue = formData.shippingAddress && availableAddresses.some(a => a.value === formData.shippingAddress)
    ? formData.shippingAddress
    : availableAddresses.length > 0 ? availableAddresses[0].value : '';

  const hasAddresses = availableAddresses.length > 0;

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
          {customer && (
            <Grid size={{ xs: 12 }}>
              {hasAddresses ? (
                <FormControl fullWidth>
                  <InputLabel>Shipping Address (Consignee)</InputLabel>
                  <Select
                    value={currentSelectValue}
                    label="Shipping Address (Consignee)"
                    onChange={(e) => handleChange('shippingAddress', e.target.value as string)}
                    sx={{ whiteSpace: 'pre-wrap' }}
                  >
                    {availableAddresses.map((addr, idx) => (
                      <MenuItem key={idx} value={addr.value}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.8rem' }}>{addr.label}</Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: '#666', ml: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {addr.value.replace(/\n/g, ', ')}
                        </Typography>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              ) : (
                <TextField
                  label="Shipping Address (Consignee)"
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="No saved addresses — type one here"
                  value={formData.shippingAddress || ''}
                  onChange={(e) => handleChange('shippingAddress', e.target.value)}
                  helperText="Customer has no saved addresses on file."
                />
              )}
              {customer.location && customer.location.lat && (
                <Box sx={{ mt: 1, ml: 1 }}>
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${customer.location.lat},${customer.location.lng}`} 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ color: '#0055CC', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    📍 View saved location on Google Maps
                  </a>
                </Box>
              )}
            </Grid>
          )}
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>Mode/Terms of Payment</InputLabel>
              <Select
                value={formData.paymentTerms || ''}
                label="Mode/Terms of Payment"
                onChange={(e) => handleChange('paymentTerms', e.target.value as string)}
              >
                <MenuItem value="UPI">UPI</MenuItem>
                <MenuItem value="NEFT/RTGS">NEFT / RTGS</MenuItem>
                <MenuItem value="Cash">Cash</MenuItem>
                <MenuItem value="Cheque">Cheque</MenuItem>
                <MenuItem value="To Pay">To Pay</MenuItem>
                <MenuItem value="Advance">Advance</MenuItem>
                <MenuItem value="Credit">Credit</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Dispatched Through (e.g. VRL Logistics)" fullWidth value={formData.dispatchedThrough || ''} onChange={(e) => handleChange('dispatchedThrough', e.target.value)} />
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
