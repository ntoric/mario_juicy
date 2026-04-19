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
  const { activeStoreId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "Default Tax Configuration",
    tax_type: "EXCLUSIVE",
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
      const data = await fetcher("/core/tax-configuration/");
      setFormData({
        name: data.name,
        tax_type: data.tax_type,
        is_gst_enabled: data.is_gst_enabled,
        cgst_rate: data.cgst_rate.toString(),
        sgst_rate: data.sgst_rate.toString(),
        igst_rate: data.igst_rate.toString(),
        is_cess_enabled: data.is_cess_enabled,
        cess_rate: data.cess_rate.toString(),
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      // Use the plural endpoint for PATCH - backend handles singleton-per-store
      await fetcher("/core/tax-configuration/1/", {
        method: "PATCH",
        body: JSON.stringify(formData),
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
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
      
      <form onSubmit={handleSubmit}>
        <Paper elevation={0} sx={{ border: '1px solid #e8e4d8', p: 4, borderRadius: '5px', bgcolor: '#FCF9EA' }}>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, letterSpacing: '-0.02em' }}>
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
                variant="outlined"
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
                    variant="outlined"
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    label="SGST (%)"
                    name="sgst_rate"
                    value={formData.sgst_rate}
                    onChange={handleInputChange}
                    type="number"
                    variant="outlined"
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
                    variant="outlined"
                  />
                </Grid>
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
                  variant="outlined"
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
              startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                px: 4,
                py: 1.5,
                borderRadius: '5px',
                fontWeight: 600,
                '&:hover': {
                  bgcolor: 'primary.dark',
                }
              }}
            >
              {saving ? "Saving..." : "Save Configuration"}
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
