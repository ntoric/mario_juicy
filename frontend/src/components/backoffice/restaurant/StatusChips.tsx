import React from 'react';
import { Chip, ChipProps } from '@mui/material';

export const TableStatusChip: React.FC<{ status: string } & Partial<ChipProps>> = ({ status, ...props }) => {
  const getColors = () => {
    switch (status) {
      case 'VACANT': return { color: 'success', label: 'Vacant' };
      case 'OCCUPIED': return { color: 'error', label: 'Occupied' };
      case 'RESERVED': return { color: 'warning', label: 'Reserved' };
      case 'MAINTENANCE': return { color: 'default', label: 'Maintenance' };
      default: return { color: 'default', label: status };
    }
  };

  const { color, label } = getColors() as any;
  return <Chip label={label} color={color} size="small" variant="outlined" {...props} />;
};

export const OrderStatusChip: React.FC<{ status: string; orderType?: string } & Partial<ChipProps>> = ({ status, orderType, ...props }) => {
  const getColors = () => {
    switch (status) {
      case 'ORDER_TAKEN': return { color: 'info', label: 'Order Taken' };
      case 'AWAITING': return { color: 'warning', label: 'Awaiting' };
      case 'PREPARING': return { color: 'primary', label: 'Preparing' };
      case 'READY': 
        return { 
          color: 'secondary', 
          label: orderType === 'TAKE_AWAY' ? 'Ready for Pickup' : 'Ready to Serve' 
        };
      case 'SERVED': 
        return { 
          color: 'success', 
          label: orderType === 'TAKE_AWAY' ? 'Ready for Pickup' : 'Served' 
        };
      case 'PAID': return { color: 'default', label: 'Paid' };
      case 'COMPLETED': return { color: 'success', label: 'Completed' };
      case 'CANCELLED': return { color: 'error', label: 'Cancelled' };
      case 'RETURNED': return { color: 'error', label: 'Returned (Loss)' };
      default: return { color: 'default', label: status };
    }
  };

  const { color, label } = getColors() as any;
  return <Chip label={label} color={color} size="small" {...props} />;
};

export const ItemStatusChip: React.FC<{ status: string; orderType?: string } & Partial<ChipProps>> = ({ status, orderType, ...props }) => {
  const getColors = () => {
    switch (status) {
      case 'ORDERED': return { color: 'info', label: 'Ordered' };
      case 'PREPARING': return { color: 'warning', label: 'Preparing' };
      case 'READY': 
        return { 
          color: 'success', 
          label: orderType === 'TAKE_AWAY' ? 'Ready for Pickup' : 'Ready to Serve' 
        };
      case 'SERVED': 
        return { 
          color: 'secondary', 
          label: orderType === 'TAKE_AWAY' ? 'Ready for Pickup' : 'Served' 
        };
      case 'CANCELLED': return { color: 'error', label: 'Cancelled' };
      default: return { color: 'default', label: status };
    }
  };

  const { color, label } = getColors() as any;
  return <Chip label={label} color={color} size="small" variant="filled" {...props} />;
};

