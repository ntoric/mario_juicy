import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  MenuItem,
  Stack,
  CircularProgress
} from '@mui/material';
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
    e.preventDefault();
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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
          {initialData ? 'Edit Reservation' : 'New Reservation'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={3} sx={{ mt: 1 }} component="div">
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Customer Name"
                  name="customer_name"
                  value={formData.customer_name}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Customer Phone"
                  name="customer_phone"
                  value={formData.customer_phone}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  select
                  label="Table"
                  name="table"
                  value={formData.table}
                  onChange={handleChange}
                  required
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
                  fullWidth
                  label="Number of Guests"
                  name="number_of_guests"
                  type="number"
                  value={formData.number_of_guests}
                  onChange={handleChange}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Reservation Time"
                  name="reservation_time"
                  type="datetime-local"
                  value={formData.reservation_time}
                  onChange={handleChange}
                  slotProps={{ inputLabel: { shrink: true } }}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Notes"
                  name="notes"
                  multiline
                  rows={3}
                  value={formData.notes}
                  onChange={handleChange}
                />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={onClose} disabled={loading}>Cancel</Button>
          <Button 
            variant="contained" 
            type="submit" 
            disabled={loading}
            startIcon={loading && <CircularProgress size={20} color="inherit" />}
          >
            {initialData ? 'Update Reservation' : 'Create Reservation'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ReservationForm;
