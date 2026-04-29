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
} from "@mui/material";
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { toast } from "sonner";
import { itemService, Item } from "@/services/itemService";
import { useAuth } from "@/hooks/useAuth";
import ItemTable from "@/components/backoffice/items/ItemTable";
import ItemForm from "@/components/backoffice/items/ItemForm";
import DeleteConfirmDialog from "@/components/backoffice/items/DeleteConfirmDialog";
import ItemDetails from "@/components/backoffice/items/ItemDetails";

export default function ItemsPage() {
  const { hasPermission } = useAuth();
  const canAdd = hasPermission("catalogs.add_item");
  const canEdit = hasPermission("catalogs.change_item");
  const canDelete = hasPermission("catalogs.delete_item");

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
        toast.success("Item created successfully");
      } else if (selectedItem) {
        await itemService.updateItem(selectedItem.id, formData);
        toast.success("Item updated successfully");
      }
      setView('list');
      fetchItems();
    } catch (err: any) {
      toast.error(err.message || "Operation failed");
      throw err;
    }
  };

  const handleToggleStatus = async (item: Item) => {
    try {
      await itemService.toggleStatus(item.id);
      fetchItems();
      toast.success(`Item ${item.is_enabled ? 'disabled' : 'enabled'} successfully`);
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle status");
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
    <Box sx={{ p: { xs: 1.5, md: 2 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Optimized Compact Header */}
      <Box sx={{ 
        mb: 2, 
        display: 'flex', 
        justifyContent: "space-between", 
        alignItems: "center", 
        gap: 2 
      }}>
        <Typography variant="h4" sx={{ fontWeight: 900, color: '#e9762b', fontSize: '1.5rem', whiteSpace: 'nowrap', display: { xs: 'none', lg: 'block' } }}>
          Menu Items
        </Typography>

        <Box sx={{ flexGrow: 1, maxWidth: { xs: '100%', sm: 400 } }}>
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
                    <SearchIcon sx={{ color: "text.secondary", fontSize: 20 }} />
                  </InputAdornment>
                ),
                sx: { borderRadius: '12px', height: 44, bgcolor: 'white' }
              }
            }}
          />
        </Box>

        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Tooltip title="Refresh Catalog">
            <IconButton 
              onClick={fetchItems} 
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
              ADD ITEM
            </Button>
          )}
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", py: 10, gap: 2 }}>
          <CircularProgress size={40} thickness={4} />
          <Typography color="text.secondary" variant="body2" sx={{ fontWeight: 700 }}>Fetching catalog...</Typography>
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

      <DeleteConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={async () => {
          if (!itemToDelete) return;
          try {
            await itemService.deleteItem(itemToDelete.id);
            toast.success("Item deleted successfully");
            fetchItems();
          } catch (err: any) {
            toast.error(err.message || "Failed to delete item");
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
