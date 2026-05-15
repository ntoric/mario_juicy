"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  Stack,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Menu,
  Divider,
  alpha,
  InputAdornment,
  tooltipClasses,
  TooltipProps,
  Chip
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Add as AddIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  LockOpen as EditModeIcon,
  Lock as ViewModeIcon,
  Refresh as RefreshIcon,
  TableBar as TableBarIcon,
  FilterList as FilterIcon,
  Close as CloseIcon,
  AutoFixHigh as SweepIcon
} from '@mui/icons-material';
import { restaurantService, Table } from '@/services/restaurantService';
import OrderDialog from '@/components/backoffice/restaurant/OrderDialog';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useConfirm } from '@/context/ConfirmContext';
import { useToast } from '@/context/ToastContext';
import PageHeader from "@/components/backoffice/PageHeader";

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, {
  bg: string; border: string; text: string; label: string; dot: string; glow: string;
}> = {
  VACANT:             { bg: 'rgba(255, 255, 255, 0.8)', border: 'rgba(34, 197, 94, 0.3)', text: '#15803d', label: 'Available',   dot: '#22c55e', glow: 'rgba(34, 197, 94, 0.1)' },
  PARTIALLY_OCCUPIED: { bg: 'rgba(255, 251, 235, 0.8)', border: 'rgba(245, 158, 11, 0.3)', text: '#b45309', label: 'Partial',     dot: '#f59e0b', glow: 'rgba(245, 158, 11, 0.15)' },
  OCCUPIED:           { bg: 'rgba(254, 242, 242, 0.8)', border: 'rgba(239, 68, 68, 0.3)', text: '#b91c1c', label: 'Occupied',    dot: '#ef4444', glow: 'rgba(239, 68, 68, 0.2)' },
  RESERVED:           { bg: 'rgba(255, 247, 237, 0.8)', border: 'rgba(249, 115, 22, 0.3)', text: '#c2410c', label: 'Reserved',    dot: '#f97316', glow: 'rgba(249, 115, 22, 0.15)' },
  MAINTENANCE:        { bg: 'rgba(248, 250, 252, 0.8)', border: 'rgba(100, 116, 139, 0.3)', text: '#334155', label: 'Maintenance', dot: '#64748b', glow: 'rgba(100, 116, 139, 0.1)' },
};

const HtmlTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: '#ffffff',
    color: 'rgba(0, 0, 0, 0.87)',
    maxWidth: 250,
    fontSize: theme.typography.pxToRem(12),
    border: '1px solid #dadde9',
    boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
    borderRadius: '0.65rem',
    padding: '16px'
  },
  [`& .${tooltipClasses.arrow}`]: {
    color: '#ffffff',
    "&::before": {
      border: '1px solid #dadde9'
    }
  },
}));

// Add pulse animation for occupied tables
const PULSE_ANIMATION = `
  @keyframes statusPulse {
    0% { transform: scale(1); box-shadow: 0 8px 20px rgba(0,0,0,0.05); }
    50% { transform: scale(1.02); box-shadow: 0 12px 28px rgba(0,0,0,0.1); }
    100% { transform: scale(1); box-shadow: 0 8px 20px rgba(0,0,0,0.05); }
  }
  @keyframes glow {
    0% { opacity: 0.5; }
    50% { opacity: 1; }
    100% { opacity: 0.5; }
  }
`;

interface DragState {
  tableId: number;
  startMouseX: number; startMouseY: number;
  startPosX: number;   startPosY: number;
}

interface AddTableForm {
  number: string; capacity: string;
  status: string;
}

