"use client";
import { useTheme } from "@mui/material/styles";

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  IconButton,
  InputAdornment,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Lock as LockIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { userService } from '@/services/userService';
import { useAuth } from '@/hooks/useAuth';

export default function ForceChangePasswordDialog() {
  const theme = useTheme();

  const { user, fetchProfile } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = !!user?.must_change_password;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      setError("Please enter a new password");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await userService.changePassword(newPassword);
      await fetchProfile(); // Refresh profile to update must_change_password flag
    } catch (err: any) {
      setError(err.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={(event, reason) => {
        // Prevent closing the dialog by clicking outside or pressing Escape
        if (reason !== 'backdropClick' && reason !== 'escapeKeyDown') {
          // onClose();
        }
      }}
      slotProps={{
        paper: {
          sx: { borderRadius: '0.65rem', p: 1, maxWidth: 450 }
        }
      }}
    >
      <DialogTitle sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <SecurityIcon color="warning" />
        Set New Password
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontWeight: 600 }}>
          You are using a temporary password. For security reasons, you must set a new permanent password before you can access your account.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: '0.65rem', fontWeight: 700 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
          <TextField
            fullWidth
            label="New Password"
            type={showPassword ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            autoFocus
            sx={{ mb: 2.5 }}
            slotProps={{
              input: {
                startAdornment: <LockIcon sx={{ mr: 1, color: 'text.disabled' }} />,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
                sx: { borderRadius: '0.65rem' }
              }
            }}
          />
          <TextField
            fullWidth
            label="Confirm New Password"
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            sx={{ mb: 1 }}
            slotProps={{
              input: {
                startAdornment: <LockIcon sx={{ mr: 1, color: 'text.disabled' }} />,
                sx: { borderRadius: '0.65rem' }
              }
            }}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 1 }}>
        <Button 
          fullWidth 
          variant="contained" 
          onClick={handleSubmit}
          disabled={loading}
          sx={{ 
            borderRadius: '0.65rem', 
            fontWeight: 800, 
            py: 1.5,
            bgcolor: theme.palette.primary.main,
            '&:hover': { bgcolor: '#D66522' }
          }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : "UPDATE & SECURE ACCOUNT"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
