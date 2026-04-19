"use client";

import React from 'react';
import { Box, Typography, Divider, Table, TableBody, TableCell, TableRow, Stack } from '@mui/material';

interface InvoicePrintProps {
  invoice: {
    invoice_number: string;
    subtotal: string;
    tax_amount: string;
    tax_details: Record<string, string>;
    total_amount: string;
    payment_method: string;
    waiter_name: string;
    created_at: string;
      store_details?: {
        name: string;
        address: string;
        location?: string;
        fssai_lic_no?: string;
        mobile?: string;
        phone?: string;
        gst_number?: string;
        thermal_printer_size?: '2_INCH' | '3_INCH';
      };
    };
    orderItems: any[];
    tableNumber: string;
  }
  
  const InvoicePrint: React.FC<InvoicePrintProps> = ({ invoice, orderItems, tableNumber }) => {
    const store = invoice.store_details;
    const printerSize = store?.thermal_printer_size || '3_INCH';
    const isSmall = printerSize === '2_INCH';
  
    return (
      <Box
        id="thermal-invoice"
        sx={{
          width: isSmall ? '58mm' : '100%',
          maxWidth: '100%',
          p: isSmall ? '4mm 2mm' : '10mm 4mm',
          bgcolor: 'white',
          color: 'black',
          fontFamily: '"Courier New", Courier, monospace',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          overflowY: 'auto',
          '@media print': {
            p: isSmall ? '2mm' : '4mm',
            width: isSmall ? '58mm' : '80mm', // Fixed widths for thermal printing
          }
        }}
      >
      {/* Business Header */}
      <Stack spacing={0.25} sx={{ textAlign: 'center', mb: 2, width: '100%' }}>
        <Typography sx={{ fontWeight: 900, fontSize: '1.2rem', textTransform: 'none', marginTop: '0.5rem' }}>
          {store?.name || 'Mario'}
        </Typography>
        {store?.address && (
          <Typography sx={{ fontSize: '0.7rem', fontWeight: 600 }}>
            {store.address.toUpperCase()}
          </Typography>
        )}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
          {store?.mobile && (
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
              MOB : {store.mobile}
            </Typography>
          )}
        </Box>
        {store?.gst_number && (
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
            GSTIN : {store.gst_number}
          </Typography>
        )}
        {store?.fssai_lic_no && (
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
            FSSAI LIC NO : {store.fssai_lic_no}
          </Typography>
        )}
      </Stack>

      <Typography sx={{ fontWeight: 900, fontSize: isSmall ? '0.8rem' : '1rem', mb: 2, textDecoration: 'underline' }}>Retail Invoice</Typography>

      {/* Bill Info */}
      <Box sx={{ width: '100%', mb: 1, fontSize: isSmall ? '0.7rem' : '0.8rem' }}>
        <Typography sx={{ fontSize: 'inherit' }}>Date : {new Date(invoice.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
          <Typography sx={{ fontSize: 'inherit' }}>Bill No: {invoice.invoice_number.split('-').pop()}</Typography>
        </Box>
        <Typography sx={{ fontSize: 'inherit' }}>Payment Mode: {invoice.payment_method}</Typography>
        <Typography sx={{ fontSize: 'inherit', mt: 0.5 }}>DR Ref : {tableNumber || 'N/A'}</Typography>
      </Box>

      <Box sx={{ width: '100%', borderTop: '1px dashed black', my: 0.5 }} />

      {/* Items Table */}
      <Box sx={{ width: '100%', mb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 0.5, mb: 0.5 }}>
          <Typography sx={{ fontSize: isSmall ? '0.7rem' : '0.8rem', fontWeight: 900 }}>Item</Typography>
          <Box sx={{ display: 'flex', gap: isSmall ? 2 : 4 }}>
            <Typography sx={{ fontSize: isSmall ? '0.7rem' : '0.8rem', fontWeight: 900 }}>Qty</Typography>
            <Typography sx={{ fontSize: isSmall ? '0.7rem' : '0.8rem', fontWeight: 900, minWidth: '45px', textAlign: 'right' }}>Amt</Typography>
          </Box>
        </Box>

        <Box sx={{ width: '100%', borderTop: '1px dashed black', mb: 1 }} />

        {orderItems.map((item, idx) => (
          <Box key={idx} sx={{ mb: 1 }}>
            <Typography sx={{ fontSize: isSmall ? '0.7rem' : '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>
              {item.item_details.name}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: isSmall ? 3 : 6 }}>
              <Typography sx={{ fontSize: isSmall ? '0.7rem' : '0.8rem' }}>{item.quantity}</Typography>
              <Typography sx={{ fontSize: isSmall ? '0.7rem' : '0.8rem', minWidth: '45px', textAlign: 'right' }}>
                {(parseFloat(item.price) * item.quantity).toFixed(2)}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      <Box sx={{ width: '100%', borderTop: '1px dashed black', my: 0.5 }} />

      {/* Financials Breakdown */}
      <Box sx={{ width: '100%', mb: 1.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: '0.8rem', fontWeight: 700 }}>Sub Total</Typography>
          <Box sx={{ display: 'flex', gap: 6 }}>
            <Typography sx={{ fontSize: '0.8rem' }}>{orderItems.reduce((acc, i) => acc + i.quantity, 0)}</Typography>
            <Typography sx={{ fontSize: '0.8rem', minWidth: '45px', textAlign: 'right' }}>{parseFloat(invoice.subtotal).toFixed(2)}</Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', mt: 1 }}>
          <Box sx={{ display: 'flex', gap: 4, mb: 0.5 }}>
            <Typography sx={{ fontSize: '0.75rem' }}>(-) Discount</Typography>
            <Typography sx={{ fontSize: '0.75rem', minWidth: '45px', textAlign: 'right' }}>0.00</Typography>
          </Box>

          {Object.entries(invoice.tax_details).map(([name, amount]) => (
            <Box sx={{ display: 'flex', gap: 4 }} key={name}>
              <Typography sx={{ fontSize: '0.7rem', fontWeight: 700 }}>{name}</Typography>
              <Typography sx={{ fontSize: '0.7rem', minWidth: '45px', textAlign: 'right' }}>{parseFloat(amount).toFixed(2)}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Box sx={{ width: '100%', borderTop: '2px dashed black', my: 0.5 }} />

      {/* Total */}
      <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
        <Typography sx={{ fontWeight: 900, fontSize: isSmall ? '0.85rem' : '1rem' }}>TOTAL</Typography>
        <Typography sx={{ fontWeight: 900, fontSize: isSmall ? '0.85rem' : '1rem' }}>Rs {parseFloat(invoice.total_amount).toFixed(2)}</Typography>
      </Box>

      <Box sx={{ width: '100%', borderTop: '1px dashed black', my: 0.5 }} />

      {/* Payment Details */}
      <Box sx={{ width: '100%', mt: 0.5, fontSize: '0.8rem' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: 'inherit' }}>{invoice.payment_method} :</Typography>
          <Typography sx={{ fontSize: 'inherit', fontWeight: 900 }}>Rs {parseFloat(invoice.total_amount).toFixed(2)}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
          <Typography sx={{ fontSize: 'inherit' }}>Cash tendered:</Typography>
          <Typography sx={{ fontSize: 'inherit', fontWeight: 900 }}>Rs {parseFloat(invoice.total_amount).toFixed(2)}</Typography>
        </Box>
      </Box>

      <Box sx={{ width: '100%', textAlign: 'right', mt: 2 }}>
        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700 }}>E & O.E</Typography>
      </Box>
    </Box>
  );
};

export default InvoicePrint;
