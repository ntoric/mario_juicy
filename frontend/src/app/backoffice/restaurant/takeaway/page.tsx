"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Stack,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Divider,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery,
  Tooltip,
  IconButton,
  alpha,
  keyframes,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  ShoppingBag as ShoppingBagIcon,
  Add as AddIcon,
  AccessTime as TimeIcon,
  Fastfood as FoodIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { restaurantService, Order } from '@/services/restaurantService';
import PageHeader from "@/components/backoffice/PageHeader";
import { OrderStatusChip } from '@/components/backoffice/restaurant/StatusChips';
import OrderDialog from '@/components/backoffice/restaurant/OrderDialog';
import { useWebSocket } from '@/hooks/useWebSocket';

function TakeAwayCard({ order, onClick }: { order: Order; onClick: () => void }) {
  const theme = useTheme();

  const pulse = keyframes`
    0% { transform: scale(1); box-shadow: 0 4px 12px rgba(0,0,0,0.02); }
    50% { transform: scale(1.01); box-shadow: 0 10px 25px ${alpha(theme.palette.primary.main, 0.08)}; }
    100% { transform: scale(1); box-shadow: 0 4px 12px rgba(0,0,0,0.02); }
  `;

  const mins = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
  const readyCount = (order.items || []).filter((i: any) => i.status === 'READY').length;
  const isActive = !['PAID', 'COMPLETED', 'CANCELLED', 'RETURNED'].includes(order.status);

  return (
    <Card
      elevation={0}
      sx={{
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        borderRadius: '0.65rem',
        position: 'relative',
        bgcolor: 'rgba(255, 255, 255, 0.75)',
        backdropFilter: 'blur(10px)',
        border: '1px solid',
        borderColor: alpha(theme.palette.divider, 0.08),
        animation: isActive ? `${pulse} 3s infinite ease-in-out` : 'none',
        '&:hover': {
          borderColor: theme.palette.primary.main,
          boxShadow: '0 15px 35px rgba(0,0,0,0.08)',
          transform: 'translateY(-6px)',
          zIndex: 2,
          '& .chevron': { transform: 'translateX(4px)' }
        },
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.2rem', letterSpacing: '-0.02em', color: '#1a1a1a', mb: 0.5 }}>
              #{order.id}
            </Typography>
            {order.customer_name ? (
              <Typography variant="body2" sx={{ fontWeight: 800, color: theme.palette.primary.main, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {order.customer_name.toUpperCase()}
              </Typography>
            ) : (
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase' }}>
                Walk-in Customer
              </Typography>
            )}
          </Box>
          <Stack sx={{ alignItems: 'flex-end' }} spacing={1}>
            <OrderStatusChip status={order.status} orderType="TAKE_AWAY" sx={{ borderRadius: '0.65rem', fontWeight: 900, px: 1.5, height: 26, fontSize: '0.65rem' }} />
            {readyCount > 0 && isActive && (
              <Box sx={{
                bgcolor: '#10b981', color: 'white',
                px: 1.2, py: 0.4, borderRadius: '0.65rem', fontSize: '0.65rem', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 0.5,
                boxShadow: '0 4px 12px rgba(16,185,129,0.2)'
              }}>
                <FoodIcon sx={{ fontSize: 12 }} /> {readyCount} READY
              </Box>
            )}
          </Stack>
        </Box>

        <Divider sx={{ my: 2, opacity: 0.4 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Stack spacing={0.5}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
              <Box sx={{ p: 0.5, bgcolor: alpha(theme.palette.primary.main, 0.08), borderRadius: '0.65rem', display: 'flex' }}>
                <ShoppingBagIcon sx={{ fontSize: 14, color: theme.palette.primary.main }} />
              </Box>
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#1a1a1a' }}>{order.items.length} ITEMS</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
              <Box sx={{ p: 0.5, bgcolor: alpha(theme.palette.divider, 0.08), borderRadius: '0.65rem', display: 'flex' }}>
                <TimeIcon sx={{ fontSize: 14 }} />
              </Box>
              <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.7 }}>{mins}M AGO</Typography>
            </Box>
          </Stack>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#1a1a1a', letterSpacing: '-0.02em' }}>
              ₹{parseFloat(order.total_amount).toFixed(0)}
            </Typography>
            {order.customer_mobile && (
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.disabled' }}>
                {order.customer_mobile}
              </Typography>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function TakeAwayPage() {
  const theme = useTheme();

  const spin = keyframes`
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  `;

  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('takeaway_active_tab');
      return saved !== null ? parseInt(saved) : 0;
    }
    return 0;
  });

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await restaurantService.getOrders();
      const parcelData = data.filter((o: Order) => o.order_type === 'TAKE_AWAY');

      const active = parcelData.filter((o: Order) =>
        !['PAID', 'COMPLETED', 'CANCELLED', 'RETURNED'].includes(o.status)
      );

      const history = parcelData.filter((o: Order) =>
        ['PAID', 'COMPLETED', 'CANCELLED', 'RETURNED'].includes(o.status)
      ).sort((a: Order, b: Order) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setActiveOrders(active);
      setHistoryOrders(history);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    localStorage.setItem('takeaway_active_tab', activeTab.toString());
  }, [fetchOrders, activeTab]);

  useWebSocket('ORDER_CREATED', () => fetchOrders());
  useWebSocket('ORDER_UPDATED', () => fetchOrders());
  useWebSocket('ORDER_CHECKOUT', () => fetchOrders());
  useWebSocket('ORDER_DELETED', () => fetchOrders());

  useEffect(() => {
    const handleRefresh = () => fetchOrders();
    window.addEventListener('app-refresh', handleRefresh);
    return () => window.removeEventListener('app-refresh', handleRefresh);
  }, [fetchOrders]);

  useEffect(() => {
    const handleClose = () => {
      setDialogOpen(false);
      localStorage.removeItem('active_parcel_id');
      localStorage.removeItem('parcel_dialog_open');
    };
    window.addEventListener('close-dialogs', handleClose);
    return () => window.removeEventListener('close-dialogs', handleClose);
  }, []);

  // Restore session
  useEffect(() => {
    const savedParcelId = localStorage.getItem('active_parcel_id');
    const isDialogOpen = localStorage.getItem('parcel_dialog_open') === 'true';

    if (savedParcelId && isDialogOpen && activeOrders.length > 0) {
      const order = activeOrders.find(o => o.id === Number(savedParcelId)) ||
        historyOrders.find(o => o.id === Number(savedParcelId));
      if (order) {
        setSelectedOrder(order);
        setDialogOpen(true);
      }
    }
  }, [activeOrders.length, historyOrders.length]);

  // Save session state
  useEffect(() => {
    if (selectedOrder && dialogOpen) {
      localStorage.setItem('active_parcel_id', selectedOrder.id.toString());
      localStorage.setItem('parcel_dialog_open', 'true');
    } else if (!dialogOpen) {
      localStorage.setItem('parcel_dialog_open', 'false');
    }
  }, [selectedOrder, dialogOpen]);

  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box sx={{ position: 'relative', height: '100%', display: "flex", flexDirection: "column", p: { xs: 2, md: 3 }, overflow: 'hidden' }}>
      {/* Decorative Background Elements */}
      <Box sx={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.08)} 0%, transparent 70%)`, borderRadius: '50%', zIndex: 0, pointerEvents: 'none' }} />
      <Box sx={{ position: 'absolute', bottom: -120, left: -120, width: 450, height: 450, background: 'radial-gradient(circle, rgba(255,184,0,0.06) 0%, transparent 70%)', borderRadius: '50%', zIndex: 0, pointerEvents: 'none' }} />

      <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Modern Header Row via Portal */}
        <PageHeader>
          <Box>
            <Typography variant="h4" sx={{
              fontWeight: 600,
              background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontSize: '2rem',
              letterSpacing: '-0.04em',
              mb: 0.5
            }}>
              Parcel Orders
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', width: { xs: '100%', md: 'auto' }, justifyContent: { xs: 'center', md: 'flex-end' } }}>
            <Box sx={{
              display: 'flex',
              gap: 1,
              p: 0.6,
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              borderRadius: '0.65rem',
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              mr: 1
            }}>
              {['Active', 'History'].map((label, idx) => (
                <Button
                  key={label}
                  onClick={() => setActiveTab(idx)}
                  sx={{
                    borderRadius: '0.65rem',
                    fontWeight: 900,
                    fontSize: '0.85rem',
                    px: 3,
                    py: 1,
                    minWidth: 0,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    ...(activeTab === idx ? {
                      background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                      color: 'white',
                      boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.3)}`
                    } : {
                      color: 'text.secondary',
                      '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main }
                    })
                  }}
                >
                  {label}
                  {idx === 0 && activeOrders.length > 0 && (
                    <Box component="span" sx={{ ml: 1, px: 0.8, py: 0.1, bgcolor: activeTab === 0 ? 'rgba(255,255,255,0.3)' : alpha(theme.palette.primary.main, 0.15), borderRadius: '0.65rem', fontSize: '0.7rem', fontWeight: 600 }}>
                      {activeOrders.length}
                    </Box>
                  )}
                </Button>
              ))}
            </Box>

            <Tooltip title="Refresh Queue">
              <IconButton
                onClick={fetchOrders}
                sx={{
                  bgcolor: 'white',
                  border: '1px solid',
                  borderColor: alpha(theme.palette.divider, 0.1),
                  borderRadius: '0.65rem',
                  height: 48,
                  width: 48,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                  transition: 'all 0.3s ease',
                  '&:hover': { transform: 'rotate(180deg)', borderColor: theme.palette.primary.main, color: theme.palette.primary.main }
                }}
              >
                <RefreshIcon sx={{ animation: loading ? `${spin} 1s linear infinite` : 'none' }} />
              </IconButton>
            </Tooltip>

            <Button
              variant="contained"
              onClick={() => { setSelectedOrder(null); setDialogOpen(true); }}
              sx={{
                borderRadius: '0.65rem',
                height: 48,
                px: 3,
                fontWeight: 600,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                color: 'white',
                boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.25)}`,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #D35400 0%, #B85C1D 100%)',
                  transform: 'translateY(-2px)',
                  boxShadow: `0 12px 24px ${alpha(theme.palette.primary.main, 0.35)}`
                }
              }}
              startIcon={<AddIcon />}
            >
              New Order
            </Button>
          </Stack>
        </PageHeader>

        {error && <Alert severity="error" sx={{ mb: 4, borderRadius: '0.65rem', border: '1px solid rgba(239, 68, 68, 0.15)' }}>{error}</Alert>}

        <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 0.5, pb: 4, '&::-webkit-scrollbar': { width: 6 }, '&::-webkit-scrollbar-thumb': { bgcolor: alpha(theme.palette.primary.main, 0.2), borderRadius: 3 } }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
              <CircularProgress sx={{ color: theme.palette.primary.main }} />
            </Box>
          ) : (
            <>
              {(activeTab === 0 ? activeOrders : historyOrders).length === 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
                  <Paper elevation={0} sx={{
                    maxWidth: 450,
                    width: '100%',
                    textAlign: 'center',
                    p: 6,
                    borderRadius: '0.65rem',
                    bgcolor: 'rgba(255, 255, 255, 0.5)',
                    border: '2px dashed',
                    borderColor: alpha(theme.palette.primary.main, 0.2),
                    backdropFilter: 'blur(10px)'
                  }}>
                    <Box sx={{ p: 3, borderRadius: '0.65rem', bgcolor: alpha(theme.palette.primary.main, 0.05), display: 'inline-flex', mb: 3 }}>
                      {activeTab === 0 ? <ShoppingBagIcon sx={{ fontSize: 48, color: theme.palette.primary.main }} /> : <HistoryIcon sx={{ fontSize: 48, color: theme.palette.primary.main }} />}
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 600, color: '#1a1a1a', mb: 1 }}>
                      {activeTab === 0 ? 'The queue is clear' : 'No history found'}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 4 }}>
                      {activeTab === 0
                        ? 'Current active take-away orders will appear here. Start a new order to fill the queue.'
                        : 'Past orders will be listed here once they are settled or cancelled.'}
                    </Typography>
                    {activeTab === 0 && (
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setDialogOpen(true)}
                        sx={{
                          borderRadius: '0.65rem',
                          px: 4,
                          py: 1.5,
                          fontWeight: 600,
                          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                          color: 'white',
                          boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.25)}`,
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #D35400 0%, #B85C1D 100%)',
                            transform: 'translateY(-2px)',
                            boxShadow: `0 12px 24px ${alpha(theme.palette.primary.main, 0.35)}`
                          }
                        }}
                      >
                        Create First Order
                      </Button>
                    )}
                  </Paper>
                </Box>
              ) : (
                <Grid container spacing={3}>
                  {(activeTab === 0 ? activeOrders : historyOrders).map(order => (
                    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={order.id}>
                      <TakeAwayCard order={order} onClick={() => { setSelectedOrder(order); setDialogOpen(true); }} />
                    </Grid>
                  ))}
                </Grid>
              )}
            </>
          )}
        </Box>
      </Box>

      <OrderDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        table={null}
        initialOrder={selectedOrder}
        onOrderUpdated={fetchOrders}
      />
    </Box>
  );
}
