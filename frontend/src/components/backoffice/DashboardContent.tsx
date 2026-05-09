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
  ArrowForward as ArrowForwardIcon,
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
  "Transactions": "#FFB800",
  "Avg. Ticket": "#D35400",
  "Table Occupancy": "#CF0F0F",
};

const GRADIENT_MAP: Record<string, string> = {
  "Today's Sales": "linear-gradient(135deg, #FF9D5C 0%, #E9762B 100%)",
  "Transactions": "linear-gradient(135deg, #FFE36D 0%, #FFB800 100%)",
  "Avg. Ticket": "linear-gradient(135deg, #E67E22 0%, #D35400 100%)",
  "Table Occupancy": "linear-gradient(135deg, #FF4D4D 0%, #CF0F0F 100%)",
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
        <CircularProgress size={48} thickness={4} sx={{ color: '#E9762B' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ mt: 2 }}>
        <Alert severity="error" sx={{ borderRadius: '16px' }} action={<Button color="inherit" size="small" onClick={fetchData}>RETRY</Button>}>
          {error}
        </Alert>
      </Box>
    );
  }

  const stats = data?.stats || [];
  const recentSales = data?.recent_transactions || [];
  const popularItems = data?.popular_items || [];
  const maxPopularSales = Math.max(...popularItems.map((pi: any) => pi.sales), 1);

  return (
    <Box sx={{ 
      height: "100%", 
      display: "flex", 
      flexDirection: "column", 
      p: { xs: 2, md: 3 }, 
      overflow: "hidden",
      position: 'relative'
    }}>
      {/* Decorative background blobs */}
      <Box sx={{
        position: 'absolute', top: -100, right: -100, width: 300, height: 300,
        background: 'radial-gradient(circle, rgba(233,118,43,0.08) 0%, rgba(255,255,255,0) 70%)',
        borderRadius: '50%', zIndex: 0, pointerEvents: 'none'
      }} />
      <Box sx={{
        position: 'absolute', bottom: -100, left: -100, width: 400, height: 400,
        background: 'radial-gradient(circle, rgba(255,212,29,0.05) 0%, rgba(255,255,255,0) 70%)',
        borderRadius: '50%', zIndex: 0, pointerEvents: 'none'
      }} />

      {/* Header Row */}
      <Box sx={{ 
        mb: 4, 
        display: { xs: 'flex', md: 'flex' }, 
        justifyContent: 'space-between', 
        alignItems: 'center',
        position: 'relative',
        zIndex: 1
      }}>
        <Box>
          <Typography variant="h4" sx={{ 
            fontWeight: 900, 
            fontSize: { xs: '1.5rem', md: '2rem' },
            background: 'linear-gradient(90deg, #E9762B 0%, #FFB800 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em',
            mb: 0.5
          }}>
            Overview
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            Here is what's happening at your store today.
          </Typography>
        </Box>
        <Tooltip title="Refresh Data" arrow>
          <Button 
            variant="contained" 
            onClick={fetchData} 
            disabled={loading}
            sx={{ 
              borderRadius: '12px', 
              minWidth: { xs: 44, md: 48 }, 
              height: { xs: 44, md: 48 },
              p: 0,
              background: 'linear-gradient(135deg, #E9762B 0%, #D35400 100%)',
              color: 'white',
              boxShadow: '0 8px 20px rgba(233, 118, 43, 0.25)',
              '&:hover': {
                background: 'linear-gradient(135deg, #D35400 0%, #B85C1D 100%)',
                transform: 'translateY(-2px)',
                boxShadow: '0 12px 24px rgba(233, 118, 43, 0.35)',
              },
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <RefreshIcon sx={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </Button>
        </Tooltip>
      </Box>

      <Box sx={{ flexGrow: 1, overflowY: "auto", pr: 0.5, position: 'relative', zIndex: 1 }}>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {stats.map((stat: any, i: number) => {
            const color = COLOR_MAP[stat.label] || "#10b981";
            const gradient = GRADIENT_MAP[stat.label] || "linear-gradient(135deg, #34D399 0%, #10B981 100%)";
            const icon = ICON_MAP[stat.label] || <ReceiptIcon />;
            
            return (
              <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  borderRadius: '24px',
                  border: '1px solid rgba(255, 255, 255, 0.8)',
                  background: 'rgba(255, 255, 255, 0.7)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.03)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
                  '&:hover': { 
                    transform: 'translateY(-6px)', 
                    boxShadow: `0 20px 40px ${alpha(color, 0.15)}`,
                    border: `1px solid ${alpha(color, 0.3)}`
                  } 
                }}>
                  <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ 
                        p: 1.5, 
                        borderRadius: '16px', 
                        background: gradient, 
                        color: 'white',
                        display: 'flex',
                        boxShadow: `0 8px 20px ${alpha(color, 0.4)}`,
                        '& svg': { fontSize: 28 }
                      }}>
                        {icon}
                      </Box>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 0.5, 
                        bgcolor: alpha('#10b981', 0.1), 
                        px: 1.5, 
                        py: 0.5, 
                        borderRadius: '20px' 
                      }}>
                        <TrendingUpIcon sx={{ fontSize: 16, color: '#10b981' }} />
                        <Typography variant="caption" sx={{ fontWeight: 800, color: '#10b981', fontSize: '0.75rem' }}>
                          {stat.trend}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {stat.label}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 900, fontSize: '2rem', color: '#2c1810', letterSpacing: '-0.02em' }}>
                      {stat.value}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        <Grid container spacing={4}>
          {/* Recent Sales Section */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <Card sx={{ 
              borderRadius: '24px', 
              border: '1px solid rgba(255, 255, 255, 0.8)', 
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 10px 40px rgba(0,0,0,0.03)',
              overflow: 'hidden'
            }}>
              <Box sx={{ px: 3, py: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.2rem', color: '#2c1810' }}>
                  Recent Sales
                </Typography>
                <Button 
                  endIcon={<ArrowForwardIcon />}
                  sx={{ 
                    fontWeight: 700, 
                    fontSize: '0.85rem',
                    color: '#E9762B',
                    borderRadius: '12px',
                    px: 2,
                    '&:hover': { background: alpha('#E9762B', 0.08) }
                  }}
                  onClick={() => window.location.href='/backoffice/billing'}
                >
                  View All
                </Button>
              </Box>
              <TableContainer sx={{ px: 1, pb: 1 }}>
                <Table sx={{ borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ borderBottom: 'none', fontWeight: 600, color: 'text.secondary', fontSize: '0.8rem', py: 1, px: 3 }}>Order ID</TableCell>
                      <TableCell sx={{ borderBottom: 'none', fontWeight: 600, color: 'text.secondary', fontSize: '0.8rem', py: 1 }}>Customer</TableCell>
                      <TableCell sx={{ borderBottom: 'none', fontWeight: 600, color: 'text.secondary', fontSize: '0.8rem', py: 1 }} align="right">Amount</TableCell>
                      <TableCell sx={{ borderBottom: 'none', fontWeight: 600, color: 'text.secondary', fontSize: '0.8rem', py: 1, px: 3 }} align="right">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentSales.map((sale: any) => {
                      const isCompleted = sale.status === 'Completed' || sale.status === 'PAID';
                      return (
                        <TableRow 
                          key={sale.id} 
                          sx={{ 
                            background: '#ffffff',
                            transition: 'all 0.2s',
                            '& td:first-of-type': { borderTopLeftRadius: '16px', borderBottomLeftRadius: '16px' },
                            '& td:last-child': { borderTopRightRadius: '16px', borderBottomRightRadius: '16px' },
                            '&:hover': { transform: 'scale(1.01)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }
                          }}
                        >
                          <TableCell sx={{ borderBottom: 'none', fontWeight: 800, fontSize: '0.9rem', px: 3 }}>#{sale.id}</TableCell>
                          <TableCell sx={{ borderBottom: 'none', fontSize: '0.9rem', fontWeight: 600 }}>{sale.customer}</TableCell>
                          <TableCell sx={{ borderBottom: 'none', fontWeight: 900, color: '#2c1810', fontSize: '0.9rem' }} align="right">₹{sale.total}</TableCell>
                          <TableCell sx={{ borderBottom: 'none', px: 3 }} align="right">
                            <Chip 
                              label={sale.status} 
                              sx={{ 
                                height: 26,
                                fontSize: '0.75rem',
                                fontWeight: 800, 
                                borderRadius: '8px',
                                backgroundColor: isCompleted ? alpha('#10b981', 0.1) : alpha('#f59e0b', 0.1),
                                color: isCompleted ? '#10b981' : '#f59e0b',
                                border: `1px solid ${isCompleted ? alpha('#10b981', 0.2) : alpha('#f59e0b', 0.2)}`
                              }} 
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          </Grid>

          {/* Popular Items Section */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <Card sx={{ 
              height: '100%', 
              borderRadius: '24px', 
              border: '1px solid rgba(255, 255, 255, 0.8)', 
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 10px 40px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <Box sx={{ px: 3, py: 2.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.2rem', color: '#2c1810' }}>
                  Popular Items
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                  Top sellers today
                </Typography>
              </Box>
              <CardContent sx={{ p: 3, pt: 0, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  {popularItems.map((item: any, i: number) => {
                    const widthPercent = Math.min(100, (item.sales / maxPopularSales) * 100);
                    return (
                      <Box key={i} sx={{ mb: 3 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Box>
                                  <Typography variant="body1" sx={{ fontWeight: 800, color: '#2c1810' }}>{item.name}</Typography>
                                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>{item.sales} sold</Typography>
                              </Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#E9762B' }}>
                                  ₹{item.amount.toLocaleString('en-IN')}
                              </Typography>
                          </Box>
                          <Box sx={{ width: '100%', height: 8, bgcolor: alpha('#E9762B', 0.1), borderRadius: '10px', overflow: 'hidden' }}>
                              <Box sx={{ 
                                width: `${widthPercent}%`, 
                                height: '100%', 
                                background: 'linear-gradient(90deg, #FFB800 0%, #E9762B 100%)', 
                                borderRadius: '10px',
                                animation: 'progressGrow 1s ease-out forwards',
                                transformOrigin: 'left'
                              }} />
                          </Box>
                      </Box>
                    );
                  })}
                  
                  <Box sx={{ 
                    mt: 'auto', 
                    p: 2.5, 
                    borderRadius: '16px', 
                    background: 'linear-gradient(135deg, rgba(233,118,43,0.05) 0%, rgba(233,118,43,0.15) 100%)', 
                    border: '1px solid rgba(233,118,43,0.2)' 
                  }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, color: '#E9762B', fontSize: '0.85rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        Quick Insights
                      </Typography>
                      <Typography variant="caption" sx={{ display: "block", mb: 0.5, fontWeight: 600, color: '#7b6158' }}>
                          • Monitor sales trends to adjust stock levels.
                      </Typography>
                      <Typography variant="caption" sx={{ display: "block", fontWeight: 600, color: '#7b6158' }}>
                          • Top items today are driving major revenue.
                      </Typography>
                  </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Global Styles for Animations */}
      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes progressGrow {
          0% { transform: scaleX(0); }
          100% { transform: scaleX(1); }
        }
      `}</style>
    </Box>
  );
}

