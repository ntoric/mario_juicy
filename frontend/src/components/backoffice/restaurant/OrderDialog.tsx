"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, alpha, Box, Typography, Grid, TextField, IconButton, Paper, Autocomplete, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, useTheme, useMediaQuery, Stack, Tooltip, Select, MenuItem, FormControl, InputLabel, Divider, Alert, Chip, Card, CardContent, Container, Tabs, Tab, Drawer, Fab, Badge, InputAdornment
} from '@mui/material';
import { useToast } from '@/context/ToastContext';
import { useRouter } from 'next/navigation';
import {
  AddOutlined as AddIcon,
  RemoveOutlined as RemoveIcon,
  DeleteOutlined as DeleteIcon,
  ShoppingBasketOutlined as BasketIcon,
  KitchenOutlined as KitchenIcon,
  SendOutlined as SendIcon,
  ArrowForwardOutlined as NextIcon,
  SearchOutlined as SearchIcon,
  CategoryOutlined as CategoryIcon,
  ReceiptOutlined as BillIcon,
  TableBarOutlined as TableIcon,
  ChevronRightOutlined as ChevronRightIcon,
  ChevronLeftOutlined as ChevronLeftIcon,
  PersonOutlined as PersonIcon,
  AccessTimeOutlined as TimeIcon,
  ExpandMoreOutlined as ExpandMoreIcon,
  ExpandLessOutlined as ExpandLessIcon,
  PrintOutlined as PrintIcon,
  DescriptionOutlined as DescriptionIcon,
  CheckCircleOutlined as CheckIcon,
  RestaurantOutlined as FoodIcon
} from '@mui/icons-material';
import { restaurantService } from '@/services/restaurantService';
import { itemService } from '@/services/itemService';
import { RestaurantTable, Order, Item, Category, OrderItem } from '@/types/restaurant';
import { useAuth } from '@/hooks/useAuth';
import { OrderStatusChip, ItemStatusChip } from './StatusChips';
import CheckoutDialog from './CheckoutDialog';
import InvoicePreviewDialog from './InvoicePreviewDialog';
import InvoicePrint from './InvoicePrint';
import KOTPrint from './KOTPrint';
import { getImageUrl } from '@/utils/image';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useConfirm } from '@/context/ConfirmContext';

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
  const { confirm } = useConfirm();
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKE_AWAY'>('DINE_IN');

  const canTakeOrder = hasPermission('access_to_take_order');
  const canManagePayment = hasPermission('billing');
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
      } else if (orderIdToSelect || (selectedOrderId && !table)) {
        // Handle standalone orders (like Take Away from Quick Order)
        const ordId = orderIdToSelect || selectedOrderId;
        if (ordId) {
          const orderData = await restaurantService.getOrder(ordId);
          setOrder(orderData);
          setOrderType(orderData.order_type);
          setSelectedOrderId(orderData.id);
          setCustomerName(orderData.customer_name || '');
          setCustomerMobile(orderData.customer_mobile || '');
          setDialogStage('ORDER_DETAILS');
        }
      } else if (currentTable) {
        // Only reset if we don't have an active selection already
        const currentSelection = orderIdToSelect || selectedOrderId;

        if (!currentSelection && !order) {
           setOrder(null);
           setSelectedOrderId(null);
           setCustomerName('');
           setCustomerMobile('');
        }
        // Don't reset customerName/Mobile if we're already in the process of creating one
        if (!customerMobile && !customerName && !currentSelection) {
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
          setCustomerName(orderData.customer_name || '');
          setCustomerMobile(orderData.customer_mobile || '');
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
      } else {
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
      await fetchData(newOrder.id);
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
      setCustomerName(orderData.customer_name || '');
      setCustomerMobile(orderData.customer_mobile || '');
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
    if (!await confirm({
      title: 'Remove Item',
      message: 'Are you sure you want to remove this item from the order?',
      severity: 'warning',
      confirmLabel: 'REMOVE'
    })) return;
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
      
      // Auto-print KOT for new items
      const newItems = (orderData.items || []).filter((i: any) => i.status === 'PREPARING');
      if (newItems.length > 0) {
        const { printKOT } = await import('@/utils/printerService');
        await printKOT(orderData, newItems, activeStore);
      }
      
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
    if (!await confirm({
      title: 'Emergency Clear',
      message: 'Are you sure you want to emergency clear this table? This will force release the table.',
      severity: 'error',
      confirmLabel: 'CLEAR TABLE'
    })) return;
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
    if (!order?.invoice) return;
    try {
      const { printInvoice } = await import('@/utils/printerService');
      const success = await printInvoice(order.invoice, order.items || [], activeStore);
      if (!success) {
        showError("Print Failed", "Could not connect to the printer service.");
      }
    } catch (e: any) {
      showError("Print Error", e.message || "An error occurred while printing.");
    }
  };

  const handlePrintKOT = async () => {
    if (!order) return;
    try {
      const { printKOT } = await import('@/utils/printerService');
      const success = await printKOT(order, order.items || [], activeStore);
      if (!success) {
        showError("Print Failed", "Could not connect to the printer service.");
      }
    } catch (e: any) {
      showError("Print Error", e.message || "An error occurred while printing.");
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
            sx={{ py: 1.5, borderRadius: '0.65rem', fontWeight: 900, bgcolor: theme.palette.primary.main, color: 'white', fontSize: '0.9rem', boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.2)}` }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : 'START ORDER'}
          </Button>
        );
      }
    } else {
    if (hasNewItems) {
      actions.push(
        <Button key="kot" variant="contained" color="warning" size="small" onClick={handleSendToKitchen} sx={{ fontWeight: 950, borderRadius: '0.65rem', flexGrow: 1, py: 1.5, bgcolor: theme.palette.primary.main, '&:hover': { bgcolor: '#d66a27' } }}>KOT</Button>
      );
    }
    if (hasReadyItems && order?.order_type !== 'TAKE_AWAY') {
      actions.push(
        <Button key="serve" variant="contained" color="success" size="small" onClick={handleServeAllReady} sx={{ fontWeight: 950, borderRadius: '0.65rem', flexGrow: 1, py: 1.5, bgcolor: '#2e7d32' }}>SERVE</Button>
      );
    }
    if (nextStatus && order?.status !== 'COMPLETED' && (order?.items || []).length > 0 && 
        !(order?.order_type === 'DINE_IN' && nextStatus === 'SERVED') &&
        !(order?.order_type === 'TAKE_AWAY' && hasNewItems)) {
      actions.push(
        <Button key="status" variant="contained" size="small" onClick={() => handleUpdateOrderStatus(nextStatus)} sx={{ fontWeight: 950, borderRadius: '0.65rem', flexGrow: 1, py: 1.5, bgcolor: theme.palette.primary.main, '&:hover': { bgcolor: '#d66a27' } }}>
          {nextStatus === 'READY' ? 'READY' : (nextStatus === 'SERVED' ? 'SERVE' : nextStatus.split('_')[0])}
        </Button>
      );
    }
    if (order?.status === 'COMPLETED' && !order.invoice) {
      actions.push(
        <Button key="checkout" variant="contained" color="success" size="small" onClick={handleGenerateBill} sx={{ fontWeight: 950, borderRadius: '0.65rem', flexGrow: 1, py: 1.5, bgcolor: '#2e7d32' }}>BILL</Button>
      );
    }
    if (order?.order_type !== 'TAKE_AWAY' && order?.invoice && order?.status !== 'COMPLETED') {
      actions.push(
        <Button key="payment" variant="contained" color="secondary" size="small" onClick={() => setCheckoutOpen(true)} sx={{ fontWeight: 950, borderRadius: '0.65rem', flexGrow: 1, py: 1.5, bgcolor: '#6a1b9a' }}>PAY</Button>
      );
    }

    if ((order?.items || []).length > 0) {
      actions.push(
        <Button key="print-kot" variant="outlined" size="small" onClick={handlePrintKOT} sx={{ fontWeight: 950, borderRadius: '0.65rem', flexGrow: 1, py: 1.5, borderColor: theme.palette.primary.main, color: theme.palette.primary.main }}>PRINT KOT</Button>
      );
      if (order?.invoice) {
        actions.push(
          <Button key="print-bill" variant="outlined" size="small" onClick={handlePrint} sx={{ fontWeight: 950, borderRadius: '0.65rem', flexGrow: 1, py: 1.5, borderColor: '#2e7d32', color: '#2e7d32' }}>PRINT BILL</Button>
        );
      }
    }
    }

    return (
      <Box sx={{ 
        p: 2, 
        bgcolor: 'white', 
        borderTop: '1px solid',
        borderColor: alpha(theme.palette.divider, 0.1), 
        display: 'flex', 
        gap: 2, 
        alignItems: 'center', 
        flexShrink: 0,
        zIndex: 1100,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.05)'
      }}>
        <Box sx={{ flexGrow: 1, display: 'flex', gap: 1.5 }}>
          {actions.length > 0 ? actions : (
            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <Typography variant="caption" sx={{ fontWeight: 900, color: 'text.disabled', letterSpacing: '0.05em' }}>NO ACTIONS AVAILABLE</Typography>
            </Box>
          )}
        </Box>
        
        <Box sx={{ flexShrink: 0 }}>
          <Badge 
            badgeContent={order ? (order.items || []).length : 0} 
            overlap="circular"
            sx={{
              '& .MuiBadge-badge': {
                bgcolor: theme.palette.primary.main,
                color: 'white',
                fontWeight: 900,
                fontSize: '0.65rem',
                height: 20,
                minWidth: 20,
                border: '2px solid white'
              }
            }}
          >
            <IconButton 
              size="large"
              onClick={() => setMobileSummaryOpen(!mobileSummaryOpen)}
              sx={{ 
                bgcolor: alpha(theme.palette.primary.main, 0.1), 
                color: theme.palette.primary.main, 
                width: 52, 
                height: 52,
                borderRadius: '0.65rem',
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.15) } 
              }}
            >
              <BasketIcon />
            </IconButton>
          </Badge>
        </Box>
      </Box>
    );
  };

  const renderSummaryContent = () => (
    <>
      <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: alpha(theme.palette.divider, 0.1), display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
        <Typography variant="caption" sx={{ fontWeight: 950, letterSpacing: '0.1em', color: 'text.disabled' }}>CART SUMMARY</Typography>
        
          {orderType === 'DINE_IN' && (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', bgcolor: 'white', borderRadius: '0.65rem', px: 1, py: 0.5, border: '1px solid', borderColor: alpha(theme.palette.divider, 0.1) }}>
            <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <IconButton size="small" onClick={() => order ? handleUpdateOrderDetails({ number_of_persons: Math.max(1, order.number_of_persons - 1) }) : setNumberOfPersons(p => Math.max(1, p-1))} disabled={Boolean(order?.invoice)} sx={{ p: 0.5 }}>
              <RemoveIcon sx={{ fontSize: 14 }} />
            </IconButton>
            <Typography sx={{ fontWeight: 900, fontSize: '0.9rem', minWidth: 20, textAlign: 'center' }}>{order ? order.number_of_persons : numberOfPersons}</Typography>
            <IconButton 
              size="small" 
              onClick={() => order ? handleUpdateOrderDetails({ number_of_persons: order.number_of_persons + 1 }) : setNumberOfPersons(p => p+1)} 
              disabled={Boolean(order?.invoice) || (table ? ((table.current_occupancy || 0) + (order ? 0 : numberOfPersons)) >= table.capacity : false)}
              sx={{ p: 0.5 }}
            >
              <AddIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Stack>
        )}
      </Box>
      
      {orderType === 'TAKE_AWAY' && (
        <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: alpha(theme.palette.divider, 0.1), bgcolor: alpha(theme.palette.primary.main, 0.01) }}>
            <Stack spacing={2}>
              <TextField 
                size="small" label="Customer Name" value={customerName} 
                onChange={(e) => setCustomerName(e.target.value)}
                disabled={Boolean(order?.invoice)}
                slotProps={{
                  input: {
                    sx: { borderRadius: '0.65rem', fontWeight: 700 },
                    endAdornment: order && (
                      <InputAdornment position="end">
                        <IconButton 
                          size="small" 
                          onClick={() => handleUpdateOrderDetails({ customer_name: customerName })}
                          disabled={loading || customerName === order.customer_name}
                          sx={{ color: theme.palette.primary.main }}
                        >
                          <CheckIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                }}
              />
              <TextField 
                size="small" 
                label="Mobile" 
                required
                error={orderType === 'TAKE_AWAY' && !customerMobile && !order}
                value={customerMobile} 
                onChange={(e) => setCustomerMobile(e.target.value)}
                disabled={Boolean(order?.invoice)}
                helperText={(orderType === 'TAKE_AWAY' && !customerMobile && !order) ? 'Required for Parcel' : ''}
                slotProps={{
                  input: {
                    sx: { borderRadius: '0.65rem', fontWeight: 700 },
                    endAdornment: order && (
                      <InputAdornment position="end">
                        <IconButton 
                          size="small" 
                          onClick={() => handleUpdateOrderDetails({ customer_mobile: customerMobile })}
                          disabled={loading || customerMobile === order.customer_mobile}
                          sx={{ color: theme.palette.primary.main }}
                        >
                          <CheckIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                }}
              />
            </Stack>
        </Box>
      )}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1 }}>
        {(order?.items || []).length === 0 ? (
          <Box sx={{ py: 8, textAlign: 'center', opacity: 0.3 }}>
            <BasketIcon sx={{ fontSize: 64, mb: 2, color: 'text.disabled' }} />
            <Typography variant="body2" sx={{ fontWeight: 800, letterSpacing: '0.05em' }}>YOUR CART IS EMPTY</Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableBody>
              {[...(order?.items || [])].sort((a, b) => a.id - b.id).map(item => (
                <TableRow key={item.id} sx={{ '&:last-child td': { borderBottom: 0 } }}>
                  <TableCell sx={{ py: 2, px: 1.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 850, color: '#1a1a1a', mb: 0.5 }}>{item.item_details.name}</Typography>
                    <ItemStatusChip status={item.status} orderType={order?.order_type || 'DINE_IN'} sx={{ height: 18, fontSize: '0.65rem', fontWeight: 900, borderRadius: '0.65rem' }} />
                  </TableCell>
                  <TableCell align="right" sx={{ px: 1 }}>
                    {item.status === 'ORDERED' && !order?.invoice ? (
                      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', justifyContent: 'flex-end', bgcolor: alpha('#000', 0.03), borderRadius: '0.65rem', p: 0.5 }}>
                        <IconButton size="small" onClick={() => handleUpdateItemQuantity(item, -1)} sx={{ p: 0.5, bgcolor: 'white', '&:hover': { bgcolor: alpha('#000', 0.05) } }}><RemoveIcon sx={{ fontSize: 12 }} /></IconButton>
                        <Typography sx={{ fontWeight: 950, fontSize: '0.9rem', minWidth: 24, textAlign: 'center' }}>{item.quantity}</Typography>
                        <IconButton size="small" onClick={() => handleUpdateItemQuantity(item, 1)} sx={{ p: 0.5, bgcolor: 'white', '&:hover': { bgcolor: alpha('#000', 0.05) } }}><AddIcon sx={{ fontSize: 12 }} /></IconButton>
                      </Stack>
                    ) : (
                      <Typography sx={{ fontWeight: 950, fontSize: '1rem', color: 'text.secondary' }}>×{item.quantity}</Typography>
                    )}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 950, fontSize: '1rem', color: '#1a1a1a', px: 1.5 }}>₹{(parseFloat(item.price) * item.quantity).toFixed(0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Box>
      <Box sx={{ p: 2.5, borderTop: '2px dashed', borderColor: alpha(theme.palette.divider, 0.2), bgcolor: 'white' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
          <Typography sx={{ fontWeight: 900, color: 'text.secondary', fontSize: '0.9rem' }}>TOTAL AMOUNT</Typography>
          <Typography variant="h4" sx={{ fontWeight: 1000, color: theme.palette.primary.main, letterSpacing: '-0.02em' }}>₹{parseFloat(order?.total_amount || '0').toFixed(0)}</Typography>
        </Box>
        {!isMobile && (
          <Stack spacing={1.5}>
            {hasNewItems && (
              <Button variant="contained" fullWidth onClick={handleSendToKitchen} sx={{ fontWeight: 950, py: 1.5, borderRadius: '0.65rem', bgcolor: theme.palette.primary.main, boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.2)}`, '&:hover': { bgcolor: '#d66a27' } }}>SEND TO KITCHEN (KOT)</Button>
            )}
            {hasReadyItems && order?.order_type !== 'TAKE_AWAY' && (
              <Button variant="contained" fullWidth onClick={handleServeAllReady} sx={{ fontWeight: 950, py: 1.5, borderRadius: '0.65rem', bgcolor: '#2e7d32', boxShadow: '0 8px 20px rgba(46, 125, 50, 0.2)' }}>SERVE ALL READY</Button>
            )}
            {nextStatus && order?.status !== 'COMPLETED' && (order?.items || []).length > 0 && 
              !(order?.order_type === 'DINE_IN' && nextStatus === 'SERVED') &&
              !(order?.order_type === 'TAKE_AWAY' && hasNewItems) && (
              <Button variant="contained" fullWidth onClick={() => handleUpdateOrderStatus(nextStatus)} sx={{ fontWeight: 950, py: 1.5, borderRadius: '0.65rem', bgcolor: theme.palette.primary.main, boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.2)}`, '&:hover': { bgcolor: '#d66a27' } }}>
                {nextStatus === 'READY' ? 'MARK AS READY' : (nextStatus === 'SERVED' ? 'MARK AS SERVED' : nextStatus.replace('_', ' '))}
              </Button>
            )}
            {order?.status === 'COMPLETED' && !order.invoice && (
              <Button variant="contained" fullWidth onClick={handleGenerateBill} sx={{ fontWeight: 950, py: 1.5, borderRadius: '0.65rem', bgcolor: '#2e7d32', boxShadow: '0 8px 20px rgba(46, 125, 50, 0.2)' }}>GENERATE BILL</Button>
            )}
            {order?.order_type !== 'TAKE_AWAY' && order?.invoice && order?.status !== 'COMPLETED' && (
              <Button variant="contained" fullWidth onClick={() => setCheckoutOpen(true)} sx={{ fontWeight: 950, py: 1.5, borderRadius: '0.65rem', bgcolor: '#6a1b9a', boxShadow: '0 8px 20px rgba(106, 27, 154, 0.2)' }}>PROCEED TO PAYMENT</Button>
            )}
            {(order?.items || []).length > 0 && (
              <Stack direction="row" spacing={1.5}>
                <Button 
                  variant="outlined" 
                  fullWidth 
                  size="small"
                  startIcon={<PrintIcon />}
                  onClick={handlePrintKOT}
                  sx={{ fontWeight: 950, py: 1, borderRadius: '0.65rem', borderColor: theme.palette.primary.main, color: theme.palette.primary.main }}
                >
                  KITCHEN BILL
                </Button>
                {order?.invoice && (
                  <Button 
                    variant="outlined" 
                    fullWidth 
                    size="small"
                    startIcon={<BillIcon />}
                    onClick={handlePrint}
                    sx={{ fontWeight: 950, py: 1, borderRadius: '0.65rem', borderColor: '#2e7d32', color: '#2e7d32' }}
                  >
                    INVOICE BILL
                  </Button>
                )}
              </Stack>
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
          <CircularProgress sx={{ color: theme.palette.primary.main }} />
        </Box>
      );
    }

    if (dialogStage === 'CHOICE') {
      return (
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
          <Container maxWidth="md" sx={{ py: { xs: 4, md: 8 }, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Grid container spacing={4} sx={{ justifyContent: 'center' }}>
              {(!table || (table.current_occupancy || 0) < (table.capacity || 0)) && (
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="overline" sx={{ fontWeight: 950, color: 'text.disabled', mb: 2, display: 'block', letterSpacing: '0.15em' }}>START FRESH</Typography>
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
                      p: 5, height: '100%', minHeight: 220, borderRadius: '0.65rem', border: '2px solid', borderColor: alpha(theme.palette.primary.main, 0.1),
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                      cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', bgcolor: 'white',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.03)',
                      '&:hover': { borderColor: theme.palette.primary.main, transform: 'translateY(-8px)', boxShadow: `0 20px 50px ${alpha(theme.palette.primary.main, 0.12)}` }
                    }}
                  >
                    <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.1), borderRadius: '0.65rem' }}>
                      <AddIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 1000, letterSpacing: '-0.02em' }}>NEW ORDER</Typography>
                  </Paper>
                </Grid>
              )}

              {table?.active_orders && table.active_orders.length > 0 && (
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="overline" sx={{ fontWeight: 950, color: 'text.disabled', mb: 2, display: 'block', letterSpacing: '0.15em' }}>JOIN EXISTING</Typography>
                  <Stack spacing={2.5}>
                    {table.active_orders.map((activeOrd: Order) => (
                      <Paper
                        key={activeOrd.id}
                        onClick={async () => {
                          const data = await restaurantService.getOrder(activeOrd.id);
                          setOrder(data);
                          setDialogStage('ORDER_DETAILS');
                        }}
                        sx={{ 
                          p: 3, border: '2px solid', borderColor: alpha(theme.palette.divider, 0.1), borderRadius: '0.65rem', cursor: 'pointer', transition: 'all 0.2s',
                          bgcolor: 'white',
                          '&:hover': { borderColor: theme.palette.primary.main, bgcolor: alpha(theme.palette.primary.main, 0.02), transform: 'translateX(8px)' } 
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Typography sx={{ fontWeight: 950, fontSize: '1.1rem', mb: 0.5 }}>{activeOrd.customer_name || `Order #${activeOrd.id}`}</Typography>
                            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.disabled', letterSpacing: '0.05em' }}>{activeOrd.number_of_persons} PERSONS • {new Date(activeOrd.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Typography>
                          </Box>
                          <Typography variant="h6" sx={{ fontWeight: 1000, color: theme.palette.primary.main }}>₹{parseFloat(activeOrd.total_amount).toFixed(0)}</Typography>
                        </Box>
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
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
          <Container maxWidth="xs" sx={{ py: 6 }}>
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton onClick={() => setDialogStage('CHOICE')} sx={{ bgcolor: 'white', border: '1px solid', borderColor: alpha(theme.palette.divider, 0.1), borderRadius: '0.65rem' }}><ChevronLeftIcon /></IconButton>
              <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: '-0.02em' }}>Order Setup</Typography>
            </Box>
            <Paper sx={{ p: 4, borderRadius: '0.65rem', border: '1px solid', borderColor: alpha(theme.palette.divider, 0.1), boxShadow: '0 10px 40px rgba(0,0,0,0.03)' }}>
              <Stack spacing={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="overline" sx={{ fontWeight: 950, color: 'text.disabled', letterSpacing: '0.1em' }}>GUEST COUNT</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, mt: 3 }}>
                    <IconButton size="large" onClick={() => setNumberOfPersons(Math.max(1, numberOfPersons - 1))} sx={{ bgcolor: alpha('#000', 0.03), borderRadius: '0.65rem' }}><RemoveIcon /></IconButton>
                    <Typography variant="h2" sx={{ fontWeight: 1000, minWidth: 80 }}>{numberOfPersons}</Typography>
                    <IconButton size="large" onClick={() => setNumberOfPersons(numberOfPersons + 1)} disabled={table ? ((table.current_occupancy || 0) + numberOfPersons) >= table.capacity : false} sx={{ bgcolor: alpha('#000', 0.03), borderRadius: '0.65rem' }}><AddIcon /></IconButton>
                  </Box>
                </Box>
                <Button variant="contained" fullWidth onClick={() => { setOrder(null); setOrderType('DINE_IN'); setDialogStage('ORDER_DETAILS'); }} sx={{ py: 2, borderRadius: '0.65rem', fontWeight: 950, fontSize: '1rem', bgcolor: theme.palette.primary.main, boxShadow: `0 10px 30px ${alpha(theme.palette.primary.main, 0.2)}` }}>START ORDER</Button>
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
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', bgcolor: '#fcfcfc' }}>
              <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: alpha(theme.palette.divider, 0.1), bgcolor: 'white' }}>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                    <TextField 
                      fullWidth 
                      size="small" 
                      placeholder="Search menu items..." 
                      value={searchQuery} 
                      onChange={e => setSearchQuery(e.target.value)} 
                    slotProps={{
                      input: {
                        startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.disabled' }} />,
                        sx: { borderRadius: '0.65rem', fontWeight: 700, bgcolor: alpha('#000', 0.02) }
                      }
                    }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 0.5, '&::-webkit-scrollbar': { height: 4 } }}>
                    <Chip 
                      label="All Items" 
                      onClick={() => setActiveCategory('all')} 
                      sx={{ 
                        fontWeight: 900, 
                        px: 1, 
                        borderRadius: '0.65rem',
                        bgcolor: activeCategory === 'all' ? theme.palette.primary.main : alpha('#000', 0.05),
                        color: activeCategory === 'all' ? 'white' : 'text.secondary',
                        '&:hover': { bgcolor: activeCategory === 'all' ? theme.palette.primary.main : alpha('#000', 0.08) }
                      }} 
                    />
                    {categories.map(cat => (
                      <Chip 
                        key={cat.id} 
                        label={cat.name} 
                        onClick={() => setActiveCategory(cat.id)} 
                        sx={{ 
                          fontWeight: 900, 
                          px: 1, 
                          borderRadius: '0.65rem',
                          bgcolor: activeCategory === cat.id ? theme.palette.primary.main : alpha('#000', 0.05),
                          color: activeCategory === cat.id ? 'white' : 'text.secondary',
                          '&:hover': { bgcolor: activeCategory === cat.id ? theme.palette.primary.main : alpha('#000', 0.08) }
                        }} 
                      />
                    ))}
                  </Box>
                </Stack>
              </Box>
              <Box sx={{ flexGrow: 1, p: { xs: 0, md: 2 }, overflowY: 'auto' }}>
                <Grid container spacing={2}>
                  {filteredItems.map((item: Item) => (
                    <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={item.id}>
                      <Card 
                        elevation={0}
                        onClick={() => setSelectedItemForDetail(item)}
                        sx={{ 
                          borderRadius: '0.65rem', 
                          border: '1px solid', 
                          borderColor: alpha(theme.palette.divider, 0.1), 
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          position: 'relative',
                          overflow: 'hidden',
                          '&:hover': { borderColor: theme.palette.primary.main, boxShadow: '0 8px 24px rgba(0,0,0,0.05)', transform: 'translateY(-4px)' }
                        }}
                      >
                        <CardContent sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                            <Box sx={{ flexGrow: 1, pr: 1 }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#1a1a1a', lineHeight: 1.2, mb: 0.5 }}>{item.name}</Typography>
                              <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.category_name}</Typography>
                            </Box>
                            <Typography variant="h6" sx={{ fontWeight: 1000, color: theme.palette.primary.main }}>₹{parseFloat(item.price).toFixed(0)}</Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <IconButton 
                              size="small" 
                              onClick={(e) => { e.stopPropagation(); handleAddItem(item); }}
                              disabled={loading || Boolean(order?.invoice)}
                              sx={{ 
                                bgcolor: alpha(theme.palette.primary.main, 0.1), 
                                color: theme.palette.primary.main,
                                borderRadius: '0.65rem',
                                p: 1,
                                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) },
                                '&.Mui-disabled': { bgcolor: alpha(theme.palette.divider, 0.1) }
                              }}
                            >
                              {loading ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}
                            </IconButton>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                  {filteredItems.length === 0 && (
                    <Box sx={{ p: 8, textAlign: 'center', width: '100%', opacity: 0.5 }}>
                      <SearchIcon sx={{ fontSize: 48, mb: 2, color: 'text.disabled' }} />
                      <Typography sx={{ fontWeight: 800 }}>No items match your search</Typography>
                    </Box>
                  )}
                </Grid>
              </Box>
            </Box>
          ) : (
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 4, bgcolor: alpha(theme.palette.primary.main, 0.02) }}>
                <Box sx={{ p: 3, bgcolor: 'white', borderRadius: '0.65rem', textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.03)', border: '1px solid', borderColor: alpha(theme.palette.divider, 0.1) }}>
                  <CheckIcon sx={{ fontSize: 64, color: '#2e7d32', mb: 2 }} />
                  <Typography variant="h5" sx={{ fontWeight: 1000, mb: 1 }}>{order?.invoice ? 'Order Finalized' : 'Order Completed'}</Typography>
                  <Typography color="text.secondary" sx={{ fontWeight: 700 }}>This order has been processed and is ready for billing.</Typography>
                </Box>
            </Box>
          )}

          {/* SUMMARY SIDEBAR (DESKTOP) */}
          <Box sx={{ width: { md: '420px' }, borderLeft: '1px solid', borderColor: alpha(theme.palette.divider, 0.1), display: { xs: 'none', md: 'flex' }, flexDirection: 'column', bgcolor: 'white' }}>
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
      top: { xs: 64, md: 0 },
      left: 0,
      right: 0,
      bottom: { xs: 'calc(64px + env(safe-area-inset-bottom))', md: 0 },
      m: 0,
      zIndex: 1050, 
      display: 'flex', 
      flexDirection: 'column', 
      bgcolor: 'white', 
      overflow: 'hidden',
      boxShadow: '0 -10px 40px rgba(0,0,0,0.1)'
    }}>
      <Box sx={{ 
        px: 2.5, 
        py: 1.5, 
        borderBottom: '1px solid', 
        borderColor: alpha(theme.palette.divider, 0.1),
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        bgcolor: 'white', 
        zIndex: 10 
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton 
            onClick={onClose} 
            sx={{ 
              bgcolor: alpha('#000', 0.03), 
              borderRadius: '0.65rem',
              '&:hover': { bgcolor: alpha('#000', 0.05) }
            }}
          >
            <ChevronLeftIcon />
          </IconButton>
          <Box>
            <Typography variant={isMobile ? "subtitle1" : "h6"} sx={{ fontWeight: 1000, lineHeight: 1.2, letterSpacing: '-0.01em' }}>
              {table?.number ? `Table ${table.number}` : 'Order Detail'}
            </Typography>
            {order && <Typography variant="caption" sx={{ fontWeight: 850, color: 'text.disabled', letterSpacing: '0.05em' }}>ORDER #{order.id}</Typography>}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {order && order.order_type === 'DINE_IN' && !order.invoice && (
            <Tooltip title="Move Order">
              <IconButton 
                onClick={() => {
                  setMovePersons(order.number_of_persons);
                  setMoveTableOpen(true);
                }}
                sx={{ 
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                  borderRadius: '0.65rem',
                  '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.15) }
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
        <Box sx={{ borderBottom: '1px solid', borderColor: alpha(theme.palette.divider, 0.1), bgcolor: alpha(theme.palette.primary.main, 0.01), display: 'flex', alignItems: 'center' }}>
          {activeOrders.length > 0 && (
            <Tabs
              value={selectedOrderId || false}
              onChange={(_, val) => handleTabChange(val)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                flexGrow: 1,
                minHeight: 52,
                '& .MuiTabs-indicator': { height: 3, borderRadius: '0.65rem 0.65rem 0 0', bgcolor: theme.palette.primary.main },
                '& .MuiTab-root': {
                  fontWeight: 900,
                  fontSize: '0.85rem',
                  minHeight: 52,
                  textTransform: 'none',
                  px: 3,
                  color: 'text.disabled',
                  '&.Mui-selected': { color: theme.palette.primary.main }
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
                <Box sx={{ height: 24, width: '1px', bgcolor: alpha(theme.palette.divider, 0.1), mx: 1 }} />
              )}
              <Button 
                onClick={() => handleTabChange(null)}
                startIcon={<AddIcon sx={{ fontSize: 20 }} />}
                sx={{ 
                  height: 52, 
                  px: 4, 
                  borderRadius: 0,
                  fontWeight: 1000,
                  fontSize: '0.85rem',
                  color: selectedOrderId === null ? theme.palette.primary.main : 'text.disabled',
                  borderBottom: selectedOrderId === null ? '3px solid' : 'none',
                  borderColor: theme.palette.primary.main,
                  bgcolor: selectedOrderId === null ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
                  textTransform: 'none',
                  whiteSpace: 'nowrap',
                  '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) }
                }}
              >
                NEW ORDER
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
              sx: { borderTopLeftRadius: '32px', borderTopRightRadius: '32px', height: '80vh', zIndex: 1400, boxShadow: '0 -10px 40px rgba(0,0,0,0.1)' }
            }
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', pb: 'env(safe-area-inset-bottom, 24px)' }}>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
              <Box sx={{ width: 48, height: 6, bgcolor: alpha('#000', 0.1), borderRadius: '0.65rem' }} />
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
        <div id="thermal-kot-container">
          {order && <KOTPrint order={order} items={order.items || []} store={activeStore} />}
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
        slotProps={{ paper: { sx: { borderRadius: '0.65rem', p: 1 } } }}
      >
        <DialogTitle sx={{ fontWeight: 1000, pb: 1, fontSize: '1.5rem', letterSpacing: '-0.02em' }}>Move Order</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4, fontWeight: 700 }}>
            Transferring Order #{order?.id} from Table {table?.number}
          </Typography>
          
          <Box sx={{ mb: 5 }}>
             <Typography variant="overline" sx={{ fontWeight: 950, color: 'text.disabled', display: 'block', mb: 2, letterSpacing: '0.1em' }}>GUEST COUNT</Typography>
             <Stack direction="row" spacing={3} sx={{ alignItems: 'center', justifyContent: 'center' }}>
                <IconButton size="large" onClick={() => setMovePersons((p: number) => Math.max(1, p - 1))} sx={{ bgcolor: alpha('#000', 0.03), borderRadius: '0.65rem' }}><RemoveIcon /></IconButton>
                <Typography variant="h3" sx={{ fontWeight: 1000, minWidth: 60, textAlign: 'center' }}>{movePersons}</Typography>
                <IconButton size="large" onClick={() => setMovePersons((p: number) => p + 1)} sx={{ bgcolor: alpha('#000', 0.03), borderRadius: '0.65rem' }}><AddIcon /></IconButton>
             </Stack>
          </Box>

          <Typography variant="overline" sx={{ fontWeight: 950, color: 'text.disabled', display: 'block', mb: 2, letterSpacing: '0.1em' }}>SELECT TARGET TABLE</Typography>
          <Box 
            sx={{ 
              display: 'flex', 
              gap: 1.5, 
              overflowX: 'auto', 
              pb: 2, 
              pt: 0.5,
              '&::-webkit-scrollbar': { height: 6 },
              '&::-webkit-scrollbar-thumb': { bgcolor: alpha(theme.palette.primary.main, 0.2), borderRadius: '0.65rem' }
            }}
          >
            {allTables
              .filter((t: RestaurantTable) => t.id !== table?.id && t.is_active)
              .sort((a: RestaurantTable, b: RestaurantTable) => (parseInt(a.number) || 0) - (parseInt(b.number) || 0))
              .map((t: RestaurantTable) => {
                const availableCapacity = t.capacity - (t.current_occupancy || 0);
                const hasCapacity = availableCapacity >= movePersons;
                const isSelected = selectedTargetTable?.id === t.id;
                
                return (
                  <Paper
                    key={t.id}
                    elevation={0}
                    onClick={() => hasCapacity && setSelectedTargetTable(t)}
                    sx={{
                      flexShrink: 0,
                      minWidth: 100,
                      p: 2,
                      borderRadius: '0.65rem',
                      border: '2px solid',
                      borderColor: isSelected ? theme.palette.primary.main : (hasCapacity ? alpha(theme.palette.divider, 0.1) : alpha(theme.palette.error.main, 0.1)),
                      cursor: hasCapacity ? 'pointer' : 'not-allowed',
                      opacity: hasCapacity ? 1 : 0.6,
                      bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.05) : 'white',
                      transition: 'all 0.2s',
                      textAlign: 'center',
                      '&:hover': hasCapacity ? { borderColor: theme.palette.primary.main, transform: 'translateY(-4px)' } : {}
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 1000, color: hasCapacity ? '#1a1a1a' : 'text.disabled' }}>T{t.number}</Typography>
                    <Typography variant="caption" sx={{ display: 'block', fontWeight: 800, color: hasCapacity ? theme.palette.primary.main : 'error.main' }}>{t.current_occupancy || 0}/{t.capacity}</Typography>
                  </Paper>
                );
              })}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0, gap: 2 }}>
          <Button onClick={() => setMoveTableOpen(false)} sx={{ fontWeight: 900, color: 'text.disabled' }}>CANCEL</Button>
          <Button variant="contained" disabled={!selectedTargetTable || moving} onClick={() => setMoveFinalConfirmOpen(true)} sx={{ fontWeight: 950, borderRadius: '0.65rem', px: 4, py: 1.5, bgcolor: theme.palette.primary.main, boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.2)}` }}>MOVE ORDER</Button>
        </DialogActions>
      </Dialog>

      {/* MOVE FINAL CONFIRMATION DIALOG */}
      <Dialog
        open={moveFinalConfirmOpen}
        onClose={() => setMoveFinalConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '0.65rem', p: 2 } } }}
      >
        <DialogTitle sx={{ fontWeight: 1000, textAlign: 'center', fontSize: '1.5rem' }}>Confirm Move</DialogTitle>
        <DialogContent sx={{ textAlign: 'center' }}>
          <Typography variant="body1" sx={{ mb: 3, fontWeight: 700 }}>
            Are you sure you want to transfer this order?
          </Typography>
          <Box sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05), p: 3, borderRadius: '0.65rem', mb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 1000, color: theme.palette.primary.main }}>
              Table {table?.number} → Table {selectedTargetTable?.number}
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Order #{order?.id} • {movePersons} Guests
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3, gap: 3 }}>
          <Button onClick={() => setMoveFinalConfirmOpen(false)} sx={{ fontWeight: 900, color: 'text.disabled' }}>CANCEL</Button>
          <Button 
            variant="contained" 
            onClick={handleMoveTable}
            disabled={moving}
            sx={{ fontWeight: 950, borderRadius: '0.65rem', px: 6, py: 1.5, bgcolor: theme.palette.primary.main }}
          >
            {moving ? <CircularProgress size={24} color="inherit" /> : 'YES, MOVE IT'}
          </Button>
        </DialogActions>
      </Dialog>


      {/* ITEM DETAIL DIALOG */}
      <Dialog
        open={Boolean(selectedItemForDetail)}
        onClose={() => setSelectedItemForDetail(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: '0.65rem', overflow: 'hidden' } } }}
      >
        {selectedItemForDetail && (
          <>
            <Box sx={{ position: 'relative' }}>
              {selectedItemForDetail.image ? (
                <Box sx={{ width: '100%', height: 240 }}>
                  <img 
                    src={getImageUrl(selectedItemForDetail.image)} 
                    alt={selectedItemForDetail.name} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                </Box>
              ) : (
                <Box sx={{ width: '100%', height: 160, bgcolor: alpha(theme.palette.primary.main, 0.05), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FoodIcon sx={{ fontSize: 64, color: alpha(theme.palette.primary.main, 0.2) }} />
                </Box>
              )}
              <IconButton 
                onClick={() => setSelectedItemForDetail(null)} 
                sx={{ position: 'absolute', right: 16, top: 16, bgcolor: 'rgba(255,255,255,0.8)', '&:hover': { bgcolor: 'white' } }}
              >
                <ChevronLeftIcon sx={{ transform: 'rotate(-90deg)' }} />
              </IconButton>
            </Box>
            <DialogContent sx={{ pt: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 1000, letterSpacing: '-0.02em', mb: 0.5 }}>{selectedItemForDetail.name}</Typography>
                  <Chip label={selectedItemForDetail.category_name} size="small" sx={{ fontWeight: 900, bgcolor: alpha('#000', 0.05) }} />
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 1000, color: theme.palette.primary.main }}>₹{parseFloat(selectedItemForDetail.price).toFixed(0)}</Typography>
              </Box>
              <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600, lineHeight: 1.6 }}>
                {selectedItemForDetail.description || 'No description available for this item.'}
              </Typography>
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
              <Button 
                fullWidth 
                variant="contained" 
                onClick={() => { handleAddItem(selectedItemForDetail); setSelectedItemForDetail(null); }} 
                sx={{ py: 2, borderRadius: '0.65rem', fontWeight: 950, fontSize: '1rem', bgcolor: theme.palette.primary.main }}
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
