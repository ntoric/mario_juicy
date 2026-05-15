import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  TextField,
  MenuItem,
  Stack,
  CircularProgress,
  IconButton,
  Paper,
  Divider,
} from '@mui/material';
import { ChevronLeft as ChevronLeftIcon, Save as SaveIcon } from '@mui/icons-material';
import { restaurantService, Reservation, Table } from '@/services/restaurantService';

interface ReservationFormProps {
  open: boolean;
  onClose: () => void;
  tables: Table[];
  onReservationCreated: () => void;
  initialData?: Reservation | null;
}

const ReservationForm: React.FC<ReservationFormProps> = ({ 
  open, 
  onClose, 
  tables, 
  onReservationCreated,
  initialData 
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: initialData?.customer_name || '',
    customer_phone: initialData?.customer_phone || '',
    table: initialData?.table || '',
    reservation_time: initialData?.reservation_time?.slice(0, 16) || '', // Format for datetime-local
    number_of_guests: initialData?.number_of_guests || 2,
    notes: initialData?.notes || ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      if (initialData) {
        await restaurantService.updateReservation(initialData.id, formData as any);
      } else {
        await restaurantService.createReservation(formData as any);
      }
      onReservationCreated();
      onClose();
    } catch (error) {
      console.error('Failed to save reservation:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <Box sx={{ 
      flexGrow: 1, bgcolor: '#fdfdfd', display: 'flex', flexDirection: 'column',
      minHeight: '100%',
      animation: 'slideInRight 0.2s ease-out',
      '@keyframes slideInRight': { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } }
    }}>
      <Box sx={{ p: 2, borderBottom: '1px solid #e8e4d8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={onClose} sx={{ color: 'text.secondary' }}>
            <ChevronLeftIcon />
          </IconButton>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            {initialData ? 'Edit Reservation' : 'New Reservation'}
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          onClick={handleSubmit}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          disabled={loading}
          sx={{ borderRadius: '0.65rem', fontWeight: 800, px: 3 }}
        >
          {initialData ? 'UPDATE' : 'CREATE'}
        </Button>
      </Box>

      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: { xs: 2, md: 4 }, bgcolor: '#f9f9f9' }}>
        <Grid container spacing={4} sx={{ justifyContent: 'center' }}>
          <Grid size={{ xs: 12, md: 8, lg: 6 }}>
            <Paper sx={{ p: 4, borderRadius: '0.65rem', border: '1px solid #e8e4d8', boxShadow: '0 8px 32px rgba(0,0,0,0.03)' }}>
              <Stack spacing={4}>
                <Box>
                  <Typography variant="overline" sx={{ fontWeight: 900, color: 'primary.main', mb: 2, display: 'block' }}>GUEST INFORMATION</Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth label="Customer Name" name="customer_name"
                        value={formData.customer_name} onChange={handleChange} required
                        slotProps={{ input: { sx: { borderRadius: '0.65rem', bgcolor: 'white' } } }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth label="Customer Phone" name="customer_phone"
                        value={formData.customer_phone} onChange={handleChange} required
                        slotProps={{ input: { sx: { borderRadius: '0.65rem', bgcolor: 'white' } } }}
                      />
                    </Grid>
                  </Grid>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="overline" sx={{ fontWeight: 900, color: 'primary.main', mb: 2, display: 'block' }}>RESERVATION DETAILS</Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth select label="Table" name="table"
                        value={formData.table} onChange={handleChange} required
                        slotProps={{ input: { sx: { borderRadius: '0.65rem', bgcolor: 'white' } } }}
                      >
                        {tables.map((table) => (
                          <MenuItem key={table.id} value={table.id}>
                            Table {table.number} (Cap: {table.capacity})
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth label="Number of Guests" name="number_of_guests" type="number"
                        value={formData.number_of_guests} onChange={handleChange} required
                        slotProps={{ input: { sx: { borderRadius: '0.65rem', bgcolor: 'white' } } }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth label="Reservation Time" name="reservation_time" type="datetime-local"
                        value={formData.reservation_time} onChange={handleChange} required
                        slotProps={{ 
                          inputLabel: { shrink: true },
                          input: { sx: { borderRadius: '0.65rem', bgcolor: 'white' } } 
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth label="Special Notes" name="notes" multiline rows={3}
                        value={formData.notes} onChange={handleChange}
                        slotProps={{ input: { sx: { borderRadius: '0.65rem', bgcolor: 'white' } } }}
                      />
                    </Grid>
                  </Grid>
                </Box>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};


export default ReservationForm;
