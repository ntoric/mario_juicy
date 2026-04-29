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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  alpha
} from '@mui/material';
import {
  Kitchen as KitchenIcon,
  CheckCircle as DoneIcon,
  Refresh as RefreshIcon,
  PlayArrow as StartIcon,
  AccessTime as TimeIcon,
  Restaurant as DishIcon,
  NotificationsActive as AlertIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { restaurantService, OrderItem } from '@/services/restaurantService';
import { useAuth } from '@/hooks/useAuth';

// ── Animations ──────────────────────────────────────────────────────────────
const pulse = keyframes`
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.01); opacity: 0.9; }
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
        borderColor: s > 600 ? 'error.main' : s > 300 ? 'warning.main' : '#e8e4d8',
        color: s > 600 ? 'error.main' : s > 300 ? 'warning.main' : 'text.secondary',
        bgcolor: 'white',
        borderRadius: '7px'
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
        borderRadius: '7px',
        border: '1px solid #e8e4d8',
        bgcolor: 'white',
        position: 'relative',
        animation: hasNew ? `${pulse} 2s infinite ease-in-out` : 'none',
        boxShadow: hasNew ? `0 0 20px ${alpha(theme.palette.error.main, 0.1)}` : '0 2px 8px rgba(0,0,0,0.03)',
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
      <CardContent sx={{ flexGrow: 1, p: 1.5, bgcolor: '#fdfcf4' }}>
        <Stack spacing={1}>
          {group.items.map(item => (
            <Box
              key={item.id}
              sx={{
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                p: 1, borderRadius: '7px',
                bgcolor: item.status === 'READY' ? '#FCF9EA' : 'white',
                border: '1px solid',
                borderColor: item.status === 'READY' ? '#e8e4d8' : alpha('#D4C4A8', 0.3),
                opacity: (item.status === 'READY' || item.status === 'REJECTED' || item.status === 'CANCELLED') ? 0.6 : 1,
              }}
            >
              <Box sx={{ flexGrow: 1, mr: 1 }}>
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: 800, 
                    fontFamily: 'monospace',
                    fontSize: '0.9rem',
                    color: item.status === 'REJECTED' ? 'error.main' : 'text.primary',
                    textDecoration: (item.status === 'REJECTED' || item.status === 'CANCELLED') ? 'line-through' : 'none',
                  }}
                >
                  {item.quantity}× {item.item_details.name.toUpperCase()}
                </Typography>
                {item.notes && (
                  <Box sx={{ mt: 0.5, p: 0.5, bgcolor: alpha(theme.palette.error.main, 0.05), border: `1px solid ${alpha(theme.palette.error.main, 0.1)}`, borderRadius: '4px' }}>
                    <Typography variant="caption" color="error.dark" sx={{ fontWeight: 800, fontFamily: 'monospace', fontSize: '0.65rem' }}>
                      {item.notes.toUpperCase()}
                    </Typography>
                  </Box>
                )}
                {item.rejection_note && (
                  <Typography variant="caption" color="error" sx={{ fontWeight: 700, mt: 0.5, display: 'block', fontSize: '0.65rem' }}>
                    Reason: {item.rejection_note}
                  </Typography>
                )}
              </Box>
              <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                {canManage && (item.status === 'AWAITING' || item.status === 'ORDERED') && (
                  <>
                    <Tooltip title="Attend Item">
                      <IconButton 
                        size="small" 
                        color="primary" 
                        onClick={() => onAttend(item.id)} 
                        sx={{ 
                          bgcolor: alpha(theme.palette.primary.main, 0.1), 
                          borderRadius: '7px',
                          '&:hover': { bgcolor: 'primary.main', color: 'white' } 
                        }}
                      >
                        <StartIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Reject Item">
                      <IconButton 
                        size="small" 
                        color="error" 
                        onClick={() => onReject(item.id)} 
                        sx={{ 
                          bgcolor: alpha(theme.palette.error.main, 0.1),
                          borderRadius: '7px' 
                        }}
                      >
                        <CancelIcon sx={{ fontSize: 16 }} />
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
                    sx={{ minWidth: 0, p: '2px 8px', borderRadius: '7px', fontWeight: 800, fontSize: '0.65rem' }}
                  >
                    READY
                  </Button>
                )}
                {item.status === 'READY' && <DoneIcon color="success" sx={{ fontSize: 18 }} />}
                {(item.status === 'REJECTED' || item.status === 'CANCELLED') && <CancelIcon color="error" sx={{ fontSize: 18 }} />}
              </Stack>
            </Box>
          ))}
        </Stack>
      </CardContent>

      <Divider sx={{ borderStyle: 'dashed', borderColor: '#e8e4d8' }} />

      <CardActions sx={{ p: 1.5, bgcolor: 'white' }}>
        {allReady ? (
          <Box sx={{ width: '100%', textAlign: 'center', py: 0.75, bgcolor: alpha(theme.palette.success.main, 0.1), borderRadius: '7px', border: `1px solid ${alpha(theme.palette.success.main, 0.2)}` }}>
            <Typography variant="body2" sx={{ fontWeight: 800, color: 'success.main', fontSize: '0.75rem' }}>✓ COMPLETED</Typography>
          </Box>
        ) : (
          <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', width: '100%', textAlign: 'center' }}>
            {group.items.filter(i => i.status === 'PREPARING').length} Items in Preparation
          </Typography>
        )}
      </CardActions>
      
      {/* Zig-zag bottom effect with 7px radius */}
      <Box sx={{ height: 6, backgroundImage: 'linear-gradient(135deg, #e8e4d8 25%, transparent 25%), linear-gradient(225deg, #e8e4d8 25%, transparent 25%)', backgroundSize: '12px 12px', backgroundPosition: '0 0', borderBottomLeftRadius: '7px', borderBottomRightRadius: '7px' }} />
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
        <Alert severity="error" sx={{ mx: 'auto', maxWidth: 500, borderRadius: '7px' }}>
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
    <Box sx={{ height: { xs: 'auto', md: '100%' }, display: "flex", flexDirection: "column", p: { xs: 1.5, md: 2 }, bgcolor: '#FCF9EA', overflow: { xs: 'visible', md: 'hidden' } }}>
      <Box sx={{ 
        mb: 2, 
        display: { xs: 'none', md: 'flex' }, 
        justifyContent: "space-between", 
        alignItems: 'center', 
        gap: 2 
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <KitchenIcon sx={{ color: '#e9762b', fontSize: 28 }} />
          <Typography variant="h4" sx={{ fontWeight: 500, color: '#e9762b', fontSize: '1.25rem' }}>
            KITCHEN DISPLAY
          </Typography>
          <Chip 
            label={`LAST UPDATED: ${lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
            size="small"
            sx={{ fontWeight: 800, fontSize: '0.65rem', borderRadius: '7px', bgcolor: 'white', border: '1px solid #e8e4d8' }}
          />
        </Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Tooltip title="Refresh Kitchen Orders">
            <Button 
              variant="outlined" 
              size="small"
              onClick={fetchItems} 
              sx={{ borderRadius: '7px', height: 40, minWidth: 40, p: 0 }}
            >
              <RefreshIcon />
            </Button>
          </Tooltip>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '7px' }}>{error}</Alert>}

      {(preparingCount > 0 || orderedCount > 0) && (
        <Grid container spacing={1.5} sx={{ mb: 2 }}>
          {orderedCount > 0 && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ p: 1.5, bgcolor: alpha(theme.palette.error.main, 0.05), border: `1px solid ${alpha(theme.palette.error.main, 0.1)}`, borderRadius: '7px', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <AlertIcon sx={{ color: 'error.main', fontSize: 20 }} />
                <Typography sx={{ fontWeight: 800, color: 'error.main', fontSize: '0.8rem' }}>
                  {orderedCount} NEW ORDERS AWAITING ATTENTION
                </Typography>
              </Box>
            </Grid>
          )}
          {preparingCount > 0 && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ p: 1.5, bgcolor: alpha(theme.palette.warning.main, 0.05), border: `1px solid ${alpha(theme.palette.warning.main, 0.1)}`, borderRadius: '7px', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <StartIcon sx={{ color: 'warning.main', fontSize: 20 }} />
                <Typography sx={{ fontWeight: 800, color: 'warning.dark', fontSize: '0.8rem' }}>
                  {preparingCount} ITEMS CURRENTLY IN PREPARATION
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      )}

      <Box sx={{ flexGrow: { xs: 0, md: 1 }, overflowY: { xs: 'visible', md: 'auto' }, minHeight: 0, pr: 0.5 }}>
      {loading && items.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10 }}><CircularProgress /></Box>
      ) : grouped.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 15, bgcolor: 'white', borderRadius: '7px', border: '2px dashed #e8e4d8' }}>
          <DoneIcon sx={{ fontSize: 60, color: '#FCF9EA', mb: 2 }} />
          <Typography variant="h5" sx={{ color: 'text.secondary', fontWeight: 900, fontSize: '1.25rem' }}>KITCHEN IS CLEAR</Typography>
          <Typography variant="body2" color="text.secondary">Waiting for new orders...</Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
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
      <Dialog 
        open={rejectOpen} 
        onClose={() => setRejectOpen(false)}
        slotProps={{ paper: { sx: { borderRadius: '12px' } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.1rem' }}>Reject Item</DialogTitle>
        <DialogContent sx={{ py: 1 }}>
          <Typography variant="body2" sx={{ mb: 2, fontWeight: 600 }}>Please provide a reason for rejecting this item.</Typography>
          <TextField
            autoFocus
            fullWidth
            label="Rejection Note"
            variant="outlined"
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            multiline
            rows={2}
            slotProps={{
              input: { sx: { borderRadius: '7px' } }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRejectOpen(false)} color="inherit" sx={{ fontWeight: 700 }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleConfirmReject} disabled={!rejectNote.trim()} sx={{ borderRadius: '7px', fontWeight: 800 }}>
            Confirm Rejection
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
