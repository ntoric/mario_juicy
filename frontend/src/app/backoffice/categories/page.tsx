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
} from "@mui/material";
import { toast } from 'sonner';
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
  const { hasPermission } = useAuth();
  const canAdd = hasPermission("catalogs.add_category");
  const canEdit = hasPermission("catalogs.change_category");
  const canDelete = hasPermission("catalogs.delete_category");

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog states
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
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
    setDialogMode("create");
    setFormData({ name: "", is_enabled: true });
    setSelectedImage(null);
    setImagePreview(null);
    setOpenDialog(true);
  };

  const handleOpenEdit = (category: Category) => {
    setDialogMode("edit");
    setCurrentCategory(category);
    setFormData({
      name: category.name,
      is_enabled: category.is_enabled,
    });
    setSelectedImage(null);
    setImagePreview(category.image);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
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
      toast.error("Name is required");
      return;
    }

    const data = new FormData();
    data.append("name", formData.name);
    data.append("is_enabled", String(formData.is_enabled));
    if (selectedImage) {
      data.append("image", selectedImage);
    }

    try {
      if (dialogMode === "create") {
        await categoryService.createCategory(data);
        toast.success("Category created successfully");
      } else if (currentCategory) {
        await categoryService.updateCategory(currentCategory.id, data);
        toast.success("Category updated successfully");
      }
      handleCloseDialog();
      fetchCategories();
    } catch (err: any) {
      toast.error(err.message || "Operation failed");
    }
  };

  const handleToggleStatus = async (category: Category) => {
    try {
      await categoryService.toggleStatus(category.id);
      fetchCategories();
      toast.success(`Category ${!category.is_enabled ? 'enabled' : 'disabled'} successfully`);
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle status");
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteId) {
      try {
        await categoryService.deleteCategory(deleteId);
        fetchCategories();
        toast.success("Category deleted successfully");
      } catch (err: any) {
        toast.error(err.message || "Failed to delete category");
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

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ 
        mb: 4, 
        display: 'flex', 
        justifyContent: "space-between", 
        alignItems: { xs: "flex-start", sm: "center" }, 
        flexWrap: "wrap", 
        gap: 2, 
        flexDirection: { xs: "column", sm: "row" } 
      }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 500, color: '#e9762b', fontSize: '1.5rem' }}>
            Category Management
          </Typography>
        </Box>
        {canAdd && (
            <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreate}
            fullWidth={false}
            sx={{ height: 48, borderRadius: 2, width: { xs: '100%', sm: 'auto' } }}
            >
            Add Category
            </Button>
        )}
      </Box>

      <Card sx={{ mb: 4, p: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, sm: 2 } }}>
          <TextField
            fullWidth
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: <SearchIcon sx={{ color: "text.secondary", mr: 1 }} />,
              }
            }}
            size="small"
          />
          <IconButton onClick={fetchCategories} title="Refresh">
            <RefreshIcon />
          </IconButton>
        </Box>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper} sx={{ borderRadius: "3px", overflow: "hidden" }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Table>
            <TableHead sx={{ backgroundColor: "#E9762B" }}>
              <TableRow>
                <TableCell sx={{ color: "white", fontWeight: 600 }}>Image</TableCell>
                <TableCell sx={{ color: "white", fontWeight: 600 }}>Name</TableCell>
                <TableCell sx={{ color: "white", fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ color: "white", fontWeight: 600, display: { xs: "none", sm: "table-cell" } }}>Created</TableCell>
                <TableCell sx={{ color: "white", fontWeight: 600, display: { xs: "none", md: "table-cell" } }}>Updated</TableCell>
                <TableCell sx={{ color: "white", fontWeight: 600, textAlign: "right" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                    No categories found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCategories.map((category) => (
                  <TableRow key={category.id} hover>
                    <TableCell>
                      <Avatar
                        src={getImageUrl(category.image)}
                        variant="rounded"
                        sx={{ width: 48, height: 48, bgcolor: "#FCF9EA", border: "1px solid #e8e4d8" }}
                      >
                        <ImageIcon sx={{ color: "#8d6e63" }} />
                      </Avatar>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{category.name}</TableCell>
                    <TableCell>
                      <Chip
                        label={category.is_enabled ? "Active" : "Disabled"}
                        size="small"
                        color={category.is_enabled ? "success" : "default"}
                        sx={{ 
                            fontWeight: 600, 
                            height: 24,
                            fontSize: '0.75rem',
                            '& .MuiChip-label': { px: 1 }
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                      {formatDate(category.created_at)}
                    </TableCell>
                    <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                      {formatDate(category.updated_at)}
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: { xs: "none", md: "flex" }, justifyContent: "flex-end" }}>
                        {canEdit && (
                            <IconButton
                            color="primary"
                            size="small"
                            onClick={() => handleOpenEdit(category)}
                            sx={{ mr: 1 }}
                            >
                            <EditIcon fontSize="small" />
                            </IconButton>
                        )}
                        {canDelete && (
                            <IconButton
                            color="error"
                            size="small"
                            onClick={() => {
                                setDeleteId(category.id);
                                setOpenDeleteDialog(true);
                            }}
                            >
                            <DeleteIcon fontSize="small" />
                            </IconButton>
                        )}
                      </Box>

                      <Box sx={{ display: { xs: "flex", md: "none" }, justifyContent: "flex-end" }}>
                        {(canEdit || canDelete) && (
                            <IconButton
                            size="small"
                            onClick={(e) => handleOpenRowMenu(e, category)}
                            >
                            <MoreVertIcon />
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

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700 }}>
          {dialogMode === "create" ? "Add New Category" : "Edit Category"}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3, py: 1 }}>
            <TextField
              fullWidth
              label="Category Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              variant="outlined"
            />

            <Box>
              <InputLabel sx={{ mb: 1, fontSize: "0.875rem", fontWeight: 500 }}>
                Category Image (Optional)
              </InputLabel>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Avatar
                  src={getImageUrl(imagePreview)}
                  variant="rounded"
                  sx={{ width: 80, height: 80, bgcolor: "#FCF9EA", border: "1px dashed #e8e4d8" }}
                >
                  <ImageIcon sx={{ color: "#8d6e63", fontSize: 40 }} />
                </Avatar>
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
                  >
                    Choose Image
                  </Button>
                </label>
              </Box>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Typography variant="body2" color="text.secondary">
                Enable this category for use in POS
              </Typography>
              <Switch
                checked={formData.is_enabled}
                onChange={(e) => setFormData({ ...formData, is_enabled: e.target.checked })}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDialog} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="contained" sx={{ px: 4 }}>
            {dialogMode === "create" ? "Create" : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Category?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this category? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDeleteDialog(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>



      {/* Row Actions Menu (Mobile/Tablet) */}
      <Menu
        anchorEl={rowMenuAnchorEl}
        open={Boolean(rowMenuAnchorEl)}
        onClose={handleCloseRowMenu}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {canEdit && (
            <MenuItem onClick={() => {
                if (rowMenuActiveCategory) handleToggleStatus(rowMenuActiveCategory);
                handleCloseRowMenu();
            }}>
                <ListItemIcon sx={{ color: rowMenuActiveCategory?.is_enabled ? 'warning.main' : 'success.main' }}>
                    {rowMenuActiveCategory?.is_enabled ? <ToggleOffIcon fontSize="small" /> : <ToggleOnIcon fontSize="small" />}
                </ListItemIcon>
                <ListItemText>{rowMenuActiveCategory?.is_enabled ? 'Disable' : 'Enable'}</ListItemText>
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
                <ListItemText>Edit</ListItemText>
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
                <ListItemText>Delete</ListItemText>
            </MenuItem>
        )}
      </Menu>
    </Box>
  );
}
