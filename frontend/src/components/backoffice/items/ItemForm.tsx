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
  useTheme,
  alpha,
  keyframes,
  Card,
} from "@mui/material";
import { 
  Image as ImageIcon,
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import { Item } from "@/services/itemService";
import { categoryService, Category } from "@/services/categoryService";
import { getImageUrl } from "@/lib/getImageUrl";

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

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
  const theme = useTheme();
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
      bgcolor: '#fcfcfc', 
      display: 'flex', 
      flexDirection: 'column',
      minHeight: '100%',
      animation: `${fadeIn} 0.3s ease-out`,
      position: 'relative',
      p: { xs: 2, md: 4 }
    }}>
      {/* Background Blobs */}
      <Box sx={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, background: 'radial-gradient(circle, rgba(233,118,43,0.05) 0%, transparent 70%)', borderRadius: '50%', zIndex: 0 }} />
      
      <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 900, mx: 'auto', width: '100%' }}>
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexDirection: { xs: 'column', sm: 'row' }, gap: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton 
              onClick={onClose} 
              sx={{ 
                bgcolor: 'white', 
                border: '1px solid', 
                borderColor: alpha(theme.palette.divider, 0.1), 
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                '&:hover': { bgcolor: alpha('#e9762b', 0.05), color: '#e9762b' }
              }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 1000, letterSpacing: '-0.02em', color: '#1a1a1a' }}>
                {mode === 'create' ? "Add New Item" : "Edit Menu Item"}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                {mode === 'create' ? 'Define a new offering for your menu catalog.' : `Update details for ${item?.name}.`}
              </Typography>
            </Box>
          </Box>
          <Button 
            variant="contained" 
            onClick={handleFormSubmit}
            disabled={loading || !formData.name.trim()}
            sx={{ 
              borderRadius: '16px', 
              fontWeight: 1000, 
              px: 4, 
              height: 48,
              background: 'linear-gradient(135deg, #e9762b 0%, #d35400 100%)',
              boxShadow: '0 8px 20px rgba(233,118,43,0.3)',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 25px rgba(233,118,43,0.4)' },
              '&.Mui-disabled': { bgcolor: alpha('#e9762b', 0.3) }
            }}
          >
            {loading ? "SAVING..." : "SAVE CHANGES"}
          </Button>
        </Box>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Card sx={{ 
              p: 4, 
              borderRadius: '32px', 
              border: '1px solid', 
              borderColor: alpha(theme.palette.divider, 0.08), 
              boxShadow: '0 20px 50px rgba(0,0,0,0.04)',
              bgcolor: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(10px)'
            }}>
              <Stack spacing={4}>
                {/* Visuals Section */}
                <Box>
                  <Typography variant="overline" sx={{ fontWeight: 1000, color: '#e9762b', mb: 2, display: 'block', letterSpacing: '0.1em' }}>ITEM VISUALS</Typography>
                  <Box sx={{ 
                    display: "flex", 
                    alignItems: "center", 
                    flexDirection: { xs: 'column', sm: 'row' },
                    gap: 4, 
                    p: 3, 
                    bgcolor: alpha('#e9762b', 0.02), 
                    borderRadius: '24px', 
                    border: '2px dashed',
                    borderColor: alpha('#e9762b', 0.1)
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
                        borderRadius: '24px',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.05)'
                      }}
                    >
                      <ImageIcon sx={{ color: alpha('#1a1a1a', 0.1), fontSize: 60 }} />
                    </Avatar>
                    <Box sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 1000, mb: 1 }}>Item Photo</Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 3 }}>
                        Recommended size: 512x512px. PNG, JPG or WEBP formats supported.
                      </Typography>
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
                          startIcon={<ImageIcon />}
                          sx={{ 
                            borderRadius: '12px', 
                            fontWeight: 900, 
                            textTransform: 'none', 
                            px: 3,
                            borderColor: alpha('#1a1a1a', 0.2),
                            color: '#1a1a1a',
                            '&:hover': { borderColor: '#1a1a1a', bgcolor: alpha('#1a1a1a', 0.05) }
                          }}
                        >
                          Upload Photo
                        </Button>
                      </label>
                    </Box>
                  </Box>
                </Box>

                <Divider sx={{ opacity: 0.5 }} />

                {/* General Info Section */}
                <Box>
                  <Typography variant="overline" sx={{ fontWeight: 1000, color: '#e9762b', mb: 2, display: 'block', letterSpacing: '0.1em' }}>GENERAL INFORMATION</Typography>
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, sm: 8 }}>
                      <TextField
                        fullWidth
                        label="Item Name"
                        placeholder="e.g. Tandoori Chicken Half"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        variant="outlined"
                        slotProps={{
                          input: { sx: { borderRadius: '16px', bgcolor: 'white', fontWeight: 700 } },
                          inputLabel: { sx: { fontWeight: 700 } }
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <TextField
                        fullWidth
                        label="Price (₹)"
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        variant="outlined"
                        slotProps={{
                          input: { 
                            startAdornment: <Typography sx={{ mr: 1, fontWeight: 1000, color: '#e9762b' }}>₹</Typography>,
                            sx: { borderRadius: '16px', bgcolor: 'white', fontWeight: 1000 } 
                          },
                          inputLabel: { sx: { fontWeight: 700 } }
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <FormControl fullWidth>
                        <InputLabel sx={{ fontWeight: 700 }}>Category</InputLabel>
                        <Select
                          label="Category"
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          sx={{ borderRadius: '16px', bgcolor: 'white', fontWeight: 700 }}
                        >
                          <MenuItem value=""><em>Uncategorized</em></MenuItem>
                          {categories.map((cat) => (
                            <MenuItem key={cat.id} value={cat.id} sx={{ fontWeight: 600 }}>{cat.name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
                        fullWidth
                        label="Item Code (Optional)"
                        placeholder="e.g. NONVEG-001"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        variant="outlined"
                        slotProps={{
                          input: { sx: { borderRadius: '16px', bgcolor: 'white', fontWeight: 700 } },
                          inputLabel: { sx: { fontWeight: 700 } }
                        }}
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth
                        label="Description"
                        placeholder="Briefly describe the item ingredients or details..."
                        multiline
                        rows={3}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        variant="outlined"
                        slotProps={{
                          input: { sx: { borderRadius: '16px', bgcolor: 'white', fontWeight: 600 } },
                          inputLabel: { sx: { fontWeight: 700 } }
                        }}
                      />
                    </Grid>
                  </Grid>
                </Box>

                <Divider sx={{ opacity: 0.5 }} />

                {/* Status Section */}
                <Box sx={{ 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "space-between", 
                  p: 3, 
                  bgcolor: alpha('#10b981', 0.05), 
                  borderRadius: '24px', 
                  border: "1px solid",
                  borderColor: alpha('#10b981', 0.1)
                }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 1000 }}>Available for Orders</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                      When enabled, this item will appear in POS and online menus.
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
