"use client";

import React, { useEffect, useState, useCallback } from "react";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import StorefrontIcon from "@mui/icons-material/Storefront";
import ReceiptIcon from "@mui/icons-material/Receipt";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import GroupIcon from "@mui/icons-material/Group";
import RefreshIcon from "@mui/icons-material/Refresh";
import { storeService } from "@/services/storeService";

const ICON_MAP: Record<string, React.ReactNode> = {
  "Today's Sales": <ReceiptIcon />,
  "Transactions": <StorefrontIcon />,
  "Avg. Ticket": <Inventory2Icon />,
  "Table Occupancy": <GroupIcon />,
};

const COLOR_MAP: Record<string, string> = {
  "Today's Sales": "#E9762B",
  "Transactions": "#FFD41D",
  "Avg. Ticket": "#d35400",
  "Table Occupancy": "#CF0F0F",
};

export default function DashboardContent() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await storeService.getDashboardStats();
      setData(result);
      setError(null);
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handleRefresh = () => fetchData();
    window.addEventListener('app-refresh', handleRefresh);
    return () => window.removeEventListener('app-refresh', handleRefresh);
  }, [fetchData]);

  if (loading && !data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ mt: 2 }}>
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={fetchData}>RETRY</Button>}>
          {error}
        </Alert>
      </Box>
    );
  }

  const stats = data?.stats || [];
  const recentSales = data?.recent_transactions || [];
  const popularItems = data?.popular_items || [];

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", p: { xs: 2, md: 3 }, overflow: "hidden" }}>
      <Box sx={{ 
        mb: { xs: 2, md: 4 }, 
        display: { xs: 'none', md: 'flex' }, 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 500, color: '#e9762b', fontSize: '1.5rem' }}>
            Overview
          </Typography>
        </Box>
        <Button 
          variant="outlined" 
          size="small"
          startIcon={<RefreshIcon />} 
          onClick={fetchData} 
          disabled={loading}
          sx={{ borderRadius: 2, display: { xs: 'none', sm: 'flex' } }}
        >
          Refresh
        </Button>
        <IconButton 
          onClick={fetchData} 
          disabled={loading}
          sx={{ display: { xs: 'flex', sm: 'none' }, color: 'primary.main', border: '1px solid #e8e4d8', borderRadius: 2 }}
        >
          <RefreshIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ flexGrow: 1, overflowY: "auto", minHeight: 0, px: { xs: 0.5, md: 0 } }}>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {stats.map((stat: any, i: number) => {
          const color = COLOR_MAP[stat.label] || "#10b981";
          const icon = ICON_MAP[stat.label] || <ReceiptIcon />;
          
          return (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Box sx={{ 
                      p: 1, 
                      borderRadius: 2, 
                      backgroundColor: `${color}15`, 
                      color: color,
                      display: 'flex'
                    }}>
                      {icon}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <TrendingUpIcon sx={{ fontSize: 16, color: '#10b981' }} />
                      <Typography variant="caption" sx={{ fontWeight: 600, color: '#10b981' }}>
                        {stat.trend}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 500, fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                    {stat.label}
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, fontSize: { xs: '1.25rem', md: '1.5rem' } }}>
                    {stat.value}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <Box sx={{ p: 3, borderBottom: '1px solid #e8e4d8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Recent Sales
              </Typography>
              <Typography 
                variant="button" 
                color="primary" 
                sx={{ cursor: 'pointer' }}
                onClick={() => window.location.href='/backoffice/restaurant/orders'}
              >
                View All
              </Typography>
            </Box>
            <TableContainer component={Paper} sx={{ boxShadow: 'none', borderRadius: 0 }}>
              <Table aria-label="recent sales table">
                <TableHead sx={{ backgroundColor: '#FCF9EA' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', py: 1 }}>ID</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', py: 1 }}>Details</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', py: 1 }} align="right">Amount</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', py: 1 }} align="right">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentSales.map((sale: any) => (
                    <TableRow key={sale.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell component="th" scope="row" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                        #{sale.id}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.75rem' }}>
                        {sale.customer}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800, color: 'primary.main', fontSize: '0.75rem' }} align="right">
                        {sale.total}
                      </TableCell>
                      <TableCell align="right">
                        <Chip 
                          label={sale.status} 
                          size="small"
                          sx={{ 
                            height: 20,
                            fontSize: '0.65rem',
                            fontWeight: 700, 
                            backgroundColor: sale.status === 'Completed' ? '#ecfdf5' : '#fff7ed',
                            color: sale.status === 'Completed' ? '#10b981' : '#f59e0b',
                            border: 'none'
                          }} 
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {recentSales.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>No recent sales</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%' }}>
            <Box sx={{ p: 3, borderBottom: '1px solid #e8e4d8' }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Popular Items (Today)
              </Typography>
            </Box>
            <CardContent>
                {popularItems.map((item: any, i: number) => (
                    <Box key={i} sx={{ mb: i === popularItems.length - 1 ? 0 : 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Box>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.name}</Typography>
                                <Typography variant="caption" color="text.secondary">{item.sales} sold today</Typography>
                            </Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                ₹{item.amount.toLocaleString('en-IN')}
                            </Typography>
                        </Box>
                        <Box sx={{ width: '100%', height: 4, bgcolor: '#FCF9EA', borderRadius: 4, overflow: 'hidden', border: '1px solid #e8e4d8' }}>
                            <Box sx={{ width: '75%', height: '100%', bgcolor: '#FFD41D', borderRadius: 4 }} />
                        </Box>
                    </Box>
                ))}
                
                {popularItems.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                    No popular items data today.
                  </Typography>
                )}

                <Box sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: '#FCF9EA', border: '1px dashed #e8e4d8' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Quick Insights</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                        • Use the "Refresh" button to get live updates.
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                        • Monitor table occupancy for better floor management.
                    </Typography>
                </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      </Box>
    </Box>
  );
}
