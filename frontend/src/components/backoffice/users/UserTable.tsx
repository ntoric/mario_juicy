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
import { alpha } from "@mui/material/styles";
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
      <TableContainer component={Paper} sx={{ borderRadius: "7px", border: '1px solid #e8e4d8', boxShadow: 'none' }}>
        <Box sx={{ p: 5, textAlign: "center" }}>
          <Typography color="text.secondary" sx={{ fontWeight: 600 }}>No users found.</Typography>
        </Box>
      </TableContainer>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ borderRadius: "7px", overflow: "hidden", border: '1px solid #e8e4d8', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
      <Table>
        <TableHead sx={{ backgroundColor: "#FCF9EA" }}>
          <TableRow>
            <TableCell sx={{ color: "#e9762b", fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase' }}>User</TableCell>
            <TableCell sx={{ color: "#e9762b", fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase' }}>Role</TableCell>
            <TableCell sx={{ color: "#e9762b", fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', display: { xs: "none", md: "table-cell" } }}>Email</TableCell>
            <TableCell sx={{ color: "#e9762b", fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase' }}>Status</TableCell>
            <TableCell sx={{ color: "#e9762b", fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', textAlign: "right" }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((user) => {
            const roleObj = user.groups && user.groups.length > 0 ? user.groups[0] : null;
            const role = (roleObj && typeof roleObj === 'object' ? roleObj.name : roleObj) || 'CASHIER';
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
                <TableCell sx={{ py: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: alpha('#e9762b', 0.1), color: '#e9762b', width: 32, height: 32, fontSize: '0.9rem', fontWeight: 800, borderRadius: '7px' }}>
                      {user.username.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        {user.username}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'block', sm: 'none' }, fontWeight: 600 }}>
                        {role}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell sx={{ py: 1.5 }}>
                  <Chip
                    icon={getRoleIcon(role)}
                    label={role.toUpperCase()}
                    size="small"
                    sx={{ 
                      bgcolor: alpha(roleStyle.bg, 0.5), 
                      color: roleStyle.text,
                      fontWeight: 800,
                      fontSize: '0.65rem',
                      borderRadius: '7px',
                      height: 22,
                      '& .MuiChip-icon': { color: 'inherit', fontSize: 14 }
                    }}
                  />
                </TableCell>
                <TableCell sx={{ display: { xs: "none", md: "table-cell" }, py: 1.5 }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.8rem' }}>
                    {user.email || '—'}
                  </Typography>
                </TableCell>
                <TableCell sx={{ py: 1.5 }}>
                  <Chip
                      label={user.is_active ? "ACTIVE" : "DISABLED"}
                      size="small"
                      sx={{ 
                          fontWeight: 800, 
                          height: 20,
                          fontSize: '0.6rem',
                          borderRadius: '7px',
                          bgcolor: user.is_active ? alpha('#2e7d32', 0.1) : alpha('#757575', 0.1),
                          color: user.is_active ? '#2e7d32' : '#757575',
                          border: `1px solid ${user.is_active ? alpha('#2e7d32', 0.2) : alpha('#757575', 0.2)}`
                      }}
                  />
                </TableCell>
                <TableCell align="right" sx={{ py: 1.5 }}>
                  <Box 
                      sx={{ display: { xs: "none", lg: "flex" }, justifyContent: "flex-end", gap: 0.5 }}
                  >
                    <Tooltip title={user.is_active ? "Disable User" : "Enable User"}>
                      <IconButton
                        size="small"
                        onClick={() => onToggleStatus(user)}
                        sx={{ 
                          color: user.is_active ? 'warning.main' : 'success.main',
                          bgcolor: user.is_active ? alpha('#ed6c02', 0.05) : alpha('#2e7d32', 0.05), 
                          borderRadius: '7px',
                          '&:hover': { bgcolor: user.is_active ? alpha('#ed6c02', 0.1) : alpha('#2e7d32', 0.1) } 
                        }}
                      >
                        {user.is_active ? <ToggleOffIcon fontSize="small" /> : <ToggleOnIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit User">
                      <IconButton
                        size="small"
                        onClick={() => onEdit(user)}
                        sx={{ 
                          bgcolor: alpha('#000', 0.03), 
                          borderRadius: '7px',
                          '&:hover': { bgcolor: alpha('#000', 0.08) }, 
                          color: 'text.primary' 
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete User">
                      <IconButton
                        size="small"
                        onClick={() => onDelete(user)}
                        sx={{ 
                          color: 'error.main',
                          bgcolor: alpha('#d32f2f', 0.05), 
                          borderRadius: '7px',
                          '&:hover': { bgcolor: alpha('#d32f2f', 0.1) } 
                        }}
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
          paper: { sx: { boxShadow: '0 4px 20px rgba(0,0,0,0.1)', borderRadius: '12px', minWidth: 150 } }
        }}
      >
        <MenuItem onClick={() => {
          if (activeUser) onToggleStatus(activeUser);
          handleCloseMenu();
        }}>
          <ListItemIcon sx={{ color: activeUser?.is_active ? 'warning.main' : 'success.main' }}>
            {activeUser?.is_active ? <ToggleOffIcon fontSize="small" /> : <ToggleOnIcon fontSize="small" />}
          </ListItemIcon>
          <ListItemText sx={{ '& .MuiTypography-root': { fontWeight: 600, fontSize: '0.85rem' } }}>
            {activeUser?.is_active ? 'Disable' : 'Enable'}
          </ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          if (activeUser) onEdit(activeUser);
          handleCloseMenu();
        }}>
          <ListItemIcon sx={{ color: 'primary.main' }}>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText sx={{ '& .MuiTypography-root': { fontWeight: 600, fontSize: '0.85rem' } }}>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          if (activeUser) onDelete(activeUser);
          handleCloseMenu();
        }} sx={{ color: 'error.main' }}>
          <ListItemIcon sx={{ color: 'error.main' }}>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText sx={{ '& .MuiTypography-root': { fontWeight: 600, fontSize: '0.85rem' } }}>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </TableContainer>
  );
}
