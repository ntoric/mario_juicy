"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Avatar,
  Divider,
  Chip,
  Card,
  CardContent,
} from "@mui/material";
import {
  Close as CloseIcon,
  Image as ImageIcon,
  Tag as TagIcon,
  Category as CategoryIcon,
  Description as DescriptionIcon,
  AttachMoney as MoneyIcon,
} from "@mui/icons-material";
import { Item } from "@/services/itemService";

interface ItemDetailDialogProps {
  open: boolean;
  item: Item | null;
  onClose: () => void;
}

export default function ItemDetailDialog({
  open,
  item,
  onClose,
}: ItemDetailDialogProps) {
  if (!item) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      slotProps={{
        paper: {
            sx: { borderRadius: 3, overflow: "hidden" }
        }
      }}
    >
      <Box sx={{ position: "relative" }}>
        <IconButton
          onClick={onClose}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
            bgcolor: "rgba(255,255,255,0.8)",
            "&:hover": { bgcolor: "white" },
            zIndex: 1,
          }}
        >
          <CloseIcon />
        </IconButton>

        <Box sx={{ height: 200, bgcolor: "#FCF9EA", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          {item.image ? (
            <img
              src={item.image}
              alt={item.name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <ImageIcon sx={{ fontSize: 80, color: "#d4c4a8" }} />
          )}
        </Box>

        <DialogContent sx={{ mt: -3, position: "relative", px: 2, pb: 3 }}>
          <Card elevation={4} sx={{ borderRadius: 3, border: "none" }}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {item.name}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
                    <Chip
                      label={item.is_enabled ? "Active" : "Disabled"}
                      size="small"
                      color={item.is_enabled ? "success" : "default"}
                      sx={{ fontWeight: 600, height: 20 }}
                    />
                    {item.category_name && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CategoryIcon sx={{ fontSize: 14 }} /> {item.category_name}
                        </Typography>
                    )}
                  </Box>
                </Box>
                <Typography variant="h6" color="primary.main" sx={{ fontWeight: 700 }}>
                  ₹{parseFloat(item.price).toFixed(2)}
                </Typography>
              </Box>

              <Divider sx={{ mb: 2 }} />

              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                  <TagIcon sx={{ color: "text.secondary", mt: 0.3 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Item Code</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{item.code || "N/A"}</Typography>
                  </Box>
                </Box>

                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                  <DescriptionIcon sx={{ color: "text.secondary", mt: 0.3 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Description</Typography>
                    <Typography variant="body2" sx={{ lineHeight: 1.6 }}>{item.description || "No description available."}</Typography>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ mt: 3, pt: 2, borderTop: "1px dashed #e8e4d8" }}>
                  <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
                    Created: {new Date(item.created_at).toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
                    Last Updated: {new Date(item.updated_at).toLocaleString()}
                  </Typography>
              </Box>
            </CardContent>
          </Card>
        </DialogContent>
      </Box>
    </Dialog>
  );
}
