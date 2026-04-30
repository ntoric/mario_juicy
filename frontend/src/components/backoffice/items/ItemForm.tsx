"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Divider,
  CircularProgress,
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
  IconButton,
  Stack,
  Paper,
} from "@mui/material";
import { 
  Image as ImageIcon,
  ChevronLeft as ChevronLeftIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import { Item } from "@/services/itemService";
import { categoryService, Category } from "@/services/categoryService";
import { getImageUrl } from "@/lib/getImageUrl";

interface ItemFormProps {
  open: boolean;
  mode: "create" | "edit";
  item: Item | null;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
}

export default function ItemForm({
  open,
  mode,
  item,
  onClose,
  onSubmit,
}: ItemFormProps) {
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

  if (!open) return null;

  return (
    <Box sx={{ 
      flexGrow: 1,
      bgcolor: '#fdfdfd',
      display: 'flex', 
      flexDirection: 'column',
      minHeight: '100%',
      animation: 'slideInRight 0.2s ease-out',
      '@keyframes slideInRight': {
        from: { transform: 'translateX(100%)' },
        to: { transform: 'translateX(0)' }
      }
    }}>
      {/* Page Header */}
      <Box sx={{ 
        p: 2, 
        borderBottom: '1px solid #e8e4d8', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        bgcolor: 'white'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={onClose} sx={{ color: 'text.secondary' }}>
            <ChevronLeftIcon />
          </IconButton>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            {mode === "create" ? "Add New Item" : `Edit: ${item?.name}`}
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          onClick={handleFormSubmit}
          disabled={loading || !formData.name.trim()}
          sx={{ borderRadius: '8px', fontWeight: 800, px: 3 }}
        >
          {loading ? "SAVING..." : "SAVE ITEM"}
        </Button>
      </Box>

      {/* Form Content */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: { xs: 2, md: 4 }, bgcolor: '#f9f9f9' }}>
        <Grid container spacing={4} sx={{ justifyContent: 'center' }}>
          <Grid size={{ xs: 12, md: 8, lg: 7 }}>
            <Paper sx={{ p: 4, borderRadius: '24px', border: '1px solid #e8e4d8', boxShadow: '0 8px 32px rgba(0,0,0,0.03)' }}>
              <Stack spacing={4}>
                {/* Image Section */}
                <Box>
                  <Typography variant="overline" sx={{ fontWeight: 900, color: 'primary.main', mb: 2, display: 'block' }}>ITEM IMAGE</Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <Avatar
                      src={getImageUrl(imagePreview)}
                      variant="rounded"
                      sx={{ width: 140, height: 140, bgcolor: "white", border: "2px dashed #e8e4d8", borderRadius: '16px' }}
                    >
                      <ImageIcon sx={{ color: "#e8e4d8", fontSize: 60 }} />
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
                          size="large"
                          startIcon={<ImageIcon />}
                          sx={{ borderRadius: '12px', fontWeight: 800 }}
                        >
                          Upload Photo
                        </Button>
                      </label>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5, fontWeight: 600 }}>
                        Square JPEG/PNG recommended. Max size 2MB.
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <Divider />

                {/* Info Section */}
                <Box>
                  <Typography variant="overline" sx={{ fontWeight: 900, color: 'primary.main', mb: 2, display: 'block' }}>GENERAL INFORMATION</Typography>
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, sm: 8 }}>
                      <TextField
                        fullWidth
                        label="Item Name"
                        placeholder="e.g. Butter Chicken"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        slotProps={{ input: { sx: { borderRadius: '12px', bgcolor: 'white' } } }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField
                        fullWidth
                        label="Price"
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        slotProps={{
                          input: {
                            startAdornment: <Box sx={{ mr: 1, fontWeight: 900, color: 'text.secondary' }}>₹</Box>,
                            sx: { borderRadius: '12px', bgcolor: 'white' }
                          }
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <FormControl fullWidth>
                        <InputLabel>Category</InputLabel>
                        <Select
                          label="Category"
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          sx={{ borderRadius: '12px', bgcolor: 'white' }}
                        >
                          <MenuItem value=""><em>None</em></MenuItem>
                          {categories.map((cat) => (
                            <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Item Code"
                        placeholder="BC-001"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        slotProps={{ input: { sx: { borderRadius: '12px', bgcolor: 'white' } } }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth
                        label="Description"
                        placeholder="Describe the taste, ingredients, or size..."
                        multiline
                        rows={3}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        slotProps={{ input: { sx: { borderRadius: '12px', bgcolor: 'white' } } }}
                      />
                    </Grid>
                  </Grid>
                </Box>

                <Divider />

                {/* Status Section */}
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 3, bgcolor: "#FCF9EA", borderRadius: '16px', border: "1px solid #e8e4d8" }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 900 }}>Visibility Status</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                      When enabled, this item will be visible in the POS and online menu.
                    </Typography>
                  </Box>
                  <Switch
                    checked={formData.is_enabled}
                    onChange={(e) => setFormData({ ...formData, is_enabled: e.target.checked })}
                    color="primary"
                    sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: 'primary.main' } }}
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
