"use client";

import React from 'react';
import {
  Button,
  Box,
  Typography,
  IconButton,
  Stack,
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  ChevronLeft as ChevronLeftIcon,
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
  if (!open || !invoice) return null;

  return (
    <Box sx={{ 
      position: 'absolute',
      inset: 0,
      bgcolor: '#fdfdfd',
      zIndex: 300,
      display: 'flex', 
      flexDirection: 'column',
      animation: 'slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      '@keyframes slideInRight': {
        from: { transform: 'translateX(100%)' },
        to: { transform: 'translateX(0)' }
      }
    }}>
      {/* Header */}
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
          <Typography variant="h6" sx={{ fontWeight: 900 }}>Invoice Preview</Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button 
            variant="outlined" 
            size="small"
            startIcon={<DownloadIcon />} 
            onClick={onDownload}
            sx={{ borderRadius: '0.65rem', fontWeight: 800 }}
          >
            Download
          </Button>
          <Button 
            variant="contained" 
            size="small"
            startIcon={<PrintIcon />} 
            onClick={onPrint}
            sx={{ borderRadius: '0.65rem', fontWeight: 800 }}
          >
            Print
          </Button>
        </Stack>
      </Box>

      {/* Content */}
      <Box sx={{ 
        flexGrow: 1, 
        overflowY: 'auto', 
        bgcolor: '#f5f5f5',
        p: { xs: 2, md: 4 },
        display: 'flex',
        justifyContent: 'center'
      }}>
        <Box sx={{ 
          width: '100%',
          maxWidth: '500px',
          bgcolor: 'white',
          p: 4,
          borderRadius: '0.65rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.05)',
          height: 'fit-content'
        }}>
          <InvoicePrint 
            invoice={invoice}
            orderItems={orderItems}
            tableNumber={tableNumber}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default InvoicePreviewDialog;
