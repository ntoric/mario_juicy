"use client";

import React, { useState } from 'react';
import {
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
  Grid,
  Paper,
  Button,
} from '@mui/material';
import {
  Close as CloseIcon,
  Receipt as BillIcon,
  CheckCircle as PaidIcon,
  Print as PrintIcon,
  Visibility as PreviewIcon,
  Download as DownloadIcon,
  ChevronLeft as ChevronLeftIcon,
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

  const handlePrint = async () => {
    const invoiceEl = document.getElementById('thermal-invoice-container-settle');
    if (!invoiceEl) return;

    const store = invoice?.store_details;
    const printerName = store?.thermal_printer_name;
    const paperSize = store?.thermal_printer_size || '3_INCH';

    // TRY 1: Electron Bridge (Primary for Desktop App)
    if (typeof window !== 'undefined' && (window as any).api) {
      const api = (window as any).api;
      if (api.printToService) {
        try {
          const { mapToPrinterServiceData } = await import('@/utils/printerService');
          const printData = mapToPrinterServiceData(invoice, order.items);
          await api.printToService(printData);
          return;
        } catch (e: any) {
          console.error("Local printer service unreachable via bridge:", e);
        }
      }
    }

    // TRY 2: Direct Fetch (Primary for Web Browser)
    try {
      const { mapToPrinterServiceData } = await import('@/utils/printerService');
      const printData = mapToPrinterServiceData(invoice, order.items);
      const response = await fetch('http://localhost:8085/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(printData)
      });
      if (response.ok) return; // Success!
    } catch (e) {
      console.warn("Direct fetch to printer service failed (likely service not running or CORS):", e);
    }

    // FALLBACK: Standard Browser Print
    fallbackPrint(invoiceEl.innerHTML);
  };

  const fallbackPrint = (html: string) => {
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (!printWindow) return;

    printWindow.document.write('<html><head><title>Print Invoice</title>');
    printWindow.document.write('<style>@media print { body { margin: 0; } }</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(html);
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
    <Box sx={{ 
      position: 'absolute',
      inset: 0,
      bgcolor: '#fdfdfd',
      zIndex: 200,
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
        <Typography variant="h6" sx={{ fontWeight: 900 }}>Settle Order #{order.id}</Typography>
      </Box>

      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: { xs: 2, md: 4 }, bgcolor: '#f9f9f9' }}>
        <Grid container spacing={4} sx={{ justifyContent: 'center' }}>
          <Grid size={{ xs: 12, md: 9, lg: 8 }}>
            <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: '24px', border: '1px solid #e8e4d8', boxShadow: '0 8px 32px rgba(0,0,0,0.03)' }}>
              {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>{error}</Alert>}

              <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="overline" sx={{ fontWeight: 900, color: 'primary.main', mb: 1, display: 'block' }}>ORDER INFORMATION</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 800 }}>Waiter: {order.waiter_name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>{new Date(order.created_at).toLocaleString()}</Typography>
                </Box>
                <Chip 
                  label={order.order_type === 'DINE_IN' ? `TABLE ${order.table_number}` : 'PARCEL'} 
                  color="primary" 
                  sx={{ fontWeight: 900, borderRadius: '8px', px: 1, height: 32 }} 
                />
              </Box>

              <Typography variant="overline" sx={{ fontWeight: 900, color: 'primary.main', mb: 2, display: 'block' }}>ORDER ITEMS</Typography>
              <TableContainer sx={{ mb: 4, borderRadius: '16px', border: '1px solid #e8e4d8', overflow: 'hidden' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#FCF9EA' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 900, py: 1.5 }}>ITEM</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 900 }}>QTY</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 900 }}>PRICE</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 900 }}>TOTAL</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {order.items.map((item) => (
                      <TableRow key={item.id} sx={{ '&:last-child td': { border: 0 } }}>
                        <TableCell sx={{ fontWeight: 600 }}>{item.item_details.name}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>{item.quantity}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>₹{item.price}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800 }}>₹{(parseFloat(item.price) * item.quantity).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Divider sx={{ my: 4, borderStyle: 'dashed' }} />

              <Grid container spacing={4}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="overline" sx={{ fontWeight: 900, color: 'primary.main', mb: 2, display: 'block' }}>PAYMENT SETTINGS</Typography>
                  <FormControl fullWidth variant="outlined">
                    <InputLabel sx={{ fontWeight: 700 }}>Payment Method</InputLabel>
                    <Select
                      value={paymentMethod}
                      label="Payment Method"
                      onChange={(e) => setPaymentMethod(e.target.value as string)}
                      disabled={loading}
                      sx={{ borderRadius: '12px', bgcolor: 'white', fontWeight: 700 }}
                    >
                      <MenuItem value="UPI" sx={{ fontWeight: 700 }}>UPI Payment</MenuItem>
                      <MenuItem value="CASH" sx={{ fontWeight: 700 }}>Cash Payment</MenuItem>
                      <MenuItem value="CARD" sx={{ fontWeight: 700 }}>Card Payment</MenuItem>
                      <MenuItem value="NET_BANKING" sx={{ fontWeight: 700 }}>Net Banking</MenuItem>
                    </Select>
                  </FormControl>

                  {hasInvoice ? (
                    <Box sx={{ mt: 3, p: 2.5, bgcolor: '#FFF9E6', borderRadius: '16px', border: '1.5px solid #E9762B' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 900, color: '#E9762B' }}>
                          BILL: {invoice.invoice_number}
                        </Typography>
                        <Stack direction="row" spacing={1}>
                          <Tooltip title="Preview">
                            <IconButton size="small" onClick={() => setPreviewOpen(true)} sx={{ color: '#E9762B', bgcolor: 'white', borderRadius: '8px' }}>
                              <PreviewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Print">
                            <IconButton size="small" onClick={handlePrint} sx={{ color: '#E9762B', bgcolor: 'white', borderRadius: '8px' }}>
                              <PrintIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Download">
                            <IconButton size="small" onClick={handleDownload} disabled={downloading} sx={{ color: '#E9762B', bgcolor: 'white', borderRadius: '8px' }}>
                              {downloading ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Box>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block' }}>
                        The bill has been generated. You can now mark the order as paid.
                      </Typography>
                    </Box>
                  ) : (
                    <Alert severity="info" sx={{ mt: 3, borderRadius: '12px', fontWeight: 600 }}>
                      Generate a bill to finalize taxes and total amount.
                    </Alert>
                  )}
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Box sx={{ p: 3, bgcolor: '#fcfcfc', borderRadius: '20px', border: '1px solid #e8e4d8' }}>
                    <Typography variant="overline" sx={{ fontWeight: 900, color: 'text.disabled', mb: 2, display: 'block' }}>SUMMARY</Typography>
                    <Stack spacing={2}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>Subtotal</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800 }}>₹{subtotal.toFixed(2)}</Typography>
                      </Box>

                      {hasInvoice && invoice.tax_details && Object.entries(invoice.tax_details).map(([key, val]: [string, any]) => (
                        <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>{key}</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 800 }}>₹{parseFloat(val).toFixed(2)}</Typography>
                        </Box>
                      ))}

                      <Divider sx={{ my: 1, borderStyle: 'dashed' }} />
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6" sx={{ fontWeight: 900 }}>Total Payable</Typography>
                        <Typography variant="h4" sx={{ fontWeight: 900, color: 'primary.main' }}>
                          ₹{hasInvoice ? parseFloat(invoice.total_amount).toFixed(2) : subtotal.toFixed(2)}
                        </Typography>
                      </Box>
                    </Stack>

                    <Box sx={{ mt: 4 }}>
                      {!hasInvoice ? (
                        <Button 
                          variant="contained" 
                          fullWidth
                          onClick={handleGenerateBill}
                          disabled={loading}
                          sx={{ py: 2, fontWeight: 900, borderRadius: '12px', fontSize: '1rem', boxShadow: '0 8px 24px rgba(233,118,43,0.1)' }}
                        >
                          {loading ? 'GENERATING...' : 'GENERATE BILL'}
                        </Button>
                      ) : (
                        <Button 
                          variant="contained" 
                          fullWidth
                          color="success"
                          onClick={handleMarkAsPaid}
                          disabled={loading}
                          sx={{ py: 2, fontWeight: 900, borderRadius: '12px', fontSize: '1rem', boxShadow: '0 8px 24px rgba(16,185,129,0.1)' }}
                        >
                          {loading ? 'PROCESSING...' : 'PAID'}
                        </Button>
                      )}
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Hidden container for printing */}
      <Box sx={{ display: 'none' }}>
        <div id="thermal-invoice-container-settle">
          {hasInvoice && <InvoicePrint invoice={invoice} orderItems={order.items} tableNumber={order.table_number} />}
        </div>
      </Box>

      {/* Preview Dialog */}
      {previewOpen && (
        <InvoicePreviewDialog
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          invoice={invoice}
          orderItems={order.items}
          tableNumber={order.table_number}
          onDownload={handleDownload}
          onPrint={handlePrint}
        />
      )}
    </Box>
  );
}
