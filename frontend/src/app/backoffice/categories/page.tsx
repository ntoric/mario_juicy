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
  Input,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Stack,
  InputAdornment,
  useTheme,
  Grid,
  useMediaQuery,
  keyframes,
} from "@mui/material";
import PageHeader from "@/components/backoffice/PageHeader";
import { alpha } from "@mui/material/styles";
import { useToast } from "@/context/ToastContext";
import {
  AddOutlined as AddIcon,
  EditOutlined as EditIcon,
  DeleteOutlined as DeleteIcon,
  ImageOutlined as ImageIcon,
  RefreshOutlined as RefreshIcon,
  SearchOutlined as SearchIcon,
  MoreVertOutlined as MoreVertIcon,
  ToggleOnOutlined as ToggleOnIcon,
  ToggleOffOutlined as ToggleOffIcon,
  ArrowBackOutlined as ArrowBackIcon,
} from "@mui/icons-material";
import { categoryService, Category } from "@/services/categoryService";
import { useAuth } from "@/hooks/useAuth";
import { getImageUrl } from "@/lib/getImageUrl";

// --- Animations ---
const slideInRight = keyframes`
  from { transform: translateX(30px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

export default function CategoryPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const { hasPermission } = useAuth();
  const { showSuccess, showError } = useToast();
  
  const canAdd = hasPermission("categories");
  const canEdit = hasPermission("categories");
  const canDelete = hasPermission("categories");

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
        flexGrow: 1, 
        bgcolor: 'transparent', 
        display: 'flex', 
        flexDirection: 'column',
        minHeight: '100%',
        animation: `${fadeIn} 0.3s ease-out`,
        position: 'relative',
        p: { xs: 2, md: 4 }
      }}>
        {/* Background Blobs */}
        <Box sx={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.05)} 0%, transparent 70%)`, borderRadius: '50%', zIndex: 0 }} />
        
        <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 800, mx: 'auto', width: '100%' }}>
          <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton 
                onClick={handleCloseForm} 
                sx={{ 
                  bgcolor: 'white', 
                  border: '1px solid', 
                  borderColor: alpha(theme.palette.divider, 0.1), 
                  borderRadius: '0.65rem',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                  '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05), color: theme.palette.primary.main }
                }}
              >
                <ArrowBackIcon />
              </IconButton>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 600, letterSpacing: '-0.02em', color: '#1a1a1a' }}>
                  {view === 'create' ? "Add Category" : "Edit Category"}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  Fill in the details below to {view === 'create' ? 'create a new' : 'update the'} category.
                </Typography>
              </Box>
            </Box>
            <Button 
              variant="contained" 
              onClick={handleSubmit}
              sx={{ 
                borderRadius: '0.65rem', 
                fontWeight: 600, 
                px: 4, 
                height: 48,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 12px 25px ${alpha(theme.palette.primary.main, 0.4)}` }
              }}
            >
              SAVE CHANGES
            </Button>
          </Box>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <Card sx={{ 
                p: 4, 
                borderRadius: '0.65rem', 
                border: '1px solid', 
                borderColor: alpha(theme.palette.divider, 0.08), 
                boxShadow: '0 20px 50px rgba(0,0,0,0.04)',
                bgcolor: 'white',
              }}>
                <Stack spacing={4}>
                  <Box>
                    <Typography variant="overline" sx={{ fontWeight: 600, color: theme.palette.primary.main, mb: 2, display: 'block', letterSpacing: '0.1em' }}>GENERAL INFORMATION</Typography>
                    <TextField
                      fullWidth
                      label="Category Name"
                      placeholder="e.g. Italian Pizzas, Refreshments..."
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      variant="outlined"
                      slotProps={{
                        input: { sx: { borderRadius: '0.65rem', bgcolor: 'white', fontWeight: 700 } },
                        inputLabel: { sx: { fontWeight: 700 } }
                      }}
                    />
                  </Box>

                  <Box>
                    <Typography variant="overline" sx={{ fontWeight: 600, color: theme.palette.primary.main, mb: 2, display: 'block', letterSpacing: '0.1em' }}>CATEGORY VISUALS</Typography>
                    <Box sx={{ 
                      display: "flex", 
                      alignItems: "center", 
                      flexDirection: { xs: 'column', sm: 'row' },
                      gap: 4, 
                      p: 3, 
                      bgcolor: alpha(theme.palette.primary.main, 0.02), 
                      borderRadius: '0.65rem', 
                      border: '2px dashed',
                      borderColor: alpha(theme.palette.primary.main, 0.1)
                    }}>
                      <Avatar
                        src={getImageUrl(imagePreview)}
                        variant="rounded"
                        sx={{ 
                          width: 140, 
                          height: 140, 
                          bgcolor: "white", 
                          border: "1px solid",
                          borderColor: alpha(theme.palette.divider, 0.1),
                          borderRadius: '0.65rem',
                          boxShadow: '0 8px 20px rgba(0,0,0,0.05)'
                        }}
                      >
                        <ImageIcon sx={{ color: alpha('#1a1a1a', 0.1), fontSize: 60 }} />
                      </Avatar>
                      <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>Cover Image</Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 3 }}>
                          Recommended size: 512x512px. PNG, JPG or WEBP formats supported.
                        </Typography>
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
                            startIcon={<ImageIcon />}
                            sx={{ 
                              borderRadius: '0.65rem', 
                              fontWeight: 600, 
                              textTransform: 'none', 
                              px: 3,
                              borderColor: alpha('#1a1a1a', 0.2),
                              color: '#1a1a1a',
                              '&:hover': { borderColor: '#1a1a1a', bgcolor: alpha('#1a1a1a', 0.05) }
                            }}
                          >
                            Upload New Image
                          </Button>
                        </label>
                      </Box>
                    </Box>
                  </Box>

                  <Box sx={{ 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "space-between", 
                    p: 3, 
                    bgcolor: alpha('#10b981', 0.05), 
                    borderRadius: '0.65rem', 
                    border: "1px solid",
                    borderColor: alpha('#10b981', 0.1)
                  }}>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Available in POS</Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        Enable this to make this category and its items visible to staff during billing.
                      </Typography>
                    </Box>
                    <Switch
                      checked={formData.is_enabled}
                      onChange={(e) => setFormData({ ...formData, is_enabled: e.target.checked })}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': { color: '#10b981' },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#10b981' }
                      }}
                    />
                  </Box>
                </Stack>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      p: { xs: 2, md: 4 }, 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      position: 'relative',
      overflow: 'hidden'
    }}>
       {/* Decorative Background Elements */}
      <Box sx={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.06)} 0%, transparent 70%)`, borderRadius: '50%', zIndex: 0, pointerEvents: 'none' }} />
      
      <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <PageHeader>
          <Box>
            <Typography variant="h3" sx={{ 
              fontWeight: 600, 
              background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`, 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent', 
              fontSize: '2rem', 
              letterSpacing: '-0.04em',
              lineHeight: 1
            }}>
              Categories
            </Typography>
          </Box>

          <Stack direction="row" spacing={2} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            <Box sx={{ flexGrow: 1, maxWidth: { xs: '100%', sm: 300 } }}>
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
                        <SearchIcon sx={{ color: theme.palette.primary.main, fontSize: 22 }} />
                      </InputAdornment>
                    ),
                    sx: { 
                      borderRadius: '0.65rem', 
                      height: 48, 
                      bgcolor: 'white', 
                      border: '1px solid',
                      borderColor: alpha(theme.palette.divider, 0.1),
                      boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                      fontWeight: 700
                    }
                  }
                }}
              />
            </Box>

            <Tooltip title="Refresh List">
              <IconButton 
                onClick={fetchCategories} 
                sx={{ 
                  bgcolor: 'white', 
                  border: '1px solid',
                  borderColor: alpha(theme.palette.divider, 0.1), 
                  borderRadius: '0.65rem', 
                  width: 48, 
                  height: 48,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                  '&:hover': { color: theme.palette.primary.main, transform: 'rotate(180deg)' },
                  transition: 'all 0.3s ease'
                }}
              >
                <RefreshIcon sx={{ animation: loading ? `${spin} 1s linear infinite` : 'none' }} />
              </IconButton>
            </Tooltip>

            {canAdd && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleOpenCreate}
                sx={{ 
                  borderRadius: '0.65rem', 
                  height: 48, 
                  px: 3, 
                  fontWeight: 600,
                  background: 'linear-gradient(135deg, #1a1a1a 0%, #333 100%)',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 30px rgba(0,0,0,0.2)' }
                }}
              >
                {!isMobile ? "ADD CATEGORY" : ""}
              </Button>
            )}
          </Stack>
        </PageHeader>

        {error && (
          <Alert severity="error" sx={{ mb: 4, borderRadius: '0.65rem', border: '1px solid rgba(239, 68, 68, 0.15)' }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <TableContainer sx={{ 
          flexGrow: 1, 
          overflow: 'auto', 
          borderRadius: '0.65rem', 
          border: '1px solid',
          borderColor: alpha(theme.palette.divider, 0.08), 
          boxShadow: '0 20px 60px rgba(0,0,0,0.04)',
          bgcolor: 'white',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: 'center', height: 400 }}>
              <CircularProgress size={40} thickness={4} sx={{ color: theme.palette.primary.main }} />
            </Box>
          ) : (
            <Table stickyHeader sx={{ '& .MuiTableCell-stickyHeader': { bgcolor: 'white', borderBottom: '2px solid', borderColor: alpha(theme.palette.divider, 0.05) } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, py: 2.5, fontSize: '0.7rem', color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.1em', pl: 4 }}>IMAGE</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.7rem', color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.1em' }}>CATEGORY NAME</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.7rem', color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.1em' }}>STATUS</TableCell>
                  {!isTablet && (
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.7rem', color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.1em' }}>LAST UPDATED</TableCell>
                  )}
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.7rem', color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: "right", pr: 4 }}>ACTIONS</TableCell>
                </TableRow>
              </TableHead>
              <TableBody sx={{ bgcolor: 'transparent' }}>
                {filteredCategories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 12 }}>
                      <Box sx={{ opacity: 0.5 }}>
                        <ImageIcon sx={{ fontSize: 60, mb: 2, color: alpha('#1a1a1a', 0.1) }} />
                        <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.secondary' }}>No categories found</Typography>
                        <Typography variant="body2" sx={{ color: 'text.disabled', fontWeight: 600 }}>Try adjusting your search query.</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCategories.map((category) => (
                    <TableRow 
                      key={category.id} 
                      hover 
                      sx={{ 
                        transition: 'all 0.2s ease',
                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) },
                        '& .MuiTableCell-root': { py: 2, borderBottom: '1px solid', borderColor: alpha(theme.palette.divider, 0.04) }
                      }}
                    >
                      <TableCell sx={{ pl: 4 }}>
                        <Avatar
                          src={getImageUrl(category.image)}
                          variant="rounded"
                          sx={{ 
                            width: 54, 
                            height: 54, 
                            bgcolor: "white", 
                            border: "1px solid",
                            borderColor: alpha(theme.palette.divider, 0.08), 
                            borderRadius: '0.65rem',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                          }}
                        >
                          <ImageIcon sx={{ color: alpha('#1a1a1a', 0.1), fontSize: 24 }} />
                        </Avatar>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '1rem', color: '#1a1a1a' }}>
                        {category.name}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={category.is_enabled ? "ACTIVE" : "DISABLED"}
                          size="small"
                          sx={{ 
                              fontWeight: 600, 
                              height: 26,
                              px: 1,
                              fontSize: '0.65rem',
                              borderRadius: '0.65rem',
                              bgcolor: category.is_enabled ? alpha('#10b981', 0.1) : alpha('#64748b', 0.1),
                              color: category.is_enabled ? '#10b981' : '#64748b',
                              border: '1px solid',
                              borderColor: category.is_enabled ? alpha('#10b981', 0.2) : alpha('#64748b', 0.2),
                          }}
                        />
                      </TableCell>
                      {!isTablet && (
                        <TableCell sx={{ fontSize: '0.85rem', fontWeight: 700, color: 'text.secondary', opacity: 0.8 }}>
                          {formatDate(category.updated_at)}
                        </TableCell>
                      )}
                      <TableCell align="right" sx={{ pr: 4 }}>
                        <Box sx={{ display: 'flex', justifyContent: "flex-end", gap: 1.5 }}>
                          {canEdit && (
                              <Tooltip title="Edit Category">
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenEdit(category)}
                                  sx={{ 
                                    bgcolor: alpha(theme.palette.primary.main, 0.05), 
                                    color: theme.palette.primary.main, 
                                    borderRadius: '0.65rem',
                                    '&:hover': { bgcolor: theme.palette.primary.main, color: 'white' }
                                  }}
                                >
                                  <EditIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                              </Tooltip>
                          )}
                          {canDelete && (
                              <Tooltip title="Delete Category">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                      setDeleteId(category.id);
                                      setOpenDeleteDialog(true);
                                  }}
                                  sx={{ 
                                    bgcolor: alpha('#ef4444', 0.05), 
                                    color: '#ef4444', 
                                    borderRadius: '0.65rem',
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
          slotProps={{ paper: { sx: { borderRadius: '0.65rem', p: 2, maxWidth: 450 } } }}
        >
          <DialogTitle sx={{ textAlign: 'center', pb: 0 }}>
            <Box sx={{ p: 2, borderRadius: '0.65rem', bgcolor: alpha('#ef4444', 0.05), display: 'inline-flex', mb: 2 }}>
              <DeleteIcon sx={{ fontSize: 40, color: '#ef4444' }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 600, color: '#1a1a1a', mb: 1 }}>Confirm Deletion</Typography>
          </DialogTitle>
          <DialogContent>
            <Typography align="center" sx={{ fontWeight: 600, color: 'text.secondary' }}>
              Are you sure you want to permanently delete this category? All associated items may become uncategorized.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 3, justifyContent: 'center', gap: 2 }}>
            <Button 
              onClick={() => setOpenDeleteDialog(false)} 
              sx={{ 
                fontWeight: 600, 
                color: 'text.disabled',
                px: 3,
                borderRadius: '0.65rem',
                '&:hover': { color: 'text.primary' }
              }}
            >
              KEEP IT
            </Button>
            <Button 
              onClick={handleDeleteConfirm} 
              variant="contained"
              sx={{ 
                borderRadius: '0.65rem', 
                fontWeight: 600, 
                px: 4,
                bgcolor: '#ef4444',
                boxShadow: '0 8px 20px rgba(239,68,68,0.25)',
                '&:hover': { bgcolor: '#dc2626', transform: 'translateY(-2px)' }
              }}
            >
              DELETE NOW
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
}
