"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Stack,
  Chip,
  Card,
  CardContent,
  CardActions,
  useTheme,
  useMediaQuery,
  Fab,
  Zoom,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Event as EventIcon,
} from '@mui/icons-material';
import { restaurantService, Reservation, Table as RestaurantTable } from '@/services/restaurantService';
import ReservationForm from '@/components/backoffice/restaurant/ReservationForm';

function formatDate(iso: string) {
  if (!iso) return '';
  try {
    const date = new Date(iso);
    return date.toLocaleString('en-IN', { 
      dateStyle: 'medium', 
      timeStyle: 'short' 
    });
  } catch (e) {
    return iso;
  }
}

const STATUS_COLORS: Record<string, 'primary' | 'success' | 'error'> = {
  CONFIRMED: 'primary',
  COMPLETED: 'success',
  CANCELLED: 'error',
};

export default function ReservationsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selected, setSelected] = useState<Reservation | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [res, tbls] = await Promise.all([
        restaurantService.getReservations(),
        restaurantService.getTables(),
      ]);
      setReservations(res);
      setTables(tbls);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const handleRefresh = () => fetchData();
    window.addEventListener('app-refresh', handleRefresh);
    return () => window.removeEventListener('app-refresh', handleRefresh);
  }, [fetchData]);

  const handleStatus = async (id: number, status: Reservation['status']) => {
    try {
      await restaurantService.updateReservation(id, { status });
      fetchData();
    } catch (e: any) { alert(e.message); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this reservation?')) return;
    try {
      await restaurantService.deleteReservation(id);
      fetchData();
    } catch (e: any) { alert(e.message); }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ 
        mb: 4, 
        display: 'flex', 
        justifyContent: "space-between", 
        alignItems: { xs: "flex-start", sm: "center" }, 
        flexWrap: "wrap", 
        gap: 2, 
        flexDirection: { xs: "column", sm: "row" } 
      }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 500, color: '#e9762b', fontSize: '1.5rem' }}>
            Reservations
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ display: { xs: 'none', sm: 'flex' }, width: { xs: '100%', sm: 'auto' }, flexWrap: 'wrap' }}>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />} 
            onClick={fetchData} 
            disabled={loading}
            sx={{ borderRadius: 2, height: 48 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => { setSelected(null); setIsFormOpen(true); }}
            sx={{ borderRadius: 2, height: 48, px: 3 }}
          >
            New Reservation
          </Button>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* ── Mobile Card view ── */}
      {isMobile ? (
        <Box>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
          ) : reservations.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <EventIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">No reservations yet</Typography>
            </Box>
          ) : (
            <Stack spacing={1.5}>
              {reservations.map(res => (
                <Card key={res.id} variant="outlined">
                  <CardContent sx={{ pb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{res.customer_name}</Typography>
                        <Typography variant="caption" color="text.secondary">{res.customer_phone}</Typography>
                      </Box>
                      <Chip label={res.status} size="small" color={STATUS_COLORS[res.status] || 'default'} />
                    </Box>
                    <Stack spacing={0.5}>
                      <Typography variant="body2"><strong>Table:</strong> {res.table_number}</Typography>
                      <Typography variant="body2"><strong>Guests:</strong> {res.number_of_guests}</Typography>
                      <Typography variant="body2"><strong>Time:</strong> {formatDate(res.reservation_time)}</Typography>
                      {res.notes && <Typography variant="caption" color="text.secondary">{res.notes}</Typography>}
                    </Stack>
                  </CardContent>
                  <CardActions sx={{ pt: 0, px: 2, pb: 1.5, gap: 0.5 }}>
                    {res.status === 'CONFIRMED' && (
                      <Button size="small" color="success" startIcon={<CheckIcon />} onClick={() => handleStatus(res.id, 'COMPLETED')}>
                        Complete
                      </Button>
                    )}
                    <Button size="small" color="primary" startIcon={<EditIcon />} onClick={() => { setSelected(res); setIsFormOpen(true); }}>
                      Edit
                    </Button>
                    <Button size="small" color="error" startIcon={<CancelIcon />} onClick={() => handleStatus(res.id, 'CANCELLED')}>
                      Cancel
                    </Button>
                    <IconButton size="small" onClick={() => handleDelete(res.id)} sx={{ ml: 'auto' }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </CardActions>
                </Card>
              ))}
            </Stack>
          )}
        </Box>
      ) : (
        /* ── Desktop Table view ── */
        <TableContainer component={Paper} sx={{ borderRadius: '5px' }}>
          <Table>
            <TableHead sx={{ bgcolor: 'rgba(15,23,42,0.04)' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Contact</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Table</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Guests</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Time</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></TableCell></TableRow>
              ) : reservations.length === 0 ? (
                <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', py: 8 }}>
                  <EventIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary">No reservations scheduled</Typography>
                </TableCell></TableRow>
              ) : reservations.map(res => (
                <TableRow key={res.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{res.customer_name}</Typography>
                    {res.notes && <Typography variant="caption" color="text.secondary">{res.notes}</Typography>}
                  </TableCell>
                  <TableCell>{res.customer_phone}</TableCell>
                  <TableCell>Table {res.table_number}</TableCell>
                  <TableCell>{res.number_of_guests}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(res.reservation_time)}</TableCell>
                  <TableCell>
                    <Chip label={res.status} size="small" color={STATUS_COLORS[res.status] || 'default'} />
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'center' }}>
                      {res.status === 'CONFIRMED' && (
                        <Tooltip title="Mark Complete">
                          <IconButton size="small" color="success" onClick={() => handleStatus(res.id, 'COMPLETED')}><CheckIcon fontSize="small" /></IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Edit">
                        <IconButton size="small" color="primary" onClick={() => { setSelected(res); setIsFormOpen(true); }}><EditIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="Cancel">
                        <IconButton size="small" color="error" onClick={() => handleStatus(res.id, 'CANCELLED')}><CancelIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => handleDelete(res.id)}><DeleteIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <ReservationForm
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        tables={tables}
        onReservationCreated={fetchData}
        initialData={selected}
      />

      {/* Floating Action Button for Mobile */}
      {isMobile && (
        <Zoom in={true} unmountOnExit>
          <Fab
            color="primary"
            aria-label="add-reservation"
            onClick={() => { setSelected(null); setIsFormOpen(true); }}
            sx={{
              position: 'fixed',
              bottom: { xs: 80, sm: 32 }, // Higher on mobile to avoid bottom nav
              right: { xs: 16, sm: 32 },
              display: { md: 'none' }, // Only show on mobile/tablet
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
