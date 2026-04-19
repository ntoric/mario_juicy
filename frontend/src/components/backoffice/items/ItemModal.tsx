"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  TextField,
  Typography,
  Button,
  Avatar,
  InputLabel,
  Input,
  Switch,
  MenuItem,
  Select,
  FormControl,
} from "@mui/material";
import { Image as ImageIcon } from "@mui/icons-material";
import { Item } from "@/services/itemService";
import { categoryService, Category } from "@/services/categoryService";
import { getImageUrl } from "@/lib/getImageUrl";

interface ItemModalProps {
  open: boolean;
  mode: "create" | "edit";
  item: Item | null;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
}

export default function ItemModal({
  open,
  mode,
  item,
  onClose,
  onSubmit,
}: ItemModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    price: "0.00",
    category: "" as string | number,
    is_enabled: true,
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await categoryService.getCategories();
        setCategories(data);
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    };
    if (open) {
        fetchCategories();
    }
  }, [open]);

  useEffect(() => {
    if (mode === "edit" && item) {
      setFormData({
        code: item.code || "",
        name: item.name,
        description: item.description || "",
        price: item.price,
        category: item.category || "",
        is_enabled: item.is_enabled,
      });
      setImagePreview(item.image);
    } else {
      setFormData({
        code: "",
        name: "",
        description: "",
        price: "0.00",
        category: "",
        is_enabled: true,
      });
      setImagePreview(null);
    }
    setSelectedImage(null);
  }, [mode, item, open]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleFormSubmit = async () => {
    if (!formData.name.trim()) return;

    setLoading(true);
    try {
      const data = new FormData();
      data.append("name", formData.name);
      data.append("code", formData.code);
      data.append("description", formData.description);
      data.append("price", formData.price);
      if (formData.category) {
        data.append("category", String(formData.category));
      }
      data.append("is_enabled", String(formData.is_enabled));
      if (selectedImage) {
        data.append("image", selectedImage);
      }
      await onSubmit(data);
      onClose();
    } catch (error) {
      console.error("Failed to submit item:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700 }}>
        {mode === "create" ? "Add New Item" : "Edit Item"}
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, py: 1 }}>
          <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", sm: "row" } }}>
            <FormControl sx={{ flex: 1 }}>
                <InputLabel>Category</InputLabel>
                <Select
                    label="Category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                    <MenuItem value=""><em>None</em></MenuItem>
                    {categories.map((cat) => (
                        <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                    ))}
                </Select>
            </FormControl>
             <TextField
              sx={{ flex: 1 }}
              label="Item Code (Optional)"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              variant="outlined"
            />
          </Box>
          
          <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", sm: "row" } }}>
            <TextField
              sx={{ flex: 2 }}
              label="Item Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              variant="outlined"
            />
            <TextField
              sx={{ flex: 1 }}
              label="Price"
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              slotProps={{
                input: {
                  startAdornment: <Box sx={{ mr: 1, color: 'text.secondary' }}>₹</Box>,
                }
              }}
              variant="outlined"
            />
          </Box>

          <TextField
            fullWidth
            label="Description (Optional)"
            multiline
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            variant="outlined"
          />

          <Box>
            <InputLabel sx={{ mb: 1, fontSize: "0.875rem", fontWeight: 500 }}>
              Item Image (Optional)
            </InputLabel>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Avatar
                src={getImageUrl(imagePreview)}
                variant="rounded"
                sx={{ width: 100, height: 100, bgcolor: "#FCF9EA", border: "1px dashed #e8e4d8" }}
              >
                <ImageIcon sx={{ color: "#8d6e63", fontSize: 50 }} />
              </Avatar>
              <Box>
                <label htmlFor="item-image">
                  <Input
                    id="item-image"
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
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Recommended: Square image, max 2MB.
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 2, bgcolor: "#FCF9EA", borderRadius: 2, border: "1px solid #e8e4d8" }}>
            <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Enable Item</Typography>
                <Typography variant="caption" color="text.secondary">
                    Items only appear in the menu when enabled.
                </Typography>
            </Box>
            <Switch
              checked={formData.is_enabled}
              onChange={(e) => setFormData({ ...formData, is_enabled: e.target.checked })}
              color="primary"
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button 
          onClick={handleFormSubmit} 
          variant="contained" 
          disabled={loading || !formData.name.trim()}
          sx={{ px: 4 }}
        >
          {loading ? "Saving..." : (mode === "create" ? "Create Item" : "Save Changes")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
