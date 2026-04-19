"use client";

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
} from '@mui/icons-material';
import InvoicePrint from './InvoicePrint';

interface InvoicePreviewDialogProps {
  open: boolean;
  onClose: () => void;
  invoice: any;
  orderItems: any[];
  tableNumber: string;
  onDownload: () => void;
  onPrint: () => void;
}

const InvoicePreviewDialog: React.FC<InvoicePreviewDialogProps> = ({
  open,
  onClose,
  invoice,
  orderItems,
  tableNumber,
  onDownload,
  onPrint,
}) => {
  if (!invoice) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: { 
            borderRadius: '12px', 
            overflow: 'hidden',
            bgcolor: '#FCF9EA'
          }
        }
      }}
    >
      <DialogTitle sx={{ 
        m: 0, 
        p: 2, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        bgcolor: 'white',
        borderBottom: '1px solid #e8e4d8'
      }}>
        <Typography variant="h6" component="span" sx={{ fontWeight: 800 }}>Invoice Preview</Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ color: 'text.secondary' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0, bgcolor: 'white' }}>
        <Box sx={{ 
          width: '100%',
          bgcolor: 'white', 
          overflowY: 'auto',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <InvoicePrint 
            invoice={invoice}
            orderItems={orderItems}
            tableNumber={tableNumber}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, bgcolor: 'white', borderTop: '1px solid #e8e4d8', gap: 2 }}>
        <Button 
          variant="outlined" 
          startIcon={<DownloadIcon />} 
          onClick={onDownload}
          sx={{ borderRadius: '8px', fontWeight: 700, px: 3 }}
        >
          Download
        </Button>
        <Button 
          variant="contained" 
          startIcon={<PrintIcon />} 
          onClick={onPrint}
          sx={{ borderRadius: '8px', fontWeight: 700, px: 3 }}
        >
          Print
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InvoicePreviewDialog;
