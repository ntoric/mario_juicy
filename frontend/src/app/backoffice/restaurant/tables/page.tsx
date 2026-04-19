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
} from '@mui/material';
import {
  Add as AddIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  LockOpen as EditModeIcon,
  Lock as ViewModeIcon,
  Refresh as RefreshIcon,
  TableBar as TableBarIcon,
  RadioButtonUnchecked as RoundIcon,
  CropLandscape as RectIcon,
} from '@mui/icons-material';
import { restaurantService, Table } from '@/services/restaurantService';
import OrderDialog from '@/components/backoffice/restaurant/OrderDialog';
import { useAuth } from '@/hooks/useAuth';
import Preloader from '@/components/ui/Preloader';

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, {
  bg: string; border: string; text: string; label: string; dot: string;
}> = {
  VACANT:             { bg: '#f1fcf1', border: '#4caf50', text: '#1b5e20', label: 'Available',   dot: '#4caf50' },
  PARTIALLY_OCCUPIED: { bg: '#fff9e6', border: '#F2C94C', text: '#856404', label: 'Partial',     dot: '#F2C94C' },
  OCCUPIED:           { bg: '#fff4f4', border: '#CF0F0F', text: '#910a0a', label: 'Occupied',    dot: '#CF0F0F' },
  RESERVED:           { bg: '#fff9e6', border: '#E9762B', text: '#7d3e17', label: 'Reserved',    dot: '#E9762B' },
  MAINTENANCE:        { bg: '#FCF9EA', border: '#D4C4A8', text: '#5d4037', label: 'Maintenance', dot: '#D4C4A8' },
};

// Add pulse animation for occupied tables
const PULSE_ANIMATION = `
  @keyframes statusPulse {
    0% { box-shadow: 0 0 0 0 rgba(207, 15, 15, 0.4); }
    70% { box-shadow: 0 0 0 10px rgba(207, 15, 15, 0); }
    100% { box-shadow: 0 0 0 0 rgba(207, 15, 15, 0); }
  }
`;

function StatPill({ status, count, active, onClick }: { status: string; count: number; active: boolean; onClick: () => void }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex', alignItems: 'center', gap: 0.75,
        px: { xs: 1.25, sm: 2 }, py: { xs: 0.75, sm: 1 },
        borderRadius: 2,
        bgcolor: active ? cfg.border : cfg.bg,
        border: `1.5px solid ${cfg.border}`,
        cursor: 'pointer',
        opacity: 1,
        transition: 'all 0.15s',
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: active ? 'white' : cfg.dot, flexShrink: 0 }} />
      <Typography sx={{ fontSize: { xs: '0.7rem', sm: '0.78rem' }, fontWeight: 700, color: active ? 'white' : cfg.text, lineHeight: 1 }}>
        {count} {cfg.label}
      </Typography>
    </Box>
  );
}

interface DragState {
  tableId: number;
  startMouseX: number; startMouseY: number;
  startPosX: number;   startPosY: number;
}

interface AddTableForm {
  number: string; capacity: string;
  shape: 'RECT' | 'CIRCLE'; status: string;
}

