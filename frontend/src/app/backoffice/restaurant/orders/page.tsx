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
  Tabs,
  useTheme,
  useMediaQuery,
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
import Preloader from '@/components/ui/Preloader';

const TABS = [
  { label: 'Active',   filter: (o: Order) => o.status !== 'PAID' && o.status !== 'CANCELLED' && o.status !== 'COMPLETED' },
  { label: 'Recent',   filter: (o: Order) => o.status === 'COMPLETED' },
  { label: 'Settled',  filter: (o: Order) => o.status === 'PAID' },
  { label: 'Cancelled', filter: (o: Order) => o.status === 'CANCELLED' },
];

function OrderCard({ order, onClick, onDelete, showDelete }: { order: Order; onClick: () => void; onDelete: () => void; showDelete: boolean }) {
  const theme = useTheme();
  const mins = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
  const readyCount = order.items.filter(i => i.status === 'READY').length;

  return (
    <Card
      variant="outlined"
      sx={{
        cursor: 'pointer',
        transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.1s',
        borderRadius: '5px',
        position: 'relative',
        bgcolor: order.status === 'CANCELLED' ? '#fffafb' : 'white',
        borderColor: order.status === 'CANCELLED' ? 'error.light' : 'divider',
        '&:hover': { 
          borderColor: order.status === 'CANCELLED' ? 'error.main' : 'primary.main', 
          boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
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
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>{order.items.length} ITEMS</Typography>
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
  const [tab, setTab] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    const handleRefresh = () => fetchOrders();
    window.addEventListener('app-refresh', handleRefresh);
    return () => window.removeEventListener('app-refresh', handleRefresh);
  }, [fetchOrders]);
  
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
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ 
        mb: 4, 
        display: { xs: 'none', md: 'flex' }, 
        justifyContent: "space-between", 
        alignItems: { xs: "flex-start", sm: "center" }, 
        flexWrap: "wrap", 
        gap: 2, 
        flexDirection: { xs: "column", sm: "row" } 
      }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 500, color: '#e9762b', fontSize: '1.5rem' }}>
            Live Orders
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />} 
            onClick={fetchOrders} 
            disabled={loading}
            sx={{ borderRadius: 2, height: 48 }}
          >
            Refresh
          </Button>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <Paper sx={{ borderRadius: '5px' }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: '1px solid', borderColor: 'divider', minHeight: 44 }}
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

        <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
          {loading && orders.length === 0 ? (
            <Box sx={{ position: 'relative', py: 12 }}>
              <Preloader fullScreen={false} size={80} message="Syncing orders..." />
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
                    onClick={() => { setSelectedOrder(order); setDialogOpen(true); }}
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
    </Box>
  );
}
