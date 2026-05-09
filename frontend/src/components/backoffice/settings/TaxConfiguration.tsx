"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Paper,
  Switch,
  FormControlLabel,
  MenuItem,
  CircularProgress,
  Divider,
  Alert,
  Snackbar,
} from "@mui/material";
import { fetcher } from "@/lib/api";
import { Save as SaveIcon } from "@mui/icons-material";
import { useAuth } from "@/hooks/useAuth";

const TAX_TYPES = [
  { value: "INCLUSIVE", label: "Inclusive" },
  { value: "EXCLUSIVE", label: "Exclusive" },
  { value: "EXEMPTED", label: "Exempted" },
];

export default function TaxConfiguration() {
  const { activeStoreId, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState<any>({
    name: "Default Tax Configuration",
    tax_type: "EXEMPTED",
    is_gst_enabled: false,
    cgst_rate: "0.00",
    sgst_rate: "0.00",
    igst_rate: "0.00",
    is_cess_enabled: false,
    cess_rate: "0.00",
  });

  useEffect(() => {
    if (activeStoreId) {
      fetchTaxConfig();
    }
  }, [activeStoreId]);

  const fetchTaxConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      // Backend expects store_id as a query parameter
      const data = await fetcher(`/core/tax-configuration/?store_id=${activeStoreId}`);
      setFormData({
        ...data,
        cgst_rate: data.cgst_rate ? data.cgst_rate.toString() : "0.00",
        sgst_rate: data.sgst_rate ? data.sgst_rate.toString() : "0.00",
        igst_rate: data.igst_rate ? data.igst_rate.toString() : "0.00",
        cess_rate: data.cess_rate ? data.cess_rate.toString() : "0.00",
      });
    } catch (err: any) {
      console.error("Failed to fetch tax config:", err);
      setError(err.message || "Failed to load tax configuration");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      // Convert rates back to numbers for the backend (float64)
      const payload = {
        ...formData,
        cgst_rate: parseFloat(formData.cgst_rate || "0"),
        sgst_rate: parseFloat(formData.sgst_rate || "0"),
        igst_rate: parseFloat(formData.igst_rate || "0"),
        cess_rate: parseFloat(formData.cess_rate || "0"),
        store_id: formData.store_id || activeStoreId
      };

      // Use the correct endpoint and method defined in the Go backend
      await fetcher("/core/tax-configuration/", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to save tax configuration");
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
        No active store selected. Please select a store to view tax configuration.
      </Alert>
    );
  }

  return (
    <Box sx={{ maxWidth: 800 }}>
      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '7px' }}>{error}</Alert>}
      
      <form onSubmit={handleSubmit}>
        <Paper elevation={0} sx={{ border: '1px solid #e8e4d8', p: 4, borderRadius: '7px', bgcolor: 'white' }}>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 800, fontSize: '1rem', color: '#e9762b', textTransform: 'uppercase' }}>
            Tax Policy
          </Typography>
          
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 12 }}>
              <TextField
                select
                fullWidth
                label="Tax Type"
                name="tax_type"
                value={formData.tax_type}
                onChange={handleInputChange}
                slotProps={{ select: { sx: { borderRadius: '7px' } }, input: { sx: { borderRadius: '7px' } } }}
              >
                {TAX_TYPES.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 2 }} />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>GST Configuration</Typography>
                  <Typography variant="body2" color="text.secondary">Configure CGST, SGST, and IGST components</Typography>
                </Box>
                <Switch
                  name="is_gst_enabled"
                  checked={formData.is_gst_enabled}
                  onChange={handleInputChange}
                  color="primary"
                />
              </Box>
            </Grid>

            {formData.is_gst_enabled && (
              <>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    label="CGST (%)"
                    name="cgst_rate"
                    value={formData.cgst_rate}
                    onChange={handleInputChange}
                    type="number"
                    slotProps={{ input: { sx: { borderRadius: '7px' } } }}
                  />
                </Grid>
                {formData.tax_type !== "EXEMPTED" && (
                  <>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        fullWidth
                        label="SGST (%)"
                        name="sgst_rate"
                        value={formData.sgst_rate}
                        onChange={handleInputChange}
                        type="number"
                        slotProps={{ input: { sx: { borderRadius: '7px' } } }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        fullWidth
                        label="IGST (%)"
                        name="igst_rate"
                        value={formData.igst_rate}
                        onChange={handleInputChange}
                        type="number"
                        slotProps={{ input: { sx: { borderRadius: '7px' } } }}
                      />
                    </Grid>
                  </>
                )}
              </>
            )}

            <Grid size={{ xs: 12 }}>
              <Divider sx={{ my: 2 }} />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>CESS Configuration</Typography>
                  <Typography variant="body2" color="text.secondary">Additional compensation cess</Typography>
                </Box>
                <Switch
                  name="is_cess_enabled"
                  checked={formData.is_cess_enabled}
                  onChange={handleInputChange}
                  color="primary"
                />
              </Box>
            </Grid>

            {formData.is_cess_enabled && (
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="CESS (%)"
                  name="cess_rate"
                  value={formData.cess_rate}
                  onChange={handleInputChange}
                  type="number"
                  slotProps={{ input: { sx: { borderRadius: '7px' } } }}
                />
              </Grid>
            )}
          </Grid>

          <Box sx={{ mt: 5, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="contained"
              disableElevation
              disabled={saving}
              sx={{
                px: 4,
                py: 1,
                borderRadius: '7px',
                fontWeight: 800,
              }}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </Box>
        </Paper>
      </form>

      <Snackbar
        open={success}
        autoHideDuration={4000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSuccess(false)} severity="success" sx={{ width: '100%', borderRadius: '5px', bgcolor: 'primary.main', color: 'white' }}>
          Tax configuration updated successfully
        </Alert>
      </Snackbar>
    </Box>
  );
}
