"use client";

import React from "react";
import {
  Box,
  Typography,
  IconButton,
  Avatar,
  Divider,
  Chip,
  Card,
  CardContent,
  Button,
  Stack,
  Paper,
  Grid,
} from "@mui/material";
import {
  ChevronLeft as ChevronLeftIcon,
  Image as ImageIcon,
  Tag as TagIcon,
  Category as CategoryIcon,
  Description as DescriptionIcon,
  Edit as EditIcon,
  CalendarMonth as CalendarIcon,
} from "@mui/icons-material";
import { Item } from "@/services/itemService";
import { getImageUrl } from "@/lib/getImageUrl";

interface ItemDetailsProps {
  item: Item;
  onClose: () => void;
  onEdit: (item: Item) => void;
  canEdit?: boolean;
}

export default function ItemDetails({
  item,
  onClose,
  onEdit,
  canEdit = true,
}: ItemDetailsProps) {
  return (
    <Box sx={{ 
      position: 'absolute',
      inset: 0,
      bgcolor: '#fdfdfd',
      zIndex: 100,
      display: 'flex', 
      flexDirection: 'column',
      animation: 'slideInRight 0.2s ease-out',
      '@keyframes slideInRight': {
        from: { transform: 'translateX(100%)' },
        to: { transform: 'translateX(0)' }
      }
    }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid #e8e4d8', display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'white' }}>
        <IconButton onClick={onClose} sx={{ color: 'text.secondary' }}>
          <ChevronLeftIcon />
        </IconButton>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>Item Details</Typography>
      </Box>

      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: { xs: 2, md: 4 }, bgcolor: '#f9f9f9' }}>
        <Grid container spacing={4} sx={{ justifyContent: 'center' }}>
          <Grid size={{ xs: 12, md: 9, lg: 8 }}>
            <Paper sx={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid #e8e4d8', boxShadow: '0 8px 32px rgba(0,0,0,0.03)' }}>
              {/* Image Banner */}
              <Box sx={{ height: { xs: 240, md: 340 }, bgcolor: "#FCF9EA", position: 'relative' }}>
                {item.image ? (
                  <img
                    src={getImageUrl(item.image)}
                    alt={item.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ImageIcon sx={{ fontSize: 100, color: "#e8e4d8" }} />
                  </Box>
                )}
                {canEdit && (
                  <Button
                    variant="contained"
                    startIcon={<EditIcon />}
                    onClick={() => onEdit(item)}
                    sx={{ position: 'absolute', right: 24, bottom: 24, borderRadius: '12px', fontWeight: 800, px: 3, py: 1.5, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}
                  >
                    EDIT ITEM
                  </Button>
                )}
              </Box>

              <Box sx={{ p: { xs: 3, md: 5 } }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 4 }}>
                  <Box>
                    <Typography variant="h3" sx={{ fontWeight: 900, mb: 1, color: 'text.primary' }}>
                      {item.name}
                    </Typography>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                      <Chip
                        label={item.is_enabled ? "ACTIVE" : "DISABLED"}
                        color={item.is_enabled ? "success" : "default"}
                        sx={{ fontWeight: 900, borderRadius: '8px', px: 1 }}
                      />
                      {item.category_name && (
                        <Chip
                          icon={<CategoryIcon sx={{ fontSize: '1rem !important' }} />}
                          label={item.category_name.toUpperCase()}
                          variant="outlined"
                          sx={{ fontWeight: 800, borderRadius: '8px', border: '1.5px solid #e8e4d8' }}
                        />
                      )}
                    </Stack>
                  </Box>
                  <Typography variant="h3" color="primary.main" sx={{ fontWeight: 900 }}>
                    ₹{parseFloat(item.price).toFixed(2)}
                  </Typography>
                </Box>

                <Divider sx={{ mb: 4 }} />

                <Grid container spacing={5}>
                  <Grid size={{ xs: 12, md: 7 }}>
                    <Box sx={{ mb: 4 }}>
                      <Typography variant="overline" sx={{ fontWeight: 900, color: 'text.disabled', mb: 1.5, display: 'block' }}>DESCRIPTION</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.secondary', lineHeight: 1.8, fontSize: '1.1rem' }}>
                        {item.description || "No description available for this item."}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography variant="overline" sx={{ fontWeight: 900, color: 'text.disabled', mb: 1.5, display: 'block' }}>SPECIFICATIONS</Typography>
                      <Stack spacing={3}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <Avatar sx={{ bgcolor: '#f0f0f0', color: 'text.secondary' }}><TagIcon /></Avatar>
                          <Box>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.disabled' }}>ITEM CODE</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 800 }}>{item.code || "---"}</Typography>
                          </Box>
                        </Box>
                      </Stack>
                    </Box>
                  </Grid>

                  <Grid size={{ xs: 12, md: 5 }}>
                    <Paper sx={{ p: 3, bgcolor: '#fcfcfc', border: '1px solid #e8e4d8', borderRadius: '16px' }}>
                      <Typography variant="overline" sx={{ fontWeight: 900, color: 'text.disabled', mb: 2, display: 'block' }}>TIMESTAMPS</Typography>
                      <Stack spacing={2.5}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <CalendarIcon sx={{ color: 'text.disabled' }} />
                          <Box>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.disabled' }}>CREATED ON</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{new Date(item.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}</Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <CalendarIcon sx={{ color: 'text.disabled' }} />
                          <Box>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.disabled' }}>LAST UPDATED</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{new Date(item.updated_at).toLocaleDateString(undefined, { dateStyle: 'long' })}</Typography>
                          </Box>
                        </Box>
                      </Stack>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
