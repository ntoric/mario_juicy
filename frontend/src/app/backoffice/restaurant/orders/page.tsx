"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Stack,
  Button,
  Alert,
  Card,
  CardContent,
  Divider,
  IconButton,
  Tooltip,
  Tab,
  CircularProgress,
  Tabs,
  useTheme,
  useMediaQuery,
  alpha,
  Drawer,
  keyframes,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  ShoppingBasket as BasketIcon,
  ChevronRight as ChevronRightIcon,
  AccessTime as TimeIcon,
  Fastfood as FoodIcon,
  Delete as DeleteIcon,
  History as HistoryIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';
import { restaurantService, Order } from '@/services/restaurantService';
import { OrderStatusChip } from '@/components/backoffice/restaurant/StatusChips';
import OrderDialog from '@/components/backoffice/restaurant/OrderDialog';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useConfirm } from '@/context/ConfirmContext';
import { useToast } from '@/context/ToastContext';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const TABS = [
  { label: 'Active',   filter: (o: Order) => o.status !== 'PAID' && o.status !== 'CANCELLED' && o.status !== 'COMPLETED', icon: <BasketIcon sx={{ fontSize: 18 }} /> },
  { label: 'Settled',  filter: (o: Order) => o.status === 'PAID', icon: <CheckCircleIcon sx={{ fontSize: 18 }} /> },
  { label: 'Cancelled', filter: (o: Order) => o.status === 'CANCELLED', icon: <CancelIcon sx={{ fontSize: 18 }} /> },
];

