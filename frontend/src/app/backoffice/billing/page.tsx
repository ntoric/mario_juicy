"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  InputAdornment,
  Chip,
  Button,
  CircularProgress,
  Stack,
  useTheme,
  Alert,
  Tabs,
  Tab,
  Tooltip,
  useMediaQuery,
  Grid,
  Card as MuiCard,
  CardContent,
  alpha,
} from "@mui/material";
import {
  Search as SearchIcon,
  Print as PrintIcon,
  Refresh as RefreshIcon,
  Receipt as BillIcon,
  Visibility as ViewIcon,
  AccountBalanceWallet as SettlementIcon,
  ShoppingBag as ShoppingBagIcon,
  Room as LocationIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { restaurantService } from '@/services/restaurantService';
import InvoicePrint from '@/components/backoffice/restaurant/InvoicePrint';
import InvoicePreviewDialog from '@/components/backoffice/restaurant/InvoicePreviewDialog';
import SettlementDialog from '@/components/backoffice/restaurant/SettlementDialog';
import { useAuth } from '@/hooks/useAuth';

export default function BillingPage() {
  const theme = useTheme();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [printingInvoice, setPrintingInvoice] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [previewInvoice, setPreviewInvoice] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);
  const { user } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const takeawayEnabled = user?.store?.is_take_away_enabled !== false;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 0 || tab === 1) {
        const data = await restaurantService.getPendingSettlements();
        setPendingOrders(data);
      } else {
        const data = await restaurantService.getInvoices();
        setInvoices(data);
      }
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handleRefresh = () => fetchData();
    window.addEventListener('app-refresh', handleRefresh);
    return () => window.removeEventListener('app-refresh', handleRefresh);
  }, [fetchData]);

  const handlePrint = async (invoice: any) => {
    setPrintingInvoice(invoice);
    
    // Give react time to render the printingInvoice in the hidden container
    setTimeout(async () => {
      const invoiceEl = document.getElementById('thermal-invoice-container');
      if (!invoiceEl) {
        setPrintingInvoice(null);
        return;
      }

      // TRY 1: Local Go Service (Port 8085) - Direct Fetch (Primary for Browser/Electron)
      try {
        const { mapToPrinterServiceData } = await import('@/utils/printerService');
        const printData = mapToPrinterServiceData(invoice, invoice.items || []);
        
        const response = await fetch('http://localhost:8085/print', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(printData)
        });

        if (response.ok) {
          setPrintingInvoice(null);
          return;
        }
      } catch (e: any) {
        console.warn("Direct fetch to printer service failed (service likely not running):", e);
      }

      // TRY 2: Electron API (Fallback)
      if (typeof window !== 'undefined' && (window as any).api) {
        const api = (window as any).api;

        // Try local service via bridge
        if (api.printToService) {
          try {
            const { mapToPrinterServiceData } = await import('@/utils/printerService');
            const printData = mapToPrinterServiceData(invoice, invoice.items || []);
            await api.printToService(printData);
            setPrintingInvoice(null);
            return;
          } catch (e: any) {
            console.error("Local service print via bridge failed:", e);
          }
        }

        // Fallback to system print via bridge
        if (api.print) {
          const store = invoice?.store_details || user?.store;
          const printerName = store?.thermal_printer_name;
          const paperSize = store?.thermal_printer_size || '3_INCH';

          try {
            await api.print({ 
              html: invoiceEl.innerHTML, 
              printerName: printerName || undefined,
              paperSize
            });
            setPrintingInvoice(null);
            return;
          } catch (e: any) {
            console.error("Direct system print failed:", e);
          }
        }
      }

      // TRY 3: Browser Fallback (Standard Dialog)
      fallbackPrint(invoiceEl.innerHTML);
      setPrintingInvoice(null);
    }, 100);
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
  
  const handleDownload = async (invoice: any) => {
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

  const filteredInvoices = invoices.filter(inv => 
    inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
    (inv.table_number || '').toString().includes(search)
  );

  const filteredOrders = pendingOrders.filter(ord => 
    ord.id.toString().includes(search) ||
    (ord.table_number || '').toString().includes(search)
  );

  const dineInOrders = filteredOrders.filter(o => o.order_type === 'DINE_IN' && o.status !== 'CANCELLED');
  const takeAwayOrders = filteredOrders.filter(o => o.order_type === 'TAKE_AWAY' && o.status !== 'CANCELLED');
  const cancelledOrders = filteredOrders.filter(o => o.status === 'CANCELLED');

  return (
    <Box sx={{ height: { xs: 'auto', md: '100%' }, display: "flex", flexDirection: "column", p: { xs: 1.5, md: 2 }, overflow: { xs: 'visible', md: 'hidden' } }}>
      {/* Optimized Header Row */}
      <Box sx={{ 
        mb: 2, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        gap: 2 
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 500, color: '#e9762b', fontSize: '1.25rem', whiteSpace: 'nowrap' }}>
            Billing
          </Typography>
          
          <Tabs 
            value={tab} 
            onChange={(_, v) => setTab(v)}
            sx={{ 
              display: { xs: 'none', sm: 'flex' },
              minHeight: 40,
              '& .MuiTabs-indicator': { height: 3, borderRadius: '7px 7px 0 0' },
              '& .MuiTab-root': { 
                fontWeight: 700, 
                fontSize: '0.8rem', 
                minHeight: 40, 
                px: 1.5,
                color: 'text.secondary',
                '&.Mui-selected': { color: 'primary.main' }
              }
            }}
          >
            <Tab label="Pending" />
            <Tab label="Cancelled" />
            <Tab label="History" />
          </Tabs>
        </Box>

        <Box sx={{ flexGrow: 1, maxWidth: 400, mx: 2, display: { xs: 'none', md: 'block' } }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search orders, tables..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.disabled', fontSize: 18 }} />
                  </InputAdornment>
                ),
                sx: { borderRadius: '7px', height: 36, bgcolor: 'white' }
              }
            }}
          />
        </Box>

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          {isMobile && (
            <IconButton onClick={fetchData} size="small" sx={{ color: 'primary.main', border: '1px solid', borderColor: 'divider', borderRadius: '7px' }}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          )}
          {!isMobile && (
            <Tooltip title="Refresh List">
              <Button
                variant="outlined"
                size="small"
                onClick={fetchData}
                disabled={loading}
                sx={{ borderRadius: '7px', height: 36, minWidth: 36, p: 0 }}
              >
                <RefreshIcon fontSize="small" />
              </Button>
            </Tooltip>
          )}
        </Stack>
      </Box>

      {/* Mobile Only Content (Search + Tabs) */}
      {isMobile && (
        <Box sx={{ mb: 2 }}>
          <Tabs 
            value={tab} 
            onChange={(_, v) => setTab(v)}
            variant="fullWidth"
            sx={{ 
              mb: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.03),
              borderRadius: '7px',
              '& .MuiTabs-indicator': { height: 3, borderRadius: '7px' },
              '& .MuiTab-root': { fontWeight: 800, fontSize: '0.75rem', minHeight: 44 }
            }}
          >
            <Tab label="Pending" />
            <Tab label="Cancelled" />
            <Tab label="History" />
          </Tabs>
          
          <TextField
            fullWidth
            size="small"
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.disabled', fontSize: 18 }} />
                  </InputAdornment>
                ),
                sx: { borderRadius: '7px', bgcolor: 'white' }
              }
            }}
          />
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '7px' }}>{error}</Alert>}

      <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', borderRadius: '7px', overflow: 'hidden', border: '1px solid #e8e4d8', boxShadow: 'none', minHeight: 0 }}>


        <TableContainer sx={{ flexGrow: 1, overflowY: 'auto', display: isMobile ? 'none' : 'block' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#FCF9EA' }}>
                {tab === 0 ? (
                  <>
                    <TableCell sx={{ fontWeight: 800, py: 2, fontSize: '0.75rem', textTransform: 'uppercase', color: '#e9762b' }}>Order Ref</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', color: '#e9762b' }}>Table/Type</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', color: '#e9762b' }}>Waiter</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', color: '#e9762b' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', color: '#e9762b' }} align="right">Amount</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', color: '#e9762b' }} align="right">Actions</TableCell>
                  </>
                ) : tab === 1 ? (
                  <>
                    <TableCell sx={{ fontWeight: 800, py: 2, fontSize: '0.75rem', textTransform: 'uppercase', color: '#e9762b' }}>Order Ref</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', color: '#e9762b' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', color: '#e9762b' }}>Waiter</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', color: '#e9762b' }}>Reason</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', color: '#e9762b' }} align="right">Amount</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', color: '#e9762b' }} align="right">Actions</TableCell>
                  </>
                ) : (
                  <>
                    <TableCell sx={{ fontWeight: 800, py: 2, fontSize: '0.75rem', textTransform: 'uppercase', color: '#e9762b' }}>Invoice Number</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', color: '#e9762b' }}>Date & Time</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', color: '#e9762b' }}>Order Ref</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', color: '#e9762b' }}>Payment Method</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', color: '#e9762b' }} align="right">Amount</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', color: '#e9762b' }} align="right">Actions</TableCell>
                  </>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : tab === 0 ? (
                // Settlements Tab
                dineInOrders.length === 0 && takeAwayOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                      <Stack sx={{ alignItems: 'center', opacity: 0.4 }} spacing={1}>
                        <SettlementIcon sx={{ fontSize: 48 }} />
                        <Typography variant="body1">No orders pending settlement</Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {dineInOrders.length > 0 && (
                      <TableRow sx={{ bgcolor: 'rgba(15,23,42,0.02)' }}>
                        <TableCell colSpan={6} sx={{ py: 1.5, px: 3 }}>
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            <LocationIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Dine-in Orders
                            </Typography>
                            <Chip label={dineInOrders.length} size="small" sx={{ fontWeight: 800, height: 20, bgcolor: 'primary.main', color: 'white', borderRadius: '7px' }} />
                          </Stack>
                        </TableCell>
                      </TableRow>
                    )}
                    {dineInOrders.map((order) => (
                      <TableRow key={order.id} sx={{ '&:hover': { bgcolor: '#fdfcf4' } }}>
                        <TableCell sx={{ py: 2 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>#{order.id}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={`Table ${order.table_number}`} 
                            size="small" 
                            variant="outlined" 
                            sx={{ fontWeight: 600, borderRadius: '7px' }} 
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{order.waiter_name}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={order.invoice ? "Bill Generated" : order.status} 
                            size="small"
                            color={order.invoice ? "info" : "warning"}
                            sx={{ fontWeight: 800, borderRadius: '7px', fontSize: '0.65rem' }} 
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body1" sx={{ fontWeight: 900, color: 'primary.main' }}>
                            ₹{parseFloat(order.total_amount).toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Settle Order">
                            <Button
                              variant="contained"
                              size="small"
                              onClick={() => setSelectedOrder(order)}
                              sx={{ fontWeight: 800, borderRadius: '7px', minWidth: 40, height: 32, p: 0 }}
                            >
                              <SettlementIcon fontSize="small" />
                            </Button>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}

                    {takeawayEnabled && takeAwayOrders.length > 0 && (
                      <TableRow sx={{ bgcolor: 'rgba(15,23,42,0.02)' }}>
                        <TableCell colSpan={6} sx={{ py: 1.5, px: 3 }}>
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                            <ShoppingBagIcon sx={{ fontSize: 18, color: 'secondary.main' }} />
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              Parcel Orders
                            </Typography>
                            <Chip label={takeAwayOrders.length} size="small" sx={{ fontWeight: 800, height: 20, bgcolor: 'secondary.main', color: 'white' }} />
                          </Stack>
                        </TableCell>
                      </TableRow>
                    )}
                    {takeawayEnabled && takeAwayOrders.map((order) => (
                      <TableRow key={order.id} sx={{ '&:hover': { bgcolor: '#fdfcf4' } }}>
                        <TableCell sx={{ py: 2 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>#{order.id}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label="Parcel" 
                            size="small" 
                            variant="outlined" 
                            sx={{ fontWeight: 600, borderRadius: 1.5, color: 'secondary.main', borderColor: 'secondary.light' }} 
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{order.waiter_name}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={order.invoice ? "Bill Generated" : order.status} 
                            size="small"
                            color={order.invoice ? "info" : "warning"}
                            sx={{ fontWeight: 800, borderRadius: 1, fontSize: '0.65rem' }} 
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body1" sx={{ fontWeight: 900, color: 'primary.main' }}>
                            ₹{parseFloat(order.total_amount).toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Settle Parcel">
                            <Button
                              variant="contained"
                              size="small"
                              color="secondary"
                              onClick={() => setSelectedOrder(order)}
                              sx={{ fontWeight: 800, borderRadius: '7px', minWidth: 40, height: 32, p: 0 }}
                            >
                              <SettlementIcon fontSize="small" />
                            </Button>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )
              ) : tab === 1 ? (
                // Cancelled Tab
                cancelledOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                      <Stack sx={{ alignItems: 'center', opacity: 0.4 }} spacing={1}>
                        <DeleteIcon sx={{ fontSize: 48 }} />
                        <Typography variant="body1">No cancelled orders found</Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {cancelledOrders.map((order) => (
                      <TableRow key={order.id} sx={{ '&:hover': { bgcolor: '#fffafb' } }}>
                        <TableCell sx={{ py: 2 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>#{order.id}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="error.main" sx={{ fontWeight: 800, fontSize: '0.75rem' }}>CANCELLED</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{order.waiter_name}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', maxWidth: 200, display: 'block' }}>
                            {order.notes?.replace('CANCELLED: ', '') || 'No reason provided'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body1" sx={{ fontWeight: 900, color: 'error.main' }}>
                            ₹{parseFloat(order.total_amount).toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="View Details">
                            <Button
                              variant="outlined"
                              size="small"
                              color="error"
                              onClick={() => setSelectedOrder(order)}
                              sx={{ fontWeight: 800, borderRadius: '7px', minWidth: 40, height: 32, p: 0 }}
                            >
                              <ViewIcon fontSize="small" />
                            </Button>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )
              ) : (
                // Invoices History Tab
                filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                      <Stack sx={{ alignItems: 'center', opacity: 0.4 }} spacing={1}>
                        <BillIcon sx={{ fontSize: 48 }} />
                        <Typography variant="body1">No invoices found</Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id} sx={{ '&:hover': { bgcolor: '#fdfcf4' } }}>
                      <TableCell sx={{ py: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{invoice.invoice_number}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{new Date(invoice.created_at).toLocaleString()}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={`Order #${invoice.order}`} size="small" variant="outlined" sx={{ fontWeight: 600, borderRadius: 1.5 }} />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={invoice.payment_method} 
                          size="small" 
                          color={invoice.payment_method === 'CASH' ? 'success' : 'primary'}
                          sx={{ fontWeight: 800, borderRadius: 1, fontSize: '0.65rem' }} 
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body1" sx={{ fontWeight: 900, color: 'primary.main' }}>
                          ₹{parseFloat(invoice.total_amount).toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="View Invoice">
                          <IconButton 
                            size="small" 
                            onClick={() => setPreviewInvoice(invoice)}
                            sx={{ color: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: '7px', mr: 0.5 }}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Print Invoice">
                          <IconButton 
                            size="small" 
                            onClick={() => handlePrint(invoice)}
                            sx={{ color: '#5D4037', bgcolor: alpha('#5D4037', 0.05), borderRadius: '7px' }}
                          >
                            <PrintIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Card View for Mobile */}
        {isMobile && (
          <Box sx={{ flexGrow: { xs: 0, md: 1 }, overflowY: { xs: 'visible', md: 'auto' }, p: 2, minHeight: 0 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                <CircularProgress size={32} />
              </Box>
            ) : tab === 0 ? (
              // Settlements Cards
              dineInOrders.length === 0 && takeAwayOrders.length === 0 ? (
                <Stack sx={{ alignItems: 'center', opacity: 0.4, py: 10 }} spacing={1}>
                  <SettlementIcon sx={{ fontSize: 48 }} />
                  <Typography variant="body1">No pending orders</Typography>
                </Stack>
              ) : (
                <Grid container spacing={3}>
                  {dineInOrders.length > 0 && (
                    <>
                      <Grid size={{ xs: 12 }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <LocationIcon sx={{ color: 'primary.main' }} />
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, textTransform: 'uppercase' }}>Dine-in</Typography>
                          <Chip label={dineInOrders.length} size="small" sx={{ fontWeight: 800, bgcolor: 'primary.main', color: 'white' }} />
                        </Stack>
                      </Grid>
                      {dineInOrders.map((order) => (
                        <Grid size={{ xs: 12 }} key={order.id}>
                          <MuiCard sx={{ borderRadius: 3, border: '1px solid #e8e4d8', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                            <CardContent sx={{ p: 2 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Order #{order.id}</Typography>
                                <Chip 
                                  label={`Table ${order.table_number}`} 
                                  size="small" variant="outlined" sx={{ fontWeight: 700, borderRadius: 1.5 }} 
                                />
                              </Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                <Box>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Waiter: {order.waiter_name}</Typography>
                                  <Typography variant="h6" sx={{ fontWeight: 900, color: 'primary.main', mt: 0.5 }}>₹{parseFloat(order.total_amount).toFixed(2)}</Typography>
                                </Box>
                                <Button 
                                  variant="contained" 
                                  size="small" 
                                  onClick={() => setSelectedOrder(order)}
                                  sx={{ px: 3, borderRadius: 2, fontWeight: 700 }}
                                >
                                  Settle
                                </Button>
                              </Box>
                            </CardContent>
                          </MuiCard>
                        </Grid>
                      ))}
                    </>
                  )}

                  {takeawayEnabled && takeAwayOrders.length > 0 && (
                    <>
                      <Grid size={{ xs: 12 }} sx={{ mt: 2 }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <ShoppingBagIcon sx={{ color: 'secondary.main' }} />
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, textTransform: 'uppercase' }}>Parcels</Typography>
                          <Chip label={takeAwayOrders.length} size="small" sx={{ fontWeight: 800, bgcolor: 'secondary.main', color: 'white' }} />
                        </Stack>
                      </Grid>
                      {takeAwayOrders.map((order) => (
                        <Grid size={{ xs: 12 }} key={order.id}>
                          <MuiCard sx={{ borderRadius: 3, border: '1px solid #e8e4d8', bgcolor: '#fdfcf4' }}>
                            <CardContent sx={{ p: 2 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Order #{order.id}</Typography>
                                <Chip 
                                  label="Parcel" 
                                  size="small" variant="outlined" sx={{ fontWeight: 700, borderRadius: 1.5, color: 'secondary.main', borderColor: 'secondary.light' }} 
                                />
                              </Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                <Box>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Waiter: {order.waiter_name}</Typography>
                                  <Typography variant="h6" sx={{ fontWeight: 900, color: 'primary.main', mt: 0.5 }}>₹{parseFloat(order.total_amount).toFixed(2)}</Typography>
                                </Box>
                                <Button 
                                  variant="contained" 
                                  size="small" 
                                  color="secondary"
                                  onClick={() => setSelectedOrder(order)}
                                  sx={{ px: 3, borderRadius: 2, fontWeight: 700 }}
                                >
                                  Settle
                                </Button>
                              </Box>
                            </CardContent>
                          </MuiCard>
                        </Grid>
                      ))}
                    </>
                  )}
                </Grid>
              )
            ) : tab === 1 ? (
              // Cancelled Cards
              cancelledOrders.length === 0 ? (
                <Stack sx={{ alignItems: 'center', opacity: 0.4, py: 10 }} spacing={1}>
                  <DeleteIcon sx={{ fontSize: 48 }} />
                  <Typography variant="body1">No cancelled orders found</Typography>
                </Stack>
              ) : (
                <Grid container spacing={2}>
                  {cancelledOrders.map((order) => (
                    <Grid size={{ xs: 12 }} key={order.id}>
                      <MuiCard sx={{ borderRadius: 3, border: '1px solid', borderColor: 'error.light', bgcolor: '#fffafb' }}>
                        <CardContent sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Order #{order.id}</Typography>
                            <Typography variant="caption" sx={{ fontWeight: 900, color: 'error.main' }}>CANCELLED</Typography>
                          </Box>
                          <Box sx={{ p: 1, bgcolor: 'error.lighter', borderRadius: 1, mb: 2 }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: 'error.dark', display: 'block' }}>REASON:</Typography>
                            <Typography variant="body2" color="text.secondary">{order.notes?.replace('CANCELLED: ', '') || 'No reason'}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="h6" sx={{ fontWeight: 900, color: 'error.main' }}>₹{parseFloat(order.total_amount).toFixed(2)}</Typography>
                            <Button 
                              variant="outlined" 
                              size="small" 
                              color="error"
                              onClick={() => setSelectedOrder(order)}
                              sx={{ px: 3, borderRadius: 2, fontWeight: 700 }}
                            >
                              Details
                            </Button>
                          </Box>
                        </CardContent>
                      </MuiCard>
                    </Grid>
                  ))}
                </Grid>
              )
            ) : (
              // Invoices Cards
              filteredInvoices.length === 0 ? (
                <Stack sx={{ alignItems: 'center', opacity: 0.4, py: 10 }} spacing={1}>
                  <BillIcon sx={{ fontSize: 48 }} />
                  <Typography variant="body1">No invoices found</Typography>
                </Stack>
              ) : (
                <Grid container spacing={2}>
                  {filteredInvoices.map((invoice) => (
                    <Grid size={{ xs: 12 }} key={invoice.id}>
                      <MuiCard sx={{ borderRadius: 3, border: '1px solid #e8e4d8', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                        <CardContent sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{invoice.invoice_number}</Typography>
                            <Typography variant="caption" color="text.secondary">{new Date(invoice.created_at).toLocaleDateString()}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                            <Chip label={`Order #${invoice.order}`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                            <Chip label={invoice.payment_method} size="small" color="success" sx={{ height: 20, fontSize: '0.65rem' }} />
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="h6" sx={{ fontWeight: 900, color: 'primary.main' }}>₹{parseFloat(invoice.total_amount).toFixed(2)}</Typography>
                            <Stack direction="row" spacing={1}>
                              <IconButton 
                                size="small" 
                                onClick={() => setPreviewInvoice(invoice)}
                                sx={{ border: '1px solid', borderColor: 'primary.light', borderRadius: 2, color: 'primary.main' }}
                              >
                                <ViewIcon fontSize="small" />
                              </IconButton>
                              <IconButton 
                                size="small" 
                                onClick={() => handlePrint(invoice)}
                                sx={{ border: '1px solid #e8e4d8', borderRadius: 2 }}
                              >
                                <PrintIcon fontSize="small" />
                              </IconButton>
                            </Stack>
                          </Box>
                        </CardContent>
                      </MuiCard>
                    </Grid>
                  ))}
                </Grid>
              )
            )}
          </Box>
        )}
      </Paper>

      {/* Hidden container for printing */}
      <Box sx={{ display: 'none' }}>
        <div id="thermal-invoice-container">
          {printingInvoice && (
            <InvoicePrint 
              invoice={printingInvoice} 
              orderItems={printingInvoice.items || []} 
              tableNumber={printingInvoice.table_number || 'N/A'} 
            />
          )}
        </div>
      </Box>

      {/* Settlement Dialog */}
      {selectedOrder && (
        <SettlementDialog
          open={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          order={selectedOrder}
          onSuccess={fetchData}
        />
      )}

      {/* Preview Dialog */}
      {previewInvoice && (
        <InvoicePreviewDialog
          open={!!previewInvoice}
          onClose={() => setPreviewInvoice(null)}
          invoice={previewInvoice}
          orderItems={previewInvoice.items || []}
          tableNumber={previewInvoice.table_number || 'N/A'}
          onDownload={() => handleDownload(previewInvoice)}
          onPrint={() => handlePrint(previewInvoice)}
        />
      )}
    </Box>
  );
}
