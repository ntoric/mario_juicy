"use client";
import { useTheme, alpha } from "@mui/material/styles";

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
import { SaveOutlined as SaveIcon } from "@mui/icons-material";
import { useAuth } from "@/hooks/useAuth";
import { storeService } from "@/services/storeService";

export default function RestaurantSettings() {
  const theme = useTheme();

  const { activeStoreId, refreshActiveStore, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Settings state
  const [settings, setSettings] = useState({
    is_kitchen_step_enabled: true,
    is_take_away_enabled: true,
    is_reservations_enabled: true,
    thermal_printer_size: '3_INCH' as '2_INCH' | '3_INCH',
    thermal_printer_type: 'USB' as string,
    thermal_printer_name: null as string | null,
    thermal_printer_address: null as string | null,
    thermal_printer_vendor_id: null as string | null,
    thermal_printer_product_id: null as string | null,
  });

  const [printers, setPrinters] = useState<any[]>([]);

  useEffect(() => {
    if (activeStoreId) {
      fetchStoreSettings();
      detectPrinters();
    }
  }, [activeStoreId]);

  const [serviceStatus, setServiceStatus] = useState<'online' | 'offline' | 'checking'>('checking');

  const detectPrinters = async () => {
    let allPrinters: any[] = [];
    let serviceOnline = false;

    // 1. Try Go printer service
    try {
      const response = await fetch('http://localhost:8085/printers', { signal: AbortSignal.timeout(2000) });
      if (response.ok) {
        const detected = await response.json();
        if (Array.isArray(detected)) {
          allPrinters = [...detected];
          serviceOnline = true;
        }
      }
    } catch (err) {
      console.warn("Go printer service not reachable:", err);
    }
    setServiceStatus(serviceOnline ? 'online' : 'offline');

    // 2. Try Electron system printers (as fallback or addition)
    try {
      if (typeof window !== 'undefined' && (window as any).api) {
        const systemPrinters = await (window as any).api.getPrinters();
        
        // Use a map to track names and avoid duplicates, giving priority to Go service details
        const printerMap = new Map();
        allPrinters.forEach(p => printerMap.set(p.name, p));
        
        systemPrinters.forEach((p: any) => {
          if (!printerMap.has(p.name)) {
            printerMap.set(p.name, {
              name: p.name,
              type: 'System'
            });
          }
        });
        
        allPrinters = Array.from(printerMap.values());
      }
    } catch (err) {
      console.error("Failed to detect system printers:", err);
    }

    setPrinters(allPrinters);
  };

  const fetchStoreSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await storeService.getStore(activeStoreId!);
      setSettings({
        is_kitchen_step_enabled: data.is_kitchen_step_enabled,
        is_take_away_enabled: data.is_take_away_enabled,
        is_reservations_enabled: data.is_reservations_enabled,
        thermal_printer_size: data.thermal_printer_size || '3_INCH',
        thermal_printer_type: data.thermal_printer_type || 'USB',
        thermal_printer_name: data.thermal_printer_name || null,
        thermal_printer_address: data.thermal_printer_address || null,
        thermal_printer_vendor_id: data.thermal_printer_vendor_id || null,
        thermal_printer_product_id: data.thermal_printer_product_id || null,
      });
    } catch (err: any) {
      console.error("Failed to load store settings:", err);
      setError(err.message || "Failed to load store settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...settings,
        thermal_printer_name: settings.thermal_printer_name || undefined,
        thermal_printer_address: settings.thermal_printer_address || undefined,
        thermal_printer_vendor_id: settings.thermal_printer_vendor_id || undefined,
        thermal_printer_product_id: settings.thermal_printer_product_id || undefined,
      };
      await storeService.updateStore(activeStoreId!, payload);
      await refreshActiveStore();
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || (activeStoreId && loading)) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (!activeStoreId && !authLoading) {
    return (
      <Alert severity="warning" sx={{ borderRadius: '0.65rem' }}>
        No active store selected. Please select a store to view configuration.
      </Alert>
    );
  }

  return (
    <Box sx={{ maxWidth: 800 }}>
      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '0.65rem' }}>{error}</Alert>}
      
      <Paper elevation={0} sx={{ border: '1px solid #e8e4d8', p: 4, borderRadius: '0.65rem', bgcolor: 'white' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1rem', color: theme.palette.primary.main, textTransform: 'uppercase' }}>
            Store Configuration
          </Typography>
          <Button
            variant="contained"
            onClick={handleSaveSettings}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            sx={{ borderRadius: '0.65rem', fontWeight: 800, px: 3, height: 48 }}
          >
            {saving ? "SAVING..." : "SAVE SETTINGS"}
          </Button>
        </Box>
        
        <Stack spacing={3}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Enable Kitchen Step</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 500 }}>
                When enabled, orders follow the standard flow: Order Taken → Awaiting → Preparing → Ready → Served.
              </Typography>
            </Box>
            <Switch
              checked={settings.is_kitchen_step_enabled}
              onChange={(e) => setSettings({ ...settings, is_kitchen_step_enabled: e.target.checked })}
              color="primary"
            />
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Enable Parcel Orders</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 500 }}>
                When enabled, the "Parcel" (Take Away) option is available in the ordering system.
              </Typography>
            </Box>
            <Switch
              checked={settings.is_take_away_enabled}
              onChange={(e) => setSettings({ ...settings, is_take_away_enabled: e.target.checked })}
              color="primary"
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Enable Reservations</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 500 }}>
                When enabled, the "Reservations" management system is available in the sidebar.
              </Typography>
            </Box>
            <Switch
              checked={settings.is_reservations_enabled}
              onChange={(e) => setSettings({ ...settings, is_reservations_enabled: e.target.checked })}
              color="primary"
            />
          </Box>

          <Divider />

          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 800, fontSize: '1rem', color: theme.palette.primary.main, textTransform: 'uppercase' }}>
              Printer Settings
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Thermal Printer Size</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 500 }}>
                  2-inch (58mm) for handheld/compact, 3-inch (80mm) for standard desktop printers.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} sx={{ bgcolor: alpha('#000', 0.05), p: 0.5, borderRadius: '0.65rem' }}>
                <Button
                  size="small"
                  variant={settings.thermal_printer_size === '2_INCH' ? 'contained' : 'text'}
                  onClick={() => setSettings({ ...settings, thermal_printer_size: '2_INCH' })}
                  sx={{ 
                    borderRadius: '0.65rem', fontWeight: 800, px: 2,
                    bgcolor: settings.thermal_printer_size === '2_INCH' ? 'primary.main' : 'transparent',
                    color: settings.thermal_printer_size === '2_INCH' ? 'white' : 'text.primary',
                  }}
                >
                  2 INCH
                </Button>
                <Button
                  size="small"
                  variant={settings.thermal_printer_size === '3_INCH' ? 'contained' : 'text'}
                  onClick={() => setSettings({ ...settings, thermal_printer_size: '3_INCH' })}
                  sx={{ 
                    borderRadius: '0.65rem', fontWeight: 800, px: 2,
                    bgcolor: settings.thermal_printer_size === '3_INCH' ? 'primary.main' : 'transparent',
                    color: settings.thermal_printer_size === '3_INCH' ? 'white' : 'text.primary',
                  }}
                >
                  3 INCH
                </Button>
              </Stack>
            </Box>

            <Box sx={{ mt: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Select Printer</Typography>
                    <Box 
                      sx={{ 
                        px: 1, py: 0.25, borderRadius: '0.65rem', fontSize: '0.65rem', fontWeight: 800,
                        bgcolor: serviceStatus === 'online' ? alpha('#4caf50', 0.1) : alpha('#f44336', 0.1),
                        color: serviceStatus === 'online' ? '#4caf50' : '#f44336',
                        border: '1px solid',
                        borderColor: serviceStatus === 'online' ? alpha('#4caf50', 0.2) : alpha('#f44336', 0.2),
                        textTransform: 'uppercase',
                        display: 'flex', alignItems: 'center', gap: 0.5
                      }}
                    >
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: serviceStatus === 'online' ? '#4caf50' : '#f44336' }} />
                      {serviceStatus === 'online' ? 'Service Online' : 'Service Offline'}
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Currently selected: <b>{settings.thermal_printer_name || "None"}</b> ({settings.thermal_printer_type})
                  </Typography>
                </Box>
                <Button size="small" variant="outlined" onClick={detectPrinters} sx={{ borderRadius: '0.65rem', fontWeight: 700 }}>
                  Refresh List
                </Button>
              </Box>

              {printers.length > 0 ? (
                <Stack spacing={1}>
                  {printers.map((printer, index) => (
                    <Paper
                      key={`${printer.name}-${printer.vendor_id || ''}-${printer.address || ''}-${index}`}
                      elevation={0}
                      onClick={() => setSettings({ 
                        ...settings, 
                        thermal_printer_name: printer.name,
                        thermal_printer_type: printer.type,
                        thermal_printer_address: printer.address || null,
                        thermal_printer_vendor_id: printer.vendor_id || null,
                        thermal_printer_product_id: printer.product_id || null
                      })}
                      sx={{
                        p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        border: '1px solid',
                        borderColor: settings.thermal_printer_name === printer.name ? 'primary.main' : '#e8e4d8',
                        borderRadius: '0.65rem', cursor: 'pointer',
                        bgcolor: settings.thermal_printer_name === printer.name ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
                        '&:hover': { borderColor: 'primary.main' }
                      }}
                    >
                      <Box>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>{printer.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {printer.type} {printer.vendor_id ? `(VID:${printer.vendor_id} PID:${printer.product_id})` : ''} {printer.address ? `(${printer.address})` : ''}
                        </Typography>
                      </Box>
                      {settings.thermal_printer_name === printer.name && (
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'primary.main' }} />
                      )}
                    </Paper>
                  ))}
                </Stack>
              ) : (
                <Alert severity="warning" sx={{ borderRadius: '0.65rem' }}>
                  No printers detected.
                </Alert>
              )}
            </Box>
          </Box>
        </Stack>
      </Paper>

      <Snackbar
        open={success}
        autoHideDuration={4000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSuccess(false)} severity="success" sx={{ width: '100%', borderRadius: '0.65rem', bgcolor: 'primary.main', color: 'white' }}>
          Settings saved successfully
        </Alert>
      </Snackbar>
    </Box>
  );
}