function OrderCard({ order, onClick, onDelete, showDelete }: { order: Order; onClick: () => void; onDelete: () => void; showDelete: boolean }) {
  const theme = useTheme();
  const mins = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
  const readyCount = (order.items || []).filter(i => i.status === 'READY').length;

  return (
    <Card
      elevation={0}
      sx={{
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        borderRadius: '24px',
        position: 'relative',
        bgcolor: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(10px)',
        border: '1px solid',
        borderColor: order.status === 'CANCELLED' ? alpha(theme.palette.error.main, 0.15) : alpha(theme.palette.divider, 0.08),
        boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
        overflow: 'hidden',
        '&:hover': { 
          borderColor: order.status === 'CANCELLED' ? 'error.main' : '#e9762b', 
          boxShadow: '0 15px 35px rgba(0,0,0,0.08)',
          transform: 'translateY(-6px)',
          '& .chevron-icon': { transform: 'translateX(4px)', color: '#e9762b' }
        },
      }}
      onClick={onClick}
    >
      <Box sx={{ 
        height: 6, 
        width: '100%', 
        background: order.status === 'CANCELLED' 
          ? theme.palette.error.main 
          : order.status === 'PAID' 
            ? '#10b981' 
            : 'linear-gradient(90deg, #e9762b 0%, #ffb800 100%)' 
      }} />
      
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 1000, lineHeight: 1.2, fontSize: '1.25rem', color: '#1a1a1a', mb: 0.5 }}>
              Table {order.table_number}
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 900, color: 'text.disabled', letterSpacing: '0.05em', bgcolor: alpha('#000', 0.03), px: 1, py: 0.5, borderRadius: '6px' }}>
              #{order.id}
            </Typography>
          </Box>
          <Stack sx={{ alignItems: 'flex-end' }} spacing={1}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {showDelete && (
                <IconButton 
                  size="small" 
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  sx={{ 
                    p: 0.75, 
                    bgcolor: alpha(theme.palette.error.main, 0.05),
                    color: 'error.main',
                    borderRadius: '10px',
                    '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.1) }
                  }}
                >
                  <DeleteIcon sx={{ fontSize: 18 }} />
                </IconButton>
              )}
              <OrderStatusChip 
                status={order.status} 
                orderType={order.order_type} 
                sx={{ 
                  borderRadius: '10px', 
                  fontWeight: 1000, 
                  height: 28, 
                  fontSize: '0.7rem',
                  letterSpacing: '0.02em',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }} 
              />
            </Box>
            {readyCount > 0 && !['READY', 'SERVED', 'PAID', 'COMPLETED'].includes(order.status) && (
              <Box sx={{ 
                bgcolor: '#10b981', 
                color: 'white', 
                px: 1.5, 
                py: 0.5, 
                borderRadius: '10px', 
                fontSize: '0.7rem', 
                fontWeight: 1000, 
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
                animation: `${pulse} 2s infinite ease-in-out`
              }}>
                <FoodIcon sx={{ fontSize: 14 }} /> {readyCount} READY
              </Box>
            )}
          </Stack>
        </Box>

        <Divider sx={{ my: 2, opacity: 0.3 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <Stack spacing={1.5} sx={{ flexGrow: 1, minWidth: 0 }}>
            {order.status === 'CANCELLED' ? (
              <Box sx={{ p: 1.5, bgcolor: alpha(theme.palette.error.main, 0.03), borderRadius: '14px', borderLeft: '4px solid', borderColor: 'error.main' }}>
                <Typography variant="caption" sx={{ fontWeight: 1000, color: 'error.main', display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5, letterSpacing: '0.02em' }}>
                  <CancelIcon sx={{ fontSize: 16 }} /> CANCELLED
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {order.notes?.replace('CANCELLED: ', '') || 'Order was manually cancelled'}
                </Typography>
              </Box>
            ) : (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ bgcolor: alpha('#e9762b', 0.08), p: 0.75, borderRadius: '8px', display: 'flex' }}>
                    <BasketIcon sx={{ fontSize: 16, color: '#e9762b' }} />
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.secondary' }}>{(order.items || []).length} Items ordered</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ bgcolor: alpha('#64748b', 0.08), p: 0.75, borderRadius: '8px', display: 'flex' }}>
                    <TimeIcon sx={{ fontSize: 16, color: '#64748b' }} />
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.secondary' }}>Placed {mins}m ago</Typography>
                </Box>
              </>
            )}
          </Stack>
          <Box sx={{ textAlign: 'right', ml: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <Typography variant="h5" sx={{ fontWeight: 1000, color: order.status === 'CANCELLED' ? 'error.main' : '#1a1a1a', fontSize: '1.5rem', letterSpacing: '-0.02em' }}>
              ₹{parseFloat(order.total_amount).toFixed(0)}
            </Typography>
            <IconButton className="chevron-icon" sx={{ transition: 'all 0.3s', p: 0, color: alpha('#000', 0.1) }}>
              <ChevronRightIcon />
            </IconButton>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function LiveOrdersPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { hasPermission, isRole } = useAuth();
  const { confirm } = useConfirm();
  const { showError, showSuccess } = useToast();
  const canDelete = hasPermission('live_order');

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('live_orders_active_tab');
      return saved !== null ? parseInt(saved) : 0;
    }
    return 0;
  });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await restaurantService.getOrders();
      setOrders(data.filter((o: Order) => !o.order_type || o.order_type === 'DINE_IN'));
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    fetchOrders(); 
    localStorage.setItem('live_orders_active_tab', tab.toString());
  }, [fetchOrders, tab]);

  useWebSocket('ORDER_CREATED', () => fetchOrders());
  useWebSocket('ORDER_UPDATED', () => fetchOrders());
  useWebSocket('TABLE_UPDATED', () => fetchOrders());
  useWebSocket('ORDER_CHECKOUT', () => fetchOrders());
  useWebSocket('ORDER_DELETED', () => fetchOrders());

  useEffect(() => {
    const handleRefresh = () => fetchOrders();
    window.addEventListener('app-refresh', handleRefresh);
    return () => window.removeEventListener('app-refresh', handleRefresh);
  }, [fetchOrders]);

  useEffect(() => {
    const handleClose = () => { setDialogOpen(false); setDrawerOpen(false); };
    window.addEventListener('close-dialogs', handleClose);
    return () => window.removeEventListener('close-dialogs', handleClose);
  }, []);

  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const orderIdParam = searchParams?.get('id');

  useEffect(() => {
    if (orderIdParam && orders.length > 0 && !dialogOpen && !drawerOpen) {
      const order = orders.find(o => o.id === Number(orderIdParam));
      if (order) {
        setSelectedOrder(order);
        if (order.status === 'PAID' || order.status === 'CANCELLED' || order.status === 'COMPLETED') {
          setDrawerOpen(true);
        } else {
          setDialogOpen(true);
        }
      }
    }
  }, [orderIdParam, orders, dialogOpen, drawerOpen]);
  
  const handleDeleteOrder = async (orderId: number) => {
    if (!await confirm({
      title: 'Delete Order',
      message: "Are you sure you want to PERMANENTLY delete this order? This will also free up the table and cannot be undone.",
      severity: 'error',
      confirmLabel: 'DELETE ORDER'
    })) return;
    try {
      await restaurantService.deleteOrder(orderId);
      showSuccess('Order deleted');
      setTimeout(fetchOrders, 200);
    } catch (e: any) {
      showError(e.message || 'Failed to delete order');
    }
  };

  const filtered = orders.filter(TABS[tab].filter);

  return (
    <Box sx={{ 
      position: 'relative', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      p: { xs: 2, md: 4 }, 
      overflow: 'hidden',
      bgcolor: '#fcfcfc',
      animation: `${fadeIn} 0.5s ease-out`
    }}>
      {/* Background Decorative Elements */}
      <Box sx={{ position: 'absolute', top: -100, right: -100, width: 500, height: 500, background: 'radial-gradient(circle, rgba(233,118,43,0.05) 0%, transparent 70%)', borderRadius: '50%', zIndex: 0 }} />
      <Box sx={{ position: 'absolute', bottom: -150, left: -150, width: 600, height: 600, background: 'radial-gradient(circle, rgba(255,184,0,0.03) 0%, transparent 70%)', borderRadius: '50%', zIndex: 0 }} />

      <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ 
          mb: 4, 
          display: 'flex', 
          justifyContent: "space-between", 
          alignItems: "center", 
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 3, 
        }}>
          <Box>
            <Typography variant="h3" sx={{ 
              fontWeight: 1000, 
              background: 'linear-gradient(135deg, #e9762b 0%, #ffb800 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.03em',
              mb: 0.5
            }}>
              Live Orders
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Monitor and manage real-time table orders across your restaurant.
            </Typography>
          </Box>
          <Tooltip title="Refresh Order List">
            <Button 
              variant="contained"
              onClick={fetchOrders} 
              disabled={loading}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <RefreshIcon />}
              sx={{ 
                bgcolor: 'white', 
                color: '#1a1a1a',
                border: '1px solid', 
                borderColor: alpha('#000', 0.1), 
                borderRadius: '16px', 
                fontWeight: 1000,
                px: 3,
                height: 48,
                textTransform: 'none',
                boxShadow: '0 8px 20px rgba(0,0,0,0.04)',
                '&:hover': { bgcolor: alpha('#e9762b', 0.05), borderColor: '#e9762b', color: '#e9762b' }
              }}
            >
              Sync Dashboard
            </Button>
          </Tooltip>
        </Box>

        {error && (
          <Alert 
            severity="error" 
            variant="filled"
            sx={{ mb: 4, borderRadius: '20px', fontWeight: 700, boxShadow: '0 8px 25px rgba(211, 47, 47, 0.15)' }} 
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        <Paper elevation={0} sx={{ 
          borderRadius: '32px', 
          border: '1px solid', 
          borderColor: alpha('#000', 0.05), 
          overflow: 'hidden', 
          display: 'flex', 
          flexDirection: 'column', 
          flexGrow: 1, 
          minHeight: 0,
          boxShadow: '0 20px 60px rgba(0,0,0,0.03)',
          bgcolor: 'rgba(255, 255, 255, 0.6)',
          backdropFilter: 'blur(20px)'
        }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ 
              bgcolor: 'rgba(255, 255, 255, 0.4)',
              borderBottom: '1px solid', 
              borderColor: alpha('#000', 0.05), 
              minHeight: 64,
              px: 2,
              '& .MuiTab-root': { 
                fontWeight: 1000, 
                textTransform: 'none', 
                minHeight: 64,
                px: 3,
                fontSize: '0.9rem',
                color: 'text.secondary',
                transition: 'all 0.2s',
                '&.Mui-selected': { color: '#e9762b' },
                '&:hover': { color: '#e9762b', bgcolor: alpha('#e9762b', 0.03) }
              },
              '& .MuiTabs-indicator': {
                height: 4,
                borderRadius: '4px 4px 0 0',
                bgcolor: '#e9762b',
                boxShadow: '0 -4px 10px rgba(233, 118, 43, 0.3)'
              }
            }}
          >
            {TABS.map((t, i) => {
              const count = orders.filter(t.filter).length;
              return (
                <Tab
                  key={i}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      {t.icon}
                      {t.label}
                      {count > 0 && (
                        <Box sx={{
                          bgcolor: tab === i ? '#e9762b' : alpha('#000', 0.06),
                          color: tab === i ? 'white' : 'text.secondary',
                          borderRadius: '8px', 
                          px: 1.2, 
                          py: 0.3, 
                          fontSize: '0.75rem', 
                          fontWeight: 1000, 
                          lineHeight: 1.4,
                          transition: 'all 0.2s'
                        }}>
                          {count}
                        </Box>
                      )}
                    </Box>
                  }
                />
              );
            })}
          </Tabs>

          <Box sx={{ p: { xs: 2, md: 4 }, flexGrow: 1, overflowY: 'auto' }}>
            {loading && orders.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Stack spacing={3} sx={{ alignItems: 'center' }}>
                  <CircularProgress sx={{ color: '#e9762b' }} thickness={5} size={50} />
                  <Typography sx={{ fontWeight: 800, color: 'text.secondary' }}>Loading Live Feed...</Typography>
                </Stack>
              </Box>
            ) : filtered.length === 0 ? (
              <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.8 }}>
                <Box sx={{ 
                  width: 120, 
                  height: 120, 
                  bgcolor: alpha('#e9762b', 0.03), 
                  borderRadius: '40px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  mb: 3,
                  border: '2px dashed',
                  borderColor: alpha('#e9762b', 0.1)
                }}>
                  <HistoryIcon sx={{ fontSize: 60, color: alpha('#e9762b', 0.2) }} />
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 1000, color: '#1a1a1a', mb: 1 }}>
                  Clear for Now
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 600, maxWidth: 300, textAlign: 'center' }}>
                  No {TABS[tab].label.toLowerCase()} orders matching your current view.
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={3}>
                {filtered.map((order, idx) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={order.id} sx={{ animation: `${fadeIn} 0.5s ease-out ${idx * 0.05}s both` }}>
                    <OrderCard
                      order={order}
                      onClick={() => { 
                        setSelectedOrder(order);
                        if (order.status === 'PAID' || order.status === 'CANCELLED' || order.status === 'COMPLETED') {
                          setDrawerOpen(true);
                        } else {
                          setDialogOpen(true);
                        }
                      }}
                      onDelete={() => handleDeleteOrder(order.id)}
                      showDelete={canDelete}
                    />
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </Paper>
      </Box>

      <OrderDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        table={selectedOrder
          ? { id: selectedOrder.table, number: selectedOrder.table_number, active_order: selectedOrder, active_orders: [selectedOrder] } as any
          : null
        }
        initialOrder={selectedOrder}
        onOrderUpdated={fetchOrders}
      />

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        slotProps={{
          paper: {
            sx: { 
              width: { xs: '100%', sm: 480 }, 
              borderLeft: 'none', 
              boxShadow: '-20px 0 60px rgba(0,0,0,0.1)',
              bgcolor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(15px)'
            }
          }
        }}
      >
        {selectedOrder && (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Drawer Header */}
            <Box sx={{ p: 4, borderBottom: '1px solid', borderColor: alpha('#000', 0.05), bgcolor: 'white', position: 'relative' }}>
              <IconButton 
                onClick={() => setDrawerOpen(false)} 
                sx={{ 
                  position: 'absolute', 
                  right: 20, 
                  top: 20, 
                  bgcolor: alpha('#000', 0.03),
                  borderRadius: '12px',
                  '&:hover': { bgcolor: alpha('#e9762b', 0.05), color: '#e9762b' }
                }}
              >
                <ChevronRightIcon />
              </IconButton>
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 1000, color: '#1a1a1a', letterSpacing: '-0.03em', mb: 1 }}>
                  Table {selectedOrder.table_number}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography sx={{ fontWeight: 900, color: 'text.disabled', fontSize: '0.85rem', letterSpacing: '0.05em', bgcolor: alpha('#000', 0.03), px: 1.5, py: 0.5, borderRadius: '8px' }}>
                    #{selectedOrder.id}
                  </Typography>
                  <OrderStatusChip 
                    status={selectedOrder.status} 
                    orderType={selectedOrder.order_type} 
                    sx={{ borderRadius: '10px', fontWeight: 1000, height: 26, fontSize: '0.65rem' }} 
                  />
                </Box>
              </Box>

              <Stack direction="row" spacing={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.secondary' }}>
                  <TimeIcon sx={{ fontSize: 20, color: alpha('#000', 0.3) }} />
                  <Typography sx={{ fontWeight: 800, fontSize: '0.9rem' }}>
                    {new Date(selectedOrder.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.secondary' }}>
                  <ReceiptIcon sx={{ fontSize: 20, color: alpha('#000', 0.3) }} />
                  <Typography sx={{ fontWeight: 800, fontSize: '0.9rem' }}>
                    {selectedOrder.invoice?.invoice_number || 'Pending Invoice'}
                  </Typography>
                </Box>
              </Stack>
            </Box>

            {/* Customer & Payment Breakdown */}
            <Box sx={{ px: 4, py: 3, bgcolor: alpha('#e9762b', 0.02), borderBottom: '1px solid', borderColor: alpha('#000', 0.03) }}>
              <Grid container spacing={4}>
                {(selectedOrder.customer_name || selectedOrder.customer_mobile) && (
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="overline" sx={{ fontWeight: 1000, color: 'text.disabled', fontSize: '0.7rem', display: 'block', mb: 1, letterSpacing: '0.1em' }}>CUSTOMER</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 1000, color: '#1a1a1a', mb: 0.25 }}>{selectedOrder.customer_name || 'Guest User'}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary' }}>{selectedOrder.customer_mobile || 'No contact info'}</Typography>
                  </Grid>
                )}
                {selectedOrder.invoice?.payment_method && (
                  <Grid size={{ xs: 6 }}>
                    <Typography variant="overline" sx={{ fontWeight: 1000, color: 'text.disabled', fontSize: '0.7rem', display: 'block', mb: 1, letterSpacing: '0.1em' }}>SETTLEMENT</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                      <CheckCircleIcon sx={{ fontSize: 16, color: '#10b981' }} />
                      <Typography variant="subtitle1" sx={{ fontWeight: 1000, color: '#10b981' }}>{selectedOrder.invoice.payment_method}</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.secondary' }}>Success Payment</Typography>
                  </Grid>
                )}
              </Grid>
            </Box>

            {/* Items List */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 4 }}>
              <Typography variant="overline" sx={{ fontWeight: 1000, color: '#e9762b', fontSize: '0.75rem', display: 'block', mb: 3, letterSpacing: '0.1em' }}>ORDER COMPOSITION</Typography>
              <Stack spacing={3}>
                {(selectedOrder.items || []).map((item, idx) => (
                  <Box key={item.id || idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: 'white', borderRadius: '20px', border: '1px solid', borderColor: alpha('#000', 0.03) }}>
                    <Box sx={{ flexGrow: 1, pr: 3 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#1a1a1a', mb: 0.5 }}>{item.item_details?.name}</Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                        {item.quantity} Unit{item.quantity > 1 ? 's' : ''} × ₹{parseFloat(item.price).toFixed(2)}
                      </Typography>
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 1000, color: '#1a1a1a' }}>
                      ₹{(item.quantity * parseFloat(item.price)).toFixed(0)}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>

            {/* Sticky Total Footer */}
            <Box sx={{ p: 4, bgcolor: 'white', borderTop: '2px dashed', borderColor: alpha('#000', 0.08) }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 1000, color: 'text.secondary' }}>Total Amount Due</Typography>
                <Typography variant="h3" sx={{ fontWeight: 1000, color: '#e9762b', letterSpacing: '-0.04em' }}>
                  ₹{parseFloat(selectedOrder.total_amount).toFixed(2)}
                </Typography>
              </Box>
              
              {selectedOrder.notes && (
                <Box sx={{ p: 2.5, bgcolor: alpha('#1a1a1a', 0.02), borderRadius: '20px', border: '1px solid', borderColor: alpha('#000', 0.04) }}>
                  <Typography variant="overline" sx={{ fontWeight: 1000, color: 'text.disabled', fontSize: '0.65rem', display: 'block', mb: 1, letterSpacing: '0.1em' }}>KITCHEN NOTES</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#1a1a1a', lineHeight: 1.6, fontStyle: 'italic' }}>
                    "{selectedOrder.notes}"
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        )}
      </Drawer>
    </Box>
  );
}
