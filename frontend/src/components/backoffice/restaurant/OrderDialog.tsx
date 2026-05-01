"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, alpha, Box, Typography, Grid, TextField, IconButton, Paper, Autocomplete, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, useTheme, useMediaQuery, Stack, Tooltip, Select, MenuItem, FormControl, InputLabel, Divider, Alert, Chip, Card, CardContent, Container, Tabs, Tab, Drawer, Fab, Badge
} from '@mui/material';
import { useToast } from '@/context/ToastContext';
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
import { useWebSocket } from '@/hooks/useWebSocket';

const DINE_IN_STATUS_FLOW: Order['status'][] = ['ORDER_TAKEN', 'SERVED', 'COMPLETED', 'PAID'];
const DINE_IN_STATUS_FLOW_NO_KITCHEN: Order['status'][] = ['ORDER_TAKEN', 'SERVED', 'COMPLETED', 'PAID'];
const TAKE_AWAY_STATUS_FLOW: Order['status'][] = ['ORDER_TAKEN', 'READY'];
const TAKE_AWAY_STATUS_FLOW_NO_KITCHEN: Order['status'][] = ['ORDER_TAKEN', 'READY'];

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
  const { showSuccess, showError, showInfo } = useToast();

  const { hasPermission, user, isRole, activeStore } = useAuth();
  const canTakeOrder = hasPermission('access_to_take_order');
  const canManagePayment = hasPermission('access_to_payment_management');

  const [loading, setLoading] = useState(false);
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
  const [selectedTargetTable, setSelectedTargetTable] = useState<RestaurantTable | null>(null);
  const [moveFinalConfirmOpen, setMoveFinalConfirmOpen] = useState(false);



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
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<Item | null>(null);

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
    if (order.status === 'PREPARING' && order.order_type === 'TAKE_AWAY' && activeFlow.includes('READY')) return 'READY';
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

  const fetchData = async (orderIdToSelect?: number) => {
    setLoading(true);

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
      const activeOrds = (currentTable?.active_orders || []).sort((a: any, b: any) => b.id - a.id);
      setActiveOrders(activeOrds);

      if (initialOrder) {
        setOrder(initialOrder);
        setOrderType(initialOrder.order_type);
        setCustomerName(initialOrder.customer_name || '');
        setCustomerMobile(initialOrder.customer_mobile || '');
        setSelectedOrderId(initialOrder.id);
        setDialogStage('ORDER_DETAILS');
      } else if (currentTable) {
        // Only reset if we don't have an active selection already
        const currentSelection = orderIdToSelect || selectedOrderId;

        if (!currentSelection && !order) {
           setOrder(null);
           setSelectedOrderId(null);
        }
        // Don't reset customerName/Mobile if we're already in the process of creating one
        if (!customerMobile && !customerName) {
           setCustomerName('');
           setCustomerMobile('');
        }
        if (activeOrds.length > 0) {
          // Try to restore from localStorage first, then from state, then default to first (newest)
          const savedOrderId = localStorage.getItem(`last_order_id_${table?.id}`);
          
          const ordToSelect = currentSelection 
            ? (activeOrds.find((o: Order) => o.id === currentSelection) || activeOrds[0])
            : (savedOrderId ? (activeOrds.find((o: Order) => o.id === Number(savedOrderId)) || activeOrds[0]) : activeOrds[0]);
            
          const orderData = await restaurantService.getOrder(ordToSelect.id);
          setOrder(orderData);
          setOrderType(orderData.order_type);
          setSelectedOrderId(orderData.id);
          setDialogStage('ORDER_DETAILS');
          
          // Persist the selection
          localStorage.setItem(`last_order_id_${table?.id}`, orderData.id.toString());
        } else {
          // No active orders, start fresh
          setOrder(null);
          setOrderType('DINE_IN');
          setSelectedOrderId(null);
          setDialogStage('ORDER_DETAILS');
        }
      }
 else {
        setOrder(null);
        setOrderType('TAKE_AWAY');
        setDialogStage('ORDER_DETAILS');
      }
    } catch (e: any) {
      console.error('Failed to load data:', e);
      showError('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const refreshOrder = async () => {
    if (selectedOrderId) {
      try {
        const orderData = await restaurantService.getOrder(selectedOrderId);
        setOrder(orderData);
        // Also refresh table data to keep active_orders in sync
        const tablesData = await restaurantService.getTables();
        setAllTables(tablesData);
        const currentTable = table ? tablesData.find((t: any) => t.id === table.id) : null;
        if (currentTable) {
          setActiveOrders(currentTable.active_orders || []);
        }
      } catch (e) {
        console.error('Failed to refresh order:', e);
      }
    } else {
      // If no order selected, maybe something new was created on this table?
      await fetchData();
    }
  };

  useWebSocket('ORDER_UPDATED', refreshOrder);
  useWebSocket('ORDER_CREATED', refreshOrder);
  useWebSocket('KITCHEN_UPDATED', refreshOrder);
  useWebSocket('TABLE_UPDATED', refreshOrder);

  const handleCreateOrder = async (type: 'DINE_IN' | 'TAKE_AWAY' = 'DINE_IN') => {
    if (!table && type === 'DINE_IN') return;
    if (!canTakeOrder) {
      showError('Permission Denied', 'You do not have permission to take orders.');
      return;
    }
    setLoading(true);

    if (type === 'TAKE_AWAY' && !customerMobile) {
      showError('Required Field', 'Customer mobile number is mandatory for Parcel orders.');
      setLoading(false);
      return;
    }
    try {
      const totalPersons = (table?.current_occupancy || 0) + (type === 'DINE_IN' ? numberOfPersons : 1);
      if (type === 'DINE_IN' && table && totalPersons > table.capacity) {
          showInfo(`Table Capacity Limit`, `Table ${table.number} capacity is ${table.capacity}. Total guests (${totalPersons}) exceeds limit.`);
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
      showError('Error', 'Failed to create order');
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
      
      // Persist the selection
      localStorage.setItem(`last_order_id_${table?.id}`, orderId.toString());
    } catch (e) {
      showError('Error', 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, table, initialOrder]);

  useEffect(() => {
    if (!moveTableOpen) {
      setSelectedTargetTable(null);
    }
  }, [moveTableOpen]);


  const handleAddItem = async (item: Item) => {
    if (order?.invoice) return;
    if (!canTakeOrder) {
      showError('Permission Denied', 'You do not have permission to take orders.');
      return;
    }
    
    // Prevent double clicks
    if (loading) return;
    
    setLoading(true);

    try {
      let activeOrder = order;
      
      // If no active order, create one first
      if (!activeOrder) {
        const currentOrderType = orderType; // Capture current type
        
        // Mobile number is now optional at item add stage, required at KOT stage
        // But if provided, we validate it
        if (customerMobile && !/^\d{10}$/.test(customerMobile)) {
           showError("Invalid mobile number", "Please enter a valid 10-digit mobile number");
           setLoading(false);
           return;
        }

        // Create the order on the backend
        const createdOrder = await restaurantService.createOrder({
          table: currentOrderType === 'DINE_IN' ? table?.id : undefined,
          order_type: currentOrderType,
          customer_name: customerName || undefined,
          customer_mobile: customerMobile || undefined,
          number_of_persons: currentOrderType === 'DINE_IN' ? numberOfPersons : 1,
        });
        
        if (!createdOrder || !createdOrder.id) {
          throw new Error('Failed to create order on server');
        }

        activeOrder = createdOrder;
        setOrder(createdOrder);
        setSelectedOrderId(createdOrder.id);
      }
      
      if (!activeOrder || !activeOrder.id) {
        throw new Error('No active order found to add items to.');
      }

      // Add the item to the order
      await restaurantService.addItemToOrder(activeOrder.id, {
        item: item.id,
        quantity: 1,
        notes: (activeOrder.status && ['READY', 'SERVED', 'COMPLETED'].includes(activeOrder.status)) ? 'ADD-ON' : '',
      });
      
      // Refresh the order data to show the new item
      const updatedOrder = await restaurantService.getOrder(activeOrder.id);
      setOrder(updatedOrder);
      
      // Refresh local active orders list to show the new tab immediately
      await fetchData(activeOrder.id);
      
      // Notify parent that something changed
      onOrderUpdated();
    } catch (e: any) {
      console.error('Add Item Error:', e);
      showError('Error', e.message || 'Failed to add item to order');
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
    } catch (e) { showError('Error', 'Failed to update quantity'); }
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
      showSuccess("Success", "Order updated");
    } catch (e: any) {
      showError('Error', e.message || 'Failed to update order details');
    } finally {
      setLoading(false);
    }
  };

  const handleSendToKitchen = async () => {
    if (!order) return;

    // Validation for Parcel - Mandatory Mobile Number at KOT stage
    if (order.order_type === 'TAKE_AWAY' && !order.customer_mobile) {
      showInfo('Mobile Number Required', 'Please provide Customer Mobile number for Parcel orders.');
      if (isMobile) {
        setMobileSummaryOpen(true);
      }
      return;
    }

    setLoading(true);
    try {
      await restaurantService.sendToKitchen(order.id);
      const orderData = await restaurantService.getOrder(order.id);
      setOrder(orderData);
      onOrderUpdated();
      showSuccess("Success", "Sent to Kitchen (KOT)");
    } catch (e: any) { 
      showError('Error', e.message || 'Failed to send to kitchen'); 
    }
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
      showSuccess("Success", "Items served");
    } catch (e) { showError('Error', 'Failed to serve items'); }
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
      
      // Auto close if completed - user requested removal from tables/details
      if (newStatus === 'COMPLETED') {
        onClose();
      }
      showSuccess("Success", `Order ${newStatus.toLowerCase()}`);
    } catch (e) { showError('Error', 'Failed to update order status'); }
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
      showSuccess("Success", "Bill generated successfully");
    } catch (e) { showError('Error', 'Failed to generate bill'); }
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
      showSuccess("Success", "Table cleared");
    } catch (e) { showError('Error', 'Failed to release table'); }
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
    } catch (e) { showError('Error', 'Failed to cancel order'); }
    finally { setLoading(false); }
  };

  const handleMoveTable = async () => {
    if (!order || !selectedTargetTable) return;
    
    setMoving(true);
    try {
      await restaurantService.changeOrderTable(order.id, selectedTargetTable.id, movePersons);
      setMoveTableOpen(false);
      setMoveFinalConfirmOpen(false);
      onOrderUpdated();
      onClose();
      showSuccess("Success", `Order moved to Table ${selectedTargetTable.number}`);
    } catch (e) { showError('Error', 'Failed to move table'); }
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
    } catch (e) { showError('Error', 'Failed to download PDF'); }
    finally { setDownloading(false); }
  };

  const renderQuickActions = () => {
    if (dialogStage !== 'ORDER_DETAILS' || !isMobile) return null;
    
    const actions = [];
    if (!order) {
      if (dialogStage === 'ORDER_DETAILS' && orderType === 'DINE_IN') {
        actions.push(
          <Button 
            key="start-order" 
            variant="contained" 
            fullWidth 
            onClick={() => handleCreateOrder('DINE_IN')} 
            sx={{ py: 1, borderRadius: '12px', fontWeight: 900, bgcolor: 'primary.main', color: 'white' }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : 'START ORDER'}
          </Button>
        );
      }
    } else {
    if (hasNewItems) {
      actions.push(
        <Button key="kot" variant="contained" color="warning" size="small" onClick={handleSendToKitchen} sx={{ fontWeight: 900, borderRadius: '12px', flexGrow: 1, py: 1 }}>KOT</Button>
      );
    }
    if (hasReadyItems && order?.order_type !== 'TAKE_AWAY') {
      actions.push(
        <Button key="serve" variant="contained" color="success" size="small" onClick={handleServeAllReady} sx={{ fontWeight: 900, borderRadius: '12px', flexGrow: 1, py: 1 }}>SERVE</Button>
      );
    }
    if (nextStatus && order?.status !== 'COMPLETED' && (order?.items || []).length > 0 && 
        !(order?.order_type === 'DINE_IN' && nextStatus === 'SERVED') &&
        !(order?.order_type === 'TAKE_AWAY' && hasNewItems)) {
      actions.push(
        <Button key="status" variant="contained" size="small" onClick={() => handleUpdateOrderStatus(nextStatus)} sx={{ fontWeight: 900, borderRadius: '12px', flexGrow: 1, py: 1 }}>
          {nextStatus === 'READY' ? 'READY' : (nextStatus === 'SERVED' ? 'SERVE' : nextStatus.split('_')[0])}
        </Button>
      );
    }
    if (order?.status === 'COMPLETED' && !order.invoice) {
      actions.push(
        <Button key="checkout" variant="contained" color="success" size="small" onClick={handleGenerateBill} sx={{ fontWeight: 900, borderRadius: '12px', flexGrow: 1, py: 1 }}>BILL</Button>
      );
    }
    if (order?.order_type !== 'TAKE_AWAY' && order?.invoice && order?.status !== 'COMPLETED') {
      actions.push(
        <Button key="payment" variant="contained" color="secondary" size="small" onClick={() => setCheckoutOpen(true)} sx={{ fontWeight: 900, borderRadius: '12px', flexGrow: 1, py: 1 }}>PAY</Button>
      );
    }
    }

    return (
      <Box sx={{ 
        p: { xs: 1, md: 2 }, 
        bgcolor: 'white', 
        borderTop: '1px solid #e8e4d8', 
        display: 'flex', 
        gap: 2, 
        alignItems: 'center', 
        flexShrink: 0,
        zIndex: 1100
      }}>
        <Box sx={{ width: '85%', display: 'flex', gap: 1 }}>
          {actions.length > 0 ? actions : (
            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
               <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>NO ACTIONS AVAILABLE</Typography>
            </Box>
          )}
        </Box>
        
        <Box sx={{ width: '20%', display: 'flex', justifyContent: 'center' }}>
          <Badge 
            badgeContent={order ? (order.items || []).length : 0} 
            overlap="circular"
            sx={{
              '& .MuiBadge-badge': {
                bgcolor: '#FFEB3B',
                color: '#E65100',
                fontWeight: 900,
                fontSize: '0.65rem',
                height: 18,
                minWidth: 18,
              }
            }}
          >
            <IconButton 
              size="small"
              onClick={() => setMobileSummaryOpen(!mobileSummaryOpen)}
              sx={{ 
                bgcolor: 'primary.main', 
                color: 'white', 
                width: 44, 
                height: 44,
                boxShadow: '0 4px 12px rgba(239, 108, 0, 0.2)',
                '&:hover': { bgcolor: 'primary.dark' } 
              }}
            >
              <BasketIcon fontSize="small" />
            </IconButton>
          </Badge>
        </Box>
      </Box>
    );
  };

  const renderSummaryContent = () => (
    <>
      <Box sx={{ p: 2, borderBottom: '1px solid #e8e4d8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="caption" sx={{ fontWeight: 900, letterSpacing: '0.05em' }}>SUMMARY</Typography>
        
          {orderType === 'DINE_IN' && (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', border: '1px solid #e8e4d8', borderRadius: '20px', px: 1 }}>
            <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <IconButton size="small" onClick={() => order ? handleUpdateOrderDetails({ number_of_persons: Math.max(1, order.number_of_persons - 1) }) : setNumberOfPersons(p => Math.max(1, p-1))} disabled={Boolean(order?.invoice)}>
              <RemoveIcon sx={{ fontSize: 12 }} />
            </IconButton>
            <Tooltip title="Guest Count">
              <Typography sx={{ fontWeight: 800, fontSize: '0.875rem', minWidth: 16, textAlign: 'center' }}>{order ? order.number_of_persons : numberOfPersons}</Typography>
            </Tooltip>
            <IconButton 
              size="small" 
              onClick={() => order ? handleUpdateOrderDetails({ number_of_persons: order.number_of_persons + 1 }) : setNumberOfPersons(p => p+1)} 
              disabled={Boolean(order?.invoice) || (table ? ((table.current_occupancy || 0) + (order ? 0 : numberOfPersons)) >= table.capacity : false)}
            >
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
                size="small" 
                label="Mobile" 
                required
                error={orderType === 'TAKE_AWAY' && !customerMobile && !order}
                value={order ? (order.customer_mobile || '') : customerMobile} 
                onChange={(e) => {
                  if (order) handleUpdateOrderDetails({ customer_mobile: e.target.value });
                  else setCustomerMobile(e.target.value);
                }}
                disabled={Boolean(order?.invoice)}
                helperText={(orderType === 'TAKE_AWAY' && !customerMobile && !order) ? 'Required for Parcel' : ''}
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
              {[...(order?.items || [])].sort((a, b) => a.id - b.id).map(item => (
                <TableRow key={item.id}>
                  <TableCell sx={{ py: 1.5, px: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 800, display: 'block' }}>{item.item_details.name}</Typography>
                    <ItemStatusChip status={item.status} orderType={order?.order_type || 'DINE_IN'} sx={{ height: 18, fontSize: '0.7rem' }} />
                  </TableCell>
                  <TableCell align="right" sx={{ px: 1 }}>
                    {item.status === 'ORDERED' && !order?.invoice ? (
                      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
                        <IconButton size="small" onClick={() => handleUpdateItemQuantity(item, -1)} sx={{ p: 0.25 }}><RemoveIcon sx={{ fontSize: 12 }} /></IconButton>
                        <Typography sx={{ fontWeight: 800, fontSize: '1rem' }}>{item.quantity}</Typography>
                        <IconButton size="small" onClick={() => handleUpdateItemQuantity(item, 1)} sx={{ p: 0.25 }}><AddIcon sx={{ fontSize: 12 }} /></IconButton>
                      </Stack>
                    ) : (
                      <Typography sx={{ fontWeight: 800, fontSize: '1rem' }}>×{item.quantity}</Typography>
                    )}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, fontSize: '1rem', px: 1 }}>₹{(parseFloat(item.price) * item.quantity).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Box>
      <Box sx={{ p: 1.5, borderTop: '2px dashed #e8e4d8', bgcolor: '#fdfdfd' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 900 }}>Total</Typography>
          <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.main' }}>₹{order?.total_amount || '0.00'}</Typography>
        </Box>
        {!isMobile && (
          <Stack spacing={1}>
            {hasNewItems && (
              <Button variant="contained" color="warning" fullWidth onClick={handleSendToKitchen} sx={{ fontWeight: 900 }}>KOT</Button>
            )}
            {hasReadyItems && order?.order_type !== 'TAKE_AWAY' && (
              <Button variant="contained" color="success" fullWidth onClick={handleServeAllReady} sx={{ fontWeight: 900 }}>SERVE</Button>
            )}
            {nextStatus && order?.status !== 'COMPLETED' && (order?.items || []).length > 0 && 
              !(order?.order_type === 'DINE_IN' && nextStatus === 'SERVED') &&
              !(order?.order_type === 'TAKE_AWAY' && hasNewItems) && (
              <Button variant="contained" fullWidth onClick={() => handleUpdateOrderStatus(nextStatus)} sx={{ fontWeight: 900 }}>
                {nextStatus === 'READY' ? 'MARK AS READY' : (nextStatus === 'SERVED' ? 'MARK AS SERVED' : nextStatus.replace('_', ' '))}
              </Button>
            )}
            {order?.status === 'COMPLETED' && !order.invoice && (
              <Button variant="contained" color="success" fullWidth onClick={handleGenerateBill} sx={{ fontWeight: 900 }}>CHECKOUT</Button>
            )}
            {order?.order_type !== 'TAKE_AWAY' && order?.invoice && order?.status !== 'COMPLETED' && (
              <Button variant="contained" color="secondary" fullWidth onClick={() => setCheckoutOpen(true)} sx={{ fontWeight: 900 }}>PAYMENT</Button>
            )}
          </Stack>
        )}
      </Box>
    </>
  );

  const renderContent = () => {
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
          <Container maxWidth="md" sx={{ py: { xs: 4, md: 8 }, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Grid container spacing={4} sx={{ justifyContent: 'center' }}>
              {(!table || (table.current_occupancy || 0) < (table.capacity || 0)) && (
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="overline" sx={{ fontWeight: 900, color: 'text.disabled', mb: 2, display: 'block', letterSpacing: '0.1em' }}>START FRESH</Typography>
                  <Paper
                    elevation={0}
                    onClick={() => {
                      if (table) {
                        setDialogStage('NEW_ORDER_SETUP');
                      } else {
                        handleCreateOrder('TAKE_AWAY');
                      }
                    }}
                    sx={{ 
                      p: 4, height: '100%', minHeight: 180, borderRadius: '24px', border: '2px solid #e8e4d8',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                      cursor: 'pointer', transition: 'all 0.25s', bgcolor: 'white',
                      '&:hover': { borderColor: 'primary.main', transform: 'translateY(-4px)', boxShadow: '0 12px 30px rgba(0,0,0,0.08)' }
                    }}
                  >
                    <AddIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                    <Typography variant="h5" sx={{ fontWeight: 900 }}>NEW ORDER</Typography>
                  </Paper>
                </Grid>
              )}

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
                    <IconButton size="small" onClick={() => setNumberOfPersons(numberOfPersons + 1)} disabled={table ? ((table.current_occupancy || 0) + numberOfPersons) >= table.capacity : false} sx={{ border: '1px solid #e8e4d8' }}><AddIcon fontSize="small" /></IconButton>
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
              <Box sx={{ p: { xs: 1, md: 2 }, borderBottom: '1px solid #e8e4d8', bgcolor: 'white' }}>
                <Grid container spacing={0.5} sx={{ alignItems: 'center' }}>
                  <Grid size={{ xs: 12, md: 'auto' }}>
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mb: { xs: 0.5, md: 0 } }}>
                      {orderType === 'DINE_IN' && (
                        <Stack direction="row" spacing={0.25} sx={{ alignItems: 'center', bgcolor: '#f8fafc', borderRadius: '12px', px: 0.75, border: '1px solid #e2e8f0', mr: 0.5 }}>
                          <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                          <IconButton size="small" onClick={() => order ? handleUpdateOrderDetails({ number_of_persons: Math.max(1, order.number_of_persons - 1) }) : setNumberOfPersons(p => Math.max(1, p-1))} disabled={Boolean(order?.invoice)} sx={{ p: 0.25 }}>
                            <RemoveIcon sx={{ fontSize: 12 }} />
                          </IconButton>
                          <Typography sx={{ fontWeight: 800, fontSize: '0.75rem', minWidth: 16, textAlign: 'center' }}>{order ? order.number_of_persons : numberOfPersons}</Typography>
                          <IconButton size="small" onClick={() => order ? handleUpdateOrderDetails({ number_of_persons: order.number_of_persons + 1 }) : setNumberOfPersons(p => p+1)} disabled={Boolean(order?.invoice) || (table ? ((table.current_occupancy || 0) + (order ? 0 : numberOfPersons)) >= table.capacity : false)} sx={{ p: 0.25 }}>
                            <AddIcon sx={{ fontSize: 12 }} />
                          </IconButton>
                        </Stack>
                      )}
                      <Box sx={{ display: 'flex', gap: 0.5, overflowX: 'auto', pb: 0.25, '&::-webkit-scrollbar': { display: 'none' } }}>
                        <Button size="small" variant={activeCategory === 'all' ? 'contained' : 'outlined'} onClick={() => setActiveCategory('all')} sx={{ minWidth: 'fit-content', borderRadius: '12px', fontSize: '0.8rem', py: 0.5 }}>All</Button>
                        {categories.map(cat => (
                          <Button key={cat.id} size="small" variant={activeCategory === cat.id ? 'contained' : 'outlined'} onClick={() => setActiveCategory(cat.id)} sx={{ minWidth: 'fit-content', borderRadius: '12px', fontSize: '0.8rem', py: 0.5 }}>{cat.name}</Button>
                        ))}
                      </Box>
                    </Stack>
                  </Grid>
                  <Grid size={{ xs: 12, md: 'grow' }}>
                    <TextField fullWidth size="small" placeholder="Search menu..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} sx={{ '& .MuiInputBase-root': { borderRadius: '12px' } }} />
                  </Grid>
                </Grid>
              </Box>
              <Box sx={{ flexGrow: 1, p: { xs: 0, md: 2 }, pb: { xs: '140px', md: 2 }, overflowY: 'auto', bgcolor: 'white' }}>
                <Stack spacing={0}>
                  {filteredItems.map((item: Item) => (
                    <Box 
                      key={item.id}
                      onClick={() => setSelectedItemForDetail(item)}
                      sx={{ 
                        px: 2, 
                        py: 1.75, 
                        borderBottom: '1px solid #f1f5f9', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05) }
                      }}
                    >
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 700, color: '#334155', fontSize: '0.95rem' }}>{item.name}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Typography variant="body1" sx={{ fontWeight: 900, color: 'primary.main', fontSize: '1rem' }}>₹{item.price}</Typography>
                        <IconButton 
                          size="small" 
                          onClick={(e) => { e.stopPropagation(); handleAddItem(item); }}
                          disabled={loading || Boolean(order?.invoice)}
                          sx={{ 
                            p: 0.25,
                            bgcolor: alpha(theme.palette.primary.main, 0.08), 
                            color: 'primary.main',
                            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.15) },
                          }}
                        >
                          {loading ? <CircularProgress size={14} color="inherit" /> : <AddIcon sx={{ fontSize: 16 }} />}
                        </IconButton>
                      </Box>
                    </Box>
                  ))}
                  {filteredItems.length === 0 && (
                    <Box sx={{ p: 4, textAlign: 'center', opacity: 0.5 }}>
                      <Typography>No items found</Typography>
                    </Box>
                  )}
                </Stack>
              </Box>
            </Box>
          ) : (
            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
                <Typography variant="h5" sx={{ fontWeight: 900 }}>{order?.invoice ? 'Order Finalized' : 'Order Completed'}</Typography>
            </Box>
          )}

          {/* SUMMARY SIDEBAR (DESKTOP) */}
          <Box sx={{ width: { md: '400px' }, borderLeft: '1px solid #e8e4d8', display: { xs: 'none', md: 'flex' }, flexDirection: 'column', bgcolor: 'white' }}>
            {renderSummaryContent()}
          </Box>
        </Box>
      );
    }
    return null;
  };

  if (!open) return null;

  return (
    <Box sx={{ 
      position: 'absolute', 
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      m: { xs: -1, md: 0 },
      zIndex: 1050, 
      display: 'flex', 
      flexDirection: 'column', 
      bgcolor: 'white', 
      overflow: 'hidden',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.1)'
    }}>
      <Box sx={{ px: { xs: 1.5, md: 2 }, py: { xs: 1, md: 1.5 }, borderBottom: '1px solid #e8e4d8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'white', zIndex: 10 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, md: 2 } }}>
          <IconButton onClick={onClose} size="small" sx={{ border: { xs: '1px solid #f1f5f9', md: 'none' }, p: 0.5 }}><ChevronLeftIcon fontSize="small" /></IconButton>
          <Box>
            <Typography variant={isMobile ? "body2" : "h6"} sx={{ fontWeight: 900, lineHeight: 1.1 }}>{table?.number ? `Table ${table.number}` : 'Order Details'}</Typography>
            {order && <Typography variant="caption" sx={{ display: 'block', opacity: 0.7, fontSize: '0.65rem' }}>Order #{order.id}</Typography>}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {order && order.order_type === 'DINE_IN' && !order.invoice && (
            <Tooltip title="Move to Another Table">
              <IconButton 
                size="small" 
                onClick={() => {
                  setMovePersons(order.number_of_persons);
                  setMoveTableOpen(true);
                }}
                sx={{ 
                  bgcolor: alpha(theme.palette.primary.main, 0.05),
                  color: 'primary.main',
                  '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) }
                }}
              >
                <TableIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {/* Tabs for multiple orders */}
      {table && (
        <Box sx={{ borderBottom: '1px solid #e8e4d8', bgcolor: '#fdfdfd', display: 'flex', alignItems: 'center' }}>
          {activeOrders.length > 0 && (
            <Tabs
              value={selectedOrderId || false}
              onChange={(_, val) => handleTabChange(val)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                flexGrow: 1,
                minHeight: 48,
                '& .MuiTabs-indicator': { height: 3 },
                '& .MuiTab-root': {
                  fontWeight: 800,
                  fontSize: '0.875rem',
                  minHeight: 48,
                  textTransform: 'none',
                  px: 2,
                  color: 'text.secondary',
                  '&.Mui-selected': { color: 'primary.main' }
                },
              }}
            >
              {activeOrders.map((ord) => (
                <Tab 
                  key={ord.id} 
                  value={ord.id} 
                  label={ord.customer_name || `Order #${ord.id}`} 
                />
              ))}
            </Tabs>
          )}

          {(table.current_occupancy || 0) < table.capacity && (
            <>
              {activeOrders.length > 0 && (
                <Box sx={{ height: 24, width: '1px', bgcolor: '#e8e4d8', mx: 0.5 }} />
              )}
              <Button 
                onClick={() => handleTabChange(null)}
                startIcon={<AddIcon sx={{ fontSize: 20 }} />}
                sx={{ 
                  height: 48, 
                  px: { xs: 2, md: 3 }, 
                  borderRadius: 0,
                  fontWeight: 900,
                  fontSize: '0.85rem',
                  color: selectedOrderId === null ? 'primary.main' : 'text.secondary',
                  borderBottom: selectedOrderId === null ? '3px solid' : 'none',
                  borderColor: 'primary.main',
                  bgcolor: selectedOrderId === null ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
                  textTransform: 'none',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                  '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) }
                }}
              >
                New Order
              </Button>
            </>
          )}
        </Box>
      )}

      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>{renderContent()}</Box>

      {/* QUICK ACTIONS (MOBILE) */}
      {renderQuickActions()}

      {isMobile && (
        <Drawer
          anchor="bottom"
          open={mobileSummaryOpen}
          onClose={() => setMobileSummaryOpen(false)}
          slotProps={{
            paper: {
              sx: { borderTopLeftRadius: '24px', borderTopRightRadius: '24px', height: '70vh', zIndex: 1400 }
            }
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', pb: 'env(safe-area-inset-bottom, 16px)' }}>
            <Box sx={{ p: 1, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
              <Box sx={{ width: 40, height: 4, bgcolor: '#e8e4d8', borderRadius: 2 }} />
            </Box>
            {renderSummaryContent()}
            {renderQuickActions()}
          </Box>
        </Drawer>
      )}

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

      {/* MOVE TABLE DIALOG */}
      <Dialog
        open={moveTableOpen}
        onClose={() => setMoveTableOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: '16px' } }
        }}
      >
        <DialogTitle sx={{ fontWeight: 900, pb: 0.5 }}>Move Order</DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            Move Order #{order?.id} (Table {table?.number})
          </Typography>
          
          <Box sx={{ mb: 2 }}>
             <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.secondary', display: 'block', mb: 1 }}>GUESTS</Typography>
             <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <IconButton 
                  size="small" 
                  onClick={() => setMovePersons((p: number) => Math.max(1, p - 1))} 
                  sx={{ 
                    border: '1px solid #e8e4d8', 
                    borderRadius: '50%', 
                    p: 0.5,
                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05), borderColor: 'primary.main' }
                  }}
                >
                  <RemoveIcon sx={{ fontSize: 16 }} />
                </IconButton>
                <Typography variant="h5" sx={{ fontWeight: 900, minWidth: 30, textAlign: 'center' }}>{movePersons}</Typography>
                <IconButton 
                  size="small" 
                  onClick={() => setMovePersons((p: number) => p + 1)} 
                  sx={{ 
                    border: '1px solid #e8e4d8', 
                    borderRadius: '50%', 
                    p: 0.5,
                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05), borderColor: 'primary.main' }
                  }}
                >
                  <AddIcon sx={{ fontSize: 16 }} />
                </IconButton>
             </Stack>
          </Box>

          <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.secondary', display: 'block', mb: 0.5 }}>TARGET TABLE</Typography>
          <Box 
            sx={{ 
              display: 'flex', 
              gap: 1, 
              overflowX: 'auto', 
              pb: 1, 
              pt: 0.5,
              mx: -0.5,
              px: 0.5,
              '&::-webkit-scrollbar': { height: 4 },
              '&::-webkit-scrollbar-thumb': { bgcolor: alpha(theme.palette.primary.main, 0.1), borderRadius: 2 }
            }}
          >
            {allTables
              .filter((t: RestaurantTable) => t.id !== table?.id && t.is_active)
              .sort((a: RestaurantTable, b: RestaurantTable) => {
                 const aNum = parseInt(a.number) || 0;
                 const bNum = parseInt(b.number) || 0;
                 return aNum - bNum;
              })
              .map((t: RestaurantTable) => {
                const availableCapacity = t.capacity - (t.current_occupancy || 0);
                const hasCapacity = availableCapacity >= movePersons;
                const isSelected = selectedTargetTable?.id === t.id;
                
                return (
                  <Paper
                    key={t.id}
                    elevation={isSelected ? 4 : 0}
                    onClick={() => hasCapacity && setSelectedTargetTable(t)}
                    sx={{
                      flexShrink: 0,
                      minWidth: 90,
                      p: 1,
                      borderRadius: '12px',
                      border: '2px solid',
                      borderColor: isSelected ? 'primary.main' : (hasCapacity ? '#e8e4d8' : alpha(theme.palette.error.main, 0.1)),
                      cursor: hasCapacity ? 'pointer' : 'not-allowed',
                      opacity: hasCapacity ? 1 : 0.6,
                      bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.05) : (hasCapacity ? 'white' : alpha(theme.palette.error.main, 0.02)),
                      transform: isSelected ? 'translateY(-2px)' : 'none',
                      transition: 'all 0.2s',
                      textAlign: 'center',
                      '&:hover': hasCapacity ? {
                        borderColor: 'primary.main',
                        bgcolor: alpha(theme.palette.primary.main, 0.02),
                      } : {}
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 900, color: hasCapacity ? 'text.primary' : 'text.disabled', lineHeight: 1.2 }}>
                      T{t.number}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, color: hasCapacity ? 'primary.main' : 'error.main', fontSize: '0.65rem' }}>
                      {t.current_occupancy || 0}/{t.capacity}
                    </Typography>
                    {!hasCapacity && (
                      <Typography variant="caption" sx={{ color: 'error.main', fontSize: '0.55rem', fontWeight: 900, display: 'block' }}>
                        FULL
                      </Typography>
                    )}
                  </Paper>
                );
              })}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0, justifyContent: 'space-between' }}>
          <Button size="small" onClick={() => setMoveTableOpen(false)} sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.75rem' }}>CANCEL</Button>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {moving && <CircularProgress size={16} />}
            <Button 
              variant="contained" 
              size="small" 
              disabled={!selectedTargetTable || moving} 
              onClick={() => setMoveFinalConfirmOpen(true)}
              sx={{ 
                fontWeight: 900, 
                borderRadius: '8px',
                px: 3
              }}
            >
              MOVE ORDER
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* MOVE FINAL CONFIRMATION DIALOG */}
      <Dialog
        open={moveFinalConfirmOpen}
        onClose={() => setMoveFinalConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: '16px', p: 1 } }
        }}
      >
        <DialogTitle sx={{ fontWeight: 900, textAlign: 'center' }}>Confirm Move</DialogTitle>
        <DialogContent sx={{ textAlign: 'center' }}>
          <Typography variant="body1" sx={{ mb: 1 }}>
            Are you sure you want to move this order?
          </Typography>
          <Box sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05), p: 2, borderRadius: '12px', mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 800 }}>
              Table {table?.number} → Table {selectedTargetTable?.number}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Order #{order?.id} • {movePersons} Guests
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2, gap: 2 }}>
          <Button 
            onClick={() => setMoveFinalConfirmOpen(false)}
            sx={{ fontWeight: 800, color: 'text.secondary' }}
          >
            CANCEL
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleMoveTable}
            disabled={moving}
            sx={{ fontWeight: 900, borderRadius: '10px', px: 4 }}
          >
            {moving ? <CircularProgress size={20} color="inherit" /> : 'CONFIRM MOVE'}
          </Button>
        </DialogActions>
      </Dialog>


      {/* ITEM DETAIL DIALOG */}
      <Dialog
        open={Boolean(selectedItemForDetail)}
        onClose={() => setSelectedItemForDetail(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: '24px', p: 1 } }
        }}
      >
        {selectedItemForDetail && (
          <>
            <DialogContent>
              {selectedItemForDetail.image && (
                <Box sx={{ width: '100%', height: 200, borderRadius: '16px', overflow: 'hidden', mb: 2 }}>
                  <img 
                    src={getImageUrl(selectedItemForDetail.image)} 
                    alt={selectedItemForDetail.name} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                </Box>
              )}
              <Typography variant="h5" sx={{ fontWeight: 900, mb: 1 }}>{selectedItemForDetail.name}</Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                {selectedItemForDetail.category_name && <Chip label={selectedItemForDetail.category_name} size="small" />}
                {selectedItemForDetail.code && <Chip label={`#${selectedItemForDetail.code}`} size="small" variant="outlined" />}
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {selectedItemForDetail.description || 'No description available for this item.'}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.main' }}>₹{selectedItemForDetail.price}</Typography>
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 2, pt: 0 }}>
              <Button 
                fullWidth 
                variant="contained" 
                onClick={() => { handleAddItem(selectedItemForDetail); setSelectedItemForDetail(null); }} 
                sx={{ py: 1.5, borderRadius: '12px', fontWeight: 900 }}
              >
                ADD TO ORDER
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default OrderDialog;
