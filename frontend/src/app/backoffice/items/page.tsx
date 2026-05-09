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

  if (view === 'create' || view === 'edit') {
    return (
      <ItemForm 
        open={true}
        mode={view === 'create' ? 'create' : 'edit'}
        item={selectedItem}
        onClose={() => setView('list')}
        onSubmit={handleModalSubmit}
      />
    );
  }

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
      <Box sx={{ position: 'absolute', top: -120, right: -120, width: 450, height: 450, background: 'radial-gradient(circle, rgba(233,118,43,0.06) 0%, transparent 70%)', borderRadius: '50%', zIndex: 0, pointerEvents: 'none' }} />
      <Box sx={{ position: 'absolute', bottom: -150, left: -150, width: 500, height: 500, background: 'radial-gradient(circle, rgba(255,184,0,0.05) 0%, transparent 70%)', borderRadius: '50%', zIndex: 0, pointerEvents: 'none' }} />
      
      <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Modern Header Row */}
        <Box sx={{ 
          mb: 4, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: { xs: 'flex-start', sm: 'center' }, 
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 3 
        }}>
          <Box>
            <Typography variant="h3" sx={{ 
              fontWeight: 1000, 
              background: 'linear-gradient(90deg, #e9762b 0%, #ffb800 100%)', 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent', 
              fontSize: { xs: '2.5rem', md: '3rem' }, 
              letterSpacing: '-0.04em',
              lineHeight: 1
            }}>
              Menu Catalog
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mt: 1, opacity: 0.8 }}>
              Manage your food and beverage offerings.
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
                        <SearchIcon sx={{ color: "#e9762b", fontSize: 22 }} />
                      </InputAdornment>
                    ),
                    sx: { 
                      borderRadius: '16px', 
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
                  borderRadius: '16px', 
                  width: 48, 
                  height: 48,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
                  transition: 'all 0.3s ease',
                  '&:hover': { transform: 'rotate(180deg)', color: '#e9762b' }
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
                  borderRadius: '16px', 
                  height: 48, 
                  px: 3, 
                  fontWeight: 1000,
                  background: 'linear-gradient(135deg, #1a1a1a 0%, #333 100%)',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 30px rgba(0,0,0,0.2)' }
                }}
              >
                ADD ITEM
              </Button>
            )}
          </Stack>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 4, borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.15)' }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 0.5, pb: 4, '&::-webkit-scrollbar': { width: 6 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(233,118,43,0.2)', borderRadius: 3 } }}>
          {loading ? (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 400, gap: 2 }}>
              <CircularProgress size={40} thickness={4} sx={{ color: '#e9762b' }} />
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
    </Box>
  );
}
