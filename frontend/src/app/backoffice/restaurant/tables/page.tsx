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
} from '@mui/icons-material';
import { restaurantService, Table } from '@/services/restaurantService';
import OrderDialog from '@/components/backoffice/restaurant/OrderDialog';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, {
  bg: string; border: string; text: string; label: string; dot: string;
}> = {
  VACANT:             { bg: '#f0fff0', border: '#22c55e', text: '#15803d', label: 'Available',   dot: '#22c55e' },
  PARTIALLY_OCCUPIED: { bg: '#fffbeb', border: '#f59e0b', text: '#b45309', label: 'Partial',     dot: '#f59e0b' },
  OCCUPIED:           { bg: '#fef2f2', border: '#ef4444', text: '#b91c1c', label: 'Occupied',    dot: '#ef4444' },
  RESERVED:           { bg: '#fff7ed', border: '#f97316', text: '#c2410c', label: 'Reserved',    dot: '#f97316' },
  MAINTENANCE:        { bg: '#f8fafc', border: '#64748b', text: '#334155', label: 'Maintenance', dot: '#64748b' },
};

// Add pulse animation for occupied tables
const PULSE_ANIMATION = `
  @keyframes statusPulse {
    0% { box-shadow: 0 0 0 0 rgba(207, 15, 15, 0.4); }
    70% { box-shadow: 0 0 0 10px rgba(207, 15, 15, 0); }
    100% { box-shadow: 0 0 0 0 rgba(207, 15, 15, 0); }
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
      
      // Update orderTable if it's currently open to ensure Dialog stays in sync
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
  }, [tables.length]); // Wait until tables are loaded to find the matching table object

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
      fetchTables();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const counts = (tables || []).reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {} as Record<string,number>);
  const visible = filterStatus ? (tables || []).filter(t => t.status === filterStatus) : (tables || []);

  return (
    <Box sx={{ 
      height: '100%', 
      display: "flex", 
      flexDirection: "column", 
      p: { xs: 1.5, md: 2 }, 
      pb: { xs: 15, md: 2 },
      overflow: "hidden",
      position: 'relative'
    }}>
      <>
          <Box sx={{ 
            mb: 2, 
            display: 'flex', 
            justifyContent: "space-between", 
            alignItems: "center", 
            gap: 2,
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 500, color: '#e9762b', fontSize: '1.25rem', whiteSpace: 'nowrap' }}>
                Floor Layout
              </Typography>
              
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={(e) => setFilterAnchor(e.currentTarget)}
                  startIcon={<Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: filterStatus ? STATUS_CONFIG[filterStatus].dot : '#94a3b8' }} />}
                  sx={{ 
                    borderRadius: '7px', 
                    height: 40, 
                    px: 2, 
                    borderColor: filterStatus ? STATUS_CONFIG[filterStatus].border : '#e8e4d8',
                    bgcolor: filterStatus ? alpha(STATUS_CONFIG[filterStatus].bg, 0.5) : 'transparent',
                    color: filterStatus ? STATUS_CONFIG[filterStatus].text : 'text.primary',
                    '&:hover': {
                      bgcolor: filterStatus ? alpha(STATUS_CONFIG[filterStatus].bg, 0.8) : alpha('#000', 0.02),
                      borderColor: filterStatus ? STATUS_CONFIG[filterStatus].border : '#d4c4a8',
                    }
                  }}
                >
                  {filterStatus ? STATUS_CONFIG[filterStatus].label : 'All Tables'}
                </Button>
                <Menu
                  anchorEl={filterAnchor}
                  open={Boolean(filterAnchor)}
                  onClose={() => setFilterAnchor(null)}
                  slotProps={{
                    paper: {
                      sx: { borderRadius: '7px', mt: 1, minWidth: 180, boxShadow: '0 10px 40px rgba(0,0,0,0.08)', border: '1px solid #e8e4d8' }
                    }
                  }}
                >
                  <MenuItem onClick={() => { setFilterStatus(null); setFilterAnchor(null); }} sx={{ gap: 1.5, py: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#94a3b8' }} />
                    <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', flexGrow: 1 }}>All Tables</Typography>
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 800 }}>{tables?.length || 0}</Typography>
                  </MenuItem>
                  <Divider sx={{ my: 0.5, opacity: 0.5 }} />
                  {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
                    <MenuItem 
                      key={status} 
                      onClick={() => { setFilterStatus(status); setFilterAnchor(null); }}
                      sx={{ 
                        gap: 1.5, 
                        py: 1,
                        bgcolor: filterStatus === status ? alpha(cfg.bg, 0.5) : 'transparent',
                        '&:hover': { bgcolor: alpha(cfg.bg, 0.8) }
                      }}
                    >
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: cfg.dot }} />
                      <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', flexGrow: 1, color: cfg.text }}>{cfg.label}</Typography>
                      <Typography variant="caption" sx={{ color: cfg.text, opacity: 0.7, fontWeight: 800 }}>{counts[status] || 0}</Typography>
                    </MenuItem>
                  ))}
                </Menu>
              </Box>
            </Box>

            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              {editMode && Object.keys(pending).length > 0 && (
                <Tooltip title={saveFeedback ? '✓ Saved' : 'Save Layout'}>
                  <Button 
                    size="small"
                    variant="contained" 
                    color="success" 
                    onClick={saveLayout} 
                    disabled={saving}
                    sx={{ borderRadius: '7px', height: 40, minWidth: 40, p: 0 }}
                  >
                    {saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                  </Button>
                </Tooltip>
              )}

              <Tooltip title="Refresh Floor Map">
                <Button 
                  variant="outlined" 
                  size="small"
                  onClick={fetchTables} 
                  disabled={loading}
                  sx={{ borderRadius: '7px', height: 40, minWidth: 40, p: 0 }}
                >
                  <RefreshIcon fontSize="small" />
                </Button>
              </Tooltip>
              
              {canManageLayout && (
                <>
                  <Tooltip title={editMode ? 'Exit Edit Mode' : 'Enter Edit Mode'}>
                    <Button
                      variant={editMode ? 'contained' : 'outlined'}
                      size="small"
                      color={editMode ? 'warning' : 'primary'}
                      onClick={() => { setEditMode(e => !e); setPending({}); }}
                      sx={{ borderRadius: '7px', height: 40, minWidth: 40, p: 0 }}
                    >
                      {editMode ? <ViewModeIcon fontSize="small" /> : <EditModeIcon fontSize="small" />}
                    </Button>
                  </Tooltip>
                  
                  <Tooltip title="Add New Table">
                    <Button 
                      variant="contained" 
                      size="small"
                      onClick={() => setAddOpen(true)}
                      sx={{ borderRadius: '7px', height: 40, minWidth: 40, p: 0 }}
                    >
                      <AddIcon fontSize="small" />
                    </Button>
                  </Tooltip>
                </>
              )}
            </Stack>
          </Box>

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
              border: '2px solid',
              borderColor: editMode ? 'warning.main' : '#e8e4d8',
              borderRadius: '7px',
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
                <CircularProgress sx={{ color: '#E9762B' }} />
              </Box>
            )}

            {!loading && (!tables || tables.length === 0) && (
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
              overflow: { xs: 'visible', md: 'auto' },
              height: { xs: 'auto', md: '100%' }
            } : { position: 'relative', width: '100%', height: '100%' }}>
              {visible.map(table => {
                const pos = pending[table.id] ?? { pos_x: table.pos_x, pos_y: table.pos_y };
                const cfg = STATUS_CONFIG[table.status] ?? STATUS_CONFIG['VACANT'];
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
                      width: isMobile ? '100%' : { sm: '11%' },
                      minWidth: isMobile ? 'auto' : { sm: 85 },
                      maxWidth: isMobile ? 'none' : 140,
                      aspectRatio: isMobile ? '1' : '1.2',
                      bgcolor: cfg.bg,
                      border: isMobile ? `2px solid ${cfg.border}` : `3px solid ${cfg.border}`,
                      borderRadius: '7px',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      p: isMobile ? 0.5 : { xs: 0.75, sm: 1.5 },
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
                      '&::after': {
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
                      top: isMobile ? 3 : 4, 
                      right: isMobile ? 3 : 4,
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

                    <Box sx={{ mt: 0.25, px: 0.5, py: 0.1, borderRadius: '2px', bgcolor: `${cfg.border}15`, border: `1px solid ${cfg.border}22` }}>
                      <Typography sx={{ fontSize: { xs: '0.45rem', sm: '0.6rem' }, fontWeight: 900, color: cfg.text, letterSpacing: '0.04em' }}>
                        {cfg.label.toUpperCase()}
                      </Typography>
                    </Box>

                    {editMode && !isDragging && (
                      <Box
                        sx={{ 
                          position: 'absolute', 
                          bottom: -12, 
                          left: '50%',
                          transform: 'translateX(-50%)',
                          display: 'flex', 
                          gap: 0.5, 
                          bgcolor: 'white', 
                          borderRadius: '8px', 
                          boxShadow: '0 4px 15px rgba(0,0,0,0.2)', 
                          px: 0.5,
                          py: 0.25,
                          zIndex: 30,
                          cursor: 'default',
                          border: '1px solid #e8e4d8'
                        }}
                        onPointerDown={e => e.stopPropagation()}
                        onClick={e => e.stopPropagation()}
                      >
                        <Tooltip title="Edit Table Details">
                          <IconButton 
                            size="small" 
                            sx={{ p: 0.5, color: 'primary.main', '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) } }} 
                            onClick={(e) => { 
                              e.stopPropagation();
                              setEditTable(table); 
                              setEditOpen(true); 
                            }}
                          >
                            <EditIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Table">
                          <IconButton 
                            size="small" 
                            color="error" 
                            sx={{ p: 0.5, '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.1) } }} 
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!confirm(`Are you sure you want to delete Table ${table.number}?`)) return;
                              try {
                                await restaurantService.deleteTable(table.id); 
                                fetchTables();
                              } catch (e: any) {
                                console.error('Failed to delete table:', e);
                                alert('Failed to delete table. Please ensure it has no active orders.');
                              }
                            }}
                          >
                            <DeleteIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Box>
          </Paper>
      </>

      {/* ── Add Table Overlay ── */}
      {addOpen && (
        <Box sx={{ 
            position: 'absolute', inset: 0, zIndex: 1300, bgcolor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3,
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <Paper sx={{ p: 4, width: '100%', maxWidth: 450, borderRadius: '24px', border: '1px solid #e8e4d8', boxShadow: '0 20px 60px rgba(0,0,0,0.05)' }}>
                <Typography variant="h5" sx={{ fontWeight: 900, mb: 1 }}>Add New Table</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 4, fontWeight: 600 }}>Enter details for the new table location.</Typography>
                
                <Stack spacing={2.5} sx={{ mb: 4 }}>
                    <TextField label="Table Number / Name" value={addForm.number} onChange={e => setAddForm(f => ({ ...f, number: e.target.value }))} fullWidth required placeholder="e.g. 1, A1, VIP-1" slotProps={{ input: { sx: { borderRadius: '12px' } } }} />
                    <TextField label="Capacity" type="number" value={addForm.capacity} onChange={e => setAddForm(f => ({ ...f, capacity: e.target.value }))} fullWidth slotProps={{ input: { sx: { borderRadius: '12px' } } }} />
                    <TextField select label="Initial Status" value={addForm.status} onChange={e => setAddForm(f => ({ ...f, status: e.target.value }))} fullWidth slotProps={{ input: { sx: { borderRadius: '12px' } } }}>
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

                <Stack direction="row" spacing={2}>
                    <Button fullWidth onClick={() => setAddOpen(false)} sx={{ fontWeight: 800, color: 'text.secondary' }}>CANCEL</Button>
                    <Button variant="contained" fullWidth onClick={async () => {
                        setAddLoading(true);
                        try {
                             await restaurantService.createTable({ number: addForm.number, capacity: Number(addForm.capacity), status: addForm.status as any, pos_x: 10, pos_y: 10 });
                            setAddOpen(false);
                            setAddForm({ number: '', capacity: '4', status: 'VACANT' });
                            fetchTables();
                        } catch (e: any) { alert('Failed to add table'); }
                        finally { setAddLoading(false); }
                    }} disabled={!addForm.number || addLoading} sx={{ borderRadius: '12px', fontWeight: 900 }}>
                        ADD TABLE
                    </Button>
                </Stack>
            </Paper>
        </Box>
      )}

      {/* ── Edit Table Overlay ── */}
      {editTable && editOpen && (
        <Box sx={{ 
            position: 'absolute', inset: 0, zIndex: 1300, bgcolor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3,
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <Paper sx={{ p: 4, width: '100%', maxWidth: 450, borderRadius: '24px', border: '1px solid #e8e4d8', boxShadow: '0 20px 60px rgba(0,0,0,0.05)' }}>
                <Typography variant="h5" sx={{ fontWeight: 900, mb: 1 }}>Edit Table {editTable.number}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 4, fontWeight: 600 }}>Update table configuration.</Typography>
                
                <Stack spacing={2.5} sx={{ mb: 4 }}>
                    <TextField label="Capacity" type="number" value={editTable.capacity} onChange={e => setEditTable(t => t ? { ...t, capacity: Number(e.target.value) } : null)} fullWidth slotProps={{ input: { sx: { borderRadius: '12px' } } }} />
                    <TextField select label="Availability Status" value={editTable.status} onChange={e => setEditTable(t => t ? { ...t, status: e.target.value as any } : null)} fullWidth slotProps={{ input: { sx: { borderRadius: '12px' } } }}>
                        {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                            <MenuItem key={val} value={val}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: cfg.dot }} /> {cfg.label}
                                </Box>
                            </MenuItem>
                        ))}
                    </TextField>
                </Stack>

                <Stack direction="row" spacing={2}>
                    <Button fullWidth onClick={() => setEditOpen(false)} sx={{ fontWeight: 800, color: 'text.secondary' }}>CANCEL</Button>
                    <Button variant="contained" fullWidth onClick={async () => {
                        if (editTable) {
                            try {
                                await restaurantService.updateTable(editTable.id, { capacity: editTable.capacity, status: editTable.status });
                                setEditOpen(false); 
                                fetchTables();
                            } catch (e: any) { alert('Failed to update table'); }
                        }
                    }} sx={{ borderRadius: '12px', fontWeight: 900 }}>
                        SAVE CHANGES
                    </Button>
                </Stack>
            </Paper>
        </Box>
      )}

      <OrderDialog open={orderDialogOpen} onClose={() => setOrderDialogOpen(false)} table={orderTable} onOrderUpdated={fetchTables} />
    </Box>
  );
}
