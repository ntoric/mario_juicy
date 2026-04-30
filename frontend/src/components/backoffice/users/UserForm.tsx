"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  IconButton,
  InputAdornment,
  Stack,
  Paper,
  Grid,
  CircularProgress,
  Alert,
  Divider,
} from "@mui/material";
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Password as PasswordIcon,
  ChevronLeft as ChevronLeftIcon,
  Save as SaveIcon,
  Badge as BadgeIcon,
  Email as EmailIcon,
  Store as StoreIcon,
} from "@mui/icons-material";
import { User, UserFormData } from "@/services/userService";
import { storeService, Store } from "@/services/storeService";
import { useAuth } from "@/hooks/useAuth";

interface UserFormProps {
  open: boolean;
  mode: "create" | "edit";
  user: User | null;
  onClose: () => void;
  onSubmit: (userData: UserFormData) => Promise<void>;
}

const ALL_ROLES = [
  { value: "SUPER_ADMIN", label: "Super Administrator" },
  { value: "ADMIN", label: "Administrator" },
  { value: "MANAGER", label: "Manager" },
  { value: "CASHIER", label: "Cashier" },
  { value: "STAFF", label: "Staff" },
];

export default function UserForm({
  open,
  mode,
  user,
  onClose,
  onSubmit,
}: UserFormProps) {
  const { user: currentUser } = useAuth();
  const [formData, setFormData] = useState<UserFormData>({
    username: "",
    password: "",
    role: "CASHIER",
    email: "",
    is_active: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stores, setStores] = useState<Store[]>([]);

  useEffect(() => {
    if (open && currentUser?.primary_role === "SUPER_ADMIN") {
      storeService.getStores().then(setStores).catch(console.error);
    }
  }, [open, currentUser]);

  useEffect(() => {
    if (mode === "edit" && user) {
      setFormData({
        username: user.username,
        password: "", 
        role: user.groups[0] || "CASHIER",
        email: user.email || "",
        is_active: user.is_active,
        store: user.store?.id || undefined
      });
    } else {
      setFormData({
        username: "",
        password: "",
        role: "CASHIER",
        email: "",
        is_active: true,
        store: undefined
      });
    }
    setShowPassword(false);
    setError(null);
  }, [mode, user, open]);

  const getAvailableRoles = () => {
    if (!currentUser) return [];
    const role = currentUser.primary_role;
    if (role === "SUPER_ADMIN") return ALL_ROLES;
    if (role === "ADMIN") return ALL_ROLES.filter(r => !["SUPER_ADMIN", "ADMIN"].includes(r.value));
    if (role === "MANAGER") return ALL_ROLES.filter(r => ["CASHIER", "STAFF"].includes(r.value));
    return [];
  };

  const availableRoles = getAvailableRoles();

  const handleFormSubmit = async () => {
    if (!formData.username.trim()) return;
    if (mode === "create" && !formData.password) return;

    setLoading(true);
    try {
      const submissionData = { ...formData };
      if (mode === "edit" && !submissionData.password) {
        delete submissionData.password;
      }
      await onSubmit(submissionData);
      onClose();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <Box sx={{ 
      flexGrow: 1,
      bgcolor: '#fdfdfd',
      display: 'flex', 
      flexDirection: 'column',
      minHeight: '100%',
      animation: 'slideInRight 0.2s ease-out',
      '@keyframes slideInRight': {
        from: { transform: 'translateX(100%)' },
        to: { transform: 'translateX(0)' }
      }
    }}>
      {/* Page Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid #e8e4d8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={onClose} sx={{ color: 'text.secondary' }}>
            <ChevronLeftIcon />
          </IconButton>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            {mode === "create" ? "Add New User" : `Edit: ${user?.username}`}
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          onClick={handleFormSubmit}
          disabled={loading || !formData.username.trim() || (mode === 'create' && !formData.password)}
          sx={{ borderRadius: '12px', fontWeight: 800, px: 3 }}
        >
          {loading ? "SAVING..." : "SAVE USER"}
        </Button>
      </Box>

      {/* Form Content */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: { xs: 2, md: 4 }, bgcolor: '#f9f9f9' }}>
        <Grid container spacing={4} sx={{ justifyContent: 'center' }}>
          <Grid size={{ xs: 12, md: 8, lg: 6 }}>
            <Paper sx={{ p: 4, borderRadius: '24px', border: '1px solid #e8e4d8', boxShadow: '0 8px 32px rgba(0,0,0,0.03)' }}>
              <Stack spacing={4}>
                {error && (
                  <Alert severity="error" sx={{ borderRadius: '12px', fontWeight: 700 }}>
                    {error}
                  </Alert>
                )}

                <Box>
                  <Typography variant="overline" sx={{ fontWeight: 900, color: 'primary.main', mb: 2, display: 'block' }}>IDENTITY & ROLE</Typography>
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Username / ID"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        required
                        disabled={mode === "edit"}
                        slotProps={{ 
                          input: { 
                            startAdornment: <BadgeIcon sx={{ mr: 1, color: 'text.disabled' }} />,
                            sx: { borderRadius: '12px', bgcolor: 'white' } 
                          } 
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <FormControl fullWidth>
                        <InputLabel>User Role</InputLabel>
                        <Select
                          label="User Role"
                          value={formData.role}
                          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                          sx={{ borderRadius: '12px', bgcolor: 'white' }}
                        >
                          {availableRoles.map(role => (
                            <MenuItem key={role.value} value={role.value}>{role.label}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="overline" sx={{ fontWeight: 900, color: 'primary.main', mb: 2, display: 'block' }}>ACCESS CONTROL</Typography>
                  <Grid container spacing={3}>
                    {currentUser?.primary_role === "SUPER_ADMIN" && (
                      <Grid size={{ xs: 12 }}>
                        <FormControl fullWidth>
                          <InputLabel>Assigned Store (Optional)</InputLabel>
                          <Select
                            label="Assigned Store (Optional)"
                            value={formData.store || ""}
                            onChange={(e) => setFormData({ ...formData, store: e.target.value ? Number(e.target.value) : undefined })}
                            sx={{ borderRadius: '12px', bgcolor: 'white' }}
                            startAdornment={<StoreIcon sx={{ mr: 1, color: 'text.disabled', ml: 1 }} />}
                          >
                            <MenuItem value=""><em>None (Global Access)</em></MenuItem>
                            {stores.map(store => (
                              <MenuItem key={store.id} value={store.id}>{store.name}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                    )}
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth
                        label="Email Address"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        slotProps={{ 
                          input: { 
                            startAdornment: <EmailIcon sx={{ mr: 1, color: 'text.disabled' }} />,
                            sx: { borderRadius: '12px', bgcolor: 'white' } 
                          } 
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth
                        label={mode === "create" ? "User Key (Password)" : "Change Key (Optional)"}
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required={mode === "create"}
                        slotProps={{
                          input: {
                            startAdornment: <PasswordIcon sx={{ mr: 1, color: 'text.disabled' }} />,
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                                  {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                </IconButton>
                              </InputAdornment>
                            ),
                            sx: { borderRadius: '12px', bgcolor: 'white' }
                          }
                        }}
                      />
                    </Grid>
                  </Grid>
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 3, bgcolor: "#FCF9EA", borderRadius: '16px', border: "1px solid #e8e4d8" }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>Account Access</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {formData.is_active ? "User is currently allowed to log in." : "User access is temporarily suspended."}
                    </Typography>
                  </Box>
                  <Switch
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    color="success"
                  />
                </Box>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
