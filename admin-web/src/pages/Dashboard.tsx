import { Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, Chip } from '@mui/material'

const sampleOrders = [
  { id: 'ORD-001', customer: 'Ramesh Traders', amount: '₹1,50,000', status: 'Pending' },
  { id: 'ORD-002', customer: 'Shree Krishna Grains', amount: '₹3,20,000', status: 'Confirmed' },
  { id: 'ORD-003', customer: 'Balaji Wholesale', amount: '₹85,000', status: 'Delivered' },
  { id: 'ORD-004', customer: 'National Agro', amount: '₹4,10,000', status: 'Under Review' },
];

export default function Dashboard() {
  return (
    <Box>
      <Typography variant="h4" fontWeight="700" mb={4}>
        Dashboard Overview
      </Typography>

      <Typography variant="h6" fontWeight="600" mb={2} color="text.secondary">
        Recent Orders
      </Typography>

      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="recent orders table">
          <TableHead>
            <TableRow>
              <TableCell>Order ID</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sampleOrders.map((row) => (
              <TableRow key={row.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <TableCell component="th" scope="row" sx={{ fontWeight: 600 }}>
                  {row.id}
                </TableCell>
                <TableCell>{row.customer}</TableCell>
                <TableCell>{row.amount}</TableCell>
                <TableCell>
                  <Chip 
                    label={row.status} 
                    size="small"
                    sx={{ 
                      fontWeight: 600, 
                      backgroundColor: row.status === 'Confirmed' || row.status === 'Delivered' ? '#000000' : '#EAEAEA',
                      color: row.status === 'Confirmed' || row.status === 'Delivered' ? '#FFFFFF' : '#000000',
                      borderRadius: 1
                    }} 
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}
