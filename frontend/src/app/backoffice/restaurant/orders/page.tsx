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
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  ShoppingBasket as BasketIcon,
  ChevronRight as ChevronRightIcon,
  AccessTime as TimeIcon,
  Fastfood as FoodIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { restaurantService, Order } from '@/services/restaurantService';
import { OrderStatusChip } from '@/components/backoffice/restaurant/StatusChips';
import OrderDialog from '@/components/backoffice/restaurant/OrderDialog';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';

const TABS = [
  { label: 'Active',   filter: (o: Order) => o.status !== 'PAID' && o.status !== 'CANCELLED' && o.status !== 'COMPLETED' },
  { label: 'Settled',  filter: (o: Order) => o.status === 'PAID' },
  { label: 'Cancelled', filter: (o: Order) => o.status === 'CANCELLED' },
];

function OrderCard({ order, onClick, onDelete, showDelete }: { order: Order; onClick: () => void; onDelete: () => void; showDelete: boolean }) {
  const theme = useTheme();
  const mins = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
  const readyCount = (order.items || []).filter(i => i.status === 'READY').length;

  return (
    <Card
      variant="outlined"
      sx={{
        cursor: 'pointer',
        transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.1s',
        borderRadius: '7px',
        position: 'relative',
        bgcolor: order.status === 'CANCELLED' ? alpha(theme.palette.error.main, 0.02) : 'white',
        borderColor: order.status === 'CANCELLED' ? alpha(theme.palette.error.main, 0.2) : 'divider',
        '&:hover': { 
          borderColor: order.status === 'CANCELLED' ? 'error.main' : 'primary.main', 
          boxShadow: '0 8px 24px rgba(44, 24, 16, 0.06)',
          transform: 'translateY(-2px)'
        },
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1, fontSize: '1.1rem' }}>
              TABLE {order.table_number}
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600, opacity: 0.6 }}>#{order.id}</Typography>
          </Box>
          <Stack sx={{ alignItems: 'flex-end' }} spacing={1}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {showDelete && (
                <Tooltip title="Delete Order">
                  <IconButton 
                    size="small" 
                    color="error" 
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    sx={{ p: 0.5, border: '1px solid', borderColor: 'error.light', opacity: 0.7, '&:hover': { opacity: 1, bgcolor: 'error.lighter' }, borderRadius: '4px' }}
                  >
                    <DeleteIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              )}
              <OrderStatusChip status={order.status} orderType={order.order_type} sx={{ borderRadius: '4px', fontWeight: 800 }} />
            </Box>
            {readyCount > 0 && !['READY', 'SERVED', 'PAID', 'COMPLETED'].includes(order.status) && (
              <Box sx={{ 
                bgcolor: 'success.main', 
                color: 'white', 
                px: 1, 
                py: 0.3, 
                borderRadius: '4px', 
                fontSize: '0.65rem', 
                fontWeight: 900, 
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <FoodIcon sx={{ fontSize: 10 }} /> {readyCount} READY
              </Box>
            )}
          </Stack>
        </Box>

        <Divider sx={{ my: 1.5, borderStyle: 'dotted' }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <Stack spacing={0.75} sx={{ flexGrow: 1, minWidth: 0 }}>
            {order.status === 'CANCELLED' ? (
              <Box sx={{ mt: 1, p: 1, bgcolor: 'error.lighter', borderRadius: 1, borderLeft: '3px solid', borderColor: 'error.main' }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'error.dark', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <DeleteIcon sx={{ fontSize: 12 }} /> REASON
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {order.notes?.replace('CANCELLED: ', '') || 'No reason provided'}
                </Typography>
              </Box>
            ) : (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                  <BasketIcon sx={{ fontSize: 14 }} />
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>{(order.items || []).length} ITEMS</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                  <TimeIcon sx={{ fontSize: 14 }} />
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>{mins}M AGO</Typography>
                </Box>
              </>
            )}
          </Stack>
          <Box sx={{ textAlign: 'right', ml: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: order.status === 'CANCELLED' ? 'error.main' : 'primary.main' }}>
              ₹{parseFloat(order.total_amount).toFixed(0)}
            </Typography>
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
  const canDelete = isRole('ADMIN') || isRole('MANAGER') || hasPermission('access_to_delete_order');

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
      // Filter only Dine-in orders for this view as Take-away has its own section
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
    // Save session
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
  
  const handleDeleteOrder = async (orderId: number) => {
    if (!window.confirm("Are you sure you want to PERMANENTLY delete this order? This will also free up the table.")) return;
    try {
      await restaurantService.deleteOrder(orderId);
      // Wait a bit for DB consistency before refresh
      setTimeout(fetchOrders, 200);
    } catch (e: any) {
      setError(e.message || 'Failed to delete order');
    }
  };

  const filtered = orders.filter(TABS[tab].filter);

  return (
    <Box sx={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', p: { xs: 1.5, md: 2 }, overflow: 'hidden' }}>
      <Box sx={{ 
        mb: 2, 
        display: 'flex', 
        justifyContent: "space-between", 
        alignItems: "center", 
        gap: 2, 
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 500, color: '#e9762b', fontSize: '1.25rem' }}>
            Live Orders
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          {isMobile ? (
            <IconButton onClick={fetchOrders} size="small" sx={{ color: 'primary.main', border: '1px solid', borderColor: 'divider', borderRadius: '7px' }}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          ) : (
            <Tooltip title="Refresh Orders">
              <Button 
                variant="outlined" 
                onClick={fetchOrders} 
                disabled={loading}
                sx={{ minWidth: 40, width: 40, height: 40, p: 0, borderRadius: '7px' }}
              >
                <RefreshIcon fontSize="small" />
              </Button>
            </Tooltip>
          )}
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <Paper elevation={0} sx={{ borderRadius: '7px', border: '1px solid', borderColor: 'divider', overflow: 'hidden', display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ 
            bgcolor: alpha(theme.palette.primary.main, 0.03),
            borderBottom: '1px solid', 
            borderColor: 'divider', 
            minHeight: 44,
            '& .MuiTab-root': { fontWeight: 800, textTransform: 'none', minHeight: 44 }
          }}
        >
          {TABS.map((t, i) => {
            const count = orders.filter(t.filter).length;
            return (
              <Tab
                key={i}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    {t.label}
                    {count > 0 && (
                      <Box sx={{
                        bgcolor: tab === i ? 'primary.main' : 'action.selected',
                        color: tab === i ? 'white' : 'text.secondary',
                        borderRadius: 10, px: 0.75, py: 0.1, fontSize: '0.7rem', fontWeight: 700, lineHeight: 1.6,
                      }}>
                        {count}
                      </Box>
                    )}
                  </Box>
                }
                sx={{ minHeight: 44, fontSize: { xs: '0.75rem', sm: '0.82rem' } }}
              />
            );
          })}
        </Tabs>

        <Box sx={{ p: { xs: 1.5, sm: 3 }, flexGrow: 1, overflowY: 'auto' }}>
          {loading && orders.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
              <CircularProgress sx={{ color: '#E9762B' }} />
            </Box>
          ) : filtered.length === 0 ? (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <FoodIcon sx={{ fontSize: 48, color: 'divider', mb: 1 }} />
              <Typography color="text.secondary">No orders in this view</Typography>
            </Box>
          ) : (
            <Grid container spacing={{ xs: 1.5, sm: 2 }}>
              {filtered.map(order => (
                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={order.id}>
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
            sx: { width: { xs: '100%', sm: 400 }, borderRadius: { xs: 0, sm: '16px 0 0 16px' } }
          }
        }}
      >
        {selectedOrder && (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#fdfdfd' }}>
            {/* Header */}
            <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'white' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 900 }}>
                    TABLE {selectedOrder.table_number}
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block' }}>
                    {new Date(selectedOrder.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.disabled' }}>
                    Order #{selectedOrder.id}
                  </Typography>
                </Box>
                <IconButton onClick={() => setDrawerOpen(false)} size="small">
                  <ChevronRightIcon />
                </IconButton>
              </Box>
              <OrderStatusChip status={selectedOrder.status} orderType={selectedOrder.order_type} />
            </Box>

            {/* Customer & Payment Details */}
            {(selectedOrder.customer_name || selectedOrder.customer_mobile || selectedOrder.invoice?.payment_method) && (
              <Box sx={{ px: 3, py: 2, bgcolor: alpha(theme.palette.primary.main, 0.02), borderBottom: '1px solid', borderColor: 'divider' }}>
                <Grid container spacing={2}>
                  {(selectedOrder.customer_name || selectedOrder.customer_mobile) && (
                    <Grid size={{ xs: selectedOrder.invoice?.payment_method ? 6 : 12 }}>
                      <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.disabled' }}>Customer</Typography>
                      {selectedOrder.customer_name && (
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{selectedOrder.customer_name}</Typography>
                      )}
                      {selectedOrder.customer_mobile && (
                        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block' }}>{selectedOrder.customer_mobile}</Typography>
                      )}
                    </Grid>
                  )}
                  {selectedOrder.invoice?.payment_method && (
                    <Grid size={{ xs: selectedOrder.customer_name ? 6 : 12 }}>
                      <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.disabled' }}>Payment</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main' }}>
                        {selectedOrder.invoice.payment_method}
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                        {selectedOrder.invoice.invoice_number}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Box>
            )}

            {/* Items Section - SCROLLABLE */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 3 }}>
              <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.disabled', mb: 1, display: 'block' }}>Items</Typography>
              <Stack spacing={2}>
                {(selectedOrder.items || []).map((item, idx) => (
                  <Box key={item.id || idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>{item.item_details?.name || 'Unknown Item'}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        {item.quantity} × ₹{parseFloat(item.price).toFixed(2)}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 900 }}>
                      ₹{(item.quantity * parseFloat(item.price)).toFixed(2)}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>

            {/* Footer */}
            <Box sx={{ p: 3, borderTop: '2px dashed', borderColor: 'divider', bgcolor: 'white' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>Total Amount</Typography>
                <Typography variant="h5" sx={{ fontWeight: 950, color: 'primary.main' }}>
                  ₹{parseFloat(selectedOrder.total_amount).toFixed(2)}
                </Typography>
              </Box>
              
              {selectedOrder.notes && (
                <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: '8px' }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', display: 'block', mb: 0.5 }}>NOTES</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>{selectedOrder.notes}</Typography>
                </Box>
              )}
            </Box>
          </Box>
        )}
      </Drawer>
    </Box>
  );
}
