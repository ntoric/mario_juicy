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
  Fab,
  Zoom,
  Tooltip,
  IconButton,
  alpha,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  ShoppingBag as ShoppingBagIcon,
  Add as AddIcon,
  AccessTime as TimeIcon,
  Fastfood as FoodIcon,
  History as HistoryIcon,
  Inbox as InboxIcon,
} from '@mui/icons-material';
import { restaurantService, Order } from '@/services/restaurantService';
import { OrderStatusChip } from '@/components/backoffice/restaurant/StatusChips';
import OrderDialog from '@/components/backoffice/restaurant/OrderDialog';
import { useWebSocket } from '@/hooks/useWebSocket';

function TakeAwayCard({ order, onClick }: { order: Order; onClick: () => void }) {
  const mins = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
  const readyCount = (order.items || []).filter((i: any) => i.status === 'READY').length;

  return (
    <Card
      variant="outlined"
      sx={{
        cursor: 'pointer',
        transition: '0.15s',
        borderRadius: '5px',
        position: 'relative',
        '&:hover': { 
          borderColor: 'primary.main', 
          boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
          transform: 'translateY(-2px)'
        },
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.1rem' }}>
              ORDER #{order.id}
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600, opacity: 0.6 }}>PARCEL</Typography>
            {order.customer_name && (
              <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 700, color: 'primary.main' }}>
                {order.customer_name} {order.customer_mobile && `(${order.customer_mobile})`}
              </Typography>
            )}
          </Box>
          <Stack sx={{ alignItems: 'flex-end' }} spacing={1}>

            <OrderStatusChip status={order.status} orderType="TAKE_AWAY" sx={{ borderRadius: '4px', fontWeight: 800 }} />
            {readyCount > 0 && !['READY', 'SERVED', 'PAID', 'COMPLETED'].includes(order.status) && (
              <Box sx={{ 
                bgcolor: 'success.main', color: 'white', 
                px: 1, py: 0.3, borderRadius: '4px', fontSize: '0.65rem', fontWeight: 900,
                display: 'flex', alignItems: 'center', gap: 0.5,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <FoodIcon sx={{ fontSize: 10 }} /> {readyCount} READY
              </Box>
            )}
          </Stack>
        </Box>

        <Divider sx={{ my: 1.5, borderStyle: 'dotted' }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <Stack spacing={0.75}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
              <ShoppingBagIcon sx={{ fontSize: 14 }} />
              <Typography variant="caption" sx={{ fontWeight: 700 }}>{order.items.length} ITEMS</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
              <TimeIcon sx={{ fontSize: 14 }} />
              <Typography variant="caption" sx={{ fontWeight: 700 }}>{mins}M AGO</Typography>
            </Box>
          </Stack>
          <Typography variant="h6" sx={{ fontWeight: 900, color: 'primary.main' }}>
            ₹{parseFloat(order.total_amount).toFixed(0)}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function TakeAwayPage() {
  const theme = useTheme();
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
    // Save session
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
    <Box sx={{ position: 'relative', height: '100%', display: "flex", flexDirection: "column", p: { xs: 1.5, md: 2 }, overflow: 'hidden' }}>
      {/* Optimized Header Row */}
      {/* Optimized Header Row */}
      <Box sx={{ 
        mb: 2, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        gap: 2 
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 500, color: '#e9762b', fontSize: '1.25rem', whiteSpace: 'nowrap' }}>
            Parcel Orders
          </Typography>
          
          <Tabs 
            value={activeTab} 
            onChange={(_, val) => setActiveTab(val)} 
            sx={{ 
              display: { xs: 'none', md: 'flex' },
              minHeight: 40,
              '& .MuiTabs-indicator': { height: 3, borderRadius: '7px 7px 0 0' },
              '& .MuiTab-root': { 
                fontWeight: 700, 
                fontSize: '0.85rem', 
                minHeight: 40, 
                px: 2,
                color: 'text.secondary',
                '&.Mui-selected': { color: 'primary.main' }
              }
            }}
          >
            <Tab label={`Active (${activeOrders.length})`} />
            <Tab label="History" />
          </Tabs>
        </Box>

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Tooltip title="Refresh Orders">
            <IconButton 
              onClick={fetchOrders} 
              size="small" 
              sx={{ 
                color: 'primary.main', 
                border: '1px solid', 
                borderColor: 'divider', 
                borderRadius: '7px',
                height: 40,
                width: 40
              }}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          {isMobile ? (
            <IconButton
              color="primary"
              onClick={() => { setSelectedOrder(null); setDialogOpen(true); }}
              sx={{ 
                borderRadius: '7px', 
                height: 40, 
                width: 40,
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': { bgcolor: 'primary.dark' }
              }}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          ) : (
            <Button
              variant="contained"
              size="small"
              onClick={() => { setSelectedOrder(null); setDialogOpen(true); }}
              sx={{ borderRadius: '7px', height: 40, px: 2, fontWeight: 800 }}
              startIcon={<AddIcon />}
            >
              New Order
            </Button>
          )}
        </Stack>
      </Box>

      {/* Mobile Only Tabs */}
      {isMobile && (
        <Box sx={{ mb: 2 }}>
          <Tabs 
            value={activeTab} 
            onChange={(_, val) => setActiveTab(val)} 
            variant="fullWidth"
            sx={{ 
              bgcolor: alpha(theme.palette.primary.main, 0.03),
              borderRadius: '7px',
              '& .MuiTabs-indicator': { height: 3, borderRadius: '7px' },
              '& .MuiTab-root': { fontWeight: 800, fontSize: '0.8rem', minHeight: 44 }
            }}
          >
            <Tab label={`Active (${activeOrders.length})`} />
            <Tab label="History" />
          </Tabs>
        </Box>
      )}


      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '7px' }}>{error}</Alert>}

      <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 0.5, pb: { xs: 15, md: 0.5 } }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>
        ) : (
          <>
            {activeTab === 0 ? (
              activeOrders.length === 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                  <Card variant="outlined" sx={{ maxWidth: 400, width: '100%', textAlign: 'center', p: 4, borderRadius: '7px', bgcolor: '#fbfaf8', borderStyle: 'dashed', borderWidth: 2 }}>
                    <ShoppingBagIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2, opacity: 0.5 }} />
                    <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.secondary' }}>No Active Parcels</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
                      Current active take-away orders will appear here. Click the button above to start a new one.
                    </Typography>
                    {!isMobile && (
                      <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)} sx={{ borderRadius: '7px' }}>
                        New Parcel Order
                      </Button>
                    )}
                  </Card>
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {activeOrders.map(order => (
                    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={order.id}>
                      <TakeAwayCard order={order} onClick={() => { setSelectedOrder(order); setDialogOpen(true); }} />
                    </Grid>
                  ))}
                </Grid>
              )
            ) : (
              historyOrders.length === 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                  <Card variant="outlined" sx={{ maxWidth: 400, width: '100%', textAlign: 'center', p: 4, borderRadius: '7px', bgcolor: '#fbfaf8', borderStyle: 'dashed', borderWidth: 2 }}>
                    <HistoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2, opacity: 0.5 }} />
                    <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.secondary' }}>History is Empty</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      All completed or cancelled parcel orders will be listed here for audit.
                    </Typography>
                  </Card>
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {historyOrders.map(order => (
                    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={order.id}>
                      <TakeAwayCard order={order} onClick={() => { setSelectedOrder(order); setDialogOpen(true); }} />
                    </Grid>
                  ))}
                </Grid>
              )
            )}
          </>
        )}
      </Box>

      <OrderDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        table={null} // Crucial: No table for take-away
        initialOrder={selectedOrder}
        onOrderUpdated={fetchOrders}
      />

    </Box>
  );
}
