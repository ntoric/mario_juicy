"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  TextField,
  IconButton,
  CircularProgress,
  Alert,
  InputAdornment,
  Tooltip,
  Chip,
  Avatar,
  Stack,
} from "@mui/material";
import { useToast } from "@/context/ToastContext";
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { userService, User, UserFormData } from "@/services/userService";
import UserTable from "@/components/backoffice/users/UserTable";
import UserForm from "@/components/backoffice/users/UserForm";
import ConfirmActionDialog from "@/components/backoffice/users/ConfirmActionDialog";
import { alpha } from "@mui/material/styles";

export default function UsersPage() {
  const { showSuccess, showError } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // View states
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Disable/Enable confirmation states
  const [openStatusDialog, setOpenStatusDialog] = useState(false);
  const [userForStatusChange, setUserForStatusChange] = useState<User | null>(null);

  // Delete confirmation states
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await userService.getUsers();
      setUsers(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    if (!users || !Array.isArray(users)) return [];
    return users.filter((u) =>
      u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.groups && u.groups.some(g => {
        const groupName = typeof g === 'string' ? g : g.name;
        return groupName.toLowerCase().includes(searchQuery.toLowerCase());
      }))
    );
  }, [users, searchQuery]);

  const handleOpenCreate = () => {
    setCurrentUser(null);
    setView('create');
  };

  const handleOpenEdit = (user: User) => {
    setCurrentUser(user);
    setView('edit');
  };

  const handleStatusConfirm = async () => {
    if (userForStatusChange) {
      try {
        const updated = await userService.toggleStatus(userForStatusChange.id, userForStatusChange.is_active);
        setUsers(users.map(u => u.id === updated.id ? updated : u));
        showSuccess("Success", `User ${updated.is_active ? 'enabled' : 'disabled'} successfully`);
      } catch (err: any) {
        showError("Error", err.message || "Failed to update status");
      } finally {
        setOpenStatusDialog(false);
        setUserForStatusChange(null);
      }
    }
  };

  const handleDeleteConfirm = async () => {
    if (userToDelete) {
      try {
        await userService.deleteUser(userToDelete.id);
        setUsers(users.filter((u) => u.id !== userToDelete.id));
        showSuccess("Success", "User deleted successfully");
      } catch (err: any) {
        showError("Error", err.message || "Failed to delete user");
      } finally {
        setOpenDeleteDialog(false);
        setUserToDelete(null);
      }
    }
  };

  const handleFormSubmit = async (userData: UserFormData) => {
    try {
      if (view === "create") {
        await userService.createUser(userData);
        showSuccess("Success", "User created successfully");
      } else if (currentUser) {
        await userService.updateUser(currentUser.id, userData);
        showSuccess("Success", "User updated successfully");
      }
      setView('list');
      fetchUsers();
    } catch (err: any) {
      showError("Operation failed", err.message || "Something went wrong");
      throw err;
    }
  };

  if (view === 'create' || view === 'edit') {
    return (
      <UserForm 
        open={true}
        mode={view === 'create' ? 'create' : 'edit'}
        user={currentUser}
        onClose={() => setView('list')}
        onSubmit={handleFormSubmit}
      />
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Optimized Compact Header */}
      <Box sx={{ 
        mb: 2, 
        display: 'flex', 
        justifyContent: "space-between", 
        alignItems: "center", 
        gap: 2 
      }}>
        <Typography variant="h4" sx={{ fontWeight: 900, color: '#e9762b', fontSize: '1.5rem', whiteSpace: 'nowrap', display: { xs: 'none', sm: 'block' } }}>
          Users
        </Typography>

        <Box sx={{ flexGrow: 1, maxWidth: { xs: '100%', sm: 400 } }}>
          <TextField
            fullWidth
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            autoComplete="off"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "text.secondary", fontSize: 20 }} />
                  </InputAdornment>
                ),
                sx: { borderRadius: '12px', height: 44, bgcolor: 'white' }
              }
            }}
          />
        </Box>

        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Tooltip title="Refresh List">
            <IconButton 
              onClick={fetchUsers} 
              sx={{ bgcolor: 'white', border: '1px solid #e8e4d8', borderRadius: '12px', width: 44, height: 44 }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreate}
            sx={{ borderRadius: '12px', height: 44, px: 3, fontWeight: 800 }}
          >
            ADD USER
          </Button>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading && users.length === 0 ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 10 }}>
          <CircularProgress sx={{ color: '#000' }} />
        </Box>
      ) : (
        <UserTable 
          users={filteredUsers} 
          onEdit={handleOpenEdit} 
          onDelete={(user) => {
            setUserToDelete(user);
            setOpenDeleteDialog(true);
          }} 
          onToggleStatus={(user) => {
            setUserForStatusChange(user);
            setOpenStatusDialog(true);
          }} 
        />
      )}

      <ConfirmActionDialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete User"
        message={`Are you sure you want to delete user "${userToDelete?.username}"? This action cannot be undone.`}
        confirmText="Delete User"
        confirmColor="error"
      />

      <ConfirmActionDialog
        open={openStatusDialog}
        onClose={() => setOpenStatusDialog(false)}
        onConfirm={handleStatusConfirm}
        title={userForStatusChange?.is_active ? "Disable User" : "Enable User"}
        message={`Are you sure you want to ${userForStatusChange?.is_active ? 'disable' : 'enable'} user "${userForStatusChange?.username}"?`}
        confirmText={userForStatusChange?.is_active ? "Disable" : "Enable"}
        confirmColor={userForStatusChange?.is_active ? "warning" : "success"}
      />
    </Box>
  );
}
