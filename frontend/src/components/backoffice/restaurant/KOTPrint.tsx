"use client";

import React from 'react';
import { Box, Typography, Stack } from '@mui/material';

interface KOTPrintProps {
  order: {
    id: number;
    table_number?: string;
    waiter_name?: string;
    notes?: string | null;
    order_type?: string;
  };
  items: any[];
  store?: {
    thermal_printer_size?: '2_INCH' | '3_INCH';
  } | null;
}

const KOTPrint: React.FC<KOTPrintProps> = ({ order, items, store }) => {
  const printerSize = store?.thermal_printer_size || '3_INCH';
  const isSmall = printerSize === '2_INCH';

  return (
    <Box
      id="thermal-kot"
      sx={{
        width: isSmall ? '58mm' : '80mm',
        maxWidth: '100%',
        p: '2mm',
        bgcolor: 'white',
        color: 'black',
        fontFamily: '"Courier New", Courier, monospace',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        '@media print': {
          width: isSmall ? '58mm' : '80mm',
          margin: 0,
          padding: '1mm',
        }
      }}
    >
      <Stack spacing={0.25} sx={{ textAlign: 'center', mb: 1, width: '100%' }}>
        <Typography sx={{ fontWeight: 900, fontSize: '1.2rem' }}>
          KITCHEN ORDER
        </Typography>
      </Stack>

      <Box sx={{ width: '100%', mb: 1, fontSize: isSmall ? '0.75rem' : '0.85rem' }}>
        <Typography sx={{ fontSize: 'inherit', fontWeight: 900 }}>Order #{order.id}</Typography>
        <Typography sx={{ fontSize: 'inherit' }}>Type: {order.order_type || 'DINE_IN'}</Typography>
        {order.table_number && order.table_number !== 'Take Away' && (
          <Typography sx={{ fontSize: 'inherit', fontWeight: 900 }}>Table: {order.table_number}</Typography>
        )}
        {(order as any).customer_name && (order as any).customer_name !== 'Guest' && (
          <Typography sx={{ fontSize: 'inherit', fontWeight: 900 }}>Cust: {(order as any).customer_name}</Typography>
        )}
        {(order as any).customer_mobile && (
          <Typography sx={{ fontSize: 'inherit', fontWeight: 900 }}>Mob: {(order as any).customer_mobile}</Typography>
        )}
        <Typography sx={{ fontSize: 'inherit' }}>Date: {new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</Typography>
        {order.waiter_name && <Typography sx={{ fontSize: 'inherit' }}>Waiter: {order.waiter_name}</Typography>}
      </Box>

      <Box sx={{ width: '100%', borderTop: '1px dashed black', my: 0.5 }} />

      <Box sx={{ width: '100%', mb: 1 }}>
        {items.map((item, idx) => (
          <Box key={idx} sx={{ mb: 0.5, display: 'flex', gap: 1 }}>
            <Typography sx={{ fontSize: isSmall ? '0.85rem' : '1rem', fontWeight: 900 }}>
              {item.quantity} x
            </Typography>
            <Typography sx={{ fontSize: isSmall ? '0.85rem' : '1rem', fontWeight: 900, textTransform: 'uppercase' }}>
              {item.item_details.name}
            </Typography>
          </Box>
        ))}
      </Box>

      {order.notes && (
        <>
          <Box sx={{ width: '100%', borderTop: '1px dashed black', my: 0.5 }} />
          <Box sx={{ width: '100%', mb: 1 }}>
            <Typography sx={{ fontSize: '0.8rem', fontWeight: 900 }}>NOTES:</Typography>
            <Typography sx={{ fontSize: '0.8rem' }}>{order.notes}</Typography>
          </Box>
        </>
      )}

      <Box sx={{ width: '100%', borderTop: '1px dashed black', my: 0.5 }} />
      <Box sx={{ height: '10mm' }} />
    </Box>
  );
};

export default KOTPrint;
