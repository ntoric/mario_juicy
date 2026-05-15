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
  SearchOutlined as SearchIcon,
  PrintOutlined as PrintIcon,
  RefreshOutlined as RefreshIcon,
  ReceiptOutlined as BillIcon,
  VisibilityOutlined as ViewIcon,
  AccountBalanceWalletOutlined as SettlementIcon,
  ShoppingBagOutlined as ShoppingBagIcon,
  RoomOutlined as LocationIcon,
  DeleteOutlined as DeleteIcon,
  ChevronRightOutlined as ChevronRightIcon,
  InfoOutlined as InfoIcon,
} from '@mui/icons-material';
import { restaurantService, Order } from '@/services/restaurantService';
import { OrderStatusChip } from '@/components/backoffice/restaurant/StatusChips';
import InvoicePrint from '@/components/backoffice/restaurant/InvoicePrint';
import InvoicePreviewDialog from '@/components/backoffice/restaurant/InvoicePreviewDialog';
import SettlementDialog from '@/components/backoffice/restaurant/SettlementDialog';
import { useAuth } from '@/hooks/useAuth';
import PageHeader from "@/components/backoffice/PageHeader";
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
  const { user, activeStore } = useAuth();
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
    if (!activeStore?.thermal_printer_name) {
      const { toast } = await import('sonner');
      toast.info("Printer not selected", {
        description: "Please configure a thermal printer in Store Settings to print invoices."
      });
      return;
    }

    setPrintingInvoice(invoice);
    
    // Give react time to render the printingInvoice in the hidden container
    setTimeout(async () => {
      const invoiceEl = document.getElementById('thermal-invoice-container');
      if (!invoiceEl) {
        setPrintingInvoice(null);
        return;
      }

      if (activeStore.thermal_printer_type?.toLowerCase() === 'system' && typeof window !== 'undefined' && (window as any).api) {
        // Use Electron's native printing for system printers
        try {
          await (window as any).api.print({
            html: invoiceEl.innerHTML,
            printerName: activeStore.thermal_printer_name,
            paperSize: activeStore.thermal_printer_size
          });
        } catch (err) {
          console.error("System print failed:", err);
          setError("Printing failed. Please check your printer connection.");
        }
      } else {
        // Use the raw printer service for USB/Bluetooth
        const { printInvoice } = await import('@/utils/printerService');
        await printInvoice(invoice, invoice.items || [], activeStore);
      }
      
      setPrintingInvoice(null);
    }, 200); // Increased timeout to ensure render
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
    <Box sx={{ position: 'relative', height: '100%', display: "flex", flexDirection: "column", p: { xs: 2, md: 3 }, pb: { xs: 15, md: 3 }, overflow: 'hidden' }}>
      {/* Decorative blobs */}
      <Box sx={{ position: 'absolute', top: -80, right: -80, width: 280, height: 280, background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.07)} 0%, transparent 70%)`, borderRadius: '50%', zIndex: 0, pointerEvents: 'none' }} />
      <Box sx={{ position: 'absolute', bottom: -80, left: -80, width: 320, height: 320, background: 'radial-gradient(circle, rgba(255,212,29,0.05) 0%, transparent 70%)', borderRadius: '50%', zIndex: 0, pointerEvents: 'none' }} />

      {/* Header Row */}
      <PageHeader>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, fontSize: '2rem', background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em', mb: 0.25 }}>
            Billing
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          {/* Desktop search */}
          <Box sx={{ display: { xs: 'none', md: 'block' }, width: 280 }}>
            <TextField
              fullWidth size="small"
              placeholder="Search orders, tables..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              slotProps={{ input: { startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ color: 'text.disabled', fontSize: 18 }} /></InputAdornment>), sx: { borderRadius: '0.65rem', height: 42, bgcolor: 'white', border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`, '&:hover': { border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}` } } } }}
            />
          </Box>
          <Tooltip title="Refresh" arrow>
            <Button variant="contained" onClick={fetchData} disabled={loading}
              sx={{ borderRadius: '0.65rem', minWidth: 48, height: 48, p: 0, background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`, boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.25)}`, '&:hover': { background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, #B85C1D 100%)`, transform: 'translateY(-2px)', boxShadow: `0 12px 24px ${alpha(theme.palette.primary.main, 0.35)}` }, transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)' }}
            >
              <RefreshIcon sx={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </Button>
          </Tooltip>
        </Stack>
      </PageHeader>

      {/* Tabs Row */}
      <Box sx={{ mb: 2, position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', gap: 1, p: 0.5, bgcolor: alpha(theme.palette.primary.main, 0.06), borderRadius: '0.65rem', border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}` }}>
            {['Pending', 'Cancelled', 'History'].map((label, idx) => (
              <Button key={label} onClick={() => setTab(idx)}
                sx={{ borderRadius: '0.65rem', fontWeight: 800, fontSize: { xs: '0.75rem', md: '0.85rem' }, px: { xs: 1.5, md: 2.5 }, py: 0.75, minWidth: 0, transition: 'all 0.25s', ...(tab === idx ? { background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`, color: 'white', boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}` } : { color: 'text.secondary', '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08), color: theme.palette.primary.main } }) }}
              >
                {label}
                {idx === 0 && (dineInOrders.length + takeAwayOrders.length) > 0 && (
                  <Box component="span" sx={{ ml: 1, px: 0.8, py: 0.1, bgcolor: tab === 0 ? 'rgba(255,255,255,0.3)' : alpha(theme.palette.primary.main, 0.15), borderRadius: '0.65rem', fontSize: '0.7rem', fontWeight: 900, color: tab === 0 ? 'white' : theme.palette.primary.main }}>{dineInOrders.length + takeAwayOrders.length}</Box>
                )}
              </Button>
            ))}
          </Box>
          {/* Mobile search */}
          <Box sx={{ display: { xs: 'block', md: 'none' }, flexGrow: 1 }}>
            <TextField fullWidth size="small" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
              slotProps={{ input: { startAdornment: (<InputAdornment position="start"><SearchIcon sx={{ color: 'text.disabled', fontSize: 16 }} /></InputAdornment>), sx: { borderRadius: '0.65rem', height: 40, bgcolor: 'white' } } }}
            />
          </Box>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '0.65rem' }}>{error}</Alert>}

      <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', borderRadius: '0.65rem', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(20px)', boxShadow: '0 10px 40px rgba(0,0,0,0.04)', minHeight: 0, position: 'relative', zIndex: 1 }}>


        <TableContainer sx={{ flexGrow: 1, overflowY: 'auto', display: isMobile ? 'none' : 'block', px: 1 }}>
          <Table sx={{ borderCollapse: 'separate', borderSpacing: '0 6px' }}>
            <TableHead>
              <TableRow>
                {tab === 0 ? (
                  <>
                    <TableCell sx={{ fontWeight: 700, py: 1.2, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', borderBottom: 'none', pl: 3 }}>Order Ref</TableCell>
                    <TableCell sx={{ fontWeight: 700, py: 1.2, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', borderBottom: 'none' }}>Table / Type</TableCell>
                    <TableCell sx={{ fontWeight: 700, py: 1.2, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', borderBottom: 'none' }}>Waiter</TableCell>
                    <TableCell sx={{ fontWeight: 700, py: 1.2, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', borderBottom: 'none' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, py: 1.2, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', borderBottom: 'none' }} align="right">Amount</TableCell>
                    <TableCell sx={{ fontWeight: 700, py: 1.2, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', borderBottom: 'none', pr: 3 }} align="right">Actions</TableCell>
                  </>
                ) : tab === 1 ? (
                  <>
                    <TableCell sx={{ fontWeight: 700, py: 1.2, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', borderBottom: 'none', pl: 3 }}>Order Ref</TableCell>
                    <TableCell sx={{ fontWeight: 700, py: 1.2, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', borderBottom: 'none' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, py: 1.2, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', borderBottom: 'none' }}>Waiter</TableCell>
                    <TableCell sx={{ fontWeight: 700, py: 1.2, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', borderBottom: 'none' }}>Reason</TableCell>
                    <TableCell sx={{ fontWeight: 700, py: 1.2, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', borderBottom: 'none' }} align="right">Amount</TableCell>
                    <TableCell sx={{ fontWeight: 700, py: 1.2, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', borderBottom: 'none', pr: 3 }} align="right">Actions</TableCell>
                  </>
                ) : (
                  <>
                    <TableCell sx={{ fontWeight: 700, py: 1.2, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', borderBottom: 'none', pl: 3 }}>Invoice No.</TableCell>
                    <TableCell sx={{ fontWeight: 700, py: 1.2, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', borderBottom: 'none' }}>Date & Time</TableCell>
                    <TableCell sx={{ fontWeight: 700, py: 1.2, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', borderBottom: 'none' }}>Order Ref</TableCell>
                    <TableCell sx={{ fontWeight: 700, py: 1.2, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', borderBottom: 'none' }}>Payment</TableCell>
                    <TableCell sx={{ fontWeight: 700, py: 1.2, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', borderBottom: 'none' }} align="right">Amount</TableCell>
                    <TableCell sx={{ fontWeight: 700, py: 1.2, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary', borderBottom: 'none', pr: 3 }} align="right">Actions</TableCell>
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
                            <Chip label={dineInOrders.length} size="small" sx={{ fontWeight: 800, height: 20, bgcolor: 'primary.main', color: 'white', borderRadius: '0.65rem' }} />
                          </Stack>
                        </TableCell>
                      </TableRow>
                    )}
                    {dineInOrders.map((order) => (
                      <TableRow key={order.id} sx={{ bgcolor: '#fff', transition: 'all 0.2s', '& td:first-of-type': { borderTopLeftRadius: '0.65rem', borderBottomLeftRadius: '0.65rem', pl: 3 }, '& td:last-child': { borderTopRightRadius: '0.65rem', borderBottomRightRadius: '0.65rem', pr: 2 }, '&:hover': { bgcolor: '#fdf8f2', boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.08)}` }, '& td': { borderBottom: 'none', py: 0.75 } }}>
                        <TableCell><Typography variant="body2" sx={{ fontWeight: 800, color: '#2c1810', fontSize: '0.85rem' }}>#{order.id}</Typography></TableCell>
                        <TableCell><Chip label={`Table ${order.table_number}`} size="small" sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700, borderRadius: '0.65rem', bgcolor: alpha(theme.palette.primary.main, 0.08), color: theme.palette.primary.main, border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}` }} /></TableCell>
                        <TableCell><Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{order.waiter_name}</Typography></TableCell>
                        <TableCell><Chip label={order.invoice ? 'Bill Generated' : order.status} size="small" color={order.invoice ? 'info' : 'warning'} sx={{ height: 22, fontWeight: 800, borderRadius: '0.65rem', fontSize: '0.65rem' }} /></TableCell>
                        <TableCell align="right"><Typography variant="body1" sx={{ fontWeight: 900, color: theme.palette.primary.main, fontSize: '0.9rem' }}>₹{parseFloat(order.total_amount).toFixed(2)}</Typography></TableCell>
                        <TableCell align="right"><Button variant="contained" size="small" onClick={() => setSelectedOrder(order)} sx={{ fontWeight: 800, borderRadius: '0.65rem', px: 2, height: 30, fontSize: '0.75rem', background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`, boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}`, '&:hover': { transform: 'translateY(-1px)' } }}>SETTLE</Button></TableCell>
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
                      <TableRow key={order.id} sx={{ bgcolor: '#fff', transition: 'all 0.2s', '& td:first-of-type': { borderTopLeftRadius: '0.65rem', borderBottomLeftRadius: '0.65rem', pl: 3 }, '& td:last-child': { borderTopRightRadius: '0.65rem', borderBottomRightRadius: '0.65rem', pr: 2 }, '&:hover': { bgcolor: '#fffdf5', boxShadow: '0 4px 16px rgba(255,180,0,0.1)' }, '& td': { borderBottom: 'none', py: 0.75 } }}>
                        <TableCell><Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.85rem' }}>#{order.id}</Typography></TableCell>
                        <TableCell><Chip label="Parcel" size="small" sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700, borderRadius: '0.65rem', bgcolor: alpha(theme.palette.secondary.main, 0.1), color: '#C7A600', border: '1px solid rgba(255,184,0,0.25)' }} /></TableCell>
                        <TableCell><Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{order.waiter_name}</Typography></TableCell>
                        <TableCell><Chip label={order.invoice ? 'Bill Generated' : order.status} size="small" color={order.invoice ? 'info' : 'warning'} sx={{ height: 22, fontWeight: 800, borderRadius: '0.65rem', fontSize: '0.65rem' }} /></TableCell>
                        <TableCell align="right"><Typography variant="body1" sx={{ fontWeight: 900, color: theme.palette.primary.main, fontSize: '0.9rem' }}>₹{parseFloat(order.total_amount).toFixed(2)}</Typography></TableCell>
                        <TableCell align="right"><Button variant="contained" size="small" color="secondary" onClick={() => setSelectedOrder(order)} sx={{ fontWeight: 800, borderRadius: '0.65rem', px: 2, height: 30, fontSize: '0.75rem', boxShadow: '0 4px 12px rgba(255,212,29,0.25)', '&:hover': { transform: 'translateY(-1px)' } }}>SETTLE</Button></TableCell>
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
                      <TableRow key={order.id} sx={{ bgcolor: '#fff', transition: 'all 0.2s', '& td:first-of-type': { borderTopLeftRadius: '0.65rem', borderBottomLeftRadius: '0.65rem', pl: 3 }, '& td:last-child': { borderTopRightRadius: '0.65rem', borderBottomRightRadius: '0.65rem', pr: 2 }, '&:hover': { bgcolor: '#fff5f5', boxShadow: '0 4px 16px rgba(207,15,15,0.06)' }, '& td': { borderBottom: 'none', py: 0.75 } }}>
                        <TableCell><Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.85rem' }}>#{order.id}</Typography></TableCell>
                        <TableCell><Chip label="CANCELLED" size="small" sx={{ height: 20, fontWeight: 800, borderRadius: '0.65rem', bgcolor: alpha('#CF0F0F', 0.08), color: '#CF0F0F', border: '1px solid rgba(207,15,15,0.15)', fontSize: '0.6rem' }} /></TableCell>
                        <TableCell><Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{order.waiter_name}</Typography></TableCell>
                        <TableCell><Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', maxWidth: 200, display: 'block', fontSize: '0.7rem' }}>{order.notes?.replace('CANCELLED: ', '') || 'No reason provided'}</Typography></TableCell>
                        <TableCell align="right"><Typography variant="body1" sx={{ fontWeight: 900, color: 'error.main', fontSize: '0.9rem' }}>₹{parseFloat(order.total_amount).toFixed(2)}</Typography></TableCell>
                        <TableCell align="right"><IconButton size="small" onClick={() => { setDrawerOrder(order); setDrawerOpen(true); }} sx={{ color: 'error.main', bgcolor: alpha('#CF0F0F', 0.06), borderRadius: '0.65rem', '&:hover': { bgcolor: alpha('#CF0F0F', 0.12) } }}><ViewIcon sx={{ fontSize: 16 }} /></IconButton></TableCell>
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
                    <TableRow key={invoice.id} sx={{ bgcolor: '#fff', transition: 'all 0.2s', '& td:first-of-type': { borderTopLeftRadius: '0.65rem', borderBottomLeftRadius: '0.65rem', pl: 3 }, '& td:last-child': { borderTopRightRadius: '0.65rem', borderBottomRightRadius: '0.65rem', pr: 2 }, '&:hover': { bgcolor: '#fdf8f2', boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.08)}` }, '& td': { borderBottom: 'none', py: 0.75 } }}>
                      <TableCell><Typography variant="body2" sx={{ fontWeight: 800, color: '#2c1810', fontSize: '0.85rem' }}>{invoice.invoice_number}</Typography></TableCell>
                      <TableCell><Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.8rem' }}>{new Date(invoice.created_at).toLocaleString()}</Typography></TableCell>
                      <TableCell><Chip label={`Order #${invoice.order}`} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, borderRadius: '0.65rem', bgcolor: alpha(theme.palette.primary.main, 0.06), color: theme.palette.primary.main }} /></TableCell>
                      <TableCell><Chip label={invoice.payment_method} size="small" color={invoice.payment_method === 'CASH' ? 'success' : 'primary'} sx={{ height: 20, fontWeight: 800, borderRadius: '0.65rem', fontSize: '0.65rem' }} /></TableCell>
                      <TableCell align="right"><Typography variant="body1" sx={{ fontWeight: 900, color: theme.palette.primary.main, fontSize: '0.9rem' }}>₹{parseFloat(invoice.total_amount).toFixed(2)}</Typography></TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', flexDirection: 'row', gap: 0.5, justifyContent: 'flex-end' }}>
                          <IconButton size="small" onClick={() => setPreviewInvoice(invoice)} sx={{ color: theme.palette.primary.main, bgcolor: alpha(theme.palette.primary.main, 0.07), borderRadius: '0.65rem', p: 0.5 }}><ViewIcon sx={{ fontSize: 16 }} /></IconButton>
                          <IconButton size="small" onClick={() => { setDrawerOrder(invoice); setDrawerOpen(true); }} sx={{ color: 'info.main', bgcolor: alpha('#0288d1', 0.07), borderRadius: '0.65rem', p: 0.5 }}><InfoIcon sx={{ fontSize: 16 }} /></IconButton>
                          <IconButton size="small" onClick={() => handlePrint(invoice)} sx={{ color: '#5D4037', bgcolor: alpha('#5D4037', 0.07), borderRadius: '0.65rem', p: 0.5 }}><PrintIcon sx={{ fontSize: 16 }} /></IconButton>
                        </Box>
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
                <Stack sx={{ alignItems: 'center', opacity: 0.4, py: 4 }} spacing={1}>
                  <SettlementIcon sx={{ fontSize: 32 }} />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>No pending orders</Typography>
                </Stack>
              ) : (
                <Stack spacing={1}>
                  {dineInOrders.length > 0 && (
                    <>
                      <Box sx={{ px: 1.5, py: 0.75, bgcolor: alpha(theme.palette.primary.main, 0.06), borderRadius: '0.65rem', border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`, display: 'inline-flex', alignItems: 'center', gap: 1, width: 'fit-content' }}>
                        <LocationIcon sx={{ fontSize: 14, color: theme.palette.primary.main }} />
                        <Typography variant="caption" sx={{ fontWeight: 900, textTransform: 'uppercase', color: theme.palette.primary.main, letterSpacing: '0.05em' }}>Dine-in Orders</Typography>
                        <Box component="span" sx={{ px: 0.8, bgcolor: theme.palette.primary.main, color: 'white', borderRadius: '0.65rem', fontSize: '0.7rem', fontWeight: 900 }}>{dineInOrders.length}</Box>
                      </Box>
                      {dineInOrders.map((order) => (
                        <Paper key={order.id} sx={{ p: 1.5, borderRadius: '0.65rem', border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`, boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.06)}`, cursor: 'pointer', bgcolor: 'white', transition: 'all 0.2s', '&:active': { bgcolor: alpha(theme.palette.primary.main, 0.04) } }} onClick={() => { setDrawerOrder(order); setDrawerOpen(true); }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ flexGrow: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#2c1810', fontSize: '0.8rem' }}>#{order.id}</Typography>
                                <Chip label={`T${order.table_number}`} size="small" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 800, borderRadius: '0.65rem', bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main }} />
                              </Box>
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>{order.waiter_name}</Typography>
                            </Box>
                            <Box sx={{ textAlign: 'right', mr: 1.5 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 900, color: theme.palette.primary.main, fontSize: '0.9rem' }}>₹{parseFloat(order.total_amount).toFixed(0)}</Typography>
                            </Box>
                            <Button variant="contained" size="small" onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }} sx={{ minWidth: 70, height: 30, borderRadius: '0.65rem', fontWeight: 800, fontSize: '0.7rem', background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`, boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.2)}` }}>SETTLE</Button>
                          </Box>
                        </Paper>
                      ))}
                    </>
                  )}

                  {takeawayEnabled && takeAwayOrders.length > 0 && (
                    <>
                      <Box sx={{ px: 1.5, py: 0.75, bgcolor: alpha(theme.palette.secondary.main, 0.08), borderRadius: '0.65rem', border: '1px solid rgba(255,184,0,0.2)', display: 'inline-flex', alignItems: 'center', gap: 1, width: 'fit-content', mt: 1 }}>
                        <ShoppingBagIcon sx={{ fontSize: 14, color: '#C7A600' }} />
                        <Typography variant="caption" sx={{ fontWeight: 900, textTransform: 'uppercase', color: '#C7A600', letterSpacing: '0.05em' }}>Parcel Orders</Typography>
                        <Box component="span" sx={{ px: 0.8, bgcolor: theme.palette.secondary.main, color: 'white', borderRadius: '0.65rem', fontSize: '0.7rem', fontWeight: 900 }}>{takeAwayOrders.length}</Box>
                      </Box>
                      {takeAwayOrders.map((order) => (
                        <Paper key={order.id} sx={{ p: 1.5, borderRadius: '0.65rem', border: '1px solid rgba(255,184,0,0.15)', boxShadow: '0 4px 16px rgba(255,184,0,0.06)', cursor: 'pointer', bgcolor: '#fffdf5', transition: 'all 0.2s', '&:active': { bgcolor: alpha(theme.palette.secondary.main, 0.05) } }} onClick={() => { setDrawerOrder(order); setDrawerOpen(true); }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ flexGrow: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 900, fontSize: '0.8rem' }}>#{order.id}</Typography>
                                <Chip label="PARCEL" size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800, borderRadius: '0.65rem', bgcolor: alpha(theme.palette.secondary.main, 0.15), color: '#C7A600' }} />
                              </Box>
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>{order.customer_name || 'No Name'}</Typography>
                            </Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 900, color: theme.palette.primary.main, mr: 1.5, fontSize: '0.9rem' }}>₹{parseFloat(order.total_amount).toFixed(0)}</Typography>
                            <Button variant="contained" size="small" color="secondary" onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }} sx={{ minWidth: 70, height: 30, borderRadius: '0.65rem', fontWeight: 800, fontSize: '0.7rem', boxShadow: '0 4px 12px rgba(255,212,29,0.3)' }}>SETTLE</Button>
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
                    <Paper key={order.id} sx={{ p: 1.5, borderRadius: '0.65rem', border: '1px solid rgba(207,15,15,0.1)', bgcolor: '#fff8f8', boxShadow: '0 4px 16px rgba(207,15,15,0.04)' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#2c1810', fontSize: '0.8rem' }}>#{order.id}</Typography>
                          <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 700, display: 'block', fontSize: '0.7rem' }}>{order.notes?.replace('CANCELLED: ', '').substring(0, 40) || 'No reason'}</Typography>
                        </Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 900, color: 'error.main', mr: 1.5, fontSize: '0.9rem' }}>₹{parseFloat(order.total_amount).toFixed(0)}</Typography>
                        <IconButton size="small" onClick={() => { setDrawerOrder(order); setDrawerOpen(true); }} sx={{ color: 'error.main', bgcolor: alpha('#CF0F0F', 0.08), borderRadius: '0.65rem' }}><ChevronRightIcon /></IconButton>
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
                    <Paper key={invoice.id} sx={{ p: 1.5, borderRadius: '0.65rem', border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`, boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.05)}`, bgcolor: 'white', transition: 'all 0.2s' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#2c1810', fontSize: '0.8rem' }}>{invoice.invoice_number}</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <Chip label={invoice.payment_method} size="small" color="success" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800, borderRadius: '0.65rem' }} />
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.7rem' }}>{new Date(invoice.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Typography>
                          </Box>
                        </Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 900, color: theme.palette.primary.main, mr: 1.5, fontSize: '0.9rem' }}>₹{parseFloat(invoice.total_amount).toFixed(0)}</Typography>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton size="small" onClick={() => setPreviewInvoice(invoice)} sx={{ color: theme.palette.primary.main, bgcolor: alpha(theme.palette.primary.main, 0.08), borderRadius: '0.65rem', p: 0.5 }}><ViewIcon sx={{ fontSize: 16 }} /></IconButton>
                          <IconButton size="small" onClick={() => handlePrint(invoice)} sx={{ color: 'text.secondary', bgcolor: alpha('#000', 0.04), borderRadius: '0.65rem', p: 0.5 }}><PrintIcon sx={{ fontSize: 16 }} /></IconButton>
                        </Box>
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
        sx={{ zIndex: theme.zIndex.drawer + 5 }}
        slotProps={{
          paper: {
            sx: { width: { xs: '100%', sm: 400 }, borderRadius: { xs: 0, sm: '16px 0 0 16px' } }
          }
        }}
      >
        {drawerOrder && (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#fafafa' }}>
            {/* Drawer Header */}
            <Box sx={{ p: 3, background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`, color: 'white' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: 'white' }}>
                    {drawerOrder.table_number ? `TABLE ${drawerOrder.table_number}` : 'PARCEL'}
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'rgba(255,255,255,0.75)', display: 'block' }}>
                    {new Date(drawerOrder.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>
                    {drawerOrder.invoice_number ? `Invoice ${drawerOrder.invoice_number}` : `Order #${drawerOrder.id}`}
                  </Typography>
                </Box>
                <IconButton onClick={() => setDrawerOpen(false)} size="small" sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.15)', borderRadius: '0.65rem', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}>
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
            <Box sx={{ p: 3, pb: { xs: 'calc(80px + env(safe-area-inset-bottom))', sm: 3 }, borderTop: `2px solid ${alpha(theme.palette.primary.main, 0.15)}`, bgcolor: 'white' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, p: 2, borderRadius: '0.65rem', background: `linear-gradient(135deg, rgba(233,118,43,0.05) 0%, ${alpha(theme.palette.primary.main, 0.12)} 100%)`, border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}` }}>
                <Typography variant="h6" sx={{ fontWeight: 900, color: '#2c1810' }}>Total Amount</Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, color: theme.palette.primary.main }}>
                  ₹{parseFloat(drawerOrder.total_amount).toFixed(2)}
                </Typography>
              </Box>
              
              {drawerOrder.notes && (
                <Box sx={{ p: 2, bgcolor: alpha('#CF0F0F', 0.04), borderRadius: '0.65rem', border: '1px solid rgba(207,15,15,0.1)' }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: 'error.main', display: 'block', mb: 0.5 }}>NOTES</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>{drawerOrder.notes}</Typography>
                </Box>
              )}
            </Box>
          </Box>
        )}
      </Drawer>

      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </Box>
  );
}
