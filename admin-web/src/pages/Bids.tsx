import { Typography, Box, Paper } from '@mui/material';

export default function Bids() {
  return (
    <Box>
      <Typography variant="h4" fontWeight="700" mb={4}>
        Live Bid Sessions
      </Typography>
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          Live Bidding feature coming soon.
        </Typography>
      </Paper>
    </Box>
  );
}
