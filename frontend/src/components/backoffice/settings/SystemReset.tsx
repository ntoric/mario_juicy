"use client";

import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Checkbox, 
  FormControlLabel, 
  FormGroup, 
  Paper, 
  Divider, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogContentText, 
  DialogActions,
  TextField,
  Alert,
  CircularProgress
} from '@mui/material';
import { WarningAmber, DeleteForever, Refresh } from '@mui/icons-material';
import { fetcher } from '@/lib/api';

const RESET_OPTIONS = [
  { id: 'orders', label: 'Orders & Billing', description: 'Deletes all orders, order items, and invoices.' },
  { id: 'reservations', label: 'Reservations', description: 'Deletes all table reservations.' },
  { id: 'catalog', label: 'Menu Catalog', description: 'Deletes all items and categories.' },
  { id: 'tables', label: 'Table Layout', description: 'Deletes all tables from the floor map.' },
  { id: 'users', label: 'Users', description: 'Deletes all users except Super Admins.' },
  { id: 'settings', label: 'Global Settings', description: 'Resets tax configuration and other settings to defaults.' },
  { id: 'all', label: 'Full System Reset', description: 'Wipes everything. Start from scratch.' },
];

export default function SystemReset() {
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const handleToggle = (id: string) => {
    if (id === 'all') {
      if (selectedTargets.includes('all')) {
        setSelectedTargets([]);
      } else {
        setSelectedTargets(['all']);
      }
      return;
    }

    setSelectedTargets(prev => {
      if (prev.includes('all')) {
        return [id];
      }
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      }
      return [...prev, id];
    });
  };

  const handleReset = async () => {
    if (confirmationText !== 'RESET') return;

    setLoading(true);
    setResult(null);
    setOpenConfirm(false);

    try {
      for (const target of selectedTargets) {
        await fetcher('/core/system-reset/', {
          method: 'POST',
          body: JSON.stringify({ target }),
        });
      }
      setResult({ type: 'success', message: 'System reset completed successfully.' });
      setSelectedTargets([]);
      setConfirmationText('');
      
      // Optionally reload after a delay
      setTimeout(() => window.location.reload(), 2000);
    } catch (error: any) {
      setResult({ type: 'error', message: error.message || 'Failed to perform system reset.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Paper 
        elevation={0} 
        sx={{ 
          p: 4, 
          border: '1px solid #e8e4d8', 
          borderRadius: 4,
          bgcolor: '#FCF9EA'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <WarningAmber color="error" sx={{ fontSize: 32, mr: 2 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: 'error.main' }}>
              System Reset
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Destructive operations. Use with extreme caution.
            </Typography>
          </Box>
        </Box>

        {result && (
          <Alert severity={result.type} sx={{ mb: 3, borderRadius: 2 }}>
            {result.message}
          </Alert>
        )}

        <FormGroup sx={{ mb: 4 }}>
          {RESET_OPTIONS.map((option) => (
            <Box key={option.id} sx={{ mb: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={selectedTargets.includes(option.id)}
                    onChange={() => handleToggle(option.id)}
                    color="error"
                    disabled={loading}
                  />
                }
                label={
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                      {option.label}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {option.description}
                    </Typography>
                  </Box>
                }
                sx={{ alignItems: 'flex-start', mt: 0 }}
              />
            </Box>
          ))}
        </FormGroup>

        <Divider sx={{ mb: 3 }} />

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="error"
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <DeleteForever />}
            disabled={selectedTargets.length === 0 || loading}
            onClick={() => setOpenConfirm(true)}
            sx={{ 
              borderRadius: 2, 
              px: 4, 
              py: 1.5,
              fontWeight: 700,
              textTransform: 'none',
              boxShadow: 'none',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(211, 47, 47, 0.2)'
              }
            }}
          >
            {loading ? 'Processing...' : 'Reset Selected Data'}
          </Button>
        </Box>
      </Paper>

      {/* Confirmation Dialog */}
      <Dialog 
        open={openConfirm} 
        onClose={() => !loading && setOpenConfirm(false)}
        slotProps={{
          paper: {
            sx: { borderRadius: 4, p: 2, maxWidth: 450 }
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, textAlign: 'center', pt: 3 }}>
          Final Confirmation
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ textAlign: 'center', mb: 4 }}>
            You are about to permanently delete selected system data. 
            This action <strong>cannot be undone</strong>.
          </DialogContentText>
          
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 700, textAlign: 'center' }}>
            To proceed, please type <strong>RESET</strong> below:
          </Typography>
          
          <TextField
            fullWidth
            size="small"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value.toUpperCase())}
            placeholder="Type RESET here"
            variant="outlined"
            autoFocus
            sx={{ 
              '& .MuiOutlinedInput-root': { borderRadius: 2 },
              '& .MuiOutlinedInput-input': { textAlign: 'center', fontWeight: 800, letterSpacing: 2 }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, justifyContent: 'center' }}>
          <Button 
            onClick={() => setOpenConfirm(false)} 
            disabled={loading}
            sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleReset}
            variant="contained"
            color="error"
            disabled={confirmationText !== 'RESET' || loading}
            sx={{ 
              borderRadius: 2, 
              px: 4, 
              fontWeight: 700, 
              textTransform: 'none',
              boxShadow: 'none'
            }}
          >
            Confirm Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
