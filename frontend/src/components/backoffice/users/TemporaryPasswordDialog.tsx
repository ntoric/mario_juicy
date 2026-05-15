"use client";

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Tooltip,
  Paper,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Check as CheckIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';

interface TemporaryPasswordDialogProps {
  open: boolean;
  password: string | null;
  username: string | null;
  onClose: () => void;
}

export default function TemporaryPasswordDialog({ open, password, username, onClose }: TemporaryPasswordDialogProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (password) {
      navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      slotProps={{
        paper: {
          sx: { borderRadius: '0.65rem', p: 1, maxWidth: 400 }
        }
      }}
    >
      <DialogTitle sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <SecurityIcon color="primary" />
        Temporary Password
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontWeight: 600 }}>
          A temporary password has been generated for <strong>{username}</strong>. Please share this with the user. They will be required to change it on their first login.
        </Typography>

        <Paper 
          elevation={0}
          sx={{ 
            p: 3, 
            bgcolor: '#F8FAFC', 
            borderRadius: '0.65rem', 
            border: '2px dashed #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative'
          }}
        >
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 900, 
              letterSpacing: '0.1em', 
              color: '#1E293B',
              fontFamily: 'monospace'
            }}
          >
            {password}
          </Typography>
          <Tooltip title={copied ? "Copied!" : "Copy to clipboard"}>
            <IconButton 
              onClick={handleCopy} 
              sx={{ 
                bgcolor: copied ? 'success.main' : 'primary.main', 
                color: 'white',
                '&:hover': { bgcolor: copied ? 'success.dark' : 'primary.dark' },
                transition: 'all 0.2s'
              }}
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
            </IconButton>
          </Tooltip>
        </Paper>
        
        <Box sx={{ mt: 3, p: 2, bgcolor: '#FFFBEB', borderRadius: '0.65rem', border: '1px solid #FEF3C7' }}>
          <Typography variant="caption" sx={{ color: '#92400E', fontWeight: 700, display: 'block' }}>
            IMPORTANT: This password will only be shown once. Please ensure you have copied it before closing this dialog.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button 
          fullWidth 
          variant="contained" 
          onClick={onClose}
          sx={{ borderRadius: '0.65rem', fontWeight: 800, py: 1.5 }}
        >
          I HAVE COPIED THE PASSWORD
        </Button>
      </DialogActions>
    </Dialog>
  );
}
