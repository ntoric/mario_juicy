"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  TextField,
  IconButton,
  Paper,
  Autocomplete,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Stack,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Alert,
  Chip,
  Card,
  CardContent,
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
  ShoppingBag as ShoppingBagIcon,
  LockOpen as LockOpenIcon,
  Close as CloseIcon,
  CompareArrows as MoveIcon,
  Block as BlockIcon,
  ChevronLeft as ChevronLeftIcon,
} from '@mui/icons-material';
import {
  restaurantService,
  Order,
  OrderItem,
  Table as RestaurantTable
} from '@/services/restaurantService';
import { itemService, Item, Category } from '@/services/itemService';
import { OrderStatusChip, ItemStatusChip } from './StatusChips';
import CheckoutDialog from './CheckoutDialog';
import InvoicePrint from './InvoicePrint';
import { useAuth } from '@/hooks/useAuth';
import InvoicePreviewDialog from './InvoicePreviewDialog';
import { 
  Download as DownloadIcon, 
  Visibility as PreviewIcon,
} from '@mui/icons-material';
import ReactDOM from 'react-dom';

const DINE_IN_STATUS_FLOW: Order['status'][] = [
  'ORDER_TAKEN', 'AWAITING', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'PAID'
];

const TAKE_AWAY_STATUS_FLOW: Order['status'][] = [
  'ORDER_TAKEN', 'PREPARING', 'READY', 'SERVED', 'PAID'
];

const DINE_IN_STATUS_FLOW_NO_KITCHEN: Order['status'][] = [
  'ORDER_TAKEN', 'PREPARING', 'SERVED', 'COMPLETED', 'PAID'
];

