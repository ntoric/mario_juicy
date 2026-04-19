"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Switch,
  CircularProgress,
  Alert,
  Snackbar,
  Stack,
  Divider,
  Button,
} from "@mui/material";
import { useAuth } from "@/hooks/useAuth";
import { storeService } from "@/services/storeService";

export default function RestaurantSettings() {
  const { activeStoreId, refreshActiveStore } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [isKitchenStepEnabled, setIsKitchenStepEnabled] = useState(true);
  const [isTakeAwayEnabled, setIsTakeAwayEnabled] = useState(true);
  const [isReservationsEnabled, setIsReservationsEnabled] = useState(true);
  const [thermalPrinterSize, setThermalPrinterSize] = useState<'2_INCH' | '3_INCH'>('3_INCH');

  useEffect(() => {
    if (activeStoreId) {
      fetchStoreSettings();
    }
  }, [activeStoreId]);

  const fetchStoreSettings = async () => {
    try {
      setLoading(true);
      const data = await storeService.getStore(activeStoreId!);
      setIsKitchenStepEnabled(data.is_kitchen_step_enabled);
      setIsTakeAwayEnabled(data.is_take_away_enabled);
      setIsReservationsEnabled(data.is_reservations_enabled);
      setThermalPrinterSize(data.thermal_printer_size || '3_INCH');
    } catch (err: any) {
      setError(err.message || "Failed to load store settings");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleKitchenStep = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked;
    setSaving(true);
    setError(null);
    try {
      await storeService.updateStore(activeStoreId!, {
        is_kitchen_step_enabled: newValue
      });
      setIsKitchenStepEnabled(newValue);
      await refreshActiveStore();
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to update setting");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTakeAway = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked;
    setSaving(true);
    setError(null);
    try {
      await storeService.updateStore(activeStoreId!, {
        is_take_away_enabled: newValue
      });
      setIsTakeAwayEnabled(newValue);
      await refreshActiveStore();
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to update setting");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleReservations = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked;
    setSaving(true);
    setError(null);
    try {
      await storeService.updateStore(activeStoreId!, {
        is_reservations_enabled: newValue
      });
      setIsReservationsEnabled(newValue);
      await refreshActiveStore();
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to update setting");
    } finally {
      setSaving(false);
    }
  };
  
  const handleUpdatePrinterSize = async (newSize: '2_INCH' | '3_INCH') => {
    setSaving(true);
    setError(null);
    try {
      await storeService.updateStore(activeStoreId!, {
        thermal_printer_size: newSize
      });
      setThermalPrinterSize(newSize);
      await refreshActiveStore();
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to update setting");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress color="inherit" />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800 }}>
      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 0 }}>{error}</Alert>}
      
      <Paper elevation={0} sx={{ border: '1px solid #e8e4d8', p: 4, borderRadius: '5px', bgcolor: '#FCF9EA' }}>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, letterSpacing: '-0.02em' }}>
          Ordering Workflow
        </Typography>
        
        <Stack spacing={3}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Enable Kitchen Step</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 500 }}>
                When enabled, orders follow the standard flow: Order Taken → Awaiting → Preparing → Ready → Served.
                When disabled, orders skip the kitchen display and advance to "Preparing" immediately after KOT creation.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {saving && <CircularProgress size={20} />}
              <Switch
                checked={isKitchenStepEnabled}
                onChange={handleToggleKitchenStep}
                disabled={saving}
                color="primary"
              />
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Enable Parcel Orders</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 500 }}>
                When enabled, the "Parcel" (Take Away) option is available in the ordering system and sidebar.
                Disabling this will hide the feature across the app for all users.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {saving && <CircularProgress size={20} />}
              <Switch
                checked={isTakeAwayEnabled}
                onChange={handleToggleTakeAway}
                disabled={saving}
                color="primary"
              />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Enable Reservations</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 500 }}>
                When enabled, the "Reservations" management system is available in the sidebar and other areas.
                Disabling this will hide the feature across the app for all users.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {saving && <CircularProgress size={20} />}
              <Switch
                checked={isReservationsEnabled}
                onChange={handleToggleReservations}
                disabled={saving}
                color="primary"
              />
            </Box>
          </Box>

          <Divider />

          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, letterSpacing: '-0.02em' }}>
              Printer Settings
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Thermal Printer Size</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 500 }}>
                  Select the width of your thermal printer. This will affect how invoices are formatted for printing.
                  2-inch (58mm) is common for handheld printers, while 3-inch (80mm) is standard for desktop receipt printers.
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {saving && <CircularProgress size={20} />}
                <Stack direction="row" spacing={1} sx={{ bgcolor: '#eee8d5', p: 0.5, borderRadius: '8px' }}>
                  <Button
                    size="small"
                    variant={thermalPrinterSize === '2_INCH' ? 'contained' : 'text'}
                    onClick={() => handleUpdatePrinterSize('2_INCH')}
                    disabled={saving}
                    sx={{ 
                      borderRadius: '6px', 
                      fontWeight: 700,
                      px: 2,
                      bgcolor: thermalPrinterSize === '2_INCH' ? 'primary.main' : 'transparent',
                      color: thermalPrinterSize === '2_INCH' ? 'white' : 'text.primary',
                      '&:hover': { bgcolor: thermalPrinterSize === '2_INCH' ? 'primary.dark' : 'rgba(0,0,0,0.05)' }
                    }}
                  >
                    2 INCH
                  </Button>
                  <Button
                    size="small"
                    variant={thermalPrinterSize === '3_INCH' ? 'contained' : 'text'}
                    onClick={() => handleUpdatePrinterSize('3_INCH')}
                    disabled={saving}
                    sx={{ 
                      borderRadius: '6px', 
                      fontWeight: 700,
                      px: 2,
                      bgcolor: thermalPrinterSize === '3_INCH' ? 'primary.main' : 'transparent',
                      color: thermalPrinterSize === '3_INCH' ? 'white' : 'text.primary',
                      '&:hover': { bgcolor: thermalPrinterSize === '3_INCH' ? 'primary.dark' : 'rgba(0,0,0,0.05)' }
                    }}
                  >
                    3 INCH
                  </Button>
                </Stack>
              </Box>
            </Box>
          </Box>

          <Divider />
          
          <Alert severity="info" variant="outlined" sx={{ borderRadius: '5px' }}>
            Changes to the ordering workflow will affect all users in this store. You may need to refresh the page to see changes in the sidebar navigation.
          </Alert>
        </Stack>
      </Paper>

      <Snackbar
        open={success}
        autoHideDuration={4000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSuccess(false)} severity="success" sx={{ width: '100%', borderRadius: '5px', bgcolor: 'primary.main', color: 'white' }}>
          Settings updated successfully
        </Alert>
      </Snackbar>
    </Box>
  );
}
