"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, alpha, Box, Typography, Grid, TextField, IconButton, Paper, Autocomplete, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, useTheme, useMediaQuery, Stack, Tooltip, Select, MenuItem, FormControl, InputLabel, Divider, Alert, Chip, Card, CardContent, Container, Tabs, Tab
} from '@mui/material';
import { useRouter } from 'next/navigation';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon,
  ShoppingBasket as BasketIcon,
  Kitchen as KitchenIcon,
  Send as SendIcon,
  ArrowForward as NextIcon,
  Search as SearchIcon,
  Category as CategoryIcon,
  Receipt as BillIcon,
  TableBar as TableIcon,
  ChevronRight as ChevronRightIcon,
  ChevronLeft as ChevronLeftIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Print as PrintIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';
import { restaurantService } from '@/services/restaurantService';
import { itemService } from '@/services/itemService';
import { RestaurantTable, Order, Item, Category, OrderItem } from '@/types/restaurant';
import { useAuth } from '@/hooks/useAuth';
import { OrderStatusChip, ItemStatusChip } from './StatusChips';
import CheckoutDialog from './CheckoutDialog';
import InvoicePreviewDialog from './InvoicePreviewDialog';
import InvoicePrint from './InvoicePrint';
import { getImageUrl } from '@/utils/image';

const DINE_IN_STATUS_FLOW: Order['status'][] = ['ORDER_TAKEN', 'PREPARING', 'SERVED', 'COMPLETED', 'PAID'];
const DINE_IN_STATUS_FLOW_NO_KITCHEN: Order['status'][] = ['ORDER_TAKEN', 'SERVED', 'COMPLETED', 'PAID'];
const TAKE_AWAY_STATUS_FLOW: Order['status'][] = ['ORDER_TAKEN', 'PREPARING', 'READY', 'COMPLETED', 'PAID'];
const TAKE_AWAY_STATUS_FLOW_NO_KITCHEN: Order['status'][] = ['ORDER_TAKEN', 'PREPARING', 'READY', 'PAID'];

interface OrderDialogProps {
  open: boolean;
  onClose: () => void;
  table: RestaurantTable | null;
  initialOrder?: Order | null;
  onOrderUpdated: () => void;
}

