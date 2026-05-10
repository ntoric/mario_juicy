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
import { alpha } from "@mui/material/styles";

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
      <Box sx={{ 
        p: 8, 
        textAlign: "center", 
        bgcolor: 'rgba(255,255,255,0.4)', 
        borderRadius: '32px', 
        border: '2px dashed',
        borderColor: alpha(theme.palette.divider, 0.1),
        backdropFilter: 'blur(10px)'
      }}>
        <Box sx={{ p: 3, borderRadius: '24px', bgcolor: alpha('#e9762b', 0.05), display: 'inline-flex', mb: 2 }}>
          <ImageIcon sx={{ fontSize: 48, color: '#e9762b', opacity: 0.5 }} />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 1000, color: 'text.secondary' }}>No items found</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Your menu items will appear here once added.</Typography>
      </Box>
    );
  }

  if (isMobile) {
    return (
      <Box sx={{ pb: { xs: 12, md: 2 } }}>
        <Grid container spacing={2}>
          {items.map((item) => (
            <Grid size={{ xs: 12, sm: 6 }} key={item.id}>
              <MuiCard 
                onClick={() => onViewDetails?.(item)}
                sx={{ 
                  borderRadius: '24px', 
                  overflow: 'hidden', 
                  border: '1px solid',
                  borderColor: alpha(theme.palette.divider, 0.08),
                  boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
                  bgcolor: 'rgba(255, 255, 255, 0.7)',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 10px 25px rgba(0,0,0,0.06)', borderColor: '#e9762b' }
                }}
              >
                <Box sx={{ display: 'flex', position: 'relative' }}>
                  <Avatar
                    src={getImageUrl(item.image)}
                    variant="square"
                    sx={{ width: 100, height: 100, bgcolor: alpha('#e9762b', 0.02), borderRight: '1px solid', borderColor: alpha(theme.palette.divider, 0.05) }}
                  >
                    <ImageIcon sx={{ color: alpha('#1a1a1a', 0.1) }} />
                  </Avatar>
                  <Box sx={{ flexGrow: 1, p: 2, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 1000, lineHeight: 1.2, mb: 0.5, color: '#1a1a1a' }}>
                          {item.name}
                        </Typography>
                        <Chip 
                          label={item.category_name || "General"} 
                          size="small" 
                          sx={{ 
                            height: 18, 
                            fontSize: '0.6rem', 
                            fontWeight: 800, 
                            borderRadius: '6px',
                            bgcolor: alpha('#e9762b', 0.08),
                            color: '#e9762b'
                          }} 
                        />
                      </Box>
                      <IconButton 
                        size="small" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenMenu(e, item);
                        }}
                        sx={{ mt: -0.5, mr: -0.5, bgcolor: alpha('#000', 0.02) }}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <Typography variant="h6" sx={{ fontWeight: 1000, color: '#1a1a1a' }}>
                        ₹{parseFloat(item.price).toFixed(0)}
                      </Typography>
                      <Chip
                        label={item.is_enabled ? "ACTIVE" : "DISABLED"}
                        size="small"
                        sx={{ 
                          height: 20, 
                          fontSize: '0.6rem', 
                          fontWeight: 1000,
                          borderRadius: '8px',
                          bgcolor: item.is_enabled ? alpha('#10b981', 0.1) : alpha('#64748b', 0.1),
                          color: item.is_enabled ? '#10b981' : '#64748b'
                        }}
                      />
                    </Box>
                  </Box>
                </Box>
              </MuiCard>
            </Grid>
          ))}
        </Grid>
        
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleCloseMenu}
          slotProps={{ paper: { sx: { borderRadius: '16px', boxShadow: '0 10px 35px rgba(0,0,0,0.1)', mt: 1 } } }}
        >
          {canEdit && (
            <MenuItem onClick={() => {
              if (activeItem) onToggleStatus(activeItem);
              handleCloseMenu();
            }}>
              <ListItemIcon sx={{ color: activeItem?.is_enabled ? 'warning.main' : 'success.main' }}>
                {activeItem?.is_enabled ? <ToggleOffIcon fontSize="small" /> : <ToggleOnIcon fontSize="small" />}
              </ListItemIcon>
              <ListItemText sx={{ '& .MuiTypography-root': { fontWeight: 800, fontSize: '0.85rem' } }}>
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
              <ListItemText sx={{ '& .MuiTypography-root': { fontWeight: 800, fontSize: '0.85rem' } }}>Edit</ListItemText>
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
              <ListItemText sx={{ '& .MuiTypography-root': { fontWeight: 800, fontSize: '0.85rem' } }}>Delete</ListItemText>
            </MenuItem>
          )}
        </Menu>
      </Box>
    );
  }

  return (
    <TableContainer sx={{ 
      borderRadius: "32px", 
      overflow: "auto", 
      border: '1px solid',
      borderColor: alpha(theme.palette.divider, 0.08), 
      boxShadow: '0 20px 60px rgba(0,0,0,0.04)',
      bgcolor: 'rgba(255, 255, 255, 0.6)',
      backdropFilter: 'blur(20px)'
    }}>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 1000, py: 2.5, fontSize: '0.7rem', color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.1em', pl: 4, bgcolor: 'white' }}>IMAGE</TableCell>
            <TableCell sx={{ fontWeight: 1000, fontSize: '0.7rem', color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.1em', bgcolor: 'white' }}>ITEM DETAILS</TableCell>
            <TableCell sx={{ fontWeight: 1000, fontSize: '0.7rem', color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.1em', bgcolor: 'white' }}>CATEGORY</TableCell>
            <TableCell sx={{ fontWeight: 1000, fontSize: '0.7rem', color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.1em', bgcolor: 'white' }}>PRICE</TableCell>
            <TableCell sx={{ fontWeight: 1000, fontSize: '0.7rem', color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.1em', bgcolor: 'white' }}>STATUS</TableCell>
            <TableCell sx={{ fontWeight: 1000, fontSize: '0.7rem', color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: "right", pr: 4, bgcolor: 'white' }}>ACTIONS</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => (
            <TableRow 
                key={item.id} 
                hover 
                sx={{ 
                  transition: 'all 0.2s ease',
                  '&:hover': { bgcolor: alpha('#e9762b', 0.02) },
                  '& .MuiTableCell-root': { py: 2, borderBottom: '1px solid', borderColor: alpha(theme.palette.divider, 0.04) }
                }}
            >
              <TableCell sx={{ pl: 4 }}>
                <Avatar
                  src={getImageUrl(item.image)}
                  variant="rounded"
                  sx={{ 
                    width: 54, 
                    height: 54, 
                    bgcolor: "white", 
                    border: "1px solid",
                    borderColor: alpha(theme.palette.divider, 0.08), 
                    borderRadius: '16px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                  }}
                >
                  <ImageIcon sx={{ color: alpha('#1a1a1a', 0.1), fontSize: 24 }} />
                </Avatar>
              </TableCell>
              <TableCell>
                <Typography variant="body1" sx={{ fontWeight: 1000, color: '#1a1a1a', fontSize: '1rem', letterSpacing: '-0.01em' }}>
                  {item.name}
                </Typography>
                {item.code && (
                  <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.05em' }}>
                    #{item.code.toUpperCase()}
                  </Typography>
                )}
              </TableCell>
              <TableCell>
                <Chip 
                  label={(item.category_name || "General").toUpperCase()} 
                  size="small" 
                  sx={{ 
                    height: 24, 
                    fontSize: '0.65rem', 
                    fontWeight: 1000, 
                    borderRadius: '10px',
                    bgcolor: alpha('#e9762b', 0.06),
                    color: '#e9762b',
                    border: '1px solid',
                    borderColor: alpha('#e9762b', 0.1)
                  }} 
                />
              </TableCell>
              <TableCell>
                <Typography variant="body1" sx={{ fontWeight: 1000, color: '#1a1a1a', fontSize: '1.1rem' }}>
                  ₹{parseFloat(item.price).toFixed(0)}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip
                    label={item.is_enabled ? "ACTIVE" : "DISABLED"}
                    size="small"
                    sx={{ 
                        fontWeight: 1000, 
                        height: 26,
                        px: 1,
                        fontSize: '0.65rem',
                        borderRadius: '10px',
                        bgcolor: item.is_enabled ? alpha('#10b981', 0.1) : alpha('#64748b', 0.1),
                        color: item.is_enabled ? '#10b981' : '#64748b',
                        border: '1px solid',
                        borderColor: item.is_enabled ? alpha('#10b981', 0.2) : alpha('#64748b', 0.2),
                    }}
                />
              </TableCell>
              <TableCell align="right" sx={{ pr: 4 }}>
                <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5 }}>
                  {canEdit && (
                    <Tooltip title="Edit Item">
                      <IconButton
                        size="small"
                        onClick={() => onEdit(item)}
                        sx={{ 
                          bgcolor: alpha('#e9762b', 0.05), 
                          color: '#e9762b', 
                          borderRadius: '12px',
                          '&:hover': { bgcolor: '#e9762b', color: 'white' }
                        }}
                      >
                        <EditIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                  {canDelete && (
                    <Tooltip title="Delete Item">
                      <IconButton
                        size="small"
                        onClick={() => onDelete(item)}
                        sx={{ 
                          color: '#ef4444',
                          bgcolor: alpha('#ef4444', 0.05), 
                          borderRadius: '12px',
                          '&:hover': { bgcolor: '#ef4444', color: 'white' }
                        }}
                      >
                        <DeleteIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
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
        slotProps={{ paper: { sx: { borderRadius: '16px', boxShadow: '0 10px 35px rgba(0,0,0,0.1)', mt: 1 } } }}
      >
        {canEdit && (
          <MenuItem onClick={() => {
            if (activeItem) onToggleStatus(activeItem);
            handleCloseMenu();
          }}>
            <ListItemIcon sx={{ color: activeItem?.is_enabled ? 'warning.main' : 'success.main' }}>
              {activeItem?.is_enabled ? <ToggleOffIcon fontSize="small" /> : <ToggleOnIcon fontSize="small" />}
            </ListItemIcon>
            <ListItemText sx={{ '& .MuiTypography-root': { fontWeight: 800, fontSize: '0.85rem' } }}>
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
            <ListItemText sx={{ '& .MuiTypography-root': { fontWeight: 800, fontSize: '0.85rem' } }}>Edit</ListItemText>
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
            <ListItemText sx={{ '& .MuiTypography-root': { fontWeight: 800, fontSize: '0.85rem' } }}>Delete</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </TableContainer>
  );
}
