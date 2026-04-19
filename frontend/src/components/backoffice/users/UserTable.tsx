"use client";

import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Box,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  useTheme,
  useMediaQuery,
  Chip,
  Avatar,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  Security as ManagerIcon,
  PointOfSale as CashierIcon,
} from "@mui/icons-material";
import { User } from "@/services/userService";

interface UserTableProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onToggleStatus: (user: User) => void;
}

const getRoleIcon = (role: string) => {
  switch (role.toUpperCase()) {
    case 'ADMIN':
      return <AdminIcon fontSize="small" />;
    case 'MANAGER':
      return <ManagerIcon fontSize="small" />;
    case 'CASHIER':
      return <CashierIcon fontSize="small" />;
    default:
      return <PersonIcon fontSize="small" />;
  }
};

const getRoleColor = (role: string) => {
  switch (role.toUpperCase()) {
    case 'ADMIN':
      return { bg: '#fee2e2', text: '#991b1b' };
    case 'MANAGER':
      return { bg: '#fef3c7', text: '#92400e' };
    case 'CASHIER':
      return { bg: '#dcfce7', text: '#166534' };
    default:
      return { bg: '#f1f5f9', text: '#475569' };
  }
};

export default function UserTable({
  users,
  onEdit,
  onDelete,
  onToggleStatus,
}: UserTableProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("lg"));
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [activeUser, setActiveUser] = useState<User | null>(null);

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, user: User) => {
    setAnchorEl(event.currentTarget);
    setActiveUser(user);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setActiveUser(null);
  };

  if (users.length === 0) {
    return (
      <TableContainer component={Paper} sx={{ borderRadius: "3px" }}>
        <Box sx={{ p: 5, textAlign: "center" }}>
          <Typography color="text.secondary">No users found.</Typography>
        </Box>
      </TableContainer>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ borderRadius: "3px", overflow: "hidden", border: '1px solid #eee', boxShadow: 'none' }}>
      <Table>
        <TableHead sx={{ backgroundColor: "#000" }}>
          <TableRow>
            <TableCell sx={{ color: "white", fontWeight: 600 }}>User</TableCell>
            <TableCell sx={{ color: "white", fontWeight: 600 }}>Role</TableCell>
            <TableCell sx={{ color: "white", fontWeight: 600, display: { xs: "none", md: "table-cell" } }}>Email</TableCell>
            <TableCell sx={{ color: "white", fontWeight: 600 }}>Status</TableCell>
            <TableCell sx={{ color: "white", fontWeight: 600, textAlign: "right" }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((user) => {
            const role = user.groups[0] || 'CASHIER';
            const roleStyle = getRoleColor(role);
            
            return (
              <TableRow 
                  key={user.id} 
                  hover 
                  sx={{ 
                      '&:hover': {
                          bgcolor: 'rgba(0,0,0,0.01) !important'
                      }
                  }}
              >
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: '#000', width: 36, height: 36 }}>
                      {user.username.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {user.username}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'block', sm: 'none' } }}>
                        {role}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    icon={getRoleIcon(role)}
                    label={role}
                    size="small"
                    sx={{ 
                      bgcolor: roleStyle.bg, 
                      color: roleStyle.text,
                      fontWeight: 600,
                      '& .MuiChip-icon': { color: 'inherit' }
                    }}
                  />
                </TableCell>
                <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                  <Typography variant="body2" color="text.secondary">
                    {user.email || '—'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                      label={user.is_active ? "Active" : "Disabled"}
                      size="small"
                      color={user.is_active ? "success" : "default"}
                      sx={{ 
                          fontWeight: 600, 
                          height: 24,
                          fontSize: '0.75rem',
                          borderRadius: 1
                      }}
                  />
                </TableCell>
                <TableCell align="right">
                  <Box 
                      sx={{ display: { xs: "none", lg: "flex" }, justifyContent: "flex-end", gap: 1 }}
                  >
                    <Tooltip title={user.is_active ? "Disable" : "Enable"}>
                      <IconButton
                        size="small"
                        onClick={() => onToggleStatus(user)}
                        sx={{ 
                          color: user.is_active ? 'warning.main' : 'success.main',
                          bgcolor: user.is_active ? 'rgba(237, 108, 2, 0.04)' : 'rgba(46, 125, 50, 0.04)', 
                          '&:hover': { bgcolor: user.is_active ? 'rgba(237, 108, 2, 0.08)' : 'rgba(46, 125, 50, 0.08)' } 
                        }}
                      >
                        {user.is_active ? <ToggleOffIcon fontSize="small" /> : <ToggleOnIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton
                        color="primary"
                        size="small"
                        onClick={() => onEdit(user)}
                        sx={{ bgcolor: 'rgba(0, 0, 0, 0.04)', '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.08)' }, color: '#000' }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        color="error"
                        size="small"
                        onClick={() => onDelete(user)}
                        sx={{ bgcolor: 'rgba(211, 47, 47, 0.04)', '&:hover': { bgcolor: 'rgba(211, 47, 47, 0.08)' } }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>

                  <Box 
                      sx={{ display: { xs: "flex", lg: "none" }, justifyContent: "flex-end" }}
                  >
                    <IconButton
                      size="small"
                      onClick={(e) => handleOpenMenu(e, user)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: { sx: { boxShadow: '0 4px 20px rgba(0,0,0,0.1)', borderRadius: 2, minWidth: 150 } }
        }}
      >
        <MenuItem onClick={() => {
          if (activeUser) onToggleStatus(activeUser);
          handleCloseMenu();
        }}>
          <ListItemIcon sx={{ color: activeUser?.is_active ? 'warning.main' : 'success.main' }}>
            {activeUser?.is_active ? <ToggleOffIcon fontSize="small" /> : <ToggleOnIcon fontSize="small" />}
          </ListItemIcon>
          <ListItemText>{activeUser?.is_active ? 'Disable' : 'Enable'}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          if (activeUser) onEdit(activeUser);
          handleCloseMenu();
        }}>
          <ListItemIcon sx={{ color: 'primary.main' }}>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          if (activeUser) onDelete(activeUser);
          handleCloseMenu();
        }} sx={{ color: 'error.main' }}>
          <ListItemIcon sx={{ color: 'error.main' }}>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </TableContainer>
  );
}
