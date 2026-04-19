"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Stack,
  Chip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  Receipt as BillIcon,
  CheckCircle as PaidIcon,
  Print as PrintIcon,
  Visibility as PreviewIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { Tooltip } from '@mui/material';
import { restaurantService, Order } from '@/services/restaurantService';
import InvoicePrint from './InvoicePrint';
import InvoicePreviewDialog from './InvoicePreviewDialog';

interface SettlementDialogProps {
  open: boolean;
  onClose: () => void;
  order: Order | null;
  onSuccess: () => void;
}

export default function SettlementDialog({ open, onClose, order, onSuccess }: SettlementDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [invoice, setInvoice] = useState<any>(order?.invoice || null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!order) return null;

  const handleGenerateBill = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await restaurantService.checkout(order.id, { 
        payment_method: paymentMethod, 
        mark_as_paid: false 
      });
      setInvoice(data);
      onSuccess(); // Refresh list to show invoice ref
    } catch (e: any) {
      setError(e.message || 'Failed to generate bill');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async () => {
    setLoading(true);
    setError(null);
    try {
      await restaurantService.checkout(order.id, { 
        payment_method: paymentMethod, 
        mark_as_paid: true 
      });
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!invoice) return;
    setDownloading(true);
    try {
      const blob = await restaurantService.downloadInvoicePDF(invoice.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice-${invoice.invoice_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (e: any) {
      setError(e.message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (!printWindow) return;

    const invoiceEl = document.getElementById('thermal-invoice-container-settle');
    if (!invoiceEl) return;

    printWindow.document.write('<html><head><title>Print Invoice</title>');
    printWindow.document.write('<style>@media print { body { margin: 0; } }</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(invoiceEl.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const subtotal = parseFloat(order.total_amount);
  const hasInvoice = !!invoice;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
      <DialogTitle component="div" sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Settle Order #{order.id}
        </Typography>

        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ mb: 3 }}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1 }}>

            <Typography variant="subtitle2" color="text.secondary">Order Details</Typography>
            <Chip label={order.order_type === 'DINE_IN' ? `Table ${order.table_number}` : 'Parcel'} 
                 size="small" color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
          </Stack>
          <Typography variant="body2">Waiter: <strong>{order.waiter_name}</strong></Typography>
          <Typography variant="body2">Date: {new Date(order.created_at).toLocaleString()}</Typography>
        </Box>

        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Items</Typography>
        <TableContainer sx={{ mb: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Item</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>Qty</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Price</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {order.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.item_details.name}</TableCell>
                  <TableCell align="center">{item.quantity}</TableCell>
                  <TableCell align="right">₹{item.price}</TableCell>
                  <TableCell align="right">₹{(parseFloat(item.price) * item.quantity).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Divider sx={{ my: 2, borderStyle: 'dashed' }} />

        <Box sx={{ px: 2 }}>
          <Stack spacing={1}>
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography variant="body2">Subtotal</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>₹{subtotal.toFixed(2)}</Typography>
            </Stack>

            
            {hasInvoice && invoice.tax_details && Object.entries(invoice.tax_details).map(([key, val]: [string, any]) => (
              <Stack direction="row" sx={{ justifyContent: "space-between" }} key={key}>

                <Typography variant="body2" color="text.secondary">{key}</Typography>
                <Typography variant="body2" color="text.secondary">₹{parseFloat(val).toFixed(2)}</Typography>
              </Stack>
            ))}

            <Stack direction="row" sx={{ justifyContent: "space-between", pt: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>Amount Payable</Typography>
              <Typography variant="h6" sx={{ fontWeight: 900, color: "primary.main" }}>
                ₹{hasInvoice ? parseFloat(invoice.total_amount).toFixed(2) : subtotal.toFixed(2)}
              </Typography>
            </Stack>

          </Stack>
        </Box>

        {hasInvoice ? (
          <Box sx={{ mt: 3, p: 2, bgcolor: '#FFF9E6', borderRadius: 2, border: '1px solid', borderColor: '#E9762B', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#E9762B' }}>
              Bill Generated: {invoice.invoice_number}
            </Typography>
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="Preview Bill">
                <IconButton size="small" onClick={() => setPreviewOpen(true)} sx={{ color: '#E9762B' }}>
                  <PreviewIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Print Bill">
                <IconButton size="small" onClick={handlePrint} sx={{ color: '#E9762B' }}>
                  <PrintIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Download PDF">
                <IconButton size="small" onClick={handleDownload} disabled={downloading} sx={{ color: '#E9762B' }}>
                  {downloading ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>
        ) : (
          <Alert severity="info" sx={{ mt: 3 }}>
            Generate a bill to see the final amount including taxes.
          </Alert>
        )}

        <Box sx={{ mt: 3 }}>
          <FormControl fullWidth variant="outlined">
            <InputLabel id="payment-method-label" sx={{ fontWeight: 600 }}>Payment Method</InputLabel>
            <Select
              labelId="payment-method-label"
              value={paymentMethod}
              label="Payment Method"
              onChange={(e) => setPaymentMethod(e.target.value as string)}
              disabled={loading}
              sx={{ 
                borderRadius: 1.5,
                '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e8e4d8' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
                bgcolor: 'white'
              }}
              MenuProps={{
                anchorOrigin: {
                  vertical: 'top',
                  horizontal: 'left',
                },
                transformOrigin: {
                  vertical: 'bottom',
                  horizontal: 'left',
                },
                sx: { 
                  borderRadius: 1.5,
                  '& .MuiPaper-root': {
                    borderRadius: 1.5,
                    mt: -0.5,
                    boxShadow: '0 -4px 20px rgba(0,0,0,0.1)'
                  }
                }
              }}
            >
              <MenuItem value="UPI" sx={{ fontWeight: 600, py: 1.5 }}>UPI</MenuItem>
              <MenuItem value="CASH" sx={{ fontWeight: 600, py: 1.5 }}>Cash</MenuItem>
              <MenuItem value="CARD" sx={{ fontWeight: 600, py: 1.5 }}>Card</MenuItem>
              <MenuItem value="NET_BANKING" sx={{ fontWeight: 600, py: 1.5 }}>Net Banking</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, gap: 1 }}>
        <Button onClick={onClose} color="inherit" disabled={loading}>
          Close
        </Button>
        {!hasInvoice ? (
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<BillIcon />}
            onClick={handleGenerateBill}
            loading={loading}
            disabled={loading}
            sx={{ px: 4, fontWeight: 700 }}
          >
            Generate Bill
          </Button>
        ) : (
          <Button 
            variant="contained" 
            color="success" 
            startIcon={<PaidIcon />}
            onClick={handleMarkAsPaid}
            loading={loading}
            disabled={loading}
            sx={{ px: 4, fontWeight: 700 }}
          >
            Mark as Paid
          </Button>
        )}
      </DialogActions>

      {/* Hidden container for printing */}
      <Box sx={{ display: 'none' }}>
        <div id="thermal-invoice-container-settle">
          {hasInvoice && <InvoicePrint invoice={invoice} orderItems={order.items} tableNumber={order.table_number} />}
        </div>
      </Box>

      {/* Preview Dialog */}
      <InvoicePreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        invoice={invoice}
        orderItems={order.items}
        tableNumber={order.table_number}
        onDownload={handleDownload}
        onPrint={handlePrint}
      />
    </Dialog>
  );
}
