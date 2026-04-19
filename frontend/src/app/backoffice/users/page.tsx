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
} from "@mui/material";
import { toast } from 'sonner';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { userService, User, UserFormData } from "@/services/userService";
import UserTable from "@/components/backoffice/users/UserTable";
import UserModal from "@/components/backoffice/users/UserModal";
import ConfirmActionDialog from "@/components/backoffice/users/ConfirmActionDialog";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [openModal, setOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
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

  useEffect(() => {
    const handleRefresh = () => fetchUsers();
    window.addEventListener('app-refresh', handleRefresh);
    return () => window.removeEventListener('app-refresh', handleRefresh);
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) =>
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.groups && u.groups.some(g => g.toLowerCase().includes(searchQuery.toLowerCase())))
    );
  }, [users, searchQuery]);

  const handleOpenCreate = () => {
    setModalMode("create");
    setCurrentUser(null);
    setOpenModal(true);
  };

  const handleOpenEdit = (user: User) => {
    setModalMode("edit");
    setCurrentUser(user);
    setOpenModal(true);
  };

  const handleOpenDelete = (user: User) => {
    setUserToDelete(user);
    setOpenDeleteDialog(true);
  };

  const handleOpenStatusToggle = (user: User) => {
    setUserForStatusChange(user);
    setOpenStatusDialog(true);
  };

  const handleStatusConfirm = async () => {
    if (userForStatusChange) {
      try {
        const updated = await userService.toggleStatus(userForStatusChange.id, userForStatusChange.is_active);
        setUsers(users.map(u => u.id === updated.id ? updated : u));
        toast.success(`User ${updated.is_active ? 'enabled' : 'disabled'} successfully`);
      } catch (err: any) {
        toast.error(err.message || "Failed to update status");
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
        toast.success("User deleted successfully");
      } catch (err: any) {
        toast.error(err.message || "Failed to delete user");
      } finally {
        setOpenDeleteDialog(false);
        setUserToDelete(null);
      }
    }
  };

  const handleModalSubmit = async (userData: UserFormData) => {
    try {
      if (modalMode === "create") {
        await userService.createUser(userData);
        toast.success("User created successfully");
      } else if (currentUser) {
        await userService.updateUser(currentUser.id, userData);
        toast.success("User updated successfully");
      }
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "Operation failed");
      throw err;
    }
  };



  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ 
        mb: 4, 
        display: { xs: 'none', md: 'flex' }, 
        justifyContent: "space-between", 
        alignItems: { xs: "flex-start", sm: "center" }, 
        gap: 2, 
        flexDirection: { xs: "column", sm: "row" } 
      }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 500, color: '#e9762b', fontSize: '1.5rem' }}>
            User Management
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCreate}
          sx={{ 
            height: 48, 
            borderRadius: 2, 
            px: 3, 
            width: { xs: '100%', sm: 'auto' },
            bgcolor: '#000',
            color: '#fff',
            '&:hover': { bgcolor: '#333' },
            boxShadow: 'none',
            fontWeight: 600
          }}
        >
          Add New User
        </Button>
      </Box>

      <Card sx={{ mb: 4, p: 2, borderRadius: 2, boxShadow: 'none', border: '1px solid #eee' }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <TextField
            fullWidth
            placeholder="Search users by name, email, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "text.secondary" }} />
                  </InputAdornment>
                ),
              },
            }}
            size="small"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          <IconButton onClick={fetchUsers} title="Refresh users" sx={{ p: 1, border: '1px solid #eee', borderRadius: 2 }}>
            <RefreshIcon />
          </IconButton>
        </Box>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError(null)}>
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
          onDelete={handleOpenDelete} 
          onToggleStatus={handleOpenStatusToggle} 
        />
      )}

      <UserModal
        open={openModal}
        mode={modalMode}
        user={currentUser}
        onClose={() => setOpenModal(false)}
        onSubmit={handleModalSubmit}
      />

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
