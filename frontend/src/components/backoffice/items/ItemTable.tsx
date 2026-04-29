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
  Switch,
  Avatar,
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
  Grid,
  Card as MuiCard,
  CardContent,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Image as ImageIcon,
  MoreVert as MoreVertIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon,
} from "@mui/icons-material";
import { Item } from "@/services/itemService";
import { getImageUrl } from "@/lib/getImageUrl";

interface ItemTableProps {
  items: Item[];
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
  onToggleStatus: (item: Item) => void;
  onViewDetails: (item: Item) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

import { alpha } from "@mui/material/styles";

export default function ItemTable({
  items,
  onEdit,
  onDelete,
  onToggleStatus,
  onViewDetails,
  canEdit = true,
  canDelete = true,
}: ItemTableProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("lg"));
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [activeItem, setActiveItem] = useState<Item | null>(null);

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, item: Item) => {
    setAnchorEl(event.currentTarget);
    setActiveItem(item);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setActiveItem(null);
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(dateString));
  };

  if (items.length === 0) {
    return (
      <TableContainer component={Paper} sx={{ borderRadius: "7px", border: '1px solid #e8e4d8', boxShadow: 'none' }}>
        <Box sx={{ p: 5, textAlign: "center" }}>
          <Typography color="text.secondary" sx={{ fontWeight: 600 }}>No items found.</Typography>
        </Box>
      </TableContainer>
    );
  }

  if (isMobile) {
    return (
      <Box sx={{ pb: 2 }}>
        <Grid container spacing={2}>
          {items.map((item) => (
            <Grid size={{ xs: 12 }} key={item.id}>
              <MuiCard 
                onClick={() => onViewDetails?.(item)}
                sx={{ 
                  borderRadius: '7px', 
                  overflow: 'hidden', 
                  border: '1px solid #e8e4d8',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  '&:active': { bgcolor: 'rgba(0,0,0,0.02)' }
                }}
              >
                <Box sx={{ display: 'flex', position: 'relative' }}>
                  <Avatar
                    src={getImageUrl(item.image)}
                    variant="square"
                    sx={{ width: 90, height: 90, bgcolor: "#FCF9EA" }}
                  >
                    <ImageIcon sx={{ color: "#8d6e63" }} />
                  </Avatar>
                  <Box sx={{ flexGrow: 1, p: 1.5, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.2, mb: 0.5 }}>
                          {item.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
                          {item.category_name || "General"}
                        </Typography>
                      </Box>
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenMenu(e, item);
                        }}
                        sx={{ mt: -0.5, mr: -0.5 }}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#e9762b' }}>
                        ₹{parseFloat(item.price).toFixed(2)}
                      </Typography>
                      <Chip
                        label={item.is_enabled ? "ACTIVE" : "DISABLED"}
                        size="small"
                        sx={{ 
                          height: 18, 
                          fontSize: '0.6rem', 
                          fontWeight: 900,
                          borderRadius: '4px',
                          bgcolor: item.is_enabled ? alpha('#2e7d32', 0.1) : alpha('#757575', 0.1),
                          color: item.is_enabled ? '#2e7d32' : '#757575'
                        }}
                      />
                    </Box>
                  </Box>
                </Box>
              </MuiCard>
            </Grid>
          ))}
        </Grid>
        
        {/* Reuse the Desktop Menu for Mobile as well */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleCloseMenu}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{ paper: { sx: { borderRadius: '12px' } } }}
        >
          {canEdit && (
            <MenuItem onClick={() => {
              if (activeItem) onToggleStatus(activeItem);
              handleCloseMenu();
            }}>
              <ListItemIcon sx={{ color: activeItem?.is_enabled ? 'warning.main' : 'success.main' }}>
                {activeItem?.is_enabled ? <ToggleOffIcon fontSize="small" /> : <ToggleOnIcon fontSize="small" />}
              </ListItemIcon>
              <ListItemText sx={{ '& .MuiTypography-root': { fontWeight: 600, fontSize: '0.85rem' } }}>
                {activeItem?.is_enabled ? 'Disable' : 'Enable'}
              </ListItemText>
            </MenuItem>
          )}
          {canEdit && (
            <MenuItem onClick={() => {
              if (activeItem) onEdit(activeItem);
              handleCloseMenu();
            }}>
              <ListItemIcon sx={{ color: 'primary.main' }}>
                <EditIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText sx={{ '& .MuiTypography-root': { fontWeight: 600, fontSize: '0.85rem' } }}>Edit</ListItemText>
            </MenuItem>
          )}
          {canDelete && (
            <MenuItem onClick={() => {
              if (activeItem) onDelete(activeItem);
              handleCloseMenu();
            }} sx={{ color: 'error.main' }}>
              <ListItemIcon sx={{ color: 'error.main' }}>
                <DeleteIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText sx={{ '& .MuiTypography-root': { fontWeight: 600, fontSize: '0.85rem' } }}>Delete</ListItemText>
            </MenuItem>
          )}
        </Menu>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ borderRadius: "7px", overflow: "hidden", border: '1px solid #e8e4d8', boxShadow: 'none' }}>
      <Table>
        <TableHead sx={{ backgroundColor: "#FCF9EA" }}>
          <TableRow>
            <TableCell sx={{ color: "#e9762b", fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase' }}>Image</TableCell>
            <TableCell sx={{ color: "#e9762b", fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase' }}>Name</TableCell>
            <TableCell sx={{ color: "#e9762b", fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', display: { xs: "none", sm: "table-cell" } }}>Category</TableCell>
            <TableCell sx={{ color: "#e9762b", fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', display: { xs: "none", md: "table-cell" } }}>Price</TableCell>
            <TableCell sx={{ color: "#e9762b", fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase' }}>Status</TableCell>
            <TableCell sx={{ color: "#e9762b", fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', display: { xs: "none", md: "table-cell" }, textAlign: 'right' }}>Created</TableCell>
            <TableCell sx={{ color: "#e9762b", fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', textAlign: "right" }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => (
            <TableRow 
                key={item.id} 
                hover 
                onClick={() => isMobile && onViewDetails(item)}
                sx={{ 
                    cursor: isMobile ? 'pointer' : 'default',
                    '&:hover': {
                        bgcolor: 'rgba(0,0,0,0.01) !important'
                    }
                }}
            >
              <TableCell sx={{ py: 1 }}>
                <Avatar
                  src={getImageUrl(item.image)}
                  variant="rounded"
                  sx={{ width: 42, height: 42, bgcolor: "#FCF9EA", border: "1px solid #e8e4d8", borderRadius: '7px' }}
                >
                  <ImageIcon sx={{ color: "#8d6e63", fontSize: 18 }} />
                </Avatar>
              </TableCell>
              <TableCell sx={{ py: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  {item.name}
                </Typography>
                {item.code && (
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    CODE: {item.code}
                  </Typography>
                )}
              </TableCell>
              <TableCell sx={{ display: { xs: "none", sm: "table-cell" }, py: 1 }}>
                <Chip 
                  label={item.category_name || "General"} 
                  size="small" 
                  sx={{ 
                    height: 20, 
                    fontSize: '0.65rem', 
                    fontWeight: 700, 
                    borderRadius: '7px',
                    bgcolor: alpha('#000', 0.05)
                  }} 
                />
              </TableCell>
              <TableCell sx={{ display: { xs: "none", md: "table-cell" }, py: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 800, color: '#e9762b' }}>
                  ₹{parseFloat(item.price).toFixed(2)}
                </Typography>
              </TableCell>
              <TableCell sx={{ py: 1 }}>
                <Chip
                    label={item.is_enabled ? "ACTIVE" : "DISABLED"}
                    size="small"
                    sx={{ 
                        fontWeight: 900, 
                        height: 20,
                        fontSize: '0.6rem',
                        borderRadius: '4px',
                        bgcolor: item.is_enabled ? alpha('#2e7d32', 0.1) : alpha('#757575', 0.1),
                        color: item.is_enabled ? '#2e7d32' : '#757575'
                    }}
                />
              </TableCell>
              <TableCell sx={{ display: { xs: "none", md: "table-cell" }, py: 1, textAlign: 'right' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.7rem' }}>
                    {formatDate(item.created_at)}
                </Typography>
              </TableCell>
              <TableCell align="right" sx={{ py: 1 }}>
                {/* Desktop View Actions */}
                <Box 
                    sx={{ display: { xs: "none", lg: "flex" }, justifyContent: "flex-end", gap: 0.5 }}
                    onClick={(e) => e.stopPropagation()}
                >
                  {canEdit && (
                    <Tooltip title="Edit Item">
                      <IconButton
                        size="small"
                        onClick={() => onEdit(item)}
                        sx={{ 
                          bgcolor: alpha('#000', 0.03), 
                          borderRadius: '7px',
                          '&:hover': { bgcolor: alpha('#000', 0.08) }
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {canDelete && (
                    <Tooltip title="Delete Item">
                      <IconButton
                        size="small"
                        onClick={() => onDelete(item)}
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
                  )}
                </Box>

                {/* Mobile/Tablet View Actions (Dropdown) */}
                <Box 
                    sx={{ display: { xs: "flex", lg: "none" }, justifyContent: "flex-end" }}
                    onClick={(e) => e.stopPropagation()}
                >
                  {(canEdit || canDelete) && (
                    <IconButton
                      size="small"
                      onClick={(e) => handleOpenMenu(e, item)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  )}
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { borderRadius: '12px' } } }}
      >
        {canEdit && (
          <MenuItem onClick={() => {
            if (activeItem) onToggleStatus(activeItem);
            handleCloseMenu();
          }}>
            <ListItemIcon sx={{ color: activeItem?.is_enabled ? 'warning.main' : 'success.main' }}>
              {activeItem?.is_enabled ? <ToggleOffIcon fontSize="small" /> : <ToggleOnIcon fontSize="small" />}
            </ListItemIcon>
            <ListItemText sx={{ '& .MuiTypography-root': { fontWeight: 600, fontSize: '0.85rem' } }}>
              {activeItem?.is_enabled ? 'Disable' : 'Enable'}
            </ListItemText>
          </MenuItem>
        )}
        {canEdit && (
          <MenuItem onClick={() => {
            if (activeItem) onEdit(activeItem);
            handleCloseMenu();
          }}>
            <ListItemIcon sx={{ color: 'primary.main' }}>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText sx={{ '& .MuiTypography-root': { fontWeight: 600, fontSize: '0.85rem' } }}>Edit</ListItemText>
          </MenuItem>
        )}
        {canDelete && (
          <MenuItem onClick={() => {
            if (activeItem) onDelete(activeItem);
            handleCloseMenu();
          }} sx={{ color: 'error.main' }}>
            <ListItemIcon sx={{ color: 'error.main' }}>
              <DeleteIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText sx={{ '& .MuiTypography-root': { fontWeight: 600, fontSize: '0.85rem' } }}>Delete</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </TableContainer>
  );
}
