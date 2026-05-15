"use client";

import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
} from "@mui/material";

interface DeleteConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
}

export default function DeleteConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Delete Item?",
  message = "Are you sure you want to delete this item? This action cannot be undone.",
}: DeleteConfirmDialogProps) {
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      slotProps={{
        paper: {
          sx: { borderRadius: '0.65rem' }
        }
      }}
    >
      <DialogTitle sx={{ fontWeight: 700 }}>{title}</DialogTitle>
      <DialogContent>
        <Typography>{message}</Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit" sx={{ borderRadius: '0.65rem' }}>
          Cancel
        </Button>
        <Button onClick={onConfirm} color="error" variant="contained" sx={{ borderRadius: '0.65rem' }}>
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}