export default function TableMapPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const canvasRef = useRef<HTMLDivElement>(null);
  const { hasPermission } = useAuth();
  const { confirm } = useConfirm();
  const { showError, showSuccess } = useToast();
  const canManageLayout = hasPermission('table_layout');

  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [pending, setPending] = useState<Record<number, { pos_x: number; pos_y: number }>>({});
  const [saving, setSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(false);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterAnchor, setFilterAnchor] = useState<null | HTMLElement>(null);

  const [orderTable, setOrderTable] = useState<Table | null>(null);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddTableForm>({ number: '', capacity: '4', status: 'VACANT' });
  const [addLoading, setAddLoading] = useState(false);

  const [editTable, setEditTable] = useState<Table | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const fetchTables = useCallback(async () => {
    if (!tables || tables.length === 0) setLoading(true);
    try {
      const data = await restaurantService.getTables();
      setTables(data || []);
      
      if (orderTable) {
        const updated = data.find((t: Table) => t.id === orderTable.id);
        if (updated) setOrderTable(updated);
      }
      
      setError(null);
    } catch (e: any) { setError(e.message || 'Failed to load tables'); }
    finally { setLoading(false); }
  }, [tables?.length]);
  
  useEffect(() => { 
    fetchTables(); 
  }, [fetchTables]);

  useWebSocket('ORDER_CREATED', () => fetchTables());
  useWebSocket('TABLE_UPDATED', () => fetchTables());
  useWebSocket('ORDER_UPDATED', () => fetchTables());
  useWebSocket('ORDER_CHECKOUT', () => fetchTables());
  useWebSocket('ORDER_DELETED', () => fetchTables());

  useEffect(() => {
    const handleRefresh = () => fetchTables();
    window.addEventListener('app-refresh', handleRefresh);
    return () => window.removeEventListener('app-refresh', handleRefresh);
  }, [fetchTables]);

  useEffect(() => {
    const handleClose = () => {
      setOrderDialogOpen(false);
      localStorage.removeItem('active_table_id');
      localStorage.removeItem('order_dialog_open');
    };
    window.addEventListener('close-dialogs', handleClose);
    return () => window.removeEventListener('close-dialogs', handleClose);
  }, []);

  // Restore session on mount
  useEffect(() => {
    const savedTableId = localStorage.getItem('active_table_id');
    const isDialogOpen = localStorage.getItem('order_dialog_open') === 'true';
    
    if (savedTableId && isDialogOpen && tables.length > 0) {
      const t = tables.find(t => t.id === Number(savedTableId));
      if (t) {
        setOrderTable(t);
        setOrderDialogOpen(true);
      }
    }
  }, [tables.length]);

  // Save session state
  useEffect(() => {
    if (orderTable && orderDialogOpen) {
      localStorage.setItem('active_table_id', orderTable.id.toString());
      localStorage.setItem('order_dialog_open', 'true');
    } else if (!orderDialogOpen) {
      localStorage.setItem('order_dialog_open', 'false');
    }
  }, [orderTable, orderDialogOpen]);

  const onPointerDown = (e: React.PointerEvent, table: Table) => {
    if (!editMode) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging({
      tableId: table.id,
      startMouseX: e.clientX, startMouseY: e.clientY,
      startPosX: pending[table.id]?.pos_x ?? table.pos_x,
      startPosY: pending[table.id]?.pos_y ?? table.pos_y,
    });
  };

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const newX = Math.max(1, Math.min(88, dragging.startPosX + ((e.clientX - dragging.startMouseX) / rect.width) * 100));
    const newY = Math.max(1, Math.min(88, dragging.startPosY + ((e.clientY - dragging.startMouseY) / rect.height) * 100));
    setPending(p => ({ ...p, [dragging.tableId]: { pos_x: newX, pos_y: newY } }));
  }, [dragging]);

  const onPointerUp = useCallback(() => setDragging(null), []);

  const saveLayout = async () => {
    setSaving(true);
    try {
      await Promise.all(
        Object.entries(pending).map(([id, pos]) =>
          restaurantService.updateTablePosition(Number(id), pos.pos_x, pos.pos_y)
        )
      );
      setPending({});
      setSaveFeedback(true);
      setTimeout(() => setSaveFeedback(false), 2000);
      showSuccess('Layout saved successfully');
      fetchTables();
    } catch (e: any) { showError(e.message); }
    finally { setSaving(false); }
  };

  const sweepLayout = () => {
    if (tables.length === 0) return;
    
    const containerWidth = canvasRef.current?.offsetWidth || 1000;
    // Calculate columns based on width, but keep it between 3 and 10
    const gapX = isMobile ? 33 : 13; // 13% step gives ~3.5% gap with 9.5% width
    const gapY = isMobile ? 15 : 20; // 20% step gives ample vertical space
    const cols = Math.floor(96 / gapX);
    
    const startX = 2;
    const startY = 4;

    const newPending: Record<number, { pos_x: number; pos_y: number }> = { ...pending };
    
    // Sort tables by current position or name to keep some order
    const sortedTables = [...tables].sort((a, b) => {
      // Primary sort by current Y, then by X
      if (Math.abs(a.pos_y - b.pos_y) > 10) return a.pos_y - b.pos_y;
      return a.pos_x - b.pos_x;
    });

    sortedTables.forEach((table, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      newPending[table.id] = {
        pos_x: Math.min(88, startX + col * gapX),
        pos_y: Math.min(88, startY + row * gapY)
      };
    });
    
    setPending(newPending);
  };

  const counts = (tables || []).reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {} as Record<string,number>);
  const visible = filterStatus ? (tables || []).filter(t => t.status === filterStatus) : (tables || []);

  const renderOrderOverview = (table: Table) => {
    if (!table.active_order) return null;
    const order = table.active_order;
    return (
      <Box sx={{ minWidth: 180 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, pb: 1, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <Typography sx={{ fontWeight: 900, fontSize: '0.85rem' }}>Order #{order.id}</Typography>
          <Box sx={{ px: 1, py: 0.2, bgcolor: alpha(theme.palette.primary.main, 0.1), borderRadius: '0.65rem' }}>
             <Typography sx={{ fontSize: '0.65rem', fontWeight: 900, color: theme.palette.primary.main }}>{order.status}</Typography>
          </Box>
        </Box>

        {order.customer_name && (
          <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, mb: 1, color: 'text.secondary' }}>
            Cust: {order.customer_name}
          </Typography>
        )}

        <Box sx={{ maxHeight: 150, overflowY: 'auto', mb: 1.5 }}>
          {order.items?.map((item: any, idx: number) => (
            <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75, gap: 2 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.9 }}>{item.quantity}x {item.item_details?.name}</Typography>
              <Typography variant="caption" sx={{ fontWeight: 800 }}>₹{item.price}</Typography>
            </Box>
          ))}
        </Box>

        <Divider sx={{ my: 1, opacity: 0.5 }} />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontWeight: 900, fontSize: '0.75rem' }}>Total Amount</Typography>
          <Typography sx={{ fontWeight: 950, fontSize: '0.9rem', color: theme.palette.primary.main }}>₹{order.total_amount}</Typography>
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ 
      height: '100%', 
      display: "flex", 
      flexDirection: "column", 
      p: { xs: 2, md: 3 }, 
      overflow: "hidden",
      position: 'relative'
    }}>
      {/* Decorative blobs */}
      <Box sx={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.08)} 0%, transparent 70%)`, borderRadius: '50%', zIndex: 0, pointerEvents: 'none' }} />
      
      <PageHeader>
        <Box>
          <Typography variant="h4" sx={{ 
            fontWeight: 600, 
            letterSpacing: '-0.02em', 
            mb: 0,
            background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`, 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent',
            fontSize: '2rem'
          }}>
            Floor Layout
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Box sx={{ display: { xs: 'none', lg: 'flex' }, gap: 0.5, mr: 1 }}>
            <Chip 
              size="small"
              label="All" 
              onClick={() => setFilterStatus(null)}
              sx={{ 
                height: 28,
                fontWeight: 900, 
                bgcolor: filterStatus === null ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                color: filterStatus === null ? theme.palette.primary.main : 'text.disabled',
                border: '1px solid',
                borderColor: filterStatus === null ? theme.palette.primary.main : alpha(theme.palette.divider, 0.1),
              }} 
            />
            {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
              <Chip 
                key={status}
                size="small"
                label={cfg.label}
                onClick={() => setFilterStatus(status)}
                sx={{ 
                  height: 28,
                  fontWeight: 900, 
                  bgcolor: filterStatus === status ? alpha(cfg.dot, 0.1) : 'transparent',
                  color: filterStatus === status ? cfg.text : 'text.disabled',
                  border: '1px solid',
                  borderColor: filterStatus === status ? cfg.dot : alpha(theme.palette.divider, 0.1),
                }} 
              />
            ))}
          </Box>

          <IconButton onClick={fetchTables} disabled={loading} size="small" sx={{ bgcolor: alpha('#000', 0.03), borderRadius: '0.65rem', width: 48, height: 48 }}>
            <RefreshIcon sx={{ fontSize: 18, animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </IconButton>

          {canManageLayout && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              {editMode && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={sweepLayout}
                  startIcon={<SweepIcon sx={{ fontSize: 16 }} />}
                  sx={{ 
                    borderRadius: '0.65rem', 
                    height: 48, 
                    px: 3,
                    fontWeight: 950,
                    borderColor: theme.palette.primary.main,
                    color: theme.palette.primary.main,
                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05), borderColor: theme.palette.primary.main }
                  }}
                >
                  SWEEP
                </Button>
              )}
              <Button
                variant={editMode ? 'contained' : 'outlined'}
                onClick={() => { setEditMode(e => !e); setPending({}); }}
                size="small"
                startIcon={editMode ? <SaveIcon sx={{ fontSize: 16 }} /> : <EditModeIcon sx={{ fontSize: 16 }} />}
                sx={{ 
                  borderRadius: '0.65rem', 
                  fontWeight: 950,
                  height: 48,
                  px: 3,
                  bgcolor: editMode ? theme.palette.primary.main : 'transparent',
                  borderColor: theme.palette.primary.main,
                  color: editMode ? 'white' : theme.palette.primary.main,
                  '&:hover': { bgcolor: editMode ? '#d66a27' : alpha(theme.palette.primary.main, 0.05), borderColor: theme.palette.primary.main }
                }}
              >
                {editMode ? 'FINISH' : 'DESIGN'}
              </Button>

              {editMode && Object.keys(pending).length > 0 && (
                <Button variant="contained" size="small" onClick={saveLayout} disabled={saving} sx={{ borderRadius: '0.65rem', height: 48, px: 3, fontWeight: 950, bgcolor: '#2e7d32' }}>
                  {saving ? <CircularProgress size={16} color="inherit" /> : 'SAVE'}
                </Button>
              )}
              
              {!editMode && (
                <Button 
                  variant="contained" 
                  size="small"
                  onClick={() => setAddOpen(true)}
                  startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                  sx={{ 
                    borderRadius: '0.65rem', 
                    height: 48, 
                    px: 3,
                    fontWeight: 950,
                    bgcolor: theme.palette.primary.main,
                    '&:hover': { bgcolor: '#d66a27' }
                  }}
                >
                  NEW
                </Button>
              )}
            </Box>
          )}
        </Stack>
      </PageHeader>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '0.65rem' }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Main Canvas */}
      <Paper
        ref={canvasRef}
        elevation={0}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        sx={{
          position: 'relative',
          flexGrow: 1,
          border: '1px solid',
          borderColor: alpha(theme.palette.divider, 0.08),
          borderRadius: '0.65rem',
          overflow: 'hidden',
          bgcolor: 'white',
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.015) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          cursor: dragging ? 'grabbing' : 'default',
          userSelect: 'none',
          touchAction: 'none',
          boxShadow: 'inset 0 2px 20px rgba(0,0,0,0.01)',
          outline: editMode ? `2px dashed ${alpha(theme.palette.primary.main, 0.4)}` : 'none',
          outlineOffset: '-4px'
        }}
      >
        <style>{PULSE_ANIMATION}</style>
        
        {loading && (
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, bgcolor: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(4px)' }}>
            <CircularProgress sx={{ color: theme.palette.primary.main }} />
          </Box>
        )}

        {/* Tables Container */}
        <Box sx={isMobile ? {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
          gap: 1.5,
          p: 2,
          overflowY: 'auto',
          height: '100%'
        } : { position: 'relative', width: '100%', height: '100%', p: 4 }}>
          {visible.map(table => {
            const pos = pending[table.id] ?? { pos_x: table.pos_x, pos_y: table.pos_y };
            const cfg = STATUS_CONFIG[table.status] ?? STATUS_CONFIG['VACANT'];
            const isDragging = dragging?.tableId === table.id;
            const orderContent = !editMode && table.active_order ? renderOrderOverview(table) : null;

            return (
              <HtmlTooltip
                key={table.id}
                title={orderContent || ''}
                disableHoverListener={editMode || !table.active_order}
                arrow
                placement="top"
              >
                <Box
                  onPointerDown={e => onPointerDown(e, table)}
                  onClick={() => { if (!editMode && !dragging) { setOrderTable(table); setOrderDialogOpen(true); } }}
                sx={{
                  position: isMobile ? 'relative' : 'absolute',
                  left: isMobile ? 'auto' : `${pos.pos_x}%`,
                  top: isMobile ? 'auto' : `${pos.pos_y}%`,
                  width: isMobile ? '100%' : { sm: '8.5%' },
                  minWidth: isMobile ? 'auto' : 80,
                  maxWidth: isMobile ? 'none' : 110,
                  aspectRatio: '1',
                  bgcolor: cfg.bg,
                  backdropFilter: 'blur(6px)',
                  border: isDragging ? `2px solid ${theme.palette.primary.main}` : `1px solid ${cfg.border}`,
                  borderRadius: '0.65rem',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  cursor: editMode ? 'grab' : 'pointer',
                  boxShadow: isDragging 
                    ? '0 25px 50px rgba(0,0,0,0.12)' 
                    : (table.status === 'OCCUPIED') 
                      ? `0 8px 25px ${alpha(cfg.dot, 0.15)}` 
                      : '0 4px 12px rgba(0,0,0,0.02)',
                  transform: isDragging ? 'scale(1.08) rotate(1deg)' : 'scale(1)',
                  transition: isDragging ? 'none' : 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  zIndex: isDragging ? 100 : 1,
                  touchAction: 'none',
                  animation: table.status === 'OCCUPIED' ? 'statusPulse 3s infinite' : 'none',
                  '&:hover': !editMode ? { 
                    transform: 'translateY(-4px)',
                    borderColor: theme.palette.primary.main,
                    boxShadow: '0 12px 30px rgba(0,0,0,0.06)',
                    zIndex: 50
                  } : {}
                }}
              >
                {/* Status indicator dot */}
                <Box sx={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: cfg.dot,
                }} />

                <Typography sx={{ 
                  fontWeight: 600, 
                  color: cfg.text, 
                  fontSize: { xs: '1.15rem', sm: '1.35rem' }, 
                  lineHeight: 1, 
                  mb: 0.25,
                }}>
                  {table.number}
                </Typography>
                
                <Typography sx={{ fontSize: '0.6rem', fontWeight: 900, color: 'text.disabled', letterSpacing: '0.02em', opacity: 0.8 }}>
                  {table.current_occupancy || 0}/{table.capacity}
                </Typography>

                {editMode && !isDragging && (
                  <Stack 
                    direction="row" 
                    spacing={0.5} 
                    sx={{ 
                      position: 'absolute', 
                      bottom: -18, 
                      bgcolor: 'white', 
                      borderRadius: '0.65rem', 
                      boxShadow: '0 8px 24px rgba(0,0,0,0.1)', 
                      p: 0.4,
                      border: '1px solid',
                      borderColor: alpha(theme.palette.divider, 0.1),
                      zIndex: 10
                    }}
                    onPointerDown={e => e.stopPropagation()}
                  >
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEditTable(table); setEditOpen(true); }} sx={{ color: theme.palette.primary.main, p: 0.4 }}><EditIcon sx={{ fontSize: 14 }} /></IconButton>
                    <IconButton 
                      size="small" 
                      color="error" 
                      sx={{ p: 0.4 }}
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!await confirm({
                          title: 'Delete Table',
                          message: `Are you sure you want to delete table ${table.number}?`,
                          severity: 'error',
                          confirmLabel: 'DELETE'
                        })) return;
                        try {
                          await restaurantService.deleteTable(table.id); 
                          showSuccess('Table deleted');
                          fetchTables();
                        } catch (e: any) { showError('Failed to delete table'); }
                      }}
                    >
                      <DeleteIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Stack>
                )}
                </Box>
              </HtmlTooltip>
            );
          })}
        </Box>
      </Paper>

      {/* Modern Dialogs */}
      <Dialog 
        open={addOpen} 
        onClose={() => setAddOpen(false)}
        slotProps={{
          paper: { sx: { borderRadius: '0.65rem', p: 1, maxWidth: 380, width: '100%' } }
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, pb: 1, fontSize: '1.5rem', letterSpacing: '-0.02em' }}>Add Table</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Table Number" size="small" fullWidth autoFocus value={addForm.number} onChange={e => setAddForm(f => ({ ...f, number: e.target.value }))} slotProps={{ input: { sx: { borderRadius: '0.65rem', fontWeight: 800 } } }} />
            <TextField label="Capacity" size="small" type="number" fullWidth value={addForm.capacity} onChange={e => setAddForm(f => ({ ...f, capacity: e.target.value }))} slotProps={{ input: { sx: { borderRadius: '0.65rem', fontWeight: 800 } } }} />
            <TextField select label="Status" size="small" fullWidth value={addForm.status} onChange={e => setAddForm(f => ({ ...f, status: e.target.value }))} slotProps={{ input: { sx: { borderRadius: '0.65rem', fontWeight: 800 } } }}>
              {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                <MenuItem key={val} value={val} sx={{ borderRadius: '0.65rem', mx: 1, my: 0.3, minHeight: 36 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: cfg.dot }} /> 
                    <Typography sx={{ fontWeight: 800, fontSize: '0.85rem' }}>{cfg.label}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1, gap: 1.5 }}>
          <Button onClick={() => setAddOpen(false)} size="small" sx={{ fontWeight: 900, color: 'text.disabled' }}>CANCEL</Button>
          <Button 
            variant="contained" 
            fullWidth 
            size="small"
            onClick={async () => {
              setAddLoading(true);
              try {
                // Smart auto-placement
                const gapX = 13;
                const gapY = 18;
                const cols = Math.floor(96 / gapX);
                const startX = 2;
                const startY = 4;
                let nextX = 40;
                let nextY = 40;
                for (let i = 0; i < 100; i++) {
                  const r = Math.floor(i / cols);
                  const c = i % cols;
                  const tx = Math.min(88, startX + c * gapX);
                  const ty = Math.min(88, startY + r * gapY);
                  if (!tables.some(t => Math.abs(t.pos_x - tx) < 5 && Math.abs(t.pos_y - ty) < 5)) {
                    nextX = tx; nextY = ty; break;
                  }
                }
                await restaurantService.createTable({ 
                  number: addForm.number, capacity: Number(addForm.capacity), 
                  status: addForm.status as any, pos_x: nextX, pos_y: nextY 
                });
                setAddOpen(false);
                setAddForm({ number: '', capacity: '4', status: 'VACANT' });
                fetchTables();
              } catch (e: any) { showError('Failed to add table'); }
              finally { setAddLoading(false); }
            }}
            disabled={!addForm.number || addLoading}
            sx={{ borderRadius: '0.65rem', height: 40, fontWeight: 600, bgcolor: theme.palette.primary.main }}
          >
            {addLoading ? <CircularProgress size={20} color="inherit" /> : 'CREATE'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog 
        open={editOpen} 
        onClose={() => setEditOpen(false)}
        slotProps={{
          paper: { sx: { borderRadius: '0.65rem', p: 1, maxWidth: 380, width: '100%' } }
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, pb: 1, fontSize: '1.5rem' }}>Edit Table</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Table Number" size="small" fullWidth value={editTable?.number || ''} onChange={e => setEditTable(t => t ? { ...t, number: e.target.value } : null)} slotProps={{ input: { sx: { borderRadius: '0.65rem', fontWeight: 800 } } }} />
            <TextField label="Capacity" size="small" type="number" fullWidth value={editTable?.capacity || ''} onChange={e => setEditTable(t => t ? { ...t, capacity: Number(e.target.value) } : null)} slotProps={{ input: { sx: { borderRadius: '0.65rem', fontWeight: 800 } } }} />
            <TextField select label="Status" size="small" fullWidth value={editTable?.status || 'VACANT'} onChange={e => setEditTable(t => t ? { ...t, status: e.target.value as any } : null)} slotProps={{ input: { sx: { borderRadius: '0.65rem', fontWeight: 800 } } }}>
              {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                <MenuItem key={val} value={val} sx={{ borderRadius: '0.65rem', mx: 1, my: 0.3, minHeight: 36 }}>
                   <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: cfg.dot }} /> 
                    <Typography sx={{ fontWeight: 800, fontSize: '0.85rem' }}>{cfg.label}</Typography>
                  </Box>
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1, gap: 1.5 }}>
          <Button onClick={() => setEditOpen(false)} size="small" sx={{ fontWeight: 900, color: 'text.disabled' }}>CANCEL</Button>
          <Button 
            variant="contained" 
            fullWidth 
            size="small"
            onClick={async () => {
              if (!editTable) return;
              setAddLoading(true);
              try {
                await restaurantService.updateTable(editTable.id, { 
                  number: editTable.number, capacity: editTable.capacity, 
                  status: editTable.status, is_active: editTable.is_active 
                });
                setEditOpen(false);
                fetchTables();
              } catch (e: any) { showError('Failed to update table'); }
              finally { setAddLoading(false); }
            }}
            sx={{ borderRadius: '0.65rem', height: 40, fontWeight: 600, bgcolor: theme.palette.primary.main }}
          >
            {addLoading ? <CircularProgress size={20} color="inherit" /> : 'SAVE'}
          </Button>
        </DialogActions>
      </Dialog>

      <OrderDialog open={orderDialogOpen} onClose={() => setOrderDialogOpen(false)} table={orderTable} onOrderUpdated={() => fetchTables()} />
      
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Box>
  );
}
