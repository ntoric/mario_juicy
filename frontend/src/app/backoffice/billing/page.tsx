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
  Drawer,
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
  ChevronRight as ChevronRightIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { restaurantService, Order } from '@/services/restaurantService';
import { OrderStatusChip } from '@/components/backoffice/restaurant/StatusChips';
import InvoicePrint from '@/components/backoffice/restaurant/InvoicePrint';
import InvoicePreviewDialog from '@/components/backoffice/restaurant/InvoicePreviewDialog';
import SettlementDialog from '@/components/backoffice/restaurant/SettlementDialog';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';

export default function BillingPage() {
  const theme = useTheme();
  const [tab, setTab] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('billing_active_tab');
      return saved !== null ? parseInt(saved) : 0;
    }
    return 0;
  });
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [printingInvoice, setPrintingInvoice] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [previewInvoice, setPreviewInvoice] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerOrder, setDrawerOrder] = useState<any>(null);
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
    // Save session
    localStorage.setItem('billing_active_tab', tab.toString());
  }, [fetchData, tab]);

  useWebSocket('ORDER_CREATED', (payload) => {
    if (!payload) return;
    // Check if it should be in pending settlements
    const shouldBeInPending = payload.status === 'COMPLETED' || 
                             (payload.order_type === 'TAKE_AWAY' && payload.status === 'READY') ||
                             payload.status === 'CANCELLED';
    
    if (shouldBeInPending) {
      setPendingOrders(prev => {
        if (prev.some(o => o.id === payload.id)) return prev;
        return [payload, ...prev];
      });
    }
  });

  useWebSocket('ORDER_UPDATED', (payload) => {
    if (!payload || !payload.id) return;
    
    // Check if it should be in pending settlements
    const shouldBeInPending = payload.status === 'COMPLETED' || 
                             (payload.order_type === 'TAKE_AWAY' && payload.status === 'READY') ||
                             payload.status === 'CANCELLED' ||
                             (payload.invoice && payload.status !== 'PAID');
    
    setPendingOrders(prev => {
      const existing = prev.find(o => o.id === payload.id);
      
      if (shouldBeInPending) {
        if (existing) {
          return prev.map(o => o.id === payload.id ? { ...o, ...payload } : o);
        } else {
          return [payload, ...prev];
        }
      } else {
        // If it was there but now shouldn't be (e.g. moved from COMPLETED to PAID)
        if (existing) {
          return prev.filter(o => o.id !== payload.id);
        }
      }
      return prev;
    });
  });

  useWebSocket('ORDER_CHECKOUT', (payload) => {
    if (!payload) return;
    // ORDER_CHECKOUT sends an Invoice. Add to invoices if we're on that tab (or just always update state)
    setInvoices(prev => {
      if (prev.some(inv => inv.id === payload.id)) return prev.map(inv => inv.id === payload.id ? payload : inv);
      return [payload, ...prev];
    });
    
    // Also remove the order from pending if it's now PAID (Terminal status check usually happens in ORDER_UPDATED)
    if (payload.order) {
      setPendingOrders(prev => prev.filter(o => o.id !== payload.order));
    }
  });

  useWebSocket('ORDER_DELETED', (payload) => {
    if (!payload || !payload.id) return;
    setPendingOrders(prev => prev.filter(o => o.id !== payload.id));
  });

  useEffect(() => {
    const handleRefresh = () => fetchData();
    window.addEventListener('app-refresh', handleRefresh);
    return () => {
      window.removeEventListener('app-refresh', handleRefresh);
    };
  }, [fetchData]);

  // Restore settlement session
  useEffect(() => {
    const savedOrderId = localStorage.getItem('billing_selected_order_id');
    if (savedOrderId && pendingOrders.length > 0) {
      const order = pendingOrders.find(o => o.id === Number(savedOrderId));
      if (order) setSelectedOrder(order);
    }
  }, [pendingOrders.length]);

  // Save settlement session
  useEffect(() => {
    if (selectedOrder) {
      localStorage.setItem('billing_selected_order_id', selectedOrder.id.toString());
    } else {
      localStorage.removeItem('billing_selected_order_id');
    }
  }, [selectedOrder]);

  const handlePrint = async (invoice: any) => {
    setPrintingInvoice(invoice);
    
    // Give react time to render the printingInvoice in the hidden container
    setTimeout(async () => {
      const invoiceEl = document.getElementById('thermal-invoice-container');
      if (!invoiceEl) {
        setPrintingInvoice(null);
        return;
      }

      const { printInvoice } = await import('@/utils/printerService');
      await printInvoice(invoice, invoice.items || [], user?.store);
      
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

  const dineInOrders = filteredOrders.filter(o => o.order_type === 'DINE_IN' && (o.status === 'COMPLETED' || o.invoice) && o.status !== 'CANCELLED');
  const takeAwayOrders = filteredOrders.filter(o => o.order_type === 'TAKE_AWAY' && o.status === 'READY' && o.status !== 'CANCELLED');
  const cancelledOrders = filteredOrders.filter(o => o.status === 'CANCELLED');

  return (
    <Box sx={{ position: 'relative', height: '100%', display: "flex", flexDirection: "column", p: { xs: 1.5, md: 2 }, pb: { xs: 15, md: 2 }, overflow: 'hidden' }}>
      {/* Optimized Header Row */}
      <Box sx={{ 
        mb: 2, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        gap: 2 
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 600, color: '#e9762b', fontSize: { xs: '1.1rem', md: '1.25rem' }, whiteSpace: 'nowrap' }}>
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
        <Box sx={{ mb: 1.5 }}>
          <Tabs 
            value={tab} 
            onChange={(_, v) => setTab(v)}
            variant="fullWidth"
            sx={{ 
              mb: 1,
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
                          <Tooltip title="Checkout Order">
                            <Button
                              variant="contained"
                              size="small"
                              onClick={() => setSelectedOrder(order)}
                              sx={{ fontWeight: 800, borderRadius: '7px', px: 2, height: 32 }}
                            >
                              CHECKOUT
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
                          <Tooltip title="Checkout Parcel">
                            <Button
                              variant="contained"
                              size="small"
                              color="secondary"
                              onClick={() => setSelectedOrder(order)}
                              sx={{ fontWeight: 800, borderRadius: '7px', px: 2, height: 32 }}
                            >
                              CHECKOUT
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
                              onClick={() => { setDrawerOrder(order); setDrawerOpen(true); }}
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
                        <Tooltip title="Order Details">
                          <IconButton 
                            size="small" 
                            onClick={() => { setDrawerOrder(invoice); setDrawerOpen(true); }}
                            sx={{ color: 'info.main', bgcolor: alpha(theme.palette.info.main, 0.05), borderRadius: '7px', mr: 0.5 }}
                          >
                            <InfoIcon fontSize="small" />
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

        {/* List View for Mobile */}
        {isMobile && (
          <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1, pb: 10, minHeight: 0 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                <CircularProgress size={32} />
              </Box>
            ) : tab === 0 ? (
              // Settlements List
              dineInOrders.length === 0 && takeAwayOrders.length === 0 ? (
                <Stack sx={{ alignItems: 'center', opacity: 0.4, py: 10 }} spacing={1}>
                  <SettlementIcon sx={{ fontSize: 48 }} />
                  <Typography variant="body1">No pending orders</Typography>
                </Stack>
              ) : (
                <Stack spacing={1}>
                  {dineInOrders.length > 0 && (
                    <>
                      <Box sx={{ px: 1, py: 0.5, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 900, textTransform: 'uppercase', color: 'primary.main' }}>Dine-in Orders</Typography>
                      </Box>
                      {dineInOrders.map((order) => (
                        <Paper 
                          key={order.id} 
                          sx={{ p: 1.5, borderRadius: 2, border: '1px solid #eee', boxShadow: 'none', cursor: 'pointer', '&:active': { bgcolor: alpha(theme.palette.primary.main, 0.05) } }}
                          onClick={() => { setDrawerOrder(order); setDrawerOpen(true); }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ flexGrow: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>#{order.id}</Typography>
                                <Chip label={`T${order.table_number}`} size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }} />
                              </Box>
                              <Typography variant="caption" color="text.secondary">Waiter: {order.waiter_name}</Typography>
                            </Box>
                            <Box sx={{ textAlign: 'right', mr: 2 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 900, color: 'primary.main' }}>₹{parseFloat(order.total_amount).toFixed(0)}</Typography>
                            </Box>
                            <Button 
                              variant="contained" 
                              size="small" 
                              onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}
                              sx={{ minWidth: 70, height: 32, borderRadius: 1.5, fontWeight: 800, fontSize: '0.7rem' }}
                            >
                              SETTLE
                            </Button>
                          </Box>
                        </Paper>
                      ))}
                    </>
                  )}

                  {takeawayEnabled && takeAwayOrders.length > 0 && (
                    <>
                      <Box sx={{ px: 1, py: 0.5, mt: 1, bgcolor: alpha(theme.palette.secondary.main, 0.05), borderRadius: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 900, textTransform: 'uppercase', color: 'secondary.main' }}>Parcel Orders</Typography>
                      </Box>
                      {takeAwayOrders.map((order) => (
                        <Paper 
                          key={order.id} 
                          sx={{ p: 1.5, borderRadius: 2, border: '1px solid #eee', boxShadow: 'none', cursor: 'pointer', bgcolor: '#fdfcf4', '&:active': { bgcolor: alpha(theme.palette.secondary.main, 0.05) } }}
                          onClick={() => { setDrawerOrder(order); setDrawerOpen(true); }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ flexGrow: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>#{order.id}</Typography>
                                <Chip label="PARCEL" size="small" color="secondary" variant="outlined" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800 }} />
                              </Box>
                              <Typography variant="caption" color="text.secondary">{order.customer_name || 'No Name'}</Typography>
                            </Box>
                            <Box sx={{ textAlign: 'right', mr: 2 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 900, color: 'primary.main' }}>₹{parseFloat(order.total_amount).toFixed(0)}</Typography>
                            </Box>
                            <Button 
                              variant="contained" 
                              size="small" 
                              color="secondary"
                              onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}
                              sx={{ minWidth: 70, height: 32, borderRadius: 1.5, fontWeight: 800, fontSize: '0.7rem' }}
                            >
                              SETTLE
                            </Button>
                          </Box>
                        </Paper>
                      ))}
                    </>
                  )}
                </Stack>
              )
            ) : tab === 1 ? (
              // Cancelled List
              cancelledOrders.length === 0 ? (
                <Stack sx={{ alignItems: 'center', opacity: 0.4, py: 10 }} spacing={1}>
                  <DeleteIcon sx={{ fontSize: 48 }} />
                  <Typography variant="body1">No cancelled orders</Typography>
                </Stack>
              ) : (
                <Stack spacing={1}>
                  {cancelledOrders.map((order) => (
                    <Paper key={order.id} sx={{ p: 1.5, borderRadius: 2, border: '1px solid #ffebee', bgcolor: '#fffafb', boxShadow: 'none' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>#{order.id}</Typography>
                          <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 700 }}>{order.notes?.replace('CANCELLED: ', '').substring(0, 30) || 'No reason'}...</Typography>
                        </Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 900, color: 'error.main', mr: 2 }}>₹{parseFloat(order.total_amount).toFixed(0)}</Typography>
                        <IconButton size="small" onClick={() => { setDrawerOrder(order); setDrawerOpen(true); }} sx={{ color: 'error.main' }}>
                          <ChevronRightIcon />
                        </IconButton>
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              )
            ) : (
              // Invoices List
              filteredInvoices.length === 0 ? (
                <Stack sx={{ alignItems: 'center', opacity: 0.4, py: 10 }} spacing={1}>
                  <BillIcon sx={{ fontSize: 48 }} />
                  <Typography variant="body1">No invoices found</Typography>
                </Stack>
              ) : (
                <Stack spacing={1}>
                  {filteredInvoices.map((invoice) => (
                    <Paper key={invoice.id} sx={{ p: 1.2, borderRadius: 2, border: '1px solid #f1f5f9', boxShadow: 'none' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.75rem' }}>{invoice.invoice_number}</Typography>
                          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.3 }}>
                            <Chip label={invoice.payment_method} size="small" color="success" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 800 }} />
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>{new Date(invoice.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Typography>
                          </Stack>
                        </Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 900, color: 'primary.main', mr: 1.5 }}>₹{parseFloat(invoice.total_amount).toFixed(0)}</Typography>
                        <Stack direction="row" spacing={0.5}>
                          <IconButton size="small" onClick={() => setPreviewInvoice(invoice)} sx={{ color: 'primary.main', p: 0.5 }}><ViewIcon sx={{ fontSize: 18 }} /></IconButton>
                          <IconButton size="small" onClick={() => handlePrint(invoice)} sx={{ color: 'text.secondary', p: 0.5 }}><PrintIcon sx={{ fontSize: 18 }} /></IconButton>
                        </Stack>
                      </Box>
                    </Paper>
                  ))}
                </Stack>
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

      {/* Order Details Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        slotProps={{
          paper: {
            sx: { width: { xs: '100%', sm: 400 }, borderRadius: { xs: 0, sm: '16px 0 0 16px' } }
          }
        }}
      >
        {drawerOrder && (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#fdfdfd' }}>
            {/* Header */}
            <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'white' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 900 }}>
                    {drawerOrder.table_number ? `TABLE ${drawerOrder.table_number}` : 'PARCEL'}
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block' }}>
                    {new Date(drawerOrder.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.disabled' }}>
                    {drawerOrder.invoice_number ? `Invoice ${drawerOrder.invoice_number}` : `Order #${drawerOrder.id}`}
                  </Typography>
                </Box>
                <IconButton onClick={() => setDrawerOpen(false)} size="small">
                  <ChevronRightIcon />
                </IconButton>
              </Box>
              <OrderStatusChip status={drawerOrder.status || 'PAID'} orderType={drawerOrder.order_type} />
            </Box>

            {/* Customer & Payment Details */}
            {(drawerOrder.customer_name || drawerOrder.customer_mobile || drawerOrder.payment_method || drawerOrder.invoice?.payment_method) && (
              <Box sx={{ px: 3, py: 2, bgcolor: alpha(theme.palette.primary.main, 0.02), borderBottom: '1px solid', borderColor: 'divider' }}>
                <Grid container spacing={2}>
                  {(drawerOrder.customer_name || drawerOrder.customer_mobile) && (
                    <Grid size={{ xs: (drawerOrder.payment_method || drawerOrder.invoice?.payment_method) ? 6 : 12 }}>
                      <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.disabled' }}>Customer</Typography>
                      {drawerOrder.customer_name && (
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{drawerOrder.customer_name}</Typography>
                      )}
                      {drawerOrder.customer_mobile && (
                        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block' }}>{drawerOrder.customer_mobile}</Typography>
                      )}
                    </Grid>
                  )}
                  {(drawerOrder.payment_method || drawerOrder.invoice?.payment_method) && (
                    <Grid size={{ xs: (drawerOrder.customer_name || drawerOrder.customer_mobile) ? 6 : 12 }}>
                      <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.disabled' }}>Payment</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main' }}>
                        {drawerOrder.payment_method || drawerOrder.invoice?.payment_method}
                      </Typography>
                      {drawerOrder.invoice_number && (
                        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                          #{drawerOrder.invoice_number}
                        </Typography>
                      )}
                    </Grid>
                  )}
                </Grid>
              </Box>
            )}

            {/* Items Section - SCROLLABLE */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 3 }}>
              <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.disabled', mb: 1, display: 'block' }}>Items</Typography>
              <Stack spacing={2}>
                {(drawerOrder.items || []).map((item: any, idx: number) => (
                  <Box key={item.id || idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>{item.item_details?.name || 'Unknown Item'}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        {item.quantity} × ₹{parseFloat(item.price).toFixed(2)}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 900 }}>
                      ₹{(item.quantity * parseFloat(item.price)).toFixed(2)}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>

            {/* Footer */}
            <Box sx={{ p: 3, pb: { xs: 'calc(80px + env(safe-area-inset-bottom))', sm: 3 }, borderTop: '2px dashed', borderColor: 'divider', bgcolor: 'white' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>Total Amount</Typography>
                <Typography variant="h5" sx={{ fontWeight: 950, color: 'primary.main' }}>
                  ₹{parseFloat(drawerOrder.total_amount).toFixed(2)}
                </Typography>
              </Box>
              
              {drawerOrder.notes && (
                <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: '8px' }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', display: 'block', mb: 0.5 }}>NOTES</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>{drawerOrder.notes}</Typography>
                </Box>
              )}
            </Box>
          </Box>
        )}
      </Drawer>
    </Box>
  );
}