const OrderDialog: React.FC<OrderDialogProps> = ({ open, onClose, table, initialOrder, onOrderUpdated }) => {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const { hasPermission, user, isRole, activeStore } = useAuth();
  const canTakeOrder = hasPermission('access_to_take_order');
  const canManagePayment = hasPermission('access_to_payment_management');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKE_AWAY'>('DINE_IN');
  const [menuItems, setMenuItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [invoice, setInvoice] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [moveTableOpen, setMoveTableOpen] = useState(false);
  const [allTables, setAllTables] = useState<RestaurantTable[]>([]);
  const [moving, setMoving] = useState(false);

  // Parcel details
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [numberOfPersons, setNumberOfPersons] = useState(1);
  const [movePersons, setMovePersons] = useState(1);

  // Stage Navigation
  const [dialogStage, setDialogStage] = useState<'CHOICE' | 'NEW_ORDER_SETUP' | 'ORDER_DETAILS'>('ORDER_DETAILS');
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [totalsExpanded, setTotalsExpanded] = useState(false);

  // Cancellation
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const isKitchenStepEnabled = activeStore?.is_kitchen_step_enabled !== false;

  const activeFlow = order?.order_type === 'TAKE_AWAY' 
    ? (isKitchenStepEnabled ? TAKE_AWAY_STATUS_FLOW : TAKE_AWAY_STATUS_FLOW_NO_KITCHEN)
    : (isKitchenStepEnabled ? DINE_IN_STATUS_FLOW : DINE_IN_STATUS_FLOW_NO_KITCHEN);
  const nextStatus = (() => {
    if (!order || !activeFlow) return null;
    const idx = activeFlow.indexOf(order.status);
    if (idx >= 0 && idx < activeFlow.length - 1) return activeFlow[idx + 1];
    if (order.status === 'READY' && activeFlow.includes('SERVED')) return 'SERVED';
    if (order.status === 'PREPARING' && !activeFlow.includes('PREPARING') && activeFlow.includes('SERVED')) return 'SERVED';
    return null;
  })();

  const hasNewItems = (order?.items || []).some((i: OrderItem) => i.status === 'ORDERED');
  const hasReadyItems = (order?.items || []).some((i: OrderItem) => ['READY', 'PREPARING'].includes(i.status));
  const hasIncompleteItems = (order?.items || []).some((i: OrderItem) => ['AWAITING', 'PREPARING'].includes(i.status));

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [items, cats, tablesData] = await Promise.all([
        itemService.getItems(),
        itemService.getCategories(),
        restaurantService.getTables()
      ]);

      setMenuItems(items.filter((i: Item) => i.is_enabled));
      setCategories(cats.filter((c: Category) => c.is_enabled));
      setAllTables(tablesData);

      const currentTable = table ? tablesData.find((t: any) => t.id === table.id) : null;
      const activeOrds = currentTable?.active_orders || [];
      setActiveOrders(activeOrds);

      if (initialOrder) {
        setOrder(initialOrder);
        setOrderType(initialOrder.order_type);
        setCustomerName(initialOrder.customer_name || '');
        setCustomerMobile(initialOrder.customer_mobile || '');
        setDialogStage('ORDER_DETAILS');
        setSelectedOrderId(initialOrder.id);
      } else if (currentTable) {
        if (activeOrds.length > 0) {
          // If we already have a selected order, try to refresh it
          const ordToSelect = selectedOrderId 
            ? (activeOrds.find((o: Order) => o.id === selectedOrderId) || activeOrds[0])
            : activeOrds[0];
            
          const orderData = await restaurantService.getOrder(ordToSelect.id);
          setOrder(orderData);
          setOrderType(orderData.order_type);
          setSelectedOrderId(orderData.id);
          setDialogStage('ORDER_DETAILS');
        } else {
          // No active orders, start fresh
          setOrder(null);
          setOrderType('DINE_IN');
          setSelectedOrderId(null);
          setDialogStage('ORDER_DETAILS');
        }
      } else {
        setOrder(null);
        setOrderType('TAKE_AWAY');
        setDialogStage('ORDER_DETAILS');
      }
    } catch (e: any) {
      console.error('Failed to load data:', e);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async (type: 'DINE_IN' | 'TAKE_AWAY' = 'DINE_IN') => {
    if (!table && type === 'DINE_IN') return;
    if (!canTakeOrder) {
      setError('You do not have permission to take orders.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const totalPersons = (table?.current_occupancy || 0) + (type === 'DINE_IN' ? numberOfPersons : 1);
      if (type === 'DINE_IN' && table && totalPersons > table.capacity) {
          setError(`Table capacity (${table.capacity}) exceeded. Total guests would be ${totalPersons}.`);
          setLoading(false);
          return;
      }

      const newOrder = await restaurantService.createOrder({
        table: type === 'DINE_IN' ? table?.id : undefined,
        order_type: type,
        customer_name: customerName || undefined,
        customer_mobile: customerMobile || undefined,
        number_of_persons: type === 'DINE_IN' ? numberOfPersons : 1,
      });
      setOrder(newOrder);
      setOrderType(type);
      setSelectedOrderId(newOrder.id);
      setDialogStage('ORDER_DETAILS');
      onOrderUpdated();
      
      // Refresh local state
      await fetchData();
    } catch (e: any) {
      setError('Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = async (orderId: number | null) => {
    if (orderId === null) {
      // "New Order" tab selected
      setOrder(null);
      setSelectedOrderId(null);
      setDialogStage('ORDER_DETAILS'); // We'll show the "Add New Order" UI when order is null
      return;
    }

    setLoading(true);
    setSelectedOrderId(orderId);
    try {
      const orderData = await restaurantService.getOrder(orderId);
      setOrder(orderData);
      setOrderType(orderData.order_type);
      setDialogStage('ORDER_DETAILS');
    } catch (e) {
      setError('Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, table, initialOrder]);

  const handleAddItem = async (item: Item) => {
    if (order?.invoice) return;
    setLoading(true);
    setError(null);
    try {
      let currentOrder = order;
      if (!currentOrder) {
        // Create order first
        currentOrder = await restaurantService.createOrder({
          table: orderType === 'DINE_IN' ? table?.id : undefined,
          order_type: orderType,
          customer_name: customerName || undefined,
          customer_mobile: customerMobile || undefined,
          number_of_persons: orderType === 'DINE_IN' ? numberOfPersons : 1,
        });
        setOrder(currentOrder);
      }
      
      await restaurantService.addItemToOrder(currentOrder!.id, {
        item: item.id,
        quantity: 1,
        notes: ['READY', 'SERVED', 'COMPLETED'].includes(currentOrder!.status) ? 'ADD-ON' : '',
      });
      const orderData = await restaurantService.getOrder(currentOrder!.id);
      setOrder(orderData);
      onOrderUpdated();
    } catch (e: any) {
      console.error('Failed to add item:', e);
      setError('Failed to add item');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateItemQuantity = async (orderItem: OrderItem, delta: number) => {
    const newQty = orderItem.quantity + delta;
    if (newQty <= 0) {
      handleRemoveItem(orderItem.id);
      return;
    }
    setLoading(true);
    try {
      await restaurantService.updateOrderItem(orderItem.id, { quantity: newQty });
      const orderData = await restaurantService.getOrder(orderItem.order);
      setOrder(orderData);
      onOrderUpdated();
    } catch (e) { setError('Failed to update quantity'); }
    finally { setLoading(false); }
  };

  const handleRemoveItem = async (itemId: number) => {
    if (!confirm('Remove this item?')) return;
    setLoading(true);
    try {
      await restaurantService.deleteOrderItem(itemId);
      const orderData = await restaurantService.getOrder(order!.id);
      setOrder(orderData);
      onOrderUpdated();
    } finally { setLoading(false); }
  };

  const handleUpdateOrderDetails = async (data: Partial<Order>) => {
    if (!order || order.invoice) return;
    setLoading(true);
    try {
      await restaurantService.updateOrder(order.id, data);
      const updatedOrder = await restaurantService.getOrder(order.id);
      setOrder(updatedOrder);
      onOrderUpdated();
    } catch (e) {
      setError('Failed to update order details');
    } finally {
      setLoading(false);
    }
  };

  const handleSendToKitchen = async () => {
    if (!order) return;
    setLoading(true);
    try {
      await restaurantService.sendToKitchen(order.id);
      const orderData = await restaurantService.getOrder(order.id);
      setOrder(orderData);
      onOrderUpdated();
    } catch (e) { setError('Failed to send to kitchen'); }
    finally { setLoading(false); }
  };

  const handleServeAllReady = async () => {
    if (!order) return;
    setLoading(true);
    try {
      await restaurantService.serveAllReady(order.id);
      const orderData = await restaurantService.getOrder(order.id);
      setOrder(orderData);
      onOrderUpdated();
    } catch (e) { setError('Failed to serve items'); }
    finally { setLoading(false); }
  };

  const handleUpdateOrderStatus = async (newStatus: Order['status']) => {
    if (!order) return;
    setLoading(true);
    try {
      await restaurantService.updateOrder(order.id, { status: newStatus });
      const orderData = await restaurantService.getOrder(order.id);
      setOrder(orderData);
      onOrderUpdated();
    } catch (e) { setError('Failed to update order status'); }
    finally { setLoading(false); }
  };

  const handleGenerateBill = async () => {
    if (!order) return;
    setLoading(true);
    try {
      await restaurantService.checkout(order.id, { payment_method: 'CASH', mark_as_paid: false });
      const orderData = await restaurantService.getOrder(order.id);
      setOrder(orderData);
      onOrderUpdated();
    } catch (e) { setError('Failed to generate bill'); }
    finally { setLoading(false); }
  };

  const handleReleaseTable = async () => {
    if (!table) return;
    if (!window.confirm('Emergency Clear Table?')) return;
    setLoading(true);
    try {
      await restaurantService.releaseTable(table.id);
      onOrderUpdated();
      onClose();
    } catch (e) { setError('Failed to release table'); }
    finally { setLoading(false); }
  };

  const handleCancelOrder = async () => {
    if (!order) return;
    setLoading(true);
    try {
      await restaurantService.cancelOrder(order.id, cancelReason);
      const orderData = await restaurantService.getOrder(order.id);
      setOrder(orderData);
      onOrderUpdated();
      setCancelDialogOpen(false);
    } catch (e) { setError('Failed to cancel order'); }
    finally { setLoading(false); }
  };

  const handleMoveTable = async (targetTable: RestaurantTable) => {
    if (!order) return;
    setMoving(true);
    try {
      await restaurantService.changeOrderTable(order.id, targetTable.id, movePersons);
      setMoveTableOpen(false);
      onOrderUpdated();
      onClose();
    } catch (e) { setError('Failed to move table'); }
    finally { setMoving(false); }
  };

  const handleCheckoutSuccess = async (invoiceData: any) => {
    setInvoice(invoiceData);
    setCheckoutOpen(false);
    if (order) {
      const orderData = await restaurantService.getOrder(order.id);
      setOrder(orderData);
    }
    onOrderUpdated();
    await fetchData();
    if (order?.order_type !== 'TAKE_AWAY') onClose();
  };

  const handlePrint = async () => {
    const invoiceEl = document.getElementById('thermal-invoice-container');
    if (!invoiceEl || !order?.invoice) return;

    const { printInvoice } = await import('@/utils/printerService');
    const success = await printInvoice(order.invoice, order.items || [], activeStore);

    if (!success) {
      // FALLBACK: Standard Browser Print
      fallbackPrint(invoiceEl.innerHTML);
    }
  };

  const fallbackPrint = (html: string) => {
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (!printWindow) return;
    printWindow.document.write('<html><head><style>@media print { body { margin: 0; } }</style></head><body>' + html + '</body></html>');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleDownloadPDF = async () => {
    if (!order?.invoice?.id) return;
    setDownloading(true);
    try {
      const blob = await restaurantService.downloadInvoicePDF(order.invoice.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice_${order.invoice.invoice_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) { setError('Failed to download PDF'); }
    finally { setDownloading(false); }
  };

  const renderContent = () => {
    const errorAlert = error && (
      <Box sx={{ p: 2, bgcolor: '#fff5f5' }}>
        <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
      </Box>
    );

    if (loading && !order && menuItems.length === 0) {
      return (
        <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (dialogStage === 'CHOICE') {
      return (
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', bgcolor: '#f8fafc' }}>
          {errorAlert}
          <Container maxWidth="md" sx={{ py: { xs: 4, md: 8 }, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Grid container spacing={4} sx={{ justifyContent: 'center' }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="overline" sx={{ fontWeight: 900, color: 'text.disabled', mb: 2, display: 'block', letterSpacing: '0.1em' }}>START FRESH</Typography>
                <Paper
                  elevation={0}
                  onClick={() => {
                    if (table) setDialogStage('NEW_ORDER_SETUP');
                    else handleCreateOrder('TAKE_AWAY');
                  }}
                  sx={{ 
                    p: 4, height: '100%', minHeight: 180, borderRadius: '24px', border: '2px solid #e8e4d8',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                    cursor: 'pointer', transition: 'all 0.25s', bgcolor: 'white',
                    opacity: Boolean(table && table.current_occupancy! >= table.capacity) ? 0.5 : 1,
                    '&:hover': { borderColor: 'primary.main', transform: 'translateY(-4px)' }
                  }}
                >
                  <AddIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                  <Typography variant="h5" sx={{ fontWeight: 900 }}>NEW ORDER</Typography>
                </Paper>
              </Grid>

              {table?.active_orders && table.active_orders.length > 0 && (
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="overline" sx={{ fontWeight: 900, color: 'text.disabled', mb: 2, display: 'block', letterSpacing: '0.1em' }}>JOIN EXISTING</Typography>
                  <Stack spacing={2}>
                    {table.active_orders.map((activeOrd: Order) => (
                      <Paper
                        key={activeOrd.id}
                        onClick={async () => {
                          const data = await restaurantService.getOrder(activeOrd.id);
                          setOrder(data);
                          setDialogStage('ORDER_DETAILS');
                        }}
                        sx={{ p: 2.5, border: '2px solid #e8e4d8', borderRadius: '20px', cursor: 'pointer', '&:hover': { borderColor: 'primary.main' } }}
                      >
                        <Typography sx={{ fontWeight: 900 }}>{activeOrd.customer_name || `Order #${activeOrd.id}`}</Typography>
                        <Typography variant="caption">₹{activeOrd.total_amount} • {activeOrd.number_of_persons} Persons</Typography>
                      </Paper>
                    ))}
                  </Stack>
                </Grid>
              )}
            </Grid>
          </Container>
        </Box>
      );
    }

    if (dialogStage === 'NEW_ORDER_SETUP') {
      return (
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', bgcolor: '#f8fafc' }}>
          {errorAlert}
          <Container maxWidth="xs" sx={{ py: 4 }}>
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <IconButton size="small" onClick={() => setDialogStage('CHOICE')} sx={{ border: '1px solid #e8e4d8' }}><ChevronLeftIcon fontSize="small" /></IconButton>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>Order Setup</Typography>
            </Box>
            <Paper sx={{ p: 3, borderRadius: '24px', border: '1px solid #e8e4d8' }}>
              <Stack spacing={2.5}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.secondary' }}>GUEST COUNT</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, mt: 1 }}>
                    <IconButton size="small" onClick={() => setNumberOfPersons(Math.max(1, numberOfPersons - 1))} sx={{ border: '1px solid #e8e4d8' }}><RemoveIcon fontSize="small" /></IconButton>
                    <Typography variant="h4" sx={{ fontWeight: 900 }}>{numberOfPersons}</Typography>
                    <IconButton size="small" onClick={() => setNumberOfPersons(numberOfPersons + 1)} sx={{ border: '1px solid #e8e4d8' }}><AddIcon fontSize="small" /></IconButton>
                  </Box>
                </Box>
                <Button variant="contained" fullWidth onClick={() => { setOrder(null); setOrderType('DINE_IN'); setDialogStage('ORDER_DETAILS'); }} sx={{ py: 1.5, borderRadius: '12px', fontWeight: 900, fontSize: '0.9rem' }}>START ORDER</Button>
              </Stack>
            </Paper>
          </Container>
        </Box>
      );
    }

    if (dialogStage === 'ORDER_DETAILS') {
      return (
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, flexGrow: 1, height: '100%', overflow: 'hidden' }}>
          {/* MENU */}
          {(!order || !order.invoice) && !['COMPLETED', 'PAID', 'CANCELLED', 'REJECTED', 'RETURNED'].includes(order?.status || 'ORDER_TAKEN') ? (
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              {order || orderType === 'TAKE_AWAY' ? (
                <>
                  <Box sx={{ p: 2, borderBottom: '1px solid #e8e4d8', bgcolor: 'white' }}>
                    <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                      <Grid size={{ xs: 12, sm: 'auto' }}>
                        <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 0.5 }}>
                          <Button size="small" variant={activeCategory === 'all' ? 'contained' : 'outlined'} onClick={() => setActiveCategory('all')}>All</Button>
                          {categories.map(cat => (
                            <Button key={cat.id} size="small" variant={activeCategory === cat.id ? 'contained' : 'outlined'} onClick={() => setActiveCategory(cat.id)}>{cat.name}</Button>
                          ))}
                        </Stack>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 'grow' }}>
                        <TextField fullWidth size="small" placeholder="Search menu..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                      </Grid>
                    </Grid>
                  </Box>
                  <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto' }}>
                    <Grid container spacing={1.5}>
                      {filteredItems.map((item: Item) => (
                        <Grid size={{ xs: 6, sm: 4, lg: 3 }} key={item.id}>
                          <Card onClick={() => handleAddItem(item)} sx={{ cursor: 'pointer', borderRadius: '12px', border: '1px solid #e8e4d8', '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.05)' } }}>
                            <CardContent sx={{ p: 1.5 }}>
                              <Typography variant="body2" sx={{ fontWeight: 800 }}>{item.name}</Typography>
                              <Typography variant="subtitle2" sx={{ fontWeight: 900, color: 'primary.main' }}>₹{item.price}</Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                </>
              ) : (
                <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 2, bgcolor: '#f8fafc' }}>
                   <Container maxWidth="xs">
                    <Typography variant="h6" sx={{ fontWeight: 900, mb: 2, textAlign: 'center' }}>Create New Order: Table {table?.number}</Typography>
                    <Paper sx={{ p: 3, borderRadius: '24px', border: '1px solid #e8e4d8' }}>
                      <Stack spacing={2.5}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.secondary' }}>GUEST COUNT</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, mt: 1 }}>
                            <IconButton size="small" onClick={() => setNumberOfPersons(Math.max(1, numberOfPersons - 1))} sx={{ border: '1px solid #e8e4d8' }}><RemoveIcon fontSize="small" /></IconButton>
                            <Typography variant="h4" sx={{ fontWeight: 900 }}>{numberOfPersons}</Typography>
                            <IconButton size="small" onClick={() => setNumberOfPersons(numberOfPersons + 1)} sx={{ border: '1px solid #e8e4d8' }}><AddIcon fontSize="small" /></IconButton>
                          </Box>
                        </Box>
                        <Button 
                          variant="contained" 
                          fullWidth 
                          onClick={() => handleCreateOrder('DINE_IN')} 
                          sx={{ py: 1.5, borderRadius: '12px', fontWeight: 900, fontSize: '0.9rem' }}
                          disabled={loading}
                        >
                          {loading ? <CircularProgress size={20} color="inherit" /> : 'START ORDER'}
                        </Button>
                      </Stack>
                    </Paper>
                  </Container>
                </Box>
              )}
            </Box>
          ) : (
            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
                <Typography variant="h5" sx={{ fontWeight: 900 }}>{order?.invoice ? 'Order Finalized' : 'Order Completed'}</Typography>
            </Box>
          )}

          {/* SUMMARY */}
          <Box sx={{ width: { xs: '100%', md: '400px' }, borderLeft: '1px solid #e8e4d8', display: 'flex', flexDirection: 'column', bgcolor: 'white' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid #e8e4d8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography sx={{ fontWeight: 900 }}>SUMMARY</Typography>
              
               {orderType === 'DINE_IN' && (
                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', border: '1px solid #e8e4d8', borderRadius: '20px', px: 1 }}>
                  <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                  <IconButton size="small" onClick={() => order ? handleUpdateOrderDetails({ number_of_persons: Math.max(1, order.number_of_persons - 1) }) : setNumberOfPersons(p => Math.max(1, p-1))} disabled={Boolean(order?.invoice)}>
                    <RemoveIcon sx={{ fontSize: 12 }} />
                  </IconButton>
                  <Tooltip title="Guest Count">
                    <Typography sx={{ fontWeight: 800, fontSize: '0.875rem', minWidth: 16, textAlign: 'center' }}>{order ? order.number_of_persons : numberOfPersons}</Typography>
                  </Tooltip>
                  <IconButton size="small" onClick={() => order ? handleUpdateOrderDetails({ number_of_persons: order.number_of_persons + 1 }) : setNumberOfPersons(p => p+1)} disabled={Boolean(order?.invoice)}>
                    <AddIcon sx={{ fontSize: 12 }} />
                  </IconButton>
                </Stack>
              )}

              <Chip label={`${(order?.items || []).length} Items`} size="small" />
            </Box>
            
            {orderType === 'TAKE_AWAY' && (
              <Box sx={{ p: 2, borderBottom: '1px solid #e8e4d8', bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                 <Stack spacing={1}>
                    <TextField 
                      size="small" label="Customer Name" value={order ? (order.customer_name || '') : customerName} 
                      onChange={(e) => {
                        if (order) handleUpdateOrderDetails({ customer_name: e.target.value });
                        else setCustomerName(e.target.value);
                      }}
                      disabled={Boolean(order?.invoice)}
                    />
                    <TextField 
                      size="small" label="Mobile" value={order ? (order.customer_mobile || '') : customerMobile} 
                      onChange={(e) => {
                        if (order) handleUpdateOrderDetails({ customer_mobile: e.target.value });
                        else setCustomerMobile(e.target.value);
                      }}
                      disabled={Boolean(order?.invoice)}
                    />
                 </Stack>
              </Box>
            )}
            <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
              {(order?.items || []).length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center', opacity: 0.5 }}>
                  <BasketIcon sx={{ fontSize: 40, mb: 1, color: 'text.disabled' }} />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Cart is empty</Typography>
                </Box>
              ) : (
                <Table size="small">
                  <TableBody>
                    {(order?.items || []).map(item => (
                      <TableRow key={item.id}>
                        <TableCell sx={{ py: 1.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 800 }}>{item.item_details.name}</Typography>
                          <ItemStatusChip status={item.status} orderType={order?.order_type || 'DINE_IN'} sx={{ height: 18 }} />
                        </TableCell>
                        <TableCell align="right">
                          {item.status === 'ORDERED' && !order?.invoice ? (
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
                              <IconButton size="small" onClick={() => handleUpdateItemQuantity(item, -1)}><RemoveIcon sx={{ fontSize: 14 }} /></IconButton>
                              <Typography sx={{ fontWeight: 800 }}>{item.quantity}</Typography>
                              <IconButton size="small" onClick={() => handleUpdateItemQuantity(item, 1)}><AddIcon sx={{ fontSize: 14 }} /></IconButton>
                            </Stack>
                          ) : (
                            <Typography sx={{ fontWeight: 800 }}>×{item.quantity}</Typography>
                          )}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800 }}>₹{(parseFloat(item.price) * item.quantity).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
            <Box sx={{ p: 3, borderTop: '2px dashed #e8e4d8', bgcolor: '#fdfdfd' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>Total</Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.main' }}>₹{order?.total_amount || '0.00'}</Typography>
              </Box>
              <Stack spacing={1}>
                {hasNewItems && (
                  <Button variant="contained" color="warning" fullWidth onClick={handleSendToKitchen} sx={{ fontWeight: 900 }}>KOT</Button>
                )}
                {hasReadyItems && order?.order_type !== 'TAKE_AWAY' && (
                  <Button variant="contained" color="success" fullWidth onClick={handleServeAllReady} sx={{ fontWeight: 900 }}>SERVE</Button>
                )}
                {nextStatus && order?.status !== 'COMPLETED' && (order?.items || []).length > 0 && !(order?.order_type === 'DINE_IN' && nextStatus === 'SERVED') && (
                  <Button variant="contained" fullWidth onClick={() => handleUpdateOrderStatus(nextStatus)} sx={{ fontWeight: 900 }}>
                    {nextStatus === 'READY' ? 'MARK AS READY' : (nextStatus === 'SERVED' ? 'MARK AS SERVED' : nextStatus.replace('_', ' '))}
                  </Button>
                )}
                {order?.status === 'COMPLETED' && !order.invoice && (
                  <Button variant="contained" color="success" fullWidth onClick={handleGenerateBill} sx={{ fontWeight: 900 }}>CHECKOUT</Button>
                )}
                {(order?.invoice || (order?.order_type === 'TAKE_AWAY' && ['READY', 'SERVED', 'COMPLETED'].includes(order.status))) && order?.status !== 'COMPLETED' && (
                  <Button variant="contained" color="secondary" fullWidth onClick={() => setCheckoutOpen(true)} sx={{ fontWeight: 900 }}>PAYMENT</Button>
                )}
              </Stack>
            </Box>
          </Box>
        </Box>
      );
    }
    return null;
  };

  if (!open) return null;

  return (
    <Box sx={{ position: 'absolute', inset: 0, zIndex: 1200, display: 'flex', flexDirection: 'column', bgcolor: 'white', overflow: 'hidden' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid #e8e4d8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={onClose}><ChevronLeftIcon /></IconButton>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>{table?.number ? `Table ${table.number}` : 'Order Details'}</Typography>
            {order && <Typography variant="caption">Order #{order.id}</Typography>}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
            {order && <OrderStatusChip status={order.status} orderType={order.order_type} />}
            {/* Removed Switch button as we have tabs now */}
        </Box>
      </Box>

      {/* Tabs for multiple orders */}
      {table && (
        <Box sx={{ borderBottom: '1px solid #e8e4d8', bgcolor: '#fdfdfd' }}>
          <Tabs
            value={(selectedOrderId !== null && activeOrders.some(o => o.id === selectedOrderId)) ? selectedOrderId : 'new'}
            onChange={(_, val) => handleTabChange(val === 'new' ? null : val)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 48,
              '& .MuiTab-root': {
                fontWeight: 800,
                fontSize: '0.8rem',
                minHeight: 48,
                textTransform: 'none',
              },
            }}
          >
            {activeOrders.map((ord) => (
              <Tab 
                key={ord.id} 
                value={ord.id} 
                label={ord.customer_name || `Order #${ord.id}`} 
                sx={{ px: 3 }}
              />
            ))}
            {(table.current_occupancy || 0) < table.capacity && (
              <Tab 
                value="new" 
                label="+ New Order" 
                sx={{ 
                  color: 'primary.main',
                  '&.Mui-selected': { color: 'primary.dark' }
                }} 
              />
            )}
          </Tabs>
        </Box>
      )}

      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>{renderContent()}</Box>

      <Box sx={{ display: 'none' }}>
        <div id="thermal-invoice-container">
          {order?.invoice && <InvoicePrint invoice={order.invoice} orderItems={order.items || []} tableNumber={table?.number || order.table_number || ''} />}
        </div>
      </Box>

      {order && <CheckoutDialog open={checkoutOpen} onClose={() => setCheckoutOpen(false)} order={order} onCheckoutSuccess={handleCheckoutSuccess} />}
      {order && order.invoice && (
        <InvoicePreviewDialog
          open={previewOpen} onClose={() => setPreviewOpen(false)} invoice={order.invoice} orderItems={order.items} tableNumber={table?.number || order.table_number || ''}
          onDownload={handleDownloadPDF} onPrint={() => setTimeout(handlePrint, 100)}
        />
      )}
    </Box>
  );
};

export default OrderDialog;
