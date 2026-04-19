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
  Grid,
  Divider,
  Stack,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  CircularProgress,
  Paper,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  Payments as CashIcon,
  CreditCard as CardIcon,
  QrCode as UpiIcon,
  Receipt as BillIcon,
  CheckCircle as SuccessIcon,
  Room as LocationIcon,
} from '@mui/icons-material';
import { Order, restaurantService } from '@/services/restaurantService';
import { useAuth } from '@/hooks/useAuth';
import { fetcher } from '@/lib/api';

interface CheckoutDialogProps {
  open: boolean;
  onClose: () => void;
  order: Order;
  onCheckoutSuccess: (invoice: any) => void;
}

const CheckoutDialog: React.FC<CheckoutDialogProps> = ({ open, onClose, order, onCheckoutSuccess }) => {
  const { hasPermission } = useAuth();
  const canManagePayment = hasPermission('access_to_payment_management');
  
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
      // Logic mirrors backend: subtotal is already total, we extract tax
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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle component="div" sx={{ textAlign: 'center', pb: 0 }}>
        <BillIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
        <Typography variant="h5" sx={{ fontWeight: 800 }}>Generate Billing</Typography>
        <Typography variant="body2" color="text.secondary">Order #{order.id} • Table {order.table_number}</Typography>
      </DialogTitle>

      <DialogContent sx={{ mt: 2 }}>
        {taxConfig?.is_gst_enabled && parseFloat(taxConfig.igst_rate) > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, display: 'block', color: 'text.secondary', textTransform: 'uppercase' }}>
              GST Type
            </Typography>
            <ToggleButtonGroup
              value={gstType}
              exclusive
              onChange={(_, val) => val && setGstType(val)}
              fullWidth
              size="small"
              sx={{ '& .MuiToggleButton-root': { borderRadius: 1, fontWeight: 700 } }}
            >
              <ToggleButton value="INTRA_STATE">INTRA-STATE (CGST+SGST)</ToggleButton>
              <ToggleButton value="INTER_STATE">INTER-STATE (IGST)</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        )}

        <Box sx={{ bgcolor: '#FCF9EA', p: 2, borderRadius: 2, mb: 1, border: '1px solid #e8e4d8' }}>
          <Stack spacing={1}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Subtotal</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>₹{order.total_amount}</Typography>
            </Box>
            
            {details.map((tax: any) => (
              <Box key={tax.label} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">{tax.label}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>₹{tax.amount.toFixed(2)}</Typography>
              </Box>
            ))}

            <Divider sx={{ my: 0.5 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Final Total</Typography>
              <Typography variant="h6" sx={{ fontWeight: 900, color: 'primary.main' }}>₹{finalTotal.toFixed(2)}</Typography>
            </Box>
          </Stack>
        </Box>

        {error && (
          <Typography color="error" variant="caption" sx={{ mt: 2, display: 'block', textAlign: 'center', fontWeight: 700 }}>
            {error}
          </Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button onClick={onClose} disabled={loading} sx={{ fontWeight: 700 }}>Cancel</Button>
        <Button
          variant="contained"
          fullWidth
          onClick={handleCheckout}
          disabled={loading || !canManagePayment}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SuccessIcon />}
          sx={{ py: 1.2, fontWeight: 800, borderRadius: 2 }}
        >
          {loading ? 'Processing...' : 'COMPLETE & GENERATE BILL'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CheckoutDialog;
