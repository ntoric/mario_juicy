"use client";
import { useTheme, alpha } from "@mui/material/styles";

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  IconButton,
  Chip,
  Avatar,
  Stack,
  Alert,
  CircularProgress,
  Tooltip,
  Paper,
  Grid,
  Divider,
  Switch,
} from "@mui/material";

import {
  AddOutlined as AddIcon,
  EditOutlined as EditIcon,
  DeleteOutlined as DeleteIcon,
  StoreOutlined as StoreIcon,
  LocationOnOutlined as LocationIcon,
  PhoneOutlined as PhoneIcon,
  RefreshOutlined as RefreshIcon,
  SaveOutlined as SaveIcon,
  ChevronLeftOutlined as ChevronLeftIcon,
  HistoryOutlined as HistoryIcon,
  PaymentsOutlined as PaymentsIcon,
} from "@mui/icons-material";
import { storeService, Store, StoreFormData } from "@/services/storeService";
import { useAuth } from "@/hooks/useAuth";
import { useConfirm } from "@/context/ConfirmContext";
import { useToast } from "@/context/ToastContext";
import PageHeader from "@/components/backoffice/PageHeader";

export default function StoreManager() {
  const theme = useTheme();

  const { user } = useAuth();
  const { confirm } = useConfirm();
  const { showError, showSuccess } = useToast();
  const isSuperAdmin = user?.primary_role === 'SUPER_ADMIN';
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View states
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [formData, setFormData] = useState<StoreFormData>({
    name: "", address: "", phone: "", email: "", gst_number: "",
    location: "", branch: "", fssai_lic_no: "", mobile: "", invoice_prefix: "", is_active: true,
  });


  const loadStores = useCallback(async () => {
    try {
      setLoading(true);
      const data = await storeService.getStores();
      setStores(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  const handleOpenCreate = () => {
    setEditingStore(null);
    setFormData({
      name: "", address: "", phone: "", email: "", gst_number: "",
      location: "", branch: "", fssai_lic_no: "", mobile: "", invoice_prefix: "", is_active: true,
    });
    setView('create');
  };

  const handleOpenEdit = (store: Store) => {
    setEditingStore(store);
    setFormData({
      name: store.name, address: store.address, phone: store.phone || "",
      email: store.email || "", gst_number: store.gst_number || "",
      location: store.location || "", branch: store.branch || "", fssai_lic_no: store.fssai_lic_no || "",
      mobile: store.mobile || "", invoice_prefix: store.invoice_prefix, is_active: store.is_active,
    });
    setView('edit');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingStore) {
        await storeService.updateStore(editingStore.id, formData);
      } else {
        await storeService.createStore(formData);
      }
      setView('list');
      loadStores();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (await confirm({
      title: 'Delete Store',
      message: "Are you sure you want to delete this store? This action cannot be undone.",
      severity: 'error',
      confirmLabel: 'DELETE'
    })) {
      try {
        await storeService.deleteStore(id);
        showSuccess('Store deleted successfully');
        loadStores();
      } catch (err: any) {
        showError(err.message);
      }
    }
  };

  if (view === 'create' || view === 'edit') {
    return (
      <Box sx={{ 
        flexGrow: 1, bgcolor: '#fdfdfd', display: 'flex', flexDirection: 'column',
        minHeight: '100%',
        animation: 'slideInRight 0.2s ease-out',
        '@keyframes slideInRight': { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } }
      }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #e8e4d8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => setView('list')} sx={{ color: 'text.secondary' }}>
              <ChevronLeftIcon />
            </IconButton>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              {view === 'create' ? "Register New Store" : `Edit: ${editingStore?.name}`}
            </Typography>
          </Box>
          <Button 
            variant="contained" 
            onClick={handleSubmit}
            startIcon={<SaveIcon />}
            sx={{ borderRadius: '0.65rem', fontWeight: 800, px: 3 }}
          >
            SAVE STORE
          </Button>
        </Box>

        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: { xs: 2, md: 4 }, bgcolor: 'transparent' }}>
          <Grid container spacing={4} sx={{ justifyContent: 'center' }}>
            <Grid size={{ xs: 12, md: 8, lg: 6 }}>
              <Paper sx={{ p: 4, borderRadius: '0.65rem', border: '1px solid #e8e4d8', boxShadow: '0 8px 32px rgba(0,0,0,0.03)' }}>
                <Stack spacing={4}>
                  <Box>
                    <Typography variant="overline" sx={{ fontWeight: 900, color: 'primary.main', mb: 2, display: 'block' }}>STORE IDENTITY</Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          label="Store Name" fullWidth required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          slotProps={{ input: { sx: { borderRadius: '0.65rem', bgcolor: 'white' } } }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          label="Address" fullWidth required multiline rows={2}
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          slotProps={{ input: { sx: { borderRadius: '0.65rem', bgcolor: 'white' } } }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          label="Branch Name" fullWidth
                          value={formData.branch}
                          onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                          slotProps={{ input: { sx: { borderRadius: '0.65rem', bgcolor: 'white' } } }}
                        />
                      </Grid>
                    </Grid>
                  </Box>

                  <Divider />

                  <Box>
                    <Typography variant="overline" sx={{ fontWeight: 900, color: 'primary.main', mb: 2, display: 'block' }}>CONTACT & COMPLIANCE</Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          label="Mobile / Phone" fullWidth required
                          value={formData.mobile}
                          onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                          slotProps={{ input: { sx: { borderRadius: '0.65rem', bgcolor: 'white' } } }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          label="Invoice Prefix" fullWidth required
                          value={formData.invoice_prefix}
                          onChange={(e) => setFormData({ ...formData, invoice_prefix: e.target.value.toUpperCase() })}
                          slotProps={{ input: { sx: { borderRadius: '0.65rem', bgcolor: 'white' } } }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          label="GST Number" fullWidth
                          value={formData.gst_number}
                          onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                          slotProps={{ input: { sx: { borderRadius: '0.65rem', bgcolor: 'white' } } }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          label="FSSAI Lic No." fullWidth
                          value={formData.fssai_lic_no}
                          onChange={(e) => setFormData({ ...formData, fssai_lic_no: e.target.value })}
                          slotProps={{ input: { sx: { borderRadius: '0.65rem', bgcolor: 'white' } } }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          label="Email Address" type="email" fullWidth
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          slotProps={{ input: { sx: { borderRadius: '0.65rem', bgcolor: 'white' } } }}
                        />
                      </Grid>
                    </Grid>
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 3, bgcolor: "#FCF9EA", borderRadius: '0.65rem', border: "1px solid #e8e4d8" }}>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>Operating Status</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                        When active, this store can accept orders and manage inventory.
                      </Typography>
                    </Box>
                    <Switch
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      color="primary"
                    />
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "flex-end", pt: 2 }}>
                    <Button
                      variant="contained"
                      onClick={handleSubmit}
                      startIcon={<SaveIcon />}
                      sx={{ borderRadius: '0.65rem', fontWeight: 800, px: 4, py: 1.5 }}
                    >
                      SAVE STORE
                    </Button>
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Box>
    );
  }

  if (loading && stores.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 10, gap: 2 }}>
        <CircularProgress size={40} thickness={4} />
        <Typography color="text.secondary" variant="body2" sx={{ fontWeight: 700 }}>Fetching stores...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader>
        <Typography variant="h4" sx={{ fontWeight: 600, color: theme.palette.primary.main, fontSize: '2rem' }}>
          Stores
        </Typography>
        <Stack direction="row" spacing={1.5}>
          <Tooltip title="Refresh Stores">
            <IconButton onClick={loadStores} sx={{ bgcolor: 'white', border: '1px solid #e8e4d8', borderRadius: '0.65rem', width: 48, height: 48 }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          {isSuperAdmin && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreate}
              sx={{ borderRadius: '0.65rem', height: 48, px: 3, fontWeight: 800 }}
            >
              ADD STORE
            </Button>
          )}
        </Stack>
      </PageHeader>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: '0.65rem' }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 3 }}>
        {stores.map((store) => (
          <Card
            key={store.id}
            elevation={0}
            sx={{
              borderRadius: '0.65rem',
              border: "1px solid #e8e4d8",
              bgcolor: 'white',
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: `0 12px 32px ${alpha(theme.palette.primary.main, 0.08)}`,
                borderColor: theme.palette.primary.main
              },
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Avatar
                    sx={{
                      width: 52, height: 52,
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main,
                      borderRadius: '0.65rem',
                    }}
                  >
                    <StoreIcon fontSize="medium" />
                  </Avatar>
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 900, color: 'text.primary', fontSize: '1.1rem' }}>
                      {store.name}
                    </Typography>
                    <Chip
                      label={store.is_active ? "ACTIVE" : "INACTIVE"}
                      size="small"
                      sx={{
                        height: 20, fontSize: "0.65rem", fontWeight: 900,
                        bgcolor: store.is_active ? alpha('#2e7d32', 0.1) : alpha('#757575', 0.1),
                        color: store.is_active ? '#2e7d32' : '#757575',
                        borderRadius: '0.65rem'
                      }}
                    />
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <IconButton onClick={() => handleOpenEdit(store)} size="small" sx={{ bgcolor: '#f5f5f5', borderRadius: '0.65rem' }}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  {isSuperAdmin && (
                    <IconButton onClick={() => handleDelete(store.id)} size="small" sx={{ color: "error.main", bgcolor: alpha('#d32f2f', 0.05), borderRadius: '0.65rem' }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              </Box>

              <Stack spacing={2} sx={{ mb: 3 }}>
                <Box sx={{ display: "flex", gap: 1.5, alignItems: 'flex-start' }}>
                  <LocationIcon sx={{ fontSize: 18, color: "text.disabled", mt: 0.2 }} />
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.85rem', lineHeight: 1.5 }}>
                    {store.address}
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                  <PhoneIcon sx={{ fontSize: 18, color: "text.disabled" }} />
                  <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 800, fontSize: '0.9rem' }}>
                    {store.mobile || store.phone || "---"}
                  </Typography>
                </Box>
              </Stack>

              <Box sx={{ p: 2, bgcolor: '#FCF9EA', borderRadius: '0.65rem', border: '1px solid #e8e4d8', display: 'flex', justifyContent: 'space-around', mb: 2 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ fontWeight: 900, color: "text.disabled", display: 'block', fontSize: '0.6rem' }}>PREFIX</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 900, color: theme.palette.primary.main }}>{store.invoice_prefix}</Typography>
                </Box>
                <Divider orientation="vertical" flexItem sx={{ borderStyle: 'dashed' }} />
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ fontWeight: 900, color: "text.disabled", display: 'block', fontSize: '0.6rem' }}>GSTIN</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 900 }}>{store.gst_number || "NONE"}</Typography>
                </Box>
              </Box>

            </CardContent>
          </Card>
        ))}
      </Box>

    </Box>
  );
}
