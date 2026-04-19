"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Store as StoreIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Receipt as ReceiptIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
} from "@mui/icons-material";
import { storeService, Store, StoreFormData } from "@/services/storeService";
import { useAuth } from "@/hooks/useAuth";

export default function StoreManager() {
  const { user } = useAuth();
  const isSuperAdmin = user?.primary_role === 'SUPER_ADMIN';
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [formData, setFormData] = useState<StoreFormData>({
    name: "",
    address: "",
    phone: "",
    email: "",
    gst_number: "",
    location: "",
    fssai_lic_no: "",
    mobile: "",
    invoice_prefix: "",
    is_active: true,
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

  useEffect(() => {
    const handleRefresh = () => loadStores();
    window.addEventListener('app-refresh', handleRefresh);
    return () => window.removeEventListener('app-refresh', handleRefresh);
  }, [loadStores]);

  const handleOpenDialog = (store?: Store) => {
    if (store) {
      setEditingStore(store);
      setFormData({
        name: store.name,
        address: store.address,
        phone: store.phone || "",
        email: store.email || "",
        gst_number: store.gst_number || "",
        location: store.location || "",
        fssai_lic_no: store.fssai_lic_no || "",
        mobile: store.mobile || "",
        invoice_prefix: store.invoice_prefix,
        is_active: store.is_active,
      });
    } else {
      setEditingStore(null);
      setFormData({
        name: "",
        address: "",
        phone: "",
        email: "",
        gst_number: "",
        location: "",
        fssai_lic_no: "",
        mobile: "",
        invoice_prefix: "",
        is_active: true,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingStore(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingStore) {
        await storeService.updateStore(editingStore.id, formData);
      } else {
        await storeService.createStore(formData);
      }
      loadStores();
      handleCloseDialog();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this store? All associated data (items, orders) will be lost!")) {
      try {
        await storeService.deleteStore(id);
        loadStores();
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  if (loading && stores.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
        <CircularProgress color="inherit" />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ 
        display: { xs: 'none', md: 'flex' }, 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 4 
      }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 500, color: '#e9762b', fontSize: '1.5rem' }}>
            Store Management
          </Typography>
        </Box>
        {isSuperAdmin && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{
              bgcolor: "black",
              color: "white",
              "&:hover": { bgcolor: "#333" },
              borderRadius: 2,
              px: 3,
              py: 1.2,
              textTransform: "none",
              fontWeight: 700,
            }}
          >
            Add New Store
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {stores.map((store) => (
          <Box key={store.id} sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 24px)', lg: '1 1 calc(33.333% - 24px)' }, maxWidth: { xs: '100%', lg: 'calc(33.333% - 24px)' } }}>
            <Card
              sx={{
                height: '100%',
                borderRadius: 4,
                boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
                border: "1px solid #eee",
                transition: "transform 0.2s, box-shadow 0.2s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
                },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Avatar
                      sx={{
                        width: 48,
                        height: 48,
                        bgcolor: "#f5f5f5",
                        color: "black",
                        border: "1px solid #eee",
                      }}
                    >
                      <StoreIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {store.name}
                      </Typography>
                      <Chip
                        label={store.is_active ? "Active" : "Inactive"}
                        size="small"
                        icon={store.is_active ? <ActiveIcon /> : <InactiveIcon />}
                        sx={{
                          height: 24,
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          bgcolor: store.is_active ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                          color: store.is_active ? "#15803d" : "#b91c1c",
                          border: "none",
                        }}
                      />
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Edit">
                      <IconButton onClick={() => handleOpenDialog(store)} size="small" sx={{ border: "1px solid #eee" }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {isSuperAdmin && (
                      <Tooltip title="Delete">
                        <IconButton onClick={() => handleDelete(store.id)} size="small" sx={{ border: "1px solid #eee", color: "error.main" }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Box>

                <Stack spacing={1.5} sx={{ mb: 3 }}>
                  <Box sx={{ display: "flex", gap: 1.5 }}>
                    <LocationIcon sx={{ fontSize: 18, color: "text.secondary", mt: 0.3 }} />
                    <Typography variant="body2" color="text.secondary">
                      {store.address}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                    <PhoneIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                    <Typography variant="body2" color="text.secondary">
                      {store.mobile || store.phone || "No contact provided"}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                    <ReceiptIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Prefix: {store.invoice_prefix} | FSSAI: {store.fssai_lic_no || 'N/A'}
                    </Typography>
                  </Box>
                </Stack>

                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    bgcolor: "#fafafa",
                    borderRadius: 2,
                    borderStyle: "dashed",
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", textTransform: "uppercase" }}>
                    GSTIN
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {store.gst_number || "NOT CONFIGURED"}
                  </Typography>
                </Paper>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <form onSubmit={handleSubmit}>
          <DialogTitle sx={{ fontWeight: 800, fontSize: "1.5rem", pt: 3 }}>
            {editingStore ? "Edit Store Profile" : "Register New Store"}
          </DialogTitle>
          <DialogContent sx={{ pb: 3 }}>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <TextField
                label="Store Name"
                fullWidth
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Downtown Branch"
              />
              <TextField
                label="Address"
                fullWidth
                required
                multiline
                rows={3}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Complete address for invoices"
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Mobile"
                  fullWidth
                  required
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  placeholder="Primary contact number"
                />
                <TextField
                  label="Invoice Prefix"
                  fullWidth
                  required
                  value={formData.invoice_prefix}
                  onChange={(e) => setFormData({ ...formData, invoice_prefix: e.target.value.toUpperCase() })}
                  placeholder="e.g., MUM"
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="GST Number"
                  fullWidth
                  value={formData.gst_number}
                  onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                  placeholder="Optional"
                />
                <TextField
                  label="FSSAI Lic No."
                  fullWidth
                  value={formData.fssai_lic_no}
                  onChange={(e) => setFormData({ ...formData, fssai_lic_no: e.target.value })}
                  placeholder="Mandatory for FBOs"
                />
              </Box>
              <TextField
                label="Email"
                type="email"
                fullWidth
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 0 }}>
            <Button onClick={handleCloseDialog} color="inherit" sx={{ fontWeight: 600 }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{
                bgcolor: "black",
                color: "white",
                "&:hover": { bgcolor: "#333" },
                borderRadius: 2,
                px: 4,
                fontWeight: 700,
              }}
            >
              {editingStore ? "Update Store" : "Create Store"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
