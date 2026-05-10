"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  CircularProgress,
  Alert,
  Snackbar,
  Stack,
  Button,
  Grid,
  Divider,
} from "@mui/material";
import { Save as SaveIcon, Business as BusinessIcon } from "@mui/icons-material";
import { useAuth } from "@/hooks/useAuth";
import { businessConfigService, BusinessConfig } from "@/services/businessConfigService";

export default function BusinessConfigForm() {
  const { activeStoreId, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState<Partial<BusinessConfig>>({
    shop_name: "",
    branch: "",
    location: "",
    mobile: "",
    gstin: "",
    fssai_lic_no: "",
  });

  useEffect(() => {
    if (activeStoreId) {
      fetchBusinessConfig();
    }
  }, [activeStoreId]);

  const fetchBusinessConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await businessConfigService.getBusinessConfig();
      setFormData({
        shop_name: data.shop_name || "",
        branch: data.branch || "",
        location: data.location || "",
        mobile: data.mobile || "",
        gstin: data.gstin || "",
        fssai_lic_no: data.fssai_lic_no || "",
      });
    } catch (err: any) {
      console.error("Failed to load business config:", err);
      setError(err.message || "Failed to load business config");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await businessConfigService.updateBusinessConfig(formData);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to update business config");
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
      <Alert severity="warning" sx={{ borderRadius: '7px' }}>
        No active store selected. Please select a store to view configuration.
      </Alert>
    );
  }

  return (
    <Box sx={{ maxWidth: 800 }}>
      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '7px' }}>{error}</Alert>}
      
      <Paper elevation={0} sx={{ border: '1px solid #e8e4d8', p: 4, borderRadius: '7px', bgcolor: 'white' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <BusinessIcon sx={{ color: '#e9762b' }} />
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1rem', color: '#e9762b', textTransform: 'uppercase' }}>
              Invoice Details (Overrides)
            </Typography>
          </Box>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            sx={{ borderRadius: '8px', fontWeight: 800, px: 3 }}
          >
            {saving ? "SAVING..." : "SAVE CONFIG"}
          </Button>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          These fields will override the default store details on the printed and digital invoices. 
          Leave them blank to use the store configuration set by the Super Admin.
        </Typography>
        
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Shop Name"
              fullWidth
              value={formData.shop_name}
              onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
              placeholder="e.g. Mario Kitchen Express"
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Branch"
              fullWidth
              value={formData.branch}
              onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
              placeholder="e.g. Indiranagar Branch"
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="Location (Optional)"
              fullWidth
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g. Near Metro Station"
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Business Mobile"
              fullWidth
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              placeholder="e.g. +91 98765 43210"
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="GSTIN"
              fullWidth
              value={formData.gstin}
              onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
              placeholder="e.g. 29AAAAA0000A1Z5"
              helperText="Indian GSTIN should be 15 characters"
              slotProps={{ 
                inputLabel: { shrink: true },
                input: { sx: { borderRadius: '8px' } },
                htmlInput: { maxLength: 25 }
              }}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              label="FSSAI Lic. No."
              fullWidth
              value={formData.fssai_lic_no}
              onChange={(e) => setFormData({ ...formData, fssai_lic_no: e.target.value })}
              placeholder="e.g. 12345678901234"
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </Grid>
        </Grid>
      </Paper>

      <Snackbar
        open={success}
        autoHideDuration={4000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSuccess(false)} severity="success" sx={{ width: '100%', borderRadius: '5px', bgcolor: 'primary.main', color: 'white' }}>
          Business configuration saved successfully
        </Alert>
      </Snackbar>
    </Box>
  );
}
