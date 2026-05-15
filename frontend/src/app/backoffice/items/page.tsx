"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  TextField,
  IconButton,
  Alert,
  CircularProgress,
  Tooltip,
  InputAdornment,
  Stack,
  useTheme,
  keyframes,
  alpha
} from "@mui/material";
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { useToast } from "@/context/ToastContext";
import { itemService, Item } from "@/services/itemService";
import { useAuth } from "@/hooks/useAuth";
import ItemTable from "@/components/backoffice/items/ItemTable";
import ItemForm from "@/components/backoffice/items/ItemForm";
import DeleteConfirmDialog from "@/components/backoffice/items/DeleteConfirmDialog";
import ItemDetails from "@/components/backoffice/items/ItemDetails";
import PageHeader from "@/components/backoffice/PageHeader";

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

export default function ItemsPage() {
  const theme = useTheme();
  const { hasPermission } = useAuth();
  const { showSuccess, showError } = useToast();
  const canAdd = hasPermission("items");
  const canEdit = hasPermission("items");
  const canDelete = hasPermission("items");

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // View states
  const [view, setView] = useState<'list' | 'create' | 'edit' | 'details'>('list');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await itemService.getItems();
      setItems(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load items");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    const handleRefresh = () => fetchItems();
    window.addEventListener('app-refresh', handleRefresh);
    return () => window.removeEventListener('app-refresh', handleRefresh);
  }, [fetchItems]);

  const filteredItems = useMemo(() => {
    return items.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.code && item.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.category_name && item.category_name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [items, searchQuery]);

  const handleOpenCreate = () => {
    setSelectedItem(null);
    setView('create');
  };

  const handleOpenEdit = (item: Item) => {
    setSelectedItem(item);
    setView('edit');
  };

  const handleOpenDetails = (item: Item) => {
    setSelectedItem(item);
    setView('details');
  };

  const handleModalSubmit = async (formData: FormData) => {
    try {
      if (view === "create") {
        await itemService.createItem(formData);
        showSuccess("Success", "Item created successfully");
      } else if (selectedItem) {
        await itemService.updateItem(selectedItem.id, formData);
        showSuccess("Success", "Item updated successfully");
      }
      setView('list');
      fetchItems();
    } catch (err: any) {
      showError("Operation failed", err.message || "Something went wrong");
      throw err;
    }
  };

  const handleToggleStatus = async (item: Item) => {
    try {
      await itemService.toggleStatus(item.id);
      fetchItems();
      showSuccess("Success", `Item ${item.is_enabled ? 'disabled' : 'enabled'} successfully`);
    } catch (err: any) {
      showError("Error", err.message || "Failed to toggle status");
    }
  };

  // Form modal rendering removed from early return, moved to main return

  if (view === 'details' && selectedItem) {
    return (
      <ItemDetails
        item={selectedItem}
        onClose={() => setView('list')}
        onEdit={(item) => {
          setSelectedItem(item);
          setView('edit');
        }}
        canEdit={canEdit}
      />
    );
  }

  return (
    <Box sx={{ position: 'relative', height: '100%', display: "flex", flexDirection: "column", p: { xs: 2, md: 3 }, overflow: 'hidden' }}>
      {/* Decorative Background Elements */}
      <Box sx={{ position: 'absolute', top: -120, right: -120, width: 450, height: 450, background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.06)} 0%, transparent 70%)`, borderRadius: '50%', zIndex: 0, pointerEvents: 'none' }} />
      <Box sx={{ position: 'absolute', bottom: -150, left: -150, width: 500, height: 500, background: 'radial-gradient(circle, rgba(255,184,0,0.05) 0%, transparent 70%)', borderRadius: '50%', zIndex: 0, pointerEvents: 'none' }} />

      <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Modern Header Row via Portal */}
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
              Menu Catalog
            </Typography>
          </Box>

          <Stack direction="row" spacing={2} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            <Box sx={{ flexGrow: 1, maxWidth: { xs: '100%', sm: 350 } }}>
              <TextField
                fullWidth
                placeholder="Search items, categories..."
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
                      borderColor: theme.palette.divider,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                      fontWeight: 700
                    }
                  }
                }}
              />
            </Box>

            <Tooltip title="Refresh Catalog">
              <IconButton
                onClick={fetchItems}
                sx={{
                  bgcolor: 'white',
                  border: '1px solid',
                  borderColor: theme.palette.divider,
                  borderRadius: '0.65rem',
                  width: 48,
                  height: 48,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                  transition: 'all 0.3s ease',
                  '&:hover': { transform: 'rotate(180deg)', color: theme.palette.primary.main }
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
                ADD ITEM
              </Button>
            )}
          </Stack>
        </PageHeader>

        {error && (
          <Alert severity="error" sx={{ mb: 4, borderRadius: '0.65rem', border: '1px solid rgba(239, 68, 68, 0.15)' }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0, px: 0.5, pb: 4 }}>
          {loading ? (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexGrow: 1, gap: 2 }}>
              <CircularProgress size={40} thickness={4} sx={{ color: theme.palette.primary.main }} />
              <Typography color="text.secondary" variant="body2" sx={{ fontWeight: 800 }}>Fetching catalog...</Typography>
            </Box>
          ) : (
            <ItemTable
              items={filteredItems}
              onEdit={handleOpenEdit}
              onDelete={(item) => {
                setItemToDelete(item);
                setDeleteOpen(true);
              }}
              onToggleStatus={handleToggleStatus}
              onViewDetails={handleOpenDetails}
              canEdit={canEdit}
              canDelete={canDelete}
            />
          )}
        </Box>
      </Box>

      <DeleteConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={async () => {
          if (!itemToDelete) return;
          try {
            await itemService.deleteItem(itemToDelete.id);
            showSuccess("Success", "Item deleted successfully");
            fetchItems();
          } catch (err: any) {
            showError("Error", err.message || "Failed to delete item");
          } finally {
            setDeleteOpen(false);
            setItemToDelete(null);
          }
        }}
        title={`Delete ${itemToDelete?.name}?`}
      />

      <ItemForm
        open={view === 'create' || view === 'edit'}
        mode={view === 'create' ? 'create' : 'edit'}
        item={selectedItem}
        onClose={() => setView('list')}
        onSubmit={handleModalSubmit}
      />
    </Box>
  );
}
