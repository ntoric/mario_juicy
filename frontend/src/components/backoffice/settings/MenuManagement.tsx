"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Snackbar,
  Button,
} from "@mui/material";
import { fetcher } from "@/lib/api";

const ALL_MENUS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'table_map', label: 'Table Map' },
  { key: 'take_order', label: 'Take Order' },
  { key: 'update_table_status', label: 'Update Table Status' },
  { key: 'manage_tables', label: 'Manage Table Layout' },
  { key: 'parcel', label: 'Parcel' },
  { key: 'reservations', label: 'Reservations' },
  { key: 'live_orders', label: 'Live Orders' },
  { key: 'kitchen_display', label: 'Kitchen Display' },
  { key: 'manage_kitchen', label: 'Manage Kitchen Queue' },
  { key: 'billing', label: 'Invoices/Billing' },
  { key: 'payment_management', label: 'Checkout/Payment' },
  { key: 'categories', label: 'Categories' },
  { key: 'items', label: 'Items' },
  { key: 'reports', label: 'Reports' },
  { key: 'stores', label: 'Stores' },
  { key: 'users', label: 'Users/Roles' },
  { key: 'manage_users', label: 'Add/Manage Users' },
  { key: 'delete_order', label: 'Delete Orders' },
  { key: 'settings', label: 'Global Settings' },
];

interface Group {
  id: number;
  name: string;
}

interface MenuPermission {
  id?: number;
  group: number;
  menu_key: string;
  is_enabled: boolean;
}

export default function MenuManagement() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<number | "">("");
  const [permissions, setPermissions] = useState<Record<string, MenuPermission>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      fetchPermissions(selectedGroup as number);
    }
  }, [selectedGroup]);

  const fetchGroups = async () => {
    try {
      const data = await fetcher("/users/groups/");
      // Filter out SUPER_ADMIN as it always has access
      const filteredGroups = data.filter((g: Group) => g.name !== "SUPER_ADMIN");
      setGroups(filteredGroups);
      if (filteredGroups.length > 0) {
        setSelectedGroup(filteredGroups[0].id);
      }
      setLoading(false);
    } catch (err: any) {
      console.error('Failed to create KOT:', err);
      let errorMsg = 'Failed to create KOT';
      setError("Failed to fetch roles");
      setLoading(false);
    }
  };

  const fetchPermissions = async (groupId: number) => {
    setLoading(true);
    try {
      const data = await fetcher(`/users/menu-permissions/?group=${groupId}`);
      const permMap: Record<string, MenuPermission> = {};
      data.forEach((p: MenuPermission) => {
        permMap[p.menu_key] = p;
      });
      setPermissions(permMap);
      setLoading(false);
    } catch (err: any) {
      setError("Failed to fetch permissions");
      setLoading(false);
    }
  };

  const handleToggle = async (menuKey: string, enabled: boolean) => {
    if (!selectedGroup) return;

    const existing = permissions[menuKey];
    setSaving(true);

    try {
      if (existing && existing.id) {
        // Update
        const updated = await fetcher(`/users/menu-permissions/${existing.id}/`, {
          method: "PATCH",
          body: JSON.stringify({ is_enabled: enabled }),
        });
        setPermissions({ ...permissions, [menuKey]: updated });
      } else {
        // Create
        const created = await fetcher("/users/menu-permissions/", {
          method: "POST",
          body: JSON.stringify({
            group: selectedGroup,
            menu_key: menuKey,
            is_enabled: enabled,
          }),
        });
        setPermissions({ ...permissions, [menuKey]: created });
      }
      setSnackbar({ open: true, message: `Menu updated successfully`, severity: "success" });
    } catch (err: any) {
      setSnackbar({ open: true, message: "Failed to update menu", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading && groups.length === 0) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Role-Based Menu Permissions
        </Typography>
        <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Select Role</InputLabel>
            <Select
                value={selectedGroup}
                label="Select Role"
                onChange={(e) => setSelectedGroup(e.target.value as number)}
            >
                {groups.map((group) => (
                    <MenuItem key={group.id} value={group.id}>
                        {group.name}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <TableContainer 
        component={Paper} 
        sx={{ 
          borderRadius: 2, 
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          maxHeight: 'calc(100vh - 350px)',
          overflow: 'auto'
        }}
      >
        <Table stickyHeader>
          <TableHead sx={{ bgcolor: '#f8f9fa' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Menu Name</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Menu Key</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>Visibility</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ALL_MENUS.map((menu) => {
                const isEnabled = permissions[menu.key]?.is_enabled ?? true; // Default to true if not set
              return (
                <TableRow key={menu.key} hover>
                  <TableCell>{menu.label}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                        {menu.key}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Switch
                      checked={isEnabled}
                      onChange={(e) => handleToggle(menu.key, e.target.checked)}
                      disabled={saving}
                      color="primary"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
        Note: Changes apply immediately. Users may need to refresh their page to see menu updates.
        Super Admins always have access to all menus.
      </Typography>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
