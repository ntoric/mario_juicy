"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Avatar,
  Tooltip,
  CircularProgress,
  Alert,
  Snackbar,
  Input,
  InputLabel,
  FormControl,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Stack,
  InputAdornment,
  useTheme,
  Grid,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useToast } from "@/context/ToastContext";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Image as ImageIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon,
} from "@mui/icons-material";
import { categoryService, Category } from "@/services/categoryService";
import { useAuth } from "@/hooks/useAuth";
import { getImageUrl } from "@/lib/getImageUrl";

export default function CategoryPage() {
  const theme = useTheme();
  const { hasPermission } = useAuth();
  const { showSuccess, showError } = useToast();
  const canAdd = hasPermission("catalogs.add_category");
  const canEdit = hasPermission("catalogs.change_category");
  const canDelete = hasPermission("catalogs.delete_category");

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // View states
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    is_enabled: true,
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Delete confirmation states
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  // Row actions menu states
  const [rowMenuAnchorEl, setRowMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [rowMenuActiveCategory, setRowMenuActiveCategory] = useState<Category | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await categoryService.getCategories();
      setCategories(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    const handleRefresh = () => fetchCategories();
    window.addEventListener('app-refresh', handleRefresh);
    return () => window.removeEventListener('app-refresh', handleRefresh);
  }, [fetchCategories]);

  const filteredCategories = useMemo(() => {
    return categories.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [categories, searchQuery]);

  const handleOpenCreate = () => {
    setView('create');
    setFormData({ name: "", is_enabled: true });
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleOpenEdit = (category: Category) => {
    setView('edit');
    setCurrentCategory(category);
    setFormData({
      name: category.name,
      is_enabled: category.is_enabled,
    });
    setSelectedImage(null);
    setImagePreview(category.image);
  };

  const handleCloseForm = () => {
    setView('list');
    setCurrentCategory(null);
  };

  const handleOpenRowMenu = (event: React.MouseEvent<HTMLElement>, category: Category) => {
    setRowMenuAnchorEl(event.currentTarget);
    setRowMenuActiveCategory(category);
  };

  const handleCloseRowMenu = () => {
    setRowMenuAnchorEl(null);
    setRowMenuActiveCategory(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      showError("Validation Error", "Name is required");
      return;
    }

    const data = new FormData();
    data.append("name", formData.name);
    data.append("is_enabled", String(formData.is_enabled));
    if (selectedImage) {
      data.append("image", selectedImage);
    }

    try {
      if (view === "create") {
        await categoryService.createCategory(data);
        showSuccess("Success", "Category created successfully");
      } else if (currentCategory) {
        await categoryService.updateCategory(currentCategory.id, data);
        showSuccess("Success", "Category updated successfully");
      }
      handleCloseForm();
      fetchCategories();
    } catch (err: any) {
      showError("Operation failed", err.message || "Something went wrong");
    }
  };

  const handleToggleStatus = async (category: Category) => {
    try {
      await categoryService.toggleStatus(category.id);
      fetchCategories();
      showSuccess("Success", `Category ${!category.is_enabled ? 'enabled' : 'disabled'} successfully`);
    } catch (err: any) {
      showError("Error", err.message || "Failed to toggle status");
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteId) {
      try {
        await categoryService.deleteCategory(deleteId);
        fetchCategories();
        showSuccess("Success", "Category deleted successfully");
      } catch (err: any) {
        showError("Error", err.message || "Failed to delete category");
      } finally {
        setOpenDeleteDialog(false);
        setDeleteId(null);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(dateString));
  };

  if (view === 'create' || view === 'edit') {
    return (
      <Box sx={{ 
        flexGrow: 1, bgcolor: '#fdfdfd', display: 'flex', flexDirection: 'column',
        minHeight: '100%',
        animation: 'slideInRight 0.2s ease-out',
        '@keyframes slideInRight': { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } }
      }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #e8e4d8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={handleCloseForm} sx={{ color: 'text.secondary' }}>
              <ToggleOffIcon sx={{ transform: 'rotate(180deg)' }} />
            </IconButton>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              {view === 'create' ? "Add New Category" : `Edit: ${currentCategory?.name}`}
            </Typography>
          </Box>
          <Button 
            variant="contained" 
            onClick={handleSubmit}
            sx={{ borderRadius: '12px', fontWeight: 800, px: 3 }}
          >
            SAVE CATEGORY
          </Button>
        </Box>

        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: { xs: 2, md: 4 }, bgcolor: '#f9f9f9' }}>
          <Grid container spacing={4} sx={{ justifyContent: 'center' }}>
            <Grid size={{ xs: 12, md: 8, lg: 6 }}>
              <Paper sx={{ p: 4, borderRadius: '24px', border: '1px solid #e8e4d8', boxShadow: '0 8px 32px rgba(0,0,0,0.03)' }}>
                <Stack spacing={4}>
                  <Box>
                    <Typography variant="overline" sx={{ fontWeight: 900, color: 'primary.main', mb: 2, display: 'block' }}>CATEGORY DETAILS</Typography>
                    <TextField
                      fullWidth
                      label="Category Name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      variant="outlined"
                      slotProps={{
                        input: { sx: { borderRadius: '12px', bgcolor: 'white' } },
                        inputLabel: { sx: { fontWeight: 700 } }
                      }}
                    />
                  </Box>

                  <Box>
                    <Typography variant="overline" sx={{ fontWeight: 900, color: 'primary.main', mb: 2, display: 'block' }}>VISUALS</Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 3, p: 3, bgcolor: '#fcfcfc', borderRadius: '16px', border: '1px solid #e8e4d8' }}>
                      <Avatar
                        src={getImageUrl(imagePreview)}
                        variant="rounded"
                        sx={{ width: 100, height: 100, bgcolor: "#FCF9EA", border: "2px dashed #e9762b", borderRadius: '20px' }}
                      >
                        <ImageIcon sx={{ color: "#e9762b", fontSize: 40 }} />
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 800, mb: 1.5 }}>Category Thumbnail</Typography>
                        <label htmlFor="category-image">
                          <Input
                            id="category-image"
                            type="file"
                            inputProps={{ accept: "image/*" }}
                            sx={{ display: "none" }}
                            onChange={handleImageChange}
                          />
                          <Button
                            variant="outlined"
                            component="span"
                            size="small"
                            startIcon={<ImageIcon />}
                            sx={{ borderRadius: '10px', fontWeight: 800, textTransform: 'none' }}
                          >
                            Update Image
                          </Button>
                        </label>
                      </Box>
                    </Box>
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 3, bgcolor: "#FCF9EA", borderRadius: '16px', border: "1px solid #e8e4d8" }}>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>Menu Availability</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                        If disabled, this category and its items won't appear in the POS menu.
                      </Typography>
                    </Box>
                    <Switch
                      checked={formData.is_enabled}
                      onChange={(e) => setFormData({ ...formData, is_enabled: e.target.checked })}
                      color="primary"
                    />
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ 
        mb: 3, 
        display: 'flex', 
        justifyContent: "space-between", 
        alignItems: "center", 
        gap: 2 
      }}>
        <Typography variant="h4" sx={{ fontWeight: 900, color: '#e9762b', fontSize: '1.5rem' }}>
          Categories
        </Typography>

        <Box sx={{ flexGrow: 1, maxWidth: { xs: '100%', sm: 400 } }}>
          <TextField
            fullWidth
            placeholder="Search categories..."
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
              onClick={fetchCategories} 
              sx={{ bgcolor: 'white', border: '1px solid #e8e4d8', borderRadius: '12px', width: 44, height: 44 }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>

          {canAdd && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreate}
              sx={{ borderRadius: '12px', height: 44, px: 3, fontWeight: 800 }}
            >
              ADD CATEGORY
            </Button>
          )}
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper} sx={{ flexGrow: 1, overflowY: 'auto', borderRadius: "20px", border: '1px solid #e8e4d8', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
            <CircularProgress size={40} thickness={4} />
          </Box>
        ) : (
          <Table>
            <TableHead sx={{ backgroundColor: alpha("#E9762B", 0.05) }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 900, py: 2.5 }}>IMAGE</TableCell>
                <TableCell sx={{ fontWeight: 900 }}>CATEGORY NAME</TableCell>
                <TableCell sx={{ fontWeight: 900 }}>STATUS</TableCell>
                <TableCell sx={{ fontWeight: 900, display: { xs: "none", sm: "table-cell" } }}>LAST UPDATED</TableCell>
                <TableCell sx={{ fontWeight: 900, textAlign: "right" }}>ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 10, color: 'text.secondary', fontWeight: 700 }}>
                    No categories match your search.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCategories.map((category) => (
                  <TableRow key={category.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell>
                      <Avatar
                        src={getImageUrl(category.image)}
                        variant="rounded"
                        sx={{ width: 48, height: 48, bgcolor: "#FCF9EA", border: "1px solid #e8e4d8", borderRadius: '12px' }}
                      >
                        <ImageIcon sx={{ color: "#e9762b", fontSize: 24 }} />
                      </Avatar>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>{category.name}</TableCell>
                    <TableCell>
                      <Chip
                        label={category.is_enabled ? "ACTIVE" : "DISABLED"}
                        size="small"
                        sx={{ 
                            fontWeight: 900, 
                            height: 24,
                            fontSize: '0.7rem',
                            borderRadius: '8px',
                            bgcolor: category.is_enabled ? alpha('#10b981', 0.1) : alpha('#64748b', 0.1),
                            color: category.is_enabled ? '#10b981' : '#64748b',
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ display: { xs: "none", sm: "table-cell" }, fontSize: '0.85rem', fontWeight: 600, color: 'text.secondary' }}>
                      {formatDate(category.updated_at)}
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', justifyContent: "flex-end", gap: 1 }}>
                        {canEdit && (
                            <IconButton
                              onClick={() => handleOpenEdit(category)}
                              sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05), color: 'primary.main', borderRadius: '10px' }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                        )}
                        {canDelete && (
                            <IconButton
                              onClick={() => {
                                  setDeleteId(category.id);
                                  setOpenDeleteDialog(true);
                              }}
                              sx={{ bgcolor: alpha(theme.palette.error.main, 0.05), color: 'error.main', borderRadius: '10px' }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={openDeleteDialog} 
        onClose={() => setOpenDeleteDialog(false)}
        slotProps={{ paper: { sx: { borderRadius: '24px', p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 900, color: 'error.main', fontSize: '1.25rem' }}>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontWeight: 600, color: 'text.secondary' }}>
            Are you sure you want to delete this category? This action is permanent and may affect linked menu items.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button onClick={() => setOpenDeleteDialog(false)} sx={{ fontWeight: 800, color: 'text.secondary' }}>
            CANCEL
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" sx={{ borderRadius: '12px', fontWeight: 900, px: 3 }}>
            YES, DELETE IT
          </Button>
        </DialogActions>
      </Dialog>

      {/* Row Actions Menu (Mobile/Tablet) */}
      <Menu
        anchorEl={rowMenuAnchorEl}
        open={Boolean(rowMenuAnchorEl)}
        onClose={handleCloseRowMenu}
        slotProps={{ paper: { sx: { borderRadius: '12px', mt: 1, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' } } }}
      >
        {canEdit && (
            <MenuItem onClick={() => {
                if (rowMenuActiveCategory) handleToggleStatus(rowMenuActiveCategory);
                handleCloseRowMenu();
            }}>
                <ListItemIcon sx={{ color: rowMenuActiveCategory?.is_enabled ? 'warning.main' : 'success.main' }}>
                    {rowMenuActiveCategory?.is_enabled ? <ToggleOffIcon fontSize="small" /> : <ToggleOnIcon fontSize="small" />}
                </ListItemIcon>
                <ListItemText sx={{ '& .MuiTypography-root': { fontWeight: 700 } }}>
                  {rowMenuActiveCategory?.is_enabled ? 'Disable' : 'Enable'}
                </ListItemText>
            </MenuItem>
        )}
        {canEdit && (
            <MenuItem onClick={() => {
                if (rowMenuActiveCategory) handleOpenEdit(rowMenuActiveCategory);
                handleCloseRowMenu();
            }}>
                <ListItemIcon sx={{ color: 'primary.main' }}>
                    <EditIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText sx={{ '& .MuiTypography-root': { fontWeight: 700 } }}>Edit</ListItemText>
            </MenuItem>
        )}
        {canDelete && (
            <MenuItem onClick={() => {
                if (rowMenuActiveCategory) {
                    setDeleteId(rowMenuActiveCategory.id);
                    setOpenDeleteDialog(true);
                }
                handleCloseRowMenu();
            }} sx={{ color: 'error.main' }}>
                <ListItemIcon sx={{ color: 'error.main' }}>
                    <DeleteIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText sx={{ '& .MuiTypography-root': { fontWeight: 700 } }}>Delete</ListItemText>
            </MenuItem>
        )}
      </Menu>
    </Box>
  );
}

