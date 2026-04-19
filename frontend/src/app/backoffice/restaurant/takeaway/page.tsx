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

function TakeAwayCard({ order, onClick }: { order: Order; onClick: () => void }) {
  const mins = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
  const readyCount = order.items.filter(i => i.status === 'READY').length;

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
  const [activeTab, setActiveTab] = useState(0);

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

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    const handleRefresh = () => fetchOrders();
    window.addEventListener('app-refresh', handleRefresh);
    return () => window.removeEventListener('app-refresh', handleRefresh);
  }, [fetchOrders]);
  
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ 
        mb: { xs: 2, md: 4 }, 
        display: 'flex', 
        justifyContent: "space-between", 
        alignItems: "center", 
        flexWrap: "wrap", 
        gap: 2 
      }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 500, color: '#e9762b', fontSize: '1.5rem' }}>Parcel Orders</Typography>
        </Box>
        <Stack direction="row" spacing={1.5} sx={{ display: { xs: 'none', md: 'flex' } }}>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />} 
            onClick={fetchOrders} 
            sx={{ borderRadius: '4px', height: 44, fontWeight: 700 }}
          >
            Refresh
          </Button>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={() => { setSelectedOrder(null); setDialogOpen(true); }}
            sx={{ borderRadius: '4px', height: 44, fontWeight: 800 }}
          >
            NEW PARCEL
          </Button>
        </Stack>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={(_, val) => setActiveTab(val)} 
          sx={{
            '& .MuiTab-root': { fontWeight: 700, fontSize: '0.9rem' }
          }}
        >
          <Tab label={`Active (${activeOrders.length})`} />
          <Tab label="History" />
        </Tabs>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box>
      ) : (
        <>
          {activeTab === 0 ? (
            activeOrders.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <Card variant="outlined" sx={{ maxWidth: 400, width: '100%', textAlign: 'center', p: 4, borderRadius: 3, bgcolor: '#fbfaf8', borderStyle: 'dashed', borderWidth: 2 }}>
                  <ShoppingBagIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2, opacity: 0.5 }} />
                  <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.secondary' }}>No Active Parcels</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
                    Current active take-away orders will appear here. Click the button above to start a new one.
                  </Typography>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)} sx={{ borderRadius: 2 }}>
                    New Parcel Order
                  </Button>
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
                <Card variant="outlined" sx={{ maxWidth: 400, width: '100%', textAlign: 'center', p: 4, borderRadius: 3, bgcolor: '#fbfaf8', borderStyle: 'dashed', borderWidth: 2 }}>
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

      <OrderDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        table={null} // Crucial: No table for take-away
        initialOrder={selectedOrder}
        onOrderUpdated={fetchOrders}
      />

      {/* Floating Action Button for Mobile */}
      {isMobile && (
        <Zoom in={true} unmountOnExit>
          <Fab
            color="primary"
            aria-label="add-parcel"
            onClick={() => { setSelectedOrder(null); setDialogOpen(true); }}
            sx={{
              position: 'fixed',
              bottom: { xs: 80, sm: 32 }, // Higher on mobile to avoid bottom nav
              right: { xs: 16, sm: 32 },
              boxShadow: 3
            }}
          >
            <AddIcon />
          </Fab>
        </Zoom>
      )}
    </Box>
  );
}
