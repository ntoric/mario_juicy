"use client";

import React, { useState } from 'react';
import {
  Button,
  Box,
  Typography,
  Grid,
  Divider,
  Stack,
  CircularProgress,
  Paper,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
  IconButton,
} from '@mui/material';
import {
  Payments as CashIcon,
  CreditCard as CardIcon,
  QrCode as UpiIcon,
  Receipt as BillIcon,
  CheckCircle as SuccessIcon,
  ChevronLeft as ChevronLeftIcon,
} from '@mui/icons-material';
import { restaurantService } from '@/services/restaurantService';
import { Order } from '@/types/restaurant';
import { useAuth } from '@/hooks/useAuth';
import { fetcher } from '@/lib/api';

interface CheckoutDialogProps {
  open: boolean;
  onClose: () => void;
  order: Order;
  onCheckoutSuccess: (invoice: any) => void;
}

interface TaxDetail {
  label: string;
  amount: number;
}

const CheckoutDialog: React.FC<CheckoutDialogProps> = ({ open, onClose, order, onCheckoutSuccess }) => {
  const { hasPermission } = useAuth();
  const canManagePayment = hasPermission('billing');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taxConfig, setTaxConfig] = useState<any>(null);
  const [gstType, setGstType] = useState<'INTRA_STATE' | 'INTER_STATE'>('INTRA_STATE');

  React.useEffect(() => {
    if (open) {
      fetchTaxConfig();
    }
  }, [open]);

  const fetchTaxConfig = async () => {
    try {
      const data = await fetcher("/core/tax-configuration/");
      setTaxConfig(data);
    } catch (err) {
      console.error("Failed to fetch tax config", err);
    }
  };

  const calculateTaxes = () => {
    if (!taxConfig || !taxConfig.is_active) return { totalTax: 0, details: [] };
    
    const subtotal = parseFloat(order.total_amount);
    let totalTax = 0;
    const details: { label: string; amount: number }[] = [];

    if (taxConfig.tax_type === 'EXCLUSIVE') {
      if (taxConfig.is_gst_enabled) {
        if (gstType === 'INTER_STATE') {
          const igst = (subtotal * parseFloat(taxConfig.igst_rate)) / 100;
          totalTax += igst;
          if (igst > 0) details.push({ label: 'IGST', amount: igst });
        } else {
          const cgst = (subtotal * parseFloat(taxConfig.cgst_rate)) / 100;
          const sgst = (subtotal * parseFloat(taxConfig.sgst_rate)) / 100;
          totalTax += (cgst + sgst);
          if (cgst > 0) details.push({ label: 'CGST', amount: cgst });
          if (sgst > 0) details.push({ label: 'SGST', amount: sgst });
        }
      }
      if (taxConfig.is_cess_enabled) {
        const cess = (subtotal * parseFloat(taxConfig.cess_rate)) / 100;
        totalTax += cess;
        if (cess > 0) details.push({ label: 'CESS', amount: cess });
      }
    } else if (taxConfig.tax_type === 'INCLUSIVE') {
      let totalRate = 0;
      if (taxConfig.is_gst_enabled) {
        totalRate += gstType === 'INTER_STATE' ? parseFloat(taxConfig.igst_rate) : (parseFloat(taxConfig.cgst_rate) + parseFloat(taxConfig.sgst_rate));
      }
      if (taxConfig.is_cess_enabled) totalRate += parseFloat(taxConfig.cess_rate);
      
      if (totalRate > 0) {
        const actualBase = subtotal / (1 + (totalRate / 100));
        totalTax = subtotal - actualBase;
        
        if (taxConfig.is_gst_enabled) {
            if (gstType === 'INTER_STATE') {
                details.push({ label: 'IGST (Incl.)', amount: (actualBase * parseFloat(taxConfig.igst_rate)) / 100 });
            } else {
                details.push({ label: 'CGST (Incl.)', amount: (actualBase * parseFloat(taxConfig.cgst_rate)) / 100 });
                details.push({ label: 'SGST (Incl.)', amount: (actualBase * parseFloat(taxConfig.sgst_rate)) / 100 });
            }
        }
        if (taxConfig.is_cess_enabled) {
            details.push({ label: 'CESS (Incl.)', amount: (actualBase * parseFloat(taxConfig.cess_rate)) / 100 });
        }
      }
    }

    return { totalTax, details };
  };

  const { totalTax, details } = calculateTaxes();
  const finalTotal = taxConfig?.tax_type === 'EXCLUSIVE' ? parseFloat(order.total_amount) + totalTax : parseFloat(order.total_amount);

  const handleCheckout = async () => {
    if (!canManagePayment) {
      setError('You do not have permission to manage this operation.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const invoice = await restaurantService.checkout(order.id, { 
        payment_method: 'CASH',
        gst_type: gstType
      });
      onCheckoutSuccess(invoice);
    } catch (e: any) {
      setError(e.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <Box sx={{ 
      position: 'absolute',
      inset: 0,
      bgcolor: '#fdfdfd',
      zIndex: 200,
      display: 'flex', 
      flexDirection: 'column',
      animation: 'slideInUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      '@keyframes slideInUp': {
        from: { transform: 'translateY(100%)' },
        to: { transform: 'translateY(0)' }
      }
    }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid #e8e4d8', display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={onClose} sx={{ color: 'text.secondary' }}>
          <ChevronLeftIcon />
        </IconButton>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>Checkout & Billing</Typography>
      </Box>

      <Box sx={{ flexGrow: 1, overflowY: 'auto', p: { xs: 2, md: 4 } }}>
        <Grid container spacing={4} sx={{ justifyContent: 'center' }}>
          <Grid size={{ xs: 12, md: 8, lg: 6 }}>
            <Paper sx={{ p: 4, borderRadius: '24px', border: '1px solid #e8e4d8', boxShadow: '0 12px 40px rgba(0,0,0,0.04)' }}>
              <Stack spacing={4}>
                <Box sx={{ textAlign: 'center' }}>
                  <BillIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                  <Typography variant="h4" sx={{ fontWeight: 900 }}>₹{finalTotal.toFixed(2)}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                    Order #{order.id} • Table {order.table_number}
                  </Typography>
                </Box>

                {taxConfig?.is_gst_enabled && parseFloat(taxConfig.igst_rate) > 0 && (
                  <Box>
                    <Typography variant="overline" sx={{ fontWeight: 900, mb: 1, display: 'block', color: 'primary.main' }}>GST TYPE</Typography>
                    <ToggleButtonGroup
                      value={gstType}
                      exclusive
                      onChange={(_, val) => val && setGstType(val)}
                      fullWidth
                      size="large"
                      sx={{ '& .MuiToggleButton-root': { borderRadius: '12px', fontWeight: 800, py: 1.5 } }}
                    >
                      <ToggleButton value="INTRA_STATE">INTRA-STATE</ToggleButton>
                      <ToggleButton value="INTER_STATE">INTER-STATE</ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                )}

                <Box sx={{ bgcolor: '#FCF9EA', p: 3, borderRadius: '16px', border: '1px solid #e8e4d8' }}>
                  <Stack spacing={1.5}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>Subtotal</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 800 }}>₹{order.total_amount}</Typography>
                    </Box>
                    
                    {details.map((tax: TaxDetail) => (
                      <Box key={tax.label} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 600 }}>{tax.label}</Typography>
                        <Typography variant="body1" sx={{ fontWeight: 800 }}>₹{tax.amount.toFixed(2)}</Typography>
                      </Box>
                    ))}

                    <Divider sx={{ my: 1, borderStyle: 'dashed' }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <Typography variant="h6" sx={{ fontWeight: 900 }}>Final Total</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 900, color: 'primary.main' }}>₹{finalTotal.toFixed(2)}</Typography>
                    </Box>
                  </Stack>
                </Box>

                {error && (
                  <Alert severity="error" sx={{ borderRadius: '12px', fontWeight: 700 }}>
                    {error}
                  </Alert>
                )}

                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleCheckout}
                  disabled={loading || !canManagePayment}
                  startIcon={loading ? <CircularProgress size={24} color="inherit" /> : <SuccessIcon sx={{ fontSize: 28 }} />}
                  sx={{ py: 2, fontWeight: 900, borderRadius: '16px', fontSize: '1.2rem', boxShadow: '0 8px 24px rgba(233,118,43,0.2)' }}
                >
                  {loading ? 'PROCESSING...' : 'COMPLETE & PRINT BILL'}
                </Button>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default CheckoutDialog;
