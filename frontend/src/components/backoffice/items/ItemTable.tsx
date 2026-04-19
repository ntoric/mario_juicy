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
      <TableContainer component={Paper} sx={{ borderRadius: "3px" }}>
        <Box sx={{ p: 5, textAlign: "center" }}>
          <Typography color="text.secondary">No items found.</Typography>
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
                  borderRadius: 3, 
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
                    sx={{ width: 100, height: 100, bgcolor: "#FCF9EA" }}
                  >
                    <ImageIcon sx={{ color: "#8d6e63" }} />
                  </Avatar>
                  <Box sx={{ flexGrow: 1, p: 1.5, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2, mb: 0.5 }}>
                          {item.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
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
                      <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main' }}>
                        ₹{parseFloat(item.price).toFixed(2)}
                      </Typography>
                      <Chip
                        label={item.is_enabled ? "Active" : "Disabled"}
                        size="small"
                        color={item.is_enabled ? "success" : "default"}
                        sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
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
        >
          {canEdit && (
            <MenuItem onClick={() => {
              if (activeItem) onToggleStatus(activeItem);
              handleCloseMenu();
            }}>
              <ListItemIcon sx={{ color: activeItem?.is_enabled ? 'warning.main' : 'success.main' }}>
                {activeItem?.is_enabled ? <ToggleOffIcon fontSize="small" /> : <ToggleOnIcon fontSize="small" />}
              </ListItemIcon>
              <ListItemText>{activeItem?.is_enabled ? 'Disable' : 'Enable'}</ListItemText>
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
              <ListItemText>Edit</ListItemText>
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
              <ListItemText>Delete</ListItemText>
            </MenuItem>
          )}
        </Menu>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ borderRadius: "3px", overflow: "hidden" }}>
      <Table>
        <TableHead sx={{ backgroundColor: "#E9762B" }}>
          <TableRow>
            <TableCell sx={{ color: "white", fontWeight: 600 }}>Image</TableCell>
            <TableCell sx={{ color: "white", fontWeight: 600 }}>Name</TableCell>
            <TableCell sx={{ color: "white", fontWeight: 600, display: { xs: "none", sm: "table-cell" } }}>Category</TableCell>
            <TableCell sx={{ color: "white", fontWeight: 600, display: { xs: "none", md: "table-cell" } }}>Price</TableCell>
            <TableCell sx={{ color: "white", fontWeight: 600 }}>Status</TableCell>
            <TableCell sx={{ color: "white", fontWeight: 600, display: { xs: "none", md: "table-cell" } }}>Created</TableCell>
            <TableCell sx={{ color: "white", fontWeight: 600, display: { xs: "none", lg: "table-cell" } }}>Updated</TableCell>
            <TableCell sx={{ color: "white", fontWeight: 600, textAlign: "right" }}>Actions</TableCell>
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
                        bgcolor: isMobile ? 'rgba(0,0,0,0.02) !important' : 'inherit'
                    }
                }}
            >
              <TableCell>
                <Avatar
                  src={getImageUrl(item.image)}
                  variant="rounded"
                  sx={{ width: 48, height: 48, bgcolor: "#FCF9EA", border: "1px solid #e8e4d8" }}
                >
                  <ImageIcon sx={{ color: "#8d6e63" }} />
                </Avatar>
              </TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {item.name}
                </Typography>
                {item.code && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                    Code: {item.code}
                  </Typography>
                )}
              </TableCell>
              <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                {item.category_name || <Typography variant="caption" color="text.disabled">No Category</Typography>}
              </TableCell>
              <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  ₹{parseFloat(item.price).toFixed(2)}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                    label={item.is_enabled ? "Active" : "Disabled"}
                    size="small"
                    color={item.is_enabled ? "success" : "default"}
                    sx={{ 
                        fontWeight: 600, 
                        height: 24,
                        fontSize: '0.75rem',
                        '& .MuiChip-label': { px: 1 }
                    }}
                />
              </TableCell>
              <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                <Typography variant="caption">
                    {formatDate(item.created_at)}
                </Typography>
              </TableCell>
              <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>
                <Typography variant="caption">
                    {formatDate(item.updated_at)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                {/* Desktop View Actions */}
                <Box 
                    sx={{ display: { xs: "none", lg: "flex" }, justifyContent: "flex-end", gap: 1 }}
                    onClick={(e) => e.stopPropagation()}
                >
                  {canEdit && (
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() => onEdit(item)}
                      sx={{ bgcolor: 'rgba(233, 118, 43, 0.04)', '&:hover': { bgcolor: 'rgba(233, 118, 43, 0.08)' } }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  )}
                  {canDelete && (
                    <IconButton
                      color="error"
                      size="small"
                      onClick={() => onDelete(item)}
                      sx={{ bgcolor: 'rgba(239, 68, 68, 0.04)', '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.08)' } }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
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
      >
        {canEdit && (
          <MenuItem onClick={() => {
            if (activeItem) onToggleStatus(activeItem);
            handleCloseMenu();
          }}>
            <ListItemIcon sx={{ color: activeItem?.is_enabled ? 'warning.main' : 'success.main' }}>
              {activeItem?.is_enabled ? <ToggleOffIcon fontSize="small" /> : <ToggleOnIcon fontSize="small" />}
            </ListItemIcon>
            <ListItemText>{activeItem?.is_enabled ? 'Disable' : 'Enable'}</ListItemText>
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
            <ListItemText>Edit</ListItemText>
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
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </TableContainer>
  );
}