export default function TableMapPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const canvasRef = useRef<HTMLDivElement>(null);
  const { hasPermission } = useAuth();
  const canManageLayout = hasPermission('manage_table_layout_access');

  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [pending, setPending] = useState<Record<number, { pos_x: number; pos_y: number }>>({});
  const [saving, setSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(false);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const [orderTable, setOrderTable] = useState<Table | null>(null);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddTableForm>({ number: '', capacity: '4', shape: 'RECT', status: 'VACANT' });
  const [addLoading, setAddLoading] = useState(false);

  const [editTable, setEditTable] = useState<Table | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const fetchTables = useCallback(async () => {
    setLoading(true);
    try {
      const data = await restaurantService.getTables();
      setTables(data);
      setError(null);
    } catch (e: any) { setError(e.message || 'Failed to load tables'); }
    finally { setLoading(false); }
  }, []);
  
  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      await restaurantService.recalculateAllTableStatuses();
      await fetchTables();
    } catch (e: any) {
      setError(e.message || 'Failed to sync table statuses');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => { 
    fetchTables(); 
    // Enable 10s polling for real-time status updates
    const interval = setInterval(fetchTables, 10000);
    return () => clearInterval(interval);
  }, [fetchTables]);

  useEffect(() => {
    const handleRefresh = () => fetchTables();
    window.addEventListener('app-refresh', handleRefresh);
    return () => window.removeEventListener('app-refresh', handleRefresh);
  }, [fetchTables]);

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
      fetchTables();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const counts = tables.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {} as Record<string,number>);
  const visible = filterStatus ? tables.filter(t => t.status === filterStatus) : tables;

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", p: { xs: 2, md: 3 }, overflow: "hidden" }}>
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
            Floor Layout
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ width: { xs: '100%', sm: 'auto' }, flexWrap: 'wrap' }}>
            <Button 
              variant="outlined" 
              startIcon={<RefreshIcon />} 
              onClick={fetchTables} 
              disabled={loading || syncing}
              sx={{ borderRadius: 2, height: 48 }}
            >
              Refresh
            </Button>
            
            <Tooltip title="Sync all tables with active orders to fix stuck statuses">
              <Button 
                variant="outlined" 
                color="secondary"
                startIcon={syncing ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />} 
                onClick={handleSyncAll} 
                disabled={loading || syncing}
                sx={{ borderRadius: 2, height: 48 }}
              >
                Sync Statuses
              </Button>
            </Tooltip>

          {canManageLayout && (
            <>
              <Button
                variant={editMode ? 'contained' : 'outlined'}
                color={editMode ? 'warning' : 'primary'}
                startIcon={editMode ? <ViewModeIcon /> : <EditModeIcon />}
                onClick={() => { setEditMode(e => !e); setPending({}); }}
                sx={{ borderRadius: 2, height: 48 }}
              >
                {editMode ? 'Exit Edit' : 'Edit Layout'}
              </Button>
              <Button 
                variant="contained" 
                startIcon={<AddIcon />} 
                onClick={() => setAddOpen(true)}
                sx={{ borderRadius: 2, height: 48 }}
              >
                Add Table
              </Button>
            </>
          )}
        </Stack>
      </Box>

      <Card sx={{ mb: 4, p: 2, borderRadius: '5px' }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, textTransform: 'uppercase', display: { xs: 'none', sm: 'block' } }}>
            Status:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', '::-webkit-scrollbar': { height: 0 } }}>
            {Object.keys(STATUS_CONFIG).map(status => (
              <StatPill
                key={status}
                status={status}
                count={counts[status] || 0}
                active={filterStatus === status}
                onClick={() => setFilterStatus(filterStatus === status ? null : status)}
              />
            ))}
          </Box>
          {editMode && Object.keys(pending).length > 0 && (
            <Button 
              size="small"
              variant="contained" 
              color="success" 
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
              onClick={saveLayout} 
              disabled={saving}
              sx={{ ml: 'auto', borderRadius: 2 }}
            >
              {saveFeedback ? '✓ Layout Saved' : 'Save New Layout'}
            </Button>
          )}
        </Box>
      </Card>

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

      <Paper
        ref={canvasRef}
        elevation={0}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        sx={{
          position: 'relative',
          flexGrow: 1,
          minHeight: { xs: 500, md: 0 },
          border: '2px solid',
          borderColor: editMode ? 'warning.main' : '#e8e4d8',
          borderRadius: '12px',
          overflow: 'hidden',
          bgcolor: '#FCF9EA',
          backgroundImage: editMode 
            ? 'radial-gradient(#D4C4A8 1.5px, transparent 1.5px)' 
            : 'linear-gradient(rgba(232, 228, 216, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(232, 228, 216, 0.5) 1px, transparent 1px)',
          backgroundSize: editMode ? '28px 28px' : '40px 40px',
          cursor: dragging ? 'grabbing' : 'default',
          userSelect: 'none',
          touchAction: 'none',
          boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.03)',
          transition: 'border-color 0.3s ease',
        }}
      >
        <style>{PULSE_ANIMATION}</style>
        {loading && (
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Preloader fullScreen={false} size={80} message="Loading floor map..." />
          </Box>
        )}

        {!loading && tables.length === 0 && (
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5 }}>
            <TableBarIcon sx={{ fontSize: 56, color: 'text.disabled' }} />
            <Typography color="text.secondary">No tables yet</Typography>
            {canManageLayout && (
              <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>Add First Table</Button>
            )}
          </Box>
        )}

        <Box sx={isMobile ? {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(75px, 1fr))',
          gap: 1,
          p: 1,
          overflow: 'auto',
          height: '100%'
        } : { position: 'relative', width: '100%', height: '100%' }}>
          {visible.map(table => {
            const pos = pending[table.id] ?? { pos_x: table.pos_x, pos_y: table.pos_y };
            const cfg = STATUS_CONFIG[table.status] ?? STATUS_CONFIG['VACANT'];
            const isRound = table.shape === 'CIRCLE';
            const isDragging = dragging?.tableId === table.id;

            return (
              <Box
                key={table.id}
                onPointerDown={e => onPointerDown(e, table)}
                onClick={() => { if (!editMode && !dragging) { setOrderTable(table); setOrderDialogOpen(true); } }}
                sx={{
                  position: isMobile ? 'relative' : 'absolute',
                  left: isMobile ? 'auto' : `${pos.pos_x}%`,
                  top: isMobile ? 'auto' : `${pos.pos_y}%`,
                  width: isMobile ? '100%' : (isRound ? { sm: '10%' } : { sm: '11%' }),
                  minWidth: isMobile ? 'auto' : (isRound ? { sm: 70 } : { sm: 85 }),
                  maxWidth: isMobile ? 'none' : (isRound ? 120 : 140),
                  aspectRatio: isRound ? '1' : (isMobile ? '1' : '1.2'),
                  bgcolor: cfg.bg,
                  border: isMobile ? `2px solid ${cfg.border}` : `3px solid ${cfg.border}`,
                  borderRadius: isRound ? '50%' : '8px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  p: isMobile ? 0.5 : (isRound ? 0.75 : { xs: 0.75, sm: 1.5 }),
                  cursor: editMode ? 'grab' : 'pointer',
                  boxShadow: isDragging 
                    ? '0 20px 40px rgba(0,0,0,0.25)' 
                    : table.status === 'OCCUPIED' ? '0 8px 20px rgba(207, 15, 15, 0.15)' : '0 4px 12px rgba(0,0,0,0.05)',
                  transform: isDragging ? 'scale(1.1) translateY(-10px)' : 'scale(1)',
                  transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  zIndex: isDragging ? 10 : 1,
                  touchAction: 'none',
                  animation: (table.status === 'OCCUPIED' || table.status === 'PARTIALLY_OCCUPIED') ? 'statusPulse 2s infinite' : 'none',
                  '&:hover': !editMode ? { 
                    boxShadow: (table.status === 'OCCUPIED' || table.status === 'PARTIALLY_OCCUPIED') ? `0 12px 28px ${cfg.border}44` : '0 10px 25px rgba(0,0,0,0.12)', 
                    transform: 'scale(1.05) translateY(-4px)',
                    borderColor: table.status === 'VACANT' ? 'primary.main' : cfg.border
                  } : {},
                  '&::after': isRound ? {} : {
                    content: '""',
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 'inherit',
                    background: `linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 50%)`,
                    pointerEvents: 'none',
                  }
                }}
              >
                <Box sx={{
                  position: 'absolute', 
                  top: isMobile ? 3 : (isRound ? '12%' : 4), 
                  right: isMobile ? 3 : (isRound ? '12%' : 4),
                  width: isMobile ? 7 : 8, 
                  height: isMobile ? 7 : 8, 
                  borderRadius: '50%', bgcolor: cfg.dot,
                  border: '1.5px solid white', boxShadow: `0 0 0 1.5px ${cfg.border}33`,
                }} />

                <Typography sx={{ fontWeight: 900, color: cfg.text, lineHeight: 1.1, fontSize: { xs: '0.75rem', sm: '1.2rem' }, mb: 0.1 }}>
                  {table.number}
                </Typography>
                
                <Typography sx={{ color: cfg.text, fontWeight: 700, opacity: 0.8, fontSize: { xs: '0.55rem', sm: '0.7rem' }, lineHeight: 1.1 }}>
                  {table.current_occupancy || 0}/{table.capacity}
                </Typography>

                {!isRound && (
                  <Box sx={{ mt: 0.25, px: 0.5, py: 0.1, borderRadius: '2px', bgcolor: `${cfg.border}15`, border: `1px solid ${cfg.border}22` }}>
                    <Typography sx={{ fontSize: { xs: '0.45rem', sm: '0.6rem' }, fontWeight: 900, color: cfg.text, letterSpacing: '0.04em' }}>
                      {cfg.label.toUpperCase()}
                    </Typography>
                  </Box>
                )}

                {editMode && !isDragging && (
                  <Box
                    sx={{ position: 'absolute', bottom: isRound ? '4%' : -16, display: 'flex', gap: 0.25, bgcolor: 'white', borderRadius: 1, boxShadow: 2, px: 0.25 }}
                    onClick={e => e.stopPropagation()}
                  >
                    <Tooltip title="Edit">
                      <IconButton size="small" sx={{ p: 0.3 }} onClick={() => { setEditTable(table); setEditOpen(true); }}>
                        <EditIcon sx={{ fontSize: 12 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" sx={{ p: 0.3 }} onClick={async () => {
                        if (!confirm('Delete this table?')) return;
                        try {
                          await restaurantService.deleteTable(table.id); 
                          fetchTables();
                        } catch (e: any) {
                          console.error('Failed to delete table:', e);
                          let errorMsg = 'Failed to delete table';
                          if (typeof e === 'object' && e !== null) {
                            errorMsg = Object.entries(e)
                              .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
                              .join(' | ') || errorMsg;
                          } else if (typeof e === 'string') {
                            errorMsg = e;
                          }
                          alert(errorMsg);
                        }
                      }}>
                        <DeleteIcon sx={{ fontSize: 12 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      </Paper>

      {/* ── Add Table Dialog ── */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', py: 1.5 }}>Add New Table</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Table Number / Name" value={addForm.number} onChange={e => setAddForm(f => ({ ...f, number: e.target.value }))} fullWidth required placeholder="e.g. 1, A1, VIP-1" size="small" />
            <TextField label="Capacity" type="number" value={addForm.capacity} onChange={e => setAddForm(f => ({ ...f, capacity: e.target.value }))} fullWidth size="small" />
            <TextField select label="Shape" value={addForm.shape} onChange={e => setAddForm(f => ({ ...f, shape: e.target.value as any }))} fullWidth size="small">
              <MenuItem value="RECT"><RectIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 16 }} />Rectangle</MenuItem>
              <MenuItem value="CIRCLE"><RoundIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 16 }} />Circle</MenuItem>
            </TextField>
            <TextField select label="Status" value={addForm.status} onChange={e => setAddForm(f => ({ ...f, status: e.target.value }))} fullWidth size="small">
              {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                <MenuItem key={val} value={val}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: cfg.dot }} />
                    {cfg.label}
                  </Box>
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAddOpen(false)} size="small">Cancel</Button>
          <Button variant="contained" size="small" onClick={async () => {
            setAddLoading(true);
              try {
                await restaurantService.createTable({ number: addForm.number, capacity: Number(addForm.capacity), shape: addForm.shape, status: addForm.status as any, pos_x: 10, pos_y: 10 });
                setAddOpen(false);
                setAddForm({ number: '', capacity: '4', shape: 'RECT', status: 'VACANT' });
                fetchTables();
              } catch (e: any) { 
                console.error('Failed to create table:', e);
                // Handle complex validation errors from DRF (e.g., { number: ["error"] })
                let errorMsg = 'Failed to add table';
                if (typeof e === 'object' && e !== null) {
                  errorMsg = Object.entries(e)
                    .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
                    .join(' | ') || errorMsg;
                } else if (typeof e === 'string') {
                  errorMsg = e;
                }
                alert(errorMsg);
              }
              finally { setAddLoading(false); }
          }} disabled={!addForm.number || addLoading} startIcon={addLoading && <CircularProgress size={12} color="inherit" />}>
            Add Table
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Edit Table Dialog ── */}
      {editTable && (
        <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', py: 1.5 }}>Edit Table {editTable.number}</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField label="Capacity" type="number" size="small" value={editTable.capacity} onChange={e => setEditTable(t => t ? { ...t, capacity: Number(e.target.value) } : null)} fullWidth />
              <TextField select label="Shape" size="small" value={editTable.shape} onChange={e => setEditTable(t => t ? { ...t, shape: e.target.value as any } : null)} fullWidth>
                <MenuItem value="RECT">Rectangle</MenuItem>
                <MenuItem value="CIRCLE">Circle</MenuItem>
              </TextField>
              <TextField select label="Availability Status" size="small" value={editTable.status} onChange={e => setEditTable(t => t ? { ...t, status: e.target.value as any } : null)} fullWidth>
                {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                  <MenuItem key={val} value={val}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: cfg.dot }} /> {cfg.label}
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button size="small" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button variant="contained" size="small" onClick={async () => {
              if (editTable) {
                try {
                  await restaurantService.updateTable(editTable.id, { capacity: editTable.capacity, shape: editTable.shape, status: editTable.status });
                  setEditOpen(false); 
                  fetchTables();
                } catch (e: any) {
                  console.error('Failed to update table:', e);
                  let errorMsg = 'Failed to update table';
                  if (typeof e === 'object' && e !== null) {
                    errorMsg = Object.entries(e)
                      .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
                      .join(' | ') || errorMsg;
                  } else if (typeof e === 'string') {
                    errorMsg = e;
                  }
                  alert(errorMsg);
                }
              }
            }}>Save</Button>
          </DialogActions>
        </Dialog>
      )}

      <OrderDialog open={orderDialogOpen} onClose={() => setOrderDialogOpen(false)} table={orderTable} onOrderUpdated={fetchTables} />
    </Box>
  );
}
