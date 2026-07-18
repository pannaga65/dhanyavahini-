import { Typography, Box } from '@mui/material';

export default function Settings() {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box>
          <Typography sx={{ fontWeight: 900, fontSize: { xs: '1.8rem', md: '2.2rem' }, letterSpacing: 3 }}>
            SETTINGS
          </Typography>
          <Typography sx={{ fontWeight: 600, color: '#999', letterSpacing: 1.5, fontSize: '0.8rem', mt: 0.5 }}>
            GENERAL APP CONFIGURATION
          </Typography>
        </Box>
      </Box>
      <Box sx={{ borderBottom: '2px solid #000', mb: 4, mt: 2 }} />
      
      <Box sx={{ p: 4, backgroundColor: '#FAFAFA', border: '1px dashed #CCC', borderRadius: 2, textAlign: 'center' }}>
        <Typography sx={{ color: '#666', fontWeight: 600, mb: 1 }}>
          Configuration Settings
        </Typography>
        <Typography sx={{ color: '#999', fontSize: '0.9rem' }}>
          Future global configuration (like tax rates, delivery fees, or contact info) will be added here.
          <br /><br />
          <i>(Note: Category management has been moved to its own dedicated tab to support icon uploads).</i>
        </Typography>
      </Box>
    </Box>
  );
}
