"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Stack,
  Alert,
  IconButton,
  Tooltip,
  Divider,
  CircularProgress,
  useTheme,
  useMediaQuery,
  keyframes,
} from '@mui/material';
import {
  Kitchen as KitchenIcon,
  CheckCircle as DoneIcon,
  Refresh as RefreshIcon,
  PlayArrow as StartIcon,
  AccessTime as TimeIcon,
  Restaurant as DishIcon,
  NotificationsActive as AlertIcon,
} from '@mui/icons-material';
import { restaurantService, OrderItem } from '@/services/restaurantService';
import { ItemStatusChip } from '@/components/backoffice/restaurant/StatusChips';
import { useAuth } from '@/hooks/useAuth';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField 
} from '@mui/material';
import {
  Cancel as CancelIcon,
} from '@mui/icons-material';

// ── Animations ──────────────────────────────────────────────────────────────
const pulse = keyframes`
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.02); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
`;

interface GroupedByOrder {
  orderId: number;
  tableNumber: string;
  orderType: string;
  orderTime: string;
  items: OrderItem[];
}

function useElapsed(iso: string) {
  const [text, setText] = useState('');
  useEffect(() => {
    const update = () => {
      const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
      if (s < 60) setText(`${s}s`);
      else if (s < 3600) setText(`${Math.floor(s / 60)}m ${s % 60}s`);
      else setText(`${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [iso]);
  return text;
}

function ElapsedChip({ iso }: { iso: string }) {
  const elapsed = useElapsed(iso);
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  return (
    <Chip
      icon={<TimeIcon sx={{ fontSize: '14px !important' }} />}
      label={elapsed}
      size="small"
      variant="outlined"
      sx={{ 
        fontWeight: 800, 
        fontSize: '0.65rem', 
        height: 22,
        borderColor: s > 600 ? 'error.main' : s > 300 ? 'warning.main' : 'divider',
        color: s > 600 ? 'error.main' : s > 300 ? 'warning.main' : 'text.secondary',
        bgcolor: 'white',
        borderRadius: '4px'
      }}
    />
  );
}

function OrderTicket({ group, onAttend, onReady, onReject, canManage }: {
  group: GroupedByOrder;
  onAttend: (id: number) => void;
  onReady: (id: number) => void;
  onReject: (id: number) => void;
  canManage: boolean;
}) {
  const theme = useTheme();
  const allReady = group.items.every(i => i.status === 'READY' || i.status === 'REJECTED' || i.status === 'CANCELLED');
  const hasNew = group.items.some(i => i.status === 'AWAITING' || i.status === 'ORDERED');

  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '0px',
        border: '1px solid #e8e4d8',
        bgcolor: 'white',
        position: 'relative',
        animation: hasNew ? `${pulse} 2s infinite ease-in-out` : 'none',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '4px',
          bgcolor: allReady ? 'success.main' : hasNew ? 'error.main' : 'warning.main',
        }
      }}
    >
      {/* Ticket Header */}
      <Box sx={{ p: 2, borderBottom: '1px dashed #e8e4d8' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: 'monospace', lineHeight: 1 }}>
              {group.tableNumber ? `T${group.tableNumber}` : 'T-AWAY'}
            </Typography>
            <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, opacity: 0.6 }}>
              #{group.orderId} • {group.orderType}
            </Typography>
          </Box>
          <ElapsedChip iso={group.orderTime} />
        </Box>
      </Box>

      {/* Ticket Items */}
      <CardContent sx={{ flexGrow: 1, p: 2, bgcolor: '#fdfcf4' }}>
        <Stack spacing={1.5}>
          {group.items.map(item => (
            <Box
              key={item.id}
              sx={{
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                p: 1.5, borderRadius: '4px',
                bgcolor: item.status === 'READY' ? '#FCF9EA' : 'white',
                border: '1px solid',
                borderColor: item.status === 'READY' ? '#e8e4d8' : '#D4C4A8',
                opacity: (item.status === 'READY' || item.status === 'REJECTED' || item.status === 'CANCELLED') ? 0.6 : 1,
              }}
            >
              <Box sx={{ flexGrow: 1, mr: 1 }}>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: 900, 
                    fontFamily: 'monospace',
                    fontSize: '1.1rem',
                    color: item.status === 'REJECTED' ? 'error.main' : 'text.primary',
                    textDecoration: (item.status === 'REJECTED' || item.status === 'CANCELLED') ? 'line-through' : 'none',
                  }}
                >
                  {item.quantity}× {item.item_details.name.toUpperCase()}
                </Typography>
                {item.notes && (
                  <Box sx={{ mt: 0.5, p: 0.5, bgcolor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '2px' }}>
                    <Typography variant="caption" color="error.dark" sx={{ fontWeight: 800, fontFamily: 'monospace' }}>
                      {item.notes.toUpperCase()}
                    </Typography>
                  </Box>
                )}
                {item.rejection_note && (
                  <Typography variant="caption" color="error" sx={{ fontWeight: 700, mt: 0.5, display: 'block' }}>
                    Reason: {item.rejection_note}
                  </Typography>
                )}
              </Box>
              <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                {canManage && (item.status === 'AWAITING' || item.status === 'ORDERED') && (
                  <>
                    <Tooltip title="Attend">
                      <IconButton size="small" color="primary" onClick={() => onAttend(item.id)} sx={{ bgcolor: 'primary.light', '&:hover': { bgcolor: 'primary.main', color: 'white' } }}>
                        <StartIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Reject">
                      <IconButton size="small" color="error" onClick={() => onReject(item.id)} sx={{ bgcolor: '#fee2e2' }}>
                        <CancelIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
                {canManage && item.status === 'PREPARING' && (
                  <Button 
                    size="small" 
                    variant="contained" 
                    color="success" 
                    onClick={() => onReady(item.id)}
                    sx={{ minWidth: 0, p: '4px 8px', borderRadius: '4px', fontWeight: 800, fontSize: '0.7rem' }}
                  >
                    READY
                  </Button>
                )}
                {item.status === 'READY' && <DoneIcon color="success" sx={{ fontSize: 20 }} />}
                {(item.status === 'REJECTED' || item.status === 'CANCELLED') && <CancelIcon color="error" sx={{ fontSize: 20 }} />}
              </Stack>
            </Box>
          ))}
        </Stack>
      </CardContent>

      <Divider sx={{ borderStyle: 'dashed' }} />

      <CardActions sx={{ p: 2, bgcolor: 'white' }}>
        {allReady ? (
          <Box sx={{ width: '100%', textAlign: 'center', py: 1, bgcolor: '#f0fdf4', borderRadius: '4px', border: '1px solid #bbf7d0' }}>
            <Typography variant="body2" sx={{ fontWeight: 800, color: 'success.main' }}>✓ COMPLETED</Typography>
          </Box>
        ) : (
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', width: '100%', textAlign: 'center' }}>
            {group.items.filter(i => i.status === 'PREPARING').length} Items in Preparation
          </Typography>
        )}
      </CardActions>
      
      {/* Zig-zag bottom effect */}
      <Box sx={{ height: 6, backgroundImage: 'linear-gradient(135deg, #e8e4d8 25%, transparent 25%), linear-gradient(225deg, #e8e4d8 25%, transparent 25%)', backgroundSize: '12px 12px', backgroundPosition: '0 0' }} />
    </Card>
  );
}

export default function KitchenDisplayPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { hasPermission } = useAuth();
  
  const canViewKDS = hasPermission('access_to_view_kitchen_display');
  const canManageKDS = hasPermission('access_to_manage_kitchen_queue');

  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Reject Modal State
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);

  const fetchItems = useCallback(async () => {
    if (!canViewKDS) {
      setLoading(false);
      return;
    }
    if (items.length === 0) setLoading(true);
    try {
      const data = await restaurantService.getKitchenItems();
      setItems(data);
      setLastRefresh(new Date());
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    } finally { setLoading(false); }
  }, [canViewKDS, items.length]);

  useEffect(() => {
    fetchItems();
    intervalRef.current = setInterval(fetchItems, 8000); 
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchItems]);

  useEffect(() => {
    const handleRefresh = () => fetchItems();
    window.addEventListener('app-refresh', handleRefresh);
    return () => window.removeEventListener('app-refresh', handleRefresh);
  }, [fetchItems]);

  const handleAttend = async (id: number) => {
    try { 
      await restaurantService.attendItem(id); 
      fetchItems(); 
    } catch (e: any) { alert(e.message); }
  };

  const handleReady = async (id: number) => {
    try { 
      await restaurantService.readyItem(id); 
      fetchItems(); 
    } catch (e: any) { alert(e.message); }
  };

  const handleRejectClick = (id: number) => {
    setRejectId(id);
    setRejectNote('');
    setRejectOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectId) return;
    try {
      await restaurantService.rejectItem(rejectId, rejectNote);
      setRejectOpen(false);
      fetchItems();
    } catch (e: any) { alert(e.message); }
  };

  if (!canViewKDS && !loading) {
    return (
      <Box sx={{ p: 5, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mx: 'auto', maxWidth: 500 }}>
          You do not have permission to view the Kitchen Display.
        </Alert>
      </Box>
    );
  }

  // Group by order
  const grouped: GroupedByOrder[] = Object.values(
    items.reduce((acc, item) => {
      if (!acc[item.order]) {
        acc[item.order] = { 
          orderId: item.order, 
          tableNumber: item.order_table_number, 
          orderType: item.notes === 'ADD-ON' ? 'ADD-ON' : 'NORMAL',
          orderTime: item.created_at, 
          items: [] 
        };
      }
      acc[item.order].items.push(item);
      return acc;
    }, {} as Record<number, GroupedByOrder>)
  );

  const preparingCount = items.filter(i => i.status === 'PREPARING').length;
  const orderedCount = items.filter(i => i.status === 'AWAITING' || i.status === 'ORDERED').length;

  return (
    <Box sx={{ height: { xs: 'auto', md: '100%' }, display: "flex", flexDirection: "column", p: { xs: 2, md: 4 }, bgcolor: '#FCF9EA', overflow: { xs: 'visible', md: 'hidden' } }}>
      <Box sx={{ 
        mb: 4, 
        display: { xs: 'none', md: 'flex' }, 
        justifyContent: "space-between", 
        alignItems: 'center', 
        flexWrap: "wrap", 
        gap: 2 
      }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 500, color: '#e9762b', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: 2 }}>
            <KitchenIcon sx={{ fontSize: 32 }} /> KITCHEN DISPLAY
          </Typography>
        </Box>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, display: 'block' }}>REAL-TIME UPDATES</Typography>
            <Typography variant="body2" sx={{ fontWeight: 900 }}>{lastRefresh.toLocaleTimeString()}</Typography>
          </Box>
          <Button 
            variant="contained" 
            startIcon={<RefreshIcon />} 
            onClick={fetchItems} 
            sx={{ borderRadius: '4px', height: 48, fontWeight: 800, px: 3 }}
          >
            REFRESH
          </Button>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '4px' }}>{error}</Alert>}

      {(preparingCount > 0 || orderedCount > 0) && (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          {orderedCount > 0 && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ p: 2, bgcolor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: 2 }}>
                <AlertIcon sx={{ color: 'error.main' }} />
                <Typography sx={{ fontWeight: 900, color: 'error.main' }}>
                  {orderedCount} NEW ORDERS AWAITING ATTENTION
                </Typography>
              </Box>
            </Grid>
          )}
          {preparingCount > 0 && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ p: 2, bgcolor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: 2 }}>
                <StartIcon sx={{ color: 'warning.main' }} />
                <Typography sx={{ fontWeight: 900, color: 'warning.dark' }}>
                  {preparingCount} ITEMS CURRENTLY IN PREPARATION
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      )}

      <Box sx={{ flexGrow: { xs: 0, md: 1 }, overflowY: { xs: 'visible', md: 'auto' }, minHeight: 0 }}>
      {loading && items.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10 }}><CircularProgress /></Box>
      ) : grouped.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 15, bgcolor: 'white', borderRadius: '8px', border: '2px dashed #e8e4d8' }}>
          <DoneIcon sx={{ fontSize: 80, color: '#FCF9EA', mb: 2 }} />
          <Typography variant="h5" sx={{ color: 'text.secondary', fontWeight: 800 }}>KITCHEN IS CLEAR</Typography>
          <Typography color="text.secondary">Waiting for new orders...</Typography>
        </Box>
      ) : (
        <Grid container spacing={4}>
          {grouped.map(group => (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={group.orderId}>
              <OrderTicket 
                group={group} 
                onAttend={handleAttend} 
                onReady={handleReady} 
                onReject={handleRejectClick}
                canManage={!!canManageKDS}
              />
            </Grid>
          ))}
        </Grid>
      )}
      </Box>

      {/* Reject Reason Dialog */}
      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)}>
        <DialogTitle sx={{ fontWeight: 800 }}>Reject Item</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>Please provide a reason for rejecting this item.</Typography>
          <TextField
            autoFocus
            fullWidth
            label="Rejection Note"
            variant="outlined"
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRejectOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleConfirmReject} disabled={!rejectNote.trim()}>
            Confirm Rejection
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
