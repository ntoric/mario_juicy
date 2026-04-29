"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Tooltip,
  alpha
} from "@mui/material";
import {
  TrendingUp as TrendingUpIcon,
  Storefront as StorefrontIcon,
  Receipt as ReceiptIcon,
  Inventory2 as Inventory2Icon,
  Group as GroupIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
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
        <Alert severity="error" sx={{ borderRadius: '7px' }} action={<Button color="inherit" size="small" onClick={fetchData}>RETRY</Button>}>
          {error}
        </Alert>
      </Box>
    );
  }

  const stats = data?.stats || [];
  const recentSales = data?.recent_transactions || [];
  const popularItems = data?.popular_items || [];

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", p: { xs: 1.5, md: 2 }, overflow: "hidden" }}>
      {/* Optimized Header Row */}
      <Box sx={{ 
        mb: 2, 
        display: { xs: 'none', md: 'flex' }, 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 500, color: '#e9762b', fontSize: '1.25rem' }}>
            Dashboard Overview
          </Typography>
        </Box>
        <Tooltip title="Refresh Dashboard Stats">
          <Button 
            variant="outlined" 
            size="small"
            onClick={fetchData} 
            disabled={loading}
            sx={{ borderRadius: '7px', height: 40, minWidth: 40, p: 0 }}
          >
            <RefreshIcon />
          </Button>
        </Tooltip>
      </Box>

      <Box sx={{ flexGrow: 1, overflowY: "auto", pr: 0.5 }}>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {stats.map((stat: any, i: number) => {
            const color = COLOR_MAP[stat.label] || "#10b981";
            const icon = ICON_MAP[stat.label] || <ReceiptIcon />;
            
            return (
              <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  borderRadius: '7px',
                  border: '1px solid #e8e4d8',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  transition: 'all 0.2s', 
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' } 
                }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Box sx={{ 
                        p: 0.75, 
                        borderRadius: '7px', 
                        backgroundColor: alpha(color, 0.1), 
                        color: color,
                        display: 'flex',
                        '& svg': { fontSize: 20 }
                      }}>
                        {icon}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: '#f0fdf4', px: 1, py: 0.25, borderRadius: '7px' }}>
                        <TrendingUpIcon sx={{ fontSize: 14, color: '#10b981' }} />
                        <Typography variant="caption" sx={{ fontWeight: 800, color: '#10b981' }}>
                          {stat.trend}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.25, fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                      {stat.label}
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, fontSize: '1.25rem', color: 'text.primary' }}>
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
            <Card sx={{ borderRadius: '7px', border: '1px solid #e8e4d8', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #e8e4d8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#FCF9EA' }}>
                <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '0.9rem' }}>
                  Recent Sales
                </Typography>
                <Button 
                  size="small"
                  color="primary" 
                  sx={{ fontWeight: 800, fontSize: '0.75rem' }}
                  onClick={() => window.location.href='/backoffice/billing'}
                >
                  View All
                </Button>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha('#FCF9EA', 0.5) }}>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.7rem', py: 1.5 }}>ID</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.7rem', py: 1.5 }}>Details</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.7rem', py: 1.5 }} align="right">Amount</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.7rem', py: 1.5 }} align="right">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentSales.map((sale: any) => (
                      <TableRow key={sale.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>#{sale.id}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', fontWeight: 600 }}>{sale.customer}</TableCell>
                        <TableCell sx={{ fontWeight: 900, color: 'primary.main', fontSize: '0.75rem' }} align="right">₹{sale.total}</TableCell>
                        <TableCell align="right">
                          <Chip 
                            label={sale.status} 
                            size="small"
                            sx={{ 
                              height: 20,
                              fontSize: '0.65rem',
                              fontWeight: 900, 
                              borderRadius: '7px',
                              backgroundColor: sale.status === 'Completed' || sale.status === 'PAID' ? '#ecfdf5' : '#fff7ed',
                              color: sale.status === 'Completed' || sale.status === 'PAID' ? '#10b981' : '#f59e0b',
                            }} 
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ height: '100%', borderRadius: '7px', border: '1px solid #e8e4d8', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #e8e4d8', bgcolor: '#FCF9EA' }}>
                <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '0.9rem' }}>
                  Popular Items (Today)
                </Typography>
              </Box>
              <CardContent sx={{ p: 2 }}>
                  {popularItems.map((item: any, i: number) => (
                      <Box key={i} sx={{ mb: 2.5 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                              <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.85rem' }}>{item.name}</Typography>
                                  <Typography variant="caption" sx={{ fontWeight: 600, opacity: 0.6 }}>{item.sales} sold today</Typography>
                              </Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 900, color: 'primary.main' }}>
                                  ₹{item.amount.toLocaleString('en-IN')}
                              </Typography>
                          </Box>
                          <Box sx={{ width: '100%', height: 6, bgcolor: '#f1f1f1', borderRadius: '7px', overflow: 'hidden' }}>
                              <Box sx={{ 
                                width: `${Math.min(100, (item.sales / Math.max(...popularItems.map((pi:any)=>pi.sales))) * 100)}%`, 
                                height: '100%', 
                                bgcolor: 'primary.main', 
                                borderRadius: '7px' 
                              }} />
                          </Box>
                      </Box>
                  ))}
                  
                  <Box sx={{ mt: 3, p: 2, borderRadius: '7px', bgcolor: '#FCF9EA', border: '1px dashed #e9762b44' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, color: '#e9762b', fontSize: '0.8rem' }}>QUICK INSIGHTS</Typography>
                      <Typography variant="caption" sx={{ display: "block", mb: 0.5, fontWeight: 600, color: 'text.secondary' }}>
                          • Monitor sales trends to adjust stock levels.
                      </Typography>
                      <Typography variant="caption" sx={{ display: "block", fontWeight: 600, color: 'text.secondary' }}>
                          • Top items today are driving 40% of revenue.
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
