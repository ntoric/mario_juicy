"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  TextField,
  IconButton,
  Alert,
  Snackbar,
} from "@mui/material";
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { itemService, Item } from "@/services/itemService";
import ItemTable from "@/components/backoffice/items/ItemTable";
import ItemModal from "@/components/backoffice/items/ItemModal";
import DeleteConfirmDialog from "@/components/backoffice/items/DeleteConfirmDialog";
import ItemDetailDialog from "@/components/backoffice/items/ItemDetailDialog";
import { useAuth } from "@/hooks/useAuth";
import Preloader from "@/components/ui/Preloader";

export default function ItemsPage() {
  const { hasPermission } = useAuth();
  const canAdd = hasPermission("catalogs.add_item");
  const canEdit = hasPermission("catalogs.change_item");
  const canDelete = hasPermission("catalogs.delete_item");

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [openModal, setOpenModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [currentItem, setCurrentItem] = useState<Item | null>(null);

  // Detail dialog states
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [itemForDetail, setItemForDetail] = useState<Item | null>(null);

  // Delete dialog states
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

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
      (item.code && item.code.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [items, searchQuery]);

  const handleOpenCreate = () => {
    setModalMode("create");
    setCurrentItem(null);
    setOpenModal(true);
  };

  const handleOpenEdit = (item: Item) => {
    setModalMode("edit");
    setCurrentItem(item);
    setOpenModal(true);
  };

  const handleOpenDelete = (item: Item) => {
    setItemToDelete(item);
    setOpenDeleteDialog(true);
  };

  const handleToggleStatus = async (item: Item) => {
    try {
      await itemService.toggleStatus(item.id);
      setItems(items.map(i => 
        i.id === item.id ? { ...i, is_enabled: !i.is_enabled } : i
      ));
      showSnackbar(`Item ${!item.is_enabled ? 'enabled' : 'disabled'} successfully`);
    } catch (err: any) {
      showSnackbar(err.message || "Failed to toggle status", "error");
    }
  };

  const handleDeleteConfirm = async () => {
    if (itemToDelete) {
      try {
        await itemService.deleteItem(itemToDelete.id);
        setItems(items.filter((i) => i.id !== itemToDelete.id));
        showSnackbar("Item deleted successfully");
      } catch (err: any) {
        showSnackbar(err.message || "Failed to delete item", "error");
      } finally {
        setOpenDeleteDialog(false);
        setItemToDelete(null);
      }
    }
  };

  const handleModalSubmit = async (formData: FormData) => {
    try {
      if (modalMode === "create") {
        await itemService.createItem(formData);
        showSnackbar("Item created successfully");
      } else if (currentItem) {
        await itemService.updateItem(currentItem.id, formData);
        showSnackbar("Item updated successfully");
      }
      fetchItems();
    } catch (err: any) {
      showSnackbar(err.message || "Operation failed", "error");
      throw err;
    }
  };

  const handleViewDetails = (item: Item) => {
    setItemForDetail(item);
    setOpenDetailDialog(true);
  };

  const showSnackbar = (message: string, severity: "success" | "error" = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", p: { xs: 2, md: 3 }, overflow: "hidden" }}>
      <Box sx={{ 
        mb: 4, 
        display: { xs: 'none', md: 'flex' }, 
        justifyContent: "space-between", 
        alignItems: { xs: "flex-start", sm: "center" }, 
        gap: 2, 
        flexDirection: { xs: "column", sm: "row" } 
      }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 500, color: '#e9762b', fontSize: '1.5rem' }}>
            Items Management
          </Typography>
        </Box>
        {canAdd && (
            <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreate}
            sx={{ height: 48, borderRadius: 2, px: 3, width: { xs: '100%', sm: 'auto' } }}
            >
            Add New Item
            </Button>
        )}
      </Box>

      <Card sx={{ mb: 4, p: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <TextField
            fullWidth
            placeholder="Search items by name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: <SearchIcon sx={{ color: "text.secondary", mr: 1 }} />,
              }
            }}
            size="small"
          />
          <IconButton onClick={fetchItems} title="Refresh items">
            <RefreshIcon />
          </IconButton>
        </Box>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading && items.length === 0 ? (
        <Box sx={{ position: 'relative', py: 12 }}>
          <Preloader fullScreen={false} size={80} message="Loading inventory..." />
        </Box>
      ) : (
        <Box sx={{ flexGrow: 1, overflowY: "auto", minHeight: 0 }}>
          <ItemTable 
            items={filteredItems} 
            onEdit={handleOpenEdit} 
            onDelete={handleOpenDelete} 
            onToggleStatus={handleToggleStatus} 
            onViewDetails={handleViewDetails}
            canEdit={canEdit}
            canDelete={canDelete}
          />
        </Box>
      )}

      <ItemModal
        open={openModal}
        mode={modalMode}
        item={currentItem}
        onClose={() => setOpenModal(false)}
        onSubmit={handleModalSubmit}
      />

      <ItemDetailDialog
        open={openDetailDialog}
        item={itemForDetail}
        onClose={() => setOpenDetailDialog(false)}
      />

      <DeleteConfirmDialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        onConfirm={handleDeleteConfirm}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%", boxShadow: 3 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