const TAKE_AWAY_STATUS_FLOW_NO_KITCHEN: Order['status'][] = [
  'ORDER_TAKEN', 'PREPARING', 'READY', 'SERVED', 'PAID'
];


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
  const [dialogStage, setDialogStage] = useState<'CHOICE' | 'NEW_ORDER_SETUP' | 'ORDER_DETAILS'>('CHOICE');
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [totalsExpanded, setTotalsExpanded] = useState(false);

  // Cancellation
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');


  useEffect(() => {
    if (open) {
      fetchData();
    } else {
      setOrder(null);
      setError(null);
      setActiveCategory('all');
      setSearchQuery('');
      setOrderType(table ? 'DINE_IN' : 'TAKE_AWAY');
      setCustomerName('');
      setCustomerMobile('');
      setNumberOfPersons(1);
      
      // Feature Toggle: Skip CHOICE stage if takeaway is disabled and no orders to join
      if (open && !initialOrder && table) {
        const canJoin = table.active_orders && table.active_orders.length > 0;
        const takeawayEnabled = activeStore?.is_take_away_enabled !== false; // default true
        
        if (!takeawayEnabled && !canJoin) {
          setDialogStage('NEW_ORDER_SETUP');
        } else {
          setDialogStage('CHOICE');
        }
      } else if (open && !initialOrder && !table) {
        // If no table and takeaway disabled, this shouldn't happen via UI but let's be safe
        setDialogStage('CHOICE');
      } else {
        setDialogStage('CHOICE');
      }
    }

  }, [open, table, initialOrder]);

  const renderContent = () => {
    // Show error alert at the top of the content area if present
    const errorAlert = error && (
      <Box sx={{ p: 2, bgcolor: '#fff5f5' }}>
        <Alert 
          severity="error" 
          variant="filled"
          sx={{ borderRadius: '8px', fontWeight: 700 }} 
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
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
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {errorAlert}
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: { xs: 4, md: 8 }, px: 2, overflowY: 'auto' }}>
            <Box sx={{ p: 4, bgcolor: 'white', borderRadius: '16px', border: '1px solid #e8e4d8', textAlign: 'center', maxWidth: 500, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
              <Box sx={{ mb: 4 }}>
                <Typography variant="h5" sx={{ fontWeight: 900, mb: 1, color: 'text.primary' }}>
                  {table ? `Table ${table.number}` : 'New Order'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  How would you like to proceed?
                </Typography>
              </Box>

              <Stack spacing={2}>
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  startIcon={(table && typeof table.current_occupancy === 'number' && table.current_occupancy >= table.capacity) ? <BlockIcon /> : <AddIcon />}
                  onClick={() => {
                    if (table) {
                      setDialogStage('NEW_ORDER_SETUP');
                    } else if (activeStore?.is_take_away_enabled !== false) {
                      handleCreateOrder('TAKE_AWAY');
                    } else {
                      setError('Parcel orders are currently disabled.');
                    }
                  }}
                  disabled={Boolean(table && typeof table.current_occupancy === 'number' && table.current_occupancy >= table.capacity)}
                  sx={{ 
                    py: 2.5, 
                    borderRadius: '12px', 
                    fontWeight: 900, 
                    fontSize: '1.1rem', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    '&.Mui-disabled': {
                        bgcolor: 'rgba(0,0,0,0.05)',
                        color: 'text.disabled'
                    }
                  }}
                >
                  {table && typeof table.current_occupancy === 'number' && table.current_occupancy >= table.capacity 
                    ? 'TABLE CAPACITY REACHED' 
                    : 'START NEW ORDER'}
                </Button>

                {table?.active_orders && table.active_orders.length > 0 && (
                  <>
                    <Divider sx={{ my: 2 }}>
                      <Typography variant="caption" sx={{ fontWeight: 900, color: 'text.disabled', letterSpacing: '0.1em' }}>OR JOIN EXISTING</Typography>
                    </Divider>

                    <Stack spacing={1.5}>
                      {table.active_orders.map((activeOrd) => (
                        <Paper
                          key={activeOrd.id}
                          elevation={0}
                          onClick={async () => {
                            setLoading(true);
                            try {
                              const data = await restaurantService.getOrder(activeOrd.id);
                              setOrder(data);
                              setDialogStage('ORDER_DETAILS');
                            } catch (e) {
                              setError('Failed to load order');
                            } finally {
                              setLoading(false);
                            }
                          }}
                          sx={{
                            p: 2,
                            border: '2px solid #e8e4d8',
                            borderRadius: '12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': {
                              borderColor: 'primary.main',
                              bgcolor: '#fdfceb',
                              transform: 'scale(1.02)'
                            }
                          }}
                        >
                          <Box sx={{ textAlign: 'left' }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: 'primary.dark' }}>
                              {activeOrd.customer_name ? activeOrd.customer_name : `Order #${activeOrd.id}`}
                            </Typography>
                            <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.7 }}>
                              {activeOrd.waiter_name} • ₹{activeOrd.total_amount} • {activeOrd.number_of_persons} Persons
                            </Typography>
                          </Box>
                          {!(activeOrd.status === 'ORDER_TAKEN' && (activeOrd as any).item_count === 0) && (
                            <OrderStatusChip
                              status={activeOrd.status}
                              orderType={activeOrd.order_type}
                              sx={{ fontWeight: 900, borderRadius: '4px' }}
                            />
                          )}
                        </Paper>
                      ))}
                    </Stack>
                  </>
                )}
              </Stack>
            </Box>
          </Box>
        </Box>
      );
    }

    if (dialogStage === 'NEW_ORDER_SETUP') {
      return (
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {errorAlert}
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: { xs: 4, md: 8 }, px: 2 }}>
            <Box sx={{ p: 4, bgcolor: 'white', borderRadius: '16px', border: '1px solid #e8e4d8', textAlign: 'center', maxWidth: 400, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
              
              <Box sx={{ mb: 4, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton onClick={() => setDialogStage('CHOICE')} sx={{ color: 'text.secondary' }}>
                  <ChevronLeftIcon />
                </IconButton>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>Order Setup</Typography>
              </Box>

              <Stack spacing={3}>
                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1, ml: 0.5 }}>NUMBER OF PERSONS</Typography>
                  <TextField
                    fullWidth
                    type="number"
                    value={numberOfPersons}
                    onChange={(e) => setNumberOfPersons(Math.max(1, parseInt(e.target.value) || 1))}
                    slotProps={{
                      input: {
                        inputProps: { 
                          min: 1, 
                          max: (table && typeof table.capacity === 'number') 
                            ? (table.capacity - (table.current_occupancy || 0)) 
                            : 100 
                        }
                      }
                    }}
                    helperText={table ? `Maximum new guests for Table ${table.number} is ${table.capacity - (table.current_occupancy || 0)}.` : ""}
                    sx={{ bgcolor: '#f9f9f9', '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                  />
                </Box>

                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  onClick={() => handleCreateOrder('DINE_IN')}
                  disabled={loading}
                  sx={{ py: 2, borderRadius: '12px', fontWeight: 900, fontSize: '1.1rem' }}
                >
                  {loading ? 'CREATING...' : 'CREATE ORDER'}
                </Button>
              </Stack>
            </Box>
          </Box>
        </Box>
      );
    }

    if (dialogStage === 'ORDER_DETAILS' && order) {
      return (
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          flexGrow: 1,
          height: '100%',
          overflow: 'hidden'
        }}>
          {/* MENU GRID (Top on Mobile) */}
          {!['COMPLETED', 'PAID', 'CANCELLED', 'RETURNED'].includes(order.status) && !order.invoice ? (
            <Box sx={{ 
              flexGrow: 1, 
              display: 'flex', 
              flexDirection: 'column', 
              height: '100%',
              order: { xs: 1, md: 2 },
              overflow: 'hidden'
            }}>
              {/* Category & Search Header */}
              <Box sx={{ p: 2, bgcolor: 'white', borderBottom: '1px solid #e8e4d8' }}>
                <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                  <Grid size={{ xs: 12, sm: 'auto' }}>
                    <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 0.5, '::-webkit-scrollbar': { height: 0 } }}>
                      <Button
                        size="small"
                        variant={activeCategory === 'all' ? 'contained' : 'outlined'}
                        onClick={() => setActiveCategory('all')}
                        sx={{ borderRadius: '8px', whiteSpace: 'nowrap', minWidth: 80, fontWeight: 800 }}
                      >
                        All Items
                      </Button>
                      {categories.map(cat => (
                        <Button
                          key={cat.id}
                          size="small"
                          variant={activeCategory === cat.id ? 'contained' : 'outlined'}
                          onClick={() => setActiveCategory(cat.id)}
                          sx={{ borderRadius: '8px', whiteSpace: 'nowrap', fontWeight: 800 }}
                        >
                          {cat.name}
                        </Button>
                      ))}
                    </Stack>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 'grow' }}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Search menu..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      slotProps={{
                        input: {
                          startAdornment: <SearchIcon sx={{ color: 'text.disabled', mr: 1 }} />,
                          sx: { borderRadius: '8px', bgcolor: '#f5f5f5' }
                        }
                      }}
                    />
                  </Grid>
                </Grid>
              </Box>

              {/* Items Grid */}
              <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto', bgcolor: '#fdfdfd' }}>
                <Grid container spacing={1.5}>
                  {filteredItems.map(item => (
                    <Grid size={{ xs: 6, sm: 4, lg: 3 }} key={item.id}>
                      <Card
                        onClick={() => handleAddItem(item)}
                        sx={{
                          height: '100%',
                          cursor: 'pointer',
                          border: '1px solid #e8e4d8',
                          borderRadius: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          '&:active': { transform: 'scale(0.96)' },
                          transition: 'transform 0.1s, box-shadow 0.2s',
                          position: 'relative',
                          overflow: 'hidden',
                          '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }
                        }}
                      >
                        {item.image && (
                          <Box
                            sx={{
                              height: 100,
                              backgroundImage: `url(${item.image})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              borderBottom: '1px solid #e8e4d8'
                            }}
                          />
                        )}
                        <CardContent sx={{ p: 1.5, flexGrow: 1, '&:last-child': { pb: 1.5 } }}>
                          <Typography variant="body2" sx={{ fontWeight: 800, lineHeight: 1.2, mb: 0.5, height: '2.4em', overflow: 'hidden' }}>
                            {item.name}
                          </Typography>
                          <Typography variant="subtitle2" sx={{ fontWeight: 900, color: 'primary.main' }}>
                            ₹{item.price}
                          </Typography>
                        </CardContent>
                        <Box sx={{ position: 'absolute', bottom: 8, right: 8 }}>
                          <Box sx={{ 
                            bgcolor: 'primary.main', 
                            color: 'white', 
                            width: 28, height: 28, 
                            borderRadius: '50%', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 2px 6px rgba(233,118,43,0.3)'
                          }}>
                            <AddIcon sx={{ fontSize: 18 }} />
                          </Box>
                        </Box>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Box>
          ) : (
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', p: 4, bgcolor: '#f8fafc', order: { xs: 1, md: 2 } }}>
              <Box sx={{ p: 4, bgcolor: 'white', borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', textAlign: 'center', maxWidth: 400 }}>
                <Typography variant="h5" sx={{ fontWeight: 900, mb: 1, color: order.invoice ? 'primary.main' : 'success.main' }}>
                  {order.invoice ? 'Order Finalized' : 'Order Completed'}
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  {order.invoice 
                    ? 'The bill has been generated and the order is locked. No further modifications can be made.' 
                    : 'All items have been served. Proceed to checkout to generate the final bill and close the table.'}
                </Typography>
                {!order.invoice && order.order_type !== 'DINE_IN' && (
                  <Button 
                    variant="contained" 
                    color="success" 
                    size="large" 
                    fullWidth 
                    onClick={handleGenerateBill}
                    sx={{ fontWeight: 900, py: 1.5, borderRadius: 2, boxShadow: '0 4px 12px rgba(46,125,50,0.2)' }}
                    startIcon={<BillIcon />}
                  >
                    GENERATE BILL
                  </Button>
                )}
              </Box>
            </Box>
          )}
          {/* LEFT/BOTTOM: Order Summary (Ticket Style) */}
          <Box sx={{
            width: { xs: '100%', md: '400px' },
            borderRight: { md: '1px solid #e2e8f0' },
            borderTop: { xs: 'none', md: 'none' },
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'white',
            height: { xs: 'auto', md: '100%' },
            position: { xs: 'relative', md: 'static' },
            zIndex: 100,
            boxShadow: { xs: '0 -4px 20px rgba(0,0,0,0.08)', md: 'none' },
            order: { xs: 2, md: 1 }
          }}>
            <Box 
              sx={{ 
                p: 2, 
                borderBottom: '1px solid #e8e4d8', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                cursor: { xs: 'pointer', md: 'default' },
                bgcolor: isMobile ? '#fdfceb' : 'white'
              }}
              onClick={() => isMobile && setSummaryExpanded(!summaryExpanded)}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {table && table.active_orders && table.active_orders.length > 0 && (
                  <IconButton 
                    size="small" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setOrder(null);
                      setDialogStage('CHOICE');
                      onOrderUpdated();
                    }}
                    sx={{ mr: 1, bgcolor: '#f0f0f0', '&:hover': { bgcolor: '#e0e0e0' } }}
                    title="Back to Group List"
                  >
                    <ChevronLeftIcon fontSize="small" />
                  </IconButton>
                )}
                <Typography variant="subtitle2" sx={{ fontWeight: 900, color: 'text.primary', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 1 }}>
                  ORDER DETAILS
                  {isMobile && (
                    <Box sx={{ width: 32, height: 4, bgcolor: 'rgba(0,0,0,0.1)', borderRadius: 2, ml: 2, display: 'none' }} />
                  )}
                </Typography>
                {isMobile && (
                  <IconButton size="small" sx={{ p: 0, ml: 0.5 }}>
                    {summaryExpanded ? <RemoveIcon sx={{ fontSize: 18 }} /> : <AddIcon sx={{ fontSize: 18 }} />}
                  </IconButton>
                )}
              </Box>
              <Chip label={`${order.items.length} Items`} size="small" sx={{ fontWeight: 800, borderRadius: '4px', bgcolor: 'primary.main', color: 'white' }} />
            </Box>

            {errorAlert}
            
            {order.status === 'CANCELLED' && (
              <Box sx={{ px: 2, mb: 2 }}>
                <Alert 
                  severity="error" 
                  variant="filled"
                  icon={<DeleteIcon />}
                  sx={{ borderRadius: 2, fontWeight: 700 }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>ORDER CANCELLED</Typography>
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                    REASON: {order.notes?.replace('CANCELLED: ', '') || 'No reason specified'}
                  </Typography>
                </Alert>
              </Box>
            )}

            <Box sx={{ 
              flexGrow: 1, 
              overflow: 'auto', 
              p: 0,
              display: isMobile && !summaryExpanded ? 'none' : 'block',
              maxHeight: { xs: '30vh', md: 'none' }
            }}>
              {order.items.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center', opacity: 0.5 }}>
                  <Typography variant="body2">No items added to order</Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableBody>
                      {order.items.map((item) => (
                        <TableRow key={item.id} sx={{ '&:last-child td': { border: 0 } }}>
                          <TableCell sx={{ py: 1.5, pl: 2 }}>
                            <Typography variant="body2" sx={{ fontWeight: 800 }}>{item.item_details.name}</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                              <ItemStatusChip
                                status={item.status}
                                orderType={order.order_type}
                                sx={{ fontSize: '0.65rem', height: 18, borderRadius: '2px' }}
                              />

                              {item.notes === 'ADD-ON' && (
                                <Chip label="ADD-ON" size="small" sx={{ height: 16, fontSize: '0.55rem', fontWeight: 900, bgcolor: 'warning.light', color: 'warning.dark' }} />
                              )}
                              <Typography variant="caption" color="text.secondary">₹{item.price}</Typography>
                            </Box>
                            {item.rejection_note && (
                              <Typography variant="caption" color="error" sx={{ fontWeight: 700, mt: 0.5, display: 'block' }}>
                                Reject Note: {item.rejection_note}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="right" sx={{ py: 1.5 }}>
                            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
                              {item.status === 'ORDERED' && !(order.order_type === 'TAKE_AWAY' && order.invoice) && order.status !== 'CANCELLED' ? (
                                <>
                                  <IconButton size="small" onClick={() => handleUpdateItemQuantity(item, -1)} sx={{ border: '1px solid #e8e4d8', p: 0.5, borderRadius: '4px' }}>
                                    <RemoveIcon sx={{ fontSize: 14 }} />
                                  </IconButton>
                                  <Typography sx={{ minWidth: 20, textAlign: 'center', fontWeight: 800 }}>{item.quantity}</Typography>
                                  <IconButton size="small" onClick={() => handleUpdateItemQuantity(item, 1)} sx={{ border: '1px solid #e8e4d8', p: 0.5, borderRadius: '4px' }}>
                                    <AddIcon sx={{ fontSize: 14 }} />
                                  </IconButton>
                                </>
                              ) : (
                                <Typography sx={{ fontWeight: 800 }}>×{item.quantity}</Typography>
                              )}
                            </Stack>
                          </TableCell>
                          <TableCell align="right" sx={{ py: 1.5, pr: 2, fontWeight: 800 }}>
                            ₹{(parseFloat(item.price) * item.quantity).toFixed(0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>

            {/* Order Footer (Sticky) */}
            <Box sx={{ 
              p: { xs: 2, md: 3 },
              pb: isMobile ? { xs: '80px', md: 3 } : { md: 3 }, // Added padding for bottom navigation
              borderTop: '2px dashed #e8e4d8', 
              bgcolor: '#FCF9EA',
              position: { xs: 'sticky', md: 'static' },
              bottom: 0,
              zIndex: 110
            }}>
              {(!isMobile || totalsExpanded) && (
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Subtotal</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>₹{order.total_amount}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>Persons</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>{order.number_of_persons}</Typography>
                  </Box>
                  <Divider sx={{ my: 1.5, borderStyle: 'dotted' }} />
                </Box>
              )}
              
              <Box 
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  mb: 2, 
                  alignItems: 'center',
                  cursor: isMobile ? 'pointer' : 'default'
                }}
                onClick={() => isMobile && setTotalsExpanded(!totalsExpanded)}
              >
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                    Total 
                    {isMobile && !summaryExpanded && (
                      <Chip label={`${order.items.length} Items`} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800, borderRadius: '4px' }} />
                    )}
                    {isMobile && (totalsExpanded ? <RemoveIcon sx={{ fontSize: 16, opacity: 0.5 }} /> : <AddIcon sx={{ fontSize: 16, opacity: 0.5 }} />)}
                  </Typography>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 900, color: 'primary.main' }}>₹{order.total_amount}</Typography>
              </Box>

              <Stack direction="row" spacing={1} sx={{ width: '100%', flexWrap: 'wrap', gap: 1 }}>
                {hasNewItems && (order.order_type !== 'TAKE_AWAY' || order.invoice) && (
                  <Button
                    variant="contained"
                    color="warning"
                    startIcon={<KitchenIcon />}
                    onClick={handleSendToKitchen}
                    disabled={!canTakeOrder || (order.items.length === 0)}
                    sx={{ fontWeight: 900, borderRadius: '8px', py: 1.5, flex: 1, minWidth: isMobile ? '120px' : 'auto', boxShadow: '0 4px 12px rgba(233,118,43,0.2)' }}
                  >
                    KOT
                  </Button>
                )}
                
                {hasReadyItems && order.order_type !== 'TAKE_AWAY' && (
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<NextIcon />}
                    onClick={handleServeAllReady}
                    sx={{ fontWeight: 900, borderRadius: '8px', py: 1.5, flex: 2, minWidth: isMobile ? '160px' : 'auto', boxShadow: '0 4px 12px rgba(46,125,50,0.2)' }}
                  >
                    SERVE
                  </Button>
                )}

                {nextStatus && (order.order_type === 'DINE_IN' || (nextStatus !== 'PAID' && !['READY', 'SERVED'].includes(order.status) && (order.order_type !== 'TAKE_AWAY' || order.invoice))) && 
                 !(isRole('STAFF') && nextStatus === 'PREPARING') &&
                 !(nextStatus === 'SERVED' && hasReadyItems) &&
                 !(nextStatus === 'PAID' && order.order_type === 'DINE_IN') && 
                 !(nextStatus === 'COMPLETED' && (hasNewItems || hasReadyItems || hasIncompleteItems)) && (
                   <Button
                    variant="contained"
                    color={nextStatus === 'COMPLETED' ? 'success' : 'primary'}
                    endIcon={<NextIcon />}
                    onClick={() => handleUpdateOrderStatus(nextStatus)}
                    disabled={order.items.length === 0}
                    sx={{ fontWeight: 900, borderRadius: '8px', py: 1.5, flex: 1.5, minWidth: isMobile ? '140px' : 'auto' }}
                  >
                    {order.order_type === 'TAKE_AWAY' && (nextStatus === 'READY' || nextStatus === 'SERVED') 
                      ? 'READY' 
                      : (nextStatus === 'SERVED' ? 'SERVE' : (isMobile ? nextStatus.split('_')[0] : `MARK AS ${nextStatus.replace('_', ' ')}`))}
                  </Button>
                )}

                {order.status === 'COMPLETED' && !order.invoice && order.order_type === 'DINE_IN' && (
                  <Button
                    variant="contained"
                    color="success"
                    fullWidth
                    startIcon={<BillIcon />}
                    onClick={handleGenerateBill}
                    sx={{ fontWeight: 900, borderRadius: '8px', py: 1.5, flex: 2 }}
                  >
                    CHECKOUT
                  </Button>
                )}

                {/* Parcel Specific Flow Buttons - Hide Generate Bill if already ready to simplify to PAID/RETURN only */}
                {order.order_type === 'TAKE_AWAY' && !order.invoice && (order.items.length > 0) && !['READY', 'SERVED'].includes(order.status) && (
                  <Button
                    variant="contained"
                    color="info"
                    startIcon={<BillIcon />}
                    onClick={handleGenerateBill}
                    sx={{ fontWeight: 900, borderRadius: '8px', py: 1.5, flex: 2 }}
                  >
                    GENERATE BILL
                  </Button>
                )}

                {((order.status === 'COMPLETED' && order.order_type === 'TAKE_AWAY') || (order.order_type === 'TAKE_AWAY' && ['READY', 'SERVED'].includes(order.status))) && (
                  <Button
                    variant="contained"
                    color="secondary"
                    fullWidth
                    startIcon={<BasketIcon />}
                    onClick={() => setCheckoutOpen(true)}
                    disabled={!canManagePayment}
                    sx={{ fontWeight: 900, borderRadius: '8px', py: 1.5, color: '#2c1810', flex: 2, display: isRole('STAFF') && order.status === 'COMPLETED' ? 'none' : 'flex' }}
                  >
                    {order.invoice ? 'PAYMENT' : (order.order_type === 'TAKE_AWAY' ? 'PAID' : 'CHECKOUT')}
                  </Button>
                )}

                {/* Return Order / Move Table - Secondary Actions */}
                <Box sx={{ display: 'flex', gap: 1, width: '100%', mt: 1 }}>
                  {order.order_type === 'TAKE_AWAY' && ['READY', 'SERVED', 'ORDER_TAKEN', 'AWAITING', 'PREPARING'].includes(order.status) && (
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<DeleteIcon />}
                      onClick={() => {
                        setCancelReason('');
                        setCancelDialogOpen(true);
                      }}
                      sx={{ fontWeight: 800, flex: 1, borderRadius: '8px', py: 1, border: '1px solid rgba(207,15,15,0.2)', '&:hover': { border: '1px solid #CF0F0F' } }}
                    >
                      CANCEL ORDER
                    </Button>
                  )}

                  {order.order_type === 'DINE_IN' && !['PAID', 'CANCELLED', 'RETURNED', 'COMPLETED'].includes(order.status) && (
                    <Button
                      variant="outlined"
                      color="secondary"
                      size="small"
                      startIcon={<MoveIcon />}
                      onClick={() => {
                        setMovePersons(order.number_of_persons || 1);
                        setMoveTableOpen(true);
                      }}
                      sx={{ fontWeight: 800, flex: 1, borderRadius: '8px', py: 1, color: 'text.primary', border: '1px solid rgba(0,0,0,0.1)' }}
                    >
                      MOVE TABLE
                    </Button>
                  )}
                </Box>

                {order.invoice && (
                  <Stack direction="row" spacing={1} sx={{ width: '100%', mt: 1 }}>
                    <Button
                      variant="outlined"
                      color="secondary"
                      onClick={() => setPreviewOpen(true)}
                      sx={{ fontWeight: 800, borderRadius: '8px', flex: 1, py: 1, color: 'text.primary' }}
                    >
                      PREVIEW
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<BillIcon />}
                      onClick={() => {
                        setInvoice(order.invoice);
                        setTimeout(handlePrint, 100);
                      }}
                      sx={{ fontWeight: 900, borderRadius: '8px', flex: 2, py: 1 }}
                    >
                      PRINT
                    </Button>
                  </Stack>
                )}
              </Stack>

              {/* Emergency Clear Table */}
              {/* Emergency Clear Table */}
              {table && canManagePayment && !['COMPLETED', 'PAID', 'CANCELLED', 'RETURNED'].includes(order.status) && (
                <Button
                  fullWidth
                  size="small"
                  color="error"
                  variant="text"
                  startIcon={<LockOpenIcon />}
                  onClick={handleReleaseTable}
                  sx={{ mt: 2, fontWeight: 700, fontSize: '0.65rem', opacity: 0.5, '&:hover': { opacity: 1 } }}
                >
                  CLEAR & RELEASE TABLE
                </Button>
              )}
            </Box>
          </Box>

        </Box>
      );
    }

    return (
      <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [items, cats] = await Promise.all([
        itemService.getItems(),
        itemService.getCategories()
      ]);

      setMenuItems(items.filter((i: Item) => i.is_enabled));
      setCategories(cats.filter((c: Category) => c.is_enabled));

      if (initialOrder) {
        setOrder(initialOrder);
        setOrderType(initialOrder.order_type);
        setCustomerName(initialOrder.customer_name || '');
        setCustomerMobile(initialOrder.customer_mobile || '');
        setDialogStage('ORDER_DETAILS');
      } else if (table?.active_orders && table.active_orders.length > 0) {
        // Show choice screen if there are any active orders
        setOrder(null);
        setOrderType('DINE_IN');
        setDialogStage('CHOICE');
      } else {
        // Multiple orders or no orders: let user select or create
        setOrder(null);
        setOrderType(table ? 'DINE_IN' : 'TAKE_AWAY');
        setDialogStage('CHOICE');
      }

      const tablesData = await restaurantService.getTables();
      setAllTables(tablesData);

    } catch (e: any) {
      console.error('Failed to load data:', e);
      const errorMsg = e.data?.detail || e.message || `Failed to load data (Status: ${e.status || 'unknown'})`;
      setError(errorMsg);
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
      // --- Capacity Check with Buffer (+2) ---
      const totalPersons = (table?.current_occupancy || 0) + (type === 'DINE_IN' ? numberOfPersons : 1);
      if (type === 'DINE_IN' && table && totalPersons > table.capacity + 2) {
          setError(`Maximum table capacity exceeded. Table ${table.number} has capacity ${table.capacity} and can only accommodate up to ${table.capacity + 2} persons.`);
          setLoading(false);
          return;
      }
      // ----------------------------------------

      const newOrder = await restaurantService.createOrder({
        table: type === 'DINE_IN' ? table?.id : undefined,
        order_type: type,
        customer_name: customerName || undefined,
        customer_mobile: customerMobile || undefined,
        number_of_persons: type === 'DINE_IN' ? numberOfPersons : 1,
      });
      setOrder(newOrder);
      setOrderType(type);
      setDialogStage('ORDER_DETAILS');
      onOrderUpdated();
    } catch (e: any) {

      let errorMsg = 'Failed to create order';
      if (e.data && typeof e.data === 'object') {
        errorMsg = Object.entries(e.data)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
          .join(' | ') || errorMsg;
      } else if (typeof e === 'string') {
        errorMsg = e;
      } else if (e.status) {
        errorMsg += ` (Status: ${e.status})`;
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (item: Item) => {
    if (!order || order.invoice) return;
    if (!canTakeOrder) {
      setError('You do not have permission to add items.');
      return;
    }

    if (order.status === 'CANCELLED') {
      setError('Cannot add items to a cancelled order.');
      return;
    }

    // Check if we are adding to a served/ready order (Add-on logic)
    const isAddon = ['READY', 'SERVED', 'COMPLETED'].includes(order.status);

    setLoading(true);
    try {
      await restaurantService.addItemToOrder(order.id, {
        item: item.id,
        quantity: 1,
        notes: isAddon ? 'ADD-ON' : '',
      });
      const orderData = await restaurantService.getOrder(order.id);
      setOrder(orderData);
      onOrderUpdated();
      if (isMobile) setSummaryExpanded(true);
    } catch (e: any) {
      console.error('Failed to add item:', e);
      let errorMsg = 'Failed to add item';
      if (e.data && typeof e.data === 'object' && Object.keys(e.data).length > 0) {
        if (e.data.error) {
          errorMsg = e.data.error;
        } else if (e.data.detail) {
          errorMsg = e.data.detail;
        } else {
          errorMsg = Object.entries(e.data)
            .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
            .join(' | ') || errorMsg;
        }
      } else if (typeof e === 'string') {
        errorMsg = e;
      } else if (e.status) {
        errorMsg += ` (Status: ${e.status})`;
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateItemQuantity = async (orderItem: OrderItem, delta: number) => {
    // No modifications allowed to parcel orders after billing
    if (order?.order_type === 'TAKE_AWAY' && order.invoice) {
      setError('Cannot modify items after bill has been generated.');
      return;
    }

    if (order?.status === 'CANCELLED') {
      setError('Cannot modify a cancelled order.');
      return;
    }

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
    } catch (e: any) {
      setError(e.message || 'Failed to update quantity');
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
    } catch (e: any) {
      console.error('Failed to send to kitchen:', e);
      let errorMsg = 'Failed to send to kitchen';
      if (e.data && typeof e.data === 'object') {
        errorMsg = e.data.detail || Object.entries(e.data)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
          .join(' | ') || errorMsg;
      } else if (e.status) {
        errorMsg += ` (Status: ${e.status})`;
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateItemStatus = async (itemId: number, status: OrderItem['status']) => {
    setLoading(true);
    try {
      await restaurantService.updateOrderItem(itemId, { status });
      const orderData = await restaurantService.getOrder(order!.id);
      setOrder(orderData);
      onOrderUpdated();
    } catch (e: any) {
      setError(e.message || 'Failed to update item');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBill = async () => {
    if (!order) return;
    setLoading(true);
    try {
      await restaurantService.checkout(order.id, { payment_method: 'CASH', mark_as_paid: false });
      
      // Refresh order data
      const orderData = await restaurantService.getOrder(order.id);
      setOrder(orderData);
      
      onOrderUpdated();
      
      if (order.order_type !== 'TAKE_AWAY') {
        router.push('/backoffice/restaurant/tables');
        onClose();
      }
    } catch (e: any) {
      setError(e.message || 'Failed to generate bill');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckoutSuccess = async (invoiceData: any) => {
    setInvoice(invoiceData);
    setCheckoutOpen(false);
    
    // Refresh order data to show new state (locked items, KOT button visibility)
    if (order) {
      const orderData = await restaurantService.getOrder(order.id);
      setOrder(orderData);
    }
    
    onOrderUpdated();
    
    // Only redirect/close for dine-in orders that are being finalized
    if (order?.order_type !== 'TAKE_AWAY') {
      router.push('/backoffice/restaurant/tables');
      onClose();
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (!printWindow) return;

    const invoiceEl = document.getElementById('thermal-invoice-container');
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

  const handleCancelOrder = async () => {
    if (!order) return;
    setLoading(true);
    try {
      await restaurantService.cancelOrder(order.id, cancelReason);
      const orderData = await restaurantService.getOrder(order.id);
      setOrder(orderData);
      onOrderUpdated();
      setCancelDialogOpen(false);
      setCancelReason('');
    } catch (e: any) {
      setError(e.message || 'Failed to cancel order');
    } finally {
      setLoading(false);
    }
  };


  const handleUpdateOrderStatus = async (newStatus: Order['status']) => {
    if (!order) return;
    setLoading(true);
    try {
      await restaurantService.updateOrder(order.id, { status: newStatus });
      if (newStatus === 'COMPLETED' && isMobile) {
        setSummaryExpanded(true);
      }
      const orderData = await restaurantService.getOrder(order.id);
      setOrder(orderData);
      onOrderUpdated();

      // For parcel orders, redirect to takeaway section once ready
      if (order.order_type === 'TAKE_AWAY' && (newStatus === 'READY' || newStatus === 'SERVED')) {
        setTimeout(() => {
          onClose();
          router.push('/backoffice/restaurant/takeaway');
        }, 100);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to update order status');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    // No modifications allowed to parcel orders after billing
    if (order?.order_type === 'TAKE_AWAY' && order.invoice) {
      setError('Cannot remove items after bill has been generated.');
      return;
    }

    if (!confirm('Remove this item?')) return;
    setLoading(true);
    try {
      await restaurantService.deleteOrderItem(itemId);
      const orderData = await restaurantService.getOrder(order!.id);
      setOrder(orderData);
      onOrderUpdated();
    } finally {
      setLoading(false);
    }
  };

  const handleReleaseTable = async () => {
    if (!table) return;
    if (!canManagePayment) {
      setError('Permission denied to release table manually.');
      return;
    }

    const confirmRelease = window.confirm(
      `Emergency Clear: This will force Table ${table.number} to become available and CANCEL all its active orders. This is usually done if a table is "stuck" or was cleared manually. Continue?`
    );

    if (!confirmRelease) return;

    setLoading(true);
    try {
      await restaurantService.releaseTable(table.id);
      onOrderUpdated(); // Refreshes tables in parent
      onClose();
    } catch (e: any) {
      setError(e.data?.detail || e.message || 'Failed to release table');
    } finally {
      setLoading(false);
    }
  };

  const handleServeAllReady = async () => {
    if (!order) return;
    setLoading(true);
    try {
      await restaurantService.serveAllReady(order.id);
      const orderData = await restaurantService.getOrder(order.id);
      setOrder(orderData);
      onOrderUpdated();

      // For parcel orders, redirect to takeaway section once served/ready
      if (order.order_type === 'TAKE_AWAY' && (orderData.status === 'READY' || orderData.status === 'SERVED')) {
        setTimeout(() => {
          onClose();
          router.push('/backoffice/restaurant/takeaway');
        }, 100);
      }
    } catch (e: any) {
      console.error('Failed to serve items:', e);
      setError(e.message || 'Failed to serve items');
    } finally {
      setLoading(false);
    }
  };

  const handleReturnOrder = async () => {
    if (!order) return;
    if (!confirm('Mark this order as Returned (Loss)? This cannot be undone.')) return;
    setLoading(true);
    try {
      await restaurantService.returnOrder(order.id);
      const orderData = await restaurantService.getOrder(order.id);
      setOrder(orderData);
      onOrderUpdated();
    } catch (e: any) {
      setError(e.message || 'Failed to return order');
    } finally {
      setLoading(false);
    }
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
    } catch (e: any) {
      setError(e.message || 'Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  const handleMoveTable = async (targetTable: RestaurantTable) => {
    if (!order) return;

    // Capacity check with Buffer (+2)
    const currentOnTarget = targetTable.current_occupancy || 0;
    const availableOnTarget = (targetTable.capacity + 2) - currentOnTarget;
    
    if (availableOnTarget < movePersons) {
      setError(`Maximum table capacity exceeded. Table ${targetTable.number} has capacity ${targetTable.capacity} and can only accommodate up to ${targetTable.capacity + 2} persons. It currently has ${currentOnTarget} guests.`);
      return;
    }

    if (!window.confirm(`Confirm move: Are you sure you want to shift this order to Table ${targetTable.number}?`)) {
      return;
    }
    setMoving(true);
    try {
      await restaurantService.changeOrderTable(order.id, targetTable.id, movePersons);
      setMoveTableOpen(false);
      onOrderUpdated();
      onClose(); // Close dialog after successful move as the table context changed
    } catch (e: any) {
      console.error('Failed to move table:', e);
      setError(e.data?.error || e.message || 'Failed to move table');
    } finally {
      setMoving(false);
    }
  };


  const isKitchenStepEnabled = activeStore?.is_kitchen_step_enabled !== false;

  const activeFlow = order?.order_type === 'TAKE_AWAY' 
    ? (isKitchenStepEnabled ? TAKE_AWAY_STATUS_FLOW : TAKE_AWAY_STATUS_FLOW_NO_KITCHEN)
    : (isKitchenStepEnabled ? DINE_IN_STATUS_FLOW : DINE_IN_STATUS_FLOW_NO_KITCHEN);
  const currentStatusIdx = order ? activeFlow.indexOf(order.status) : -1;
  const nextStatus = currentStatusIdx >= 0 && currentStatusIdx < activeFlow.length - 1
    ? activeFlow[currentStatusIdx + 1]
    : null;


  const hasNewItems = order?.items.some(i => i.status === 'ORDERED') ?? false;
  const hasReadyItems = order?.items.some(i => ['READY', 'PREPARING'].includes(i.status)) ?? false;
  const hasIncompleteItems = order?.items.some(i => ['AWAITING', 'PREPARING'].includes(i.status)) ?? false;

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobile}
      maxWidth="lg"
      fullWidth
      slotProps={{
        paper: {
          sx: { borderRadius: isMobile ? 0 : '5px', overflow: 'hidden', height: { md: '90vh' } }
        }
      }}
    >
      {/* Header */}
      <DialogTitle
        component="div"
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          py: { xs: 1.5, md: 2 },
          px: { xs: 2.5, md: 3 },
          position: 'relative',
          zIndex: 1100,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}
      >
        <Box>
          <Typography variant={isMobile ? "subtitle1" : "h6"} sx={{ fontWeight: 800, lineHeight: 1.2, letterSpacing: '0.02em' }}>
            {table ? `Table ${table.number}` : 'Parcel Order'}
          </Typography>
          {order && (
            <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 600, display: 'block', mt: 0.2 }}>
              Order #{order.id} • {order.waiter_name || 'Staff'} • {order.order_type === 'DINE_IN' ? 'Dine-in' : 'Parcel'}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: { xs: 1, md: 2 }, alignItems: 'center' }}>
          {order && table?.active_orders && table.active_orders.length > 1 && !isMobile && (
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              onClick={() => {
                setOrder(null);
                setDialogStage('CHOICE');
              }}
              sx={{ borderColor: 'rgba(255,255,255,0.5)', fontWeight: 700, borderRadius: '4px' }}
            >
              SWITCH GROUP
            </Button>
          )}
          {order && !(order.status === 'ORDER_TAKEN' && order.items.length === 0) && (
            <OrderStatusChip
              status={order.status}
              orderType={order.order_type}
              sx={{ 
                borderRadius: '4px', 
                fontWeight: 900, 
                px: 1.5, 
                height: 26, 
                fontSize: '0.7rem',
                bgcolor: 'white',
                color: 'primary.main',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            />
          )}
          <IconButton onClick={onClose} sx={{ color: 'white', ml: 0.5 }} size="small">
            <CloseIcon fontSize={isMobile ? "medium" : "small"} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', bgcolor: '#FCF9EA', overflow: 'hidden' }}>
        {renderContent()}
      </DialogContent>

      {/* Hidden container for printing */}
      <Box sx={{ display: 'none' }}>
        <div id="thermal-invoice-container">
          {invoice && (
            <InvoicePrint
              invoice={invoice}
              orderItems={order?.items || []}
              tableNumber={table?.number || order?.table_number || ''}
            />
          )}
        </div>
      </Box>

      {order && (
        <CheckoutDialog
          open={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          order={order}
          onCheckoutSuccess={handleCheckoutSuccess}
        />
      )}

      {order && order.invoice && (
        <InvoicePreviewDialog
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          invoice={order.invoice}
          orderItems={order.items}
          tableNumber={table?.number || order?.table_number || ''}
          onDownload={handleDownloadPDF}
          onPrint={() => {
            setInvoice(order.invoice);
            setTimeout(handlePrint, 100);
          }}
        />
      )}

      {/* Move Table Dialog */}
      <Dialog open={moveTableOpen} onClose={() => setMoveTableOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Move Order to Another Table</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select a table to move this order. You can move to occupied tables to merge groups.
          </Typography>
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Update Number of Persons"
              type="number"
              value={movePersons}
              onChange={(e) => setMovePersons(Math.max(1, parseInt(e.target.value) || 1))}
              size="small"
              helperText="How many persons are moving to the new table?"
            />
          </Box>
          <Stack spacing={1}>
            {allTables
              .filter(t => t.id !== table?.id)
              .map(t => (
                <Button
                  key={t.id}
                  variant="outlined"
                  onClick={() => handleMoveTable(t)}
                  disabled={moving}
                  sx={{
                    justifyContent: 'space-between',
                    px: 2, py: 1.5,
                    borderRadius: '4px',
                    border: '1px solid #e8e4d8',
                    color: 'text.primary',
                    borderColor: t.status === 'OCCUPIED' ? 'warning.light' : '#e8e4d8',
                    '&:hover': { bgcolor: '#FCF9EA', borderColor: 'primary.main' }
                  }}
                >
                  <Box sx={{ textAlign: 'left' }}>
                    <Typography sx={{ fontWeight: 800 }}>Table {t.number}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>Capacity: {t.capacity}</Typography>
                  </Box>
                  <Chip
                    label={t.status}
                    size="small"
                    sx={{
                      fontSize: '0.6rem',
                      height: 18,
                      fontWeight: 800,
                      bgcolor: t.status === 'VACANT' ? 'success.light' : 'warning.light',
                      color: t.status === 'VACANT' ? 'success.dark' : 'warning.dark'
                    }}
                  />
                </Button>
              ))}
            {allTables.filter(t => t.id !== table?.id).length === 0 && (
              <Alert severity="warning">No other tables available.</Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setMoveTableOpen(false)} disabled={moving}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Cancellation Reason Dialog */}
      <Dialog 
        open={cancelDialogOpen} 
        onClose={() => setCancelDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Cancel Order</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Are you sure you want to cancel this order? This action cannot be undone.
          </Typography>
          <TextField
            fullWidth
            label="Reason for cancellation (Optional)"
            placeholder="e.g. Customer changed mind, wrong items"
            multiline
            rows={3}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setCancelDialogOpen(false)} disabled={loading}>Close</Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleCancelOrder}
            disabled={loading}
            sx={{ fontWeight: 700, borderRadius: '8px' }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : 'Confirm Cancellation'}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default OrderDialog;
