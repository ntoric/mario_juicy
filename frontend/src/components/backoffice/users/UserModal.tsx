"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
} from "@mui/material";
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Password as PasswordIcon,
} from "@mui/icons-material";
import { userService, User, UserFormData } from "@/services/userService";
import { storeService, Store } from "@/services/storeService";
import { useAuth } from "@/hooks/useAuth";

interface UserModalProps {
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

export default function UserModal({
  open,
  mode,
  user,
  onClose,
  onSubmit,
}: UserModalProps) {
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
    // Only superadmins can see and manage users across different stores
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
    
    if (role === "SUPER_ADMIN") {
      return ALL_ROLES;
    }
    
    if (role === "ADMIN") {
      return ALL_ROLES.filter(r => !["SUPER_ADMIN", "ADMIN"].includes(r.value));
    }
    
    if (role === "MANAGER") {
      return ALL_ROLES.filter(r => ["CASHIER", "STAFF"].includes(r.value));
    }
    
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
      console.error("Failed to submit user:", err);
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      fullWidth 
      maxWidth="xs"
      slotProps={{
        paper: { sx: { borderRadius: 3, boxShadow: '0 20px 40px rgba(44, 24, 16, 0.1)' } }
      }}
    >
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
        {mode === "create" ? "Add New User" : "Edit User"}
      </DialogTitle>
      <DialogContent sx={{ py: 2 }}>
        {error && (
          <Box sx={{ mb: 3, p: 2, bgcolor: "#fff4f4", borderRadius: 2, border: "1px solid #ffebeb" }}>
            <Typography variant="body2" color="error" sx={{ fontWeight: 600 }}>
              {error}
            </Typography>
          </Box>
        )}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 1 }}>
          <TextField
            fullWidth
            label="UserID / Username"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            required
            disabled={mode === "edit"}
            variant="outlined"
            size="small"
          />

          <FormControl fullWidth size="small">
            <InputLabel>User Role</InputLabel>
            <Select
              label="User Role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              {availableRoles.map(role => (
                <MenuItem key={role.value} value={role.value}>
                  {role.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {currentUser?.primary_role === "SUPER_ADMIN" && (
            <FormControl fullWidth size="small">
              <InputLabel>Assigned Store (Optional)</InputLabel>
              <Select
                label="Assigned Store (Optional)"
                value={formData.store || ""}
                onChange={(e) => setFormData({ ...formData, store: e.target.value ? Number(e.target.value) : undefined })}
              >
                <MenuItem value=""><em>None (Global Access)</em></MenuItem>
                {stores.map(store => (
                  <MenuItem key={store.id} value={store.id}>
                    {store.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <TextField
            fullWidth
            label="Email Address (Optional)"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            variant="outlined"
            size="small"
          />

          <TextField
            fullWidth
            label={mode === "create" ? "User Key (Password)" : "Change User Key (Leave blank to keep current)"}
            type={showPassword ? "text" : "password"}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required={mode === "create"}
            variant="outlined"
            size="small"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <PasswordIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                    >
                      {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }
            }}
          />

          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.5, bgcolor: "#FCF9EA", borderRadius: 2, border: '1px solid #e8e4d8' }}>
            <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Account Status</Typography>
                <Typography variant="caption" color="text.secondary">
                    {formData.is_active ? "User can log in" : "User access is disabled"}
                </Typography>
            </Box>
            <Switch
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              color="success"
              size="small"
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button onClick={onClose} color="inherit" sx={{ fontWeight: 600 }}>
          Cancel
        </Button>
        <Button 
          onClick={handleFormSubmit} 
          variant="contained" 
          disabled={loading || !formData.username.trim() || (mode === 'create' && !formData.password)}
          sx={{ 
            px: 4, 
            bgcolor: '#E9762B', 
            color: '#fff',
            '&:hover': { bgcolor: '#d35400' },
            boxShadow: 'none',
            fontWeight: 600,
            borderRadius: 2
          }}
        >
          {loading ? "Processing..." : (mode === "create" ? "Create User" : "Save Changes")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
