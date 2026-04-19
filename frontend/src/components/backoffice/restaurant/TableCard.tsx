import React from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  IconButton, 
  Tooltip,
  Paper,
  Stack
} from '@mui/material';
import { 
  Add as AddIcon, 
  Visibility as ViewIcon, 
  Group as GroupIcon,
  Restaurant as RestaurantIcon
} from '@mui/icons-material';
import { Table } from '@/services/restaurantService';
import { TableStatusChip } from './StatusChips';

interface TableCardProps {
  table: Table;
  onOpenOrder: (table: Table) => void;
  onViewDetails: (table: Table) => void;
}

const TableCard: React.FC<TableCardProps> = ({ table, onOpenOrder, onViewDetails }) => {
  return (
    <Card 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        position: 'relative',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 8px 16px -4px rgba(0,0,0,0.1)'
        },
        cursor: 'pointer'
      }}
      onClick={() => onViewDetails(table)}
    >
      <CardContent sx={{ flexGrow: 1, p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Paper 
            elevation={0} 
            sx={{ 
              width: 48, 
              height: 48, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              borderRadius: 2,
              bgcolor: table.status === 'OCCUPIED' ? 'error.light' : 'primary.light',
              color: 'white'
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{table.number}</Typography>
          </Paper>
          <TableStatusChip status={table.status} />
        </Box>

        <Stack spacing={1}>
          <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', gap: 1 }}>
            <GroupIcon sx={{ fontSize: 20 }} />
            <Typography variant="body2">Capacity: {table.capacity}</Typography>
          </Box>
          
          {table.active_orders && table.active_orders.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', color: 'primary.main', gap: 1 }}>
              <RestaurantIcon sx={{ fontSize: 20 }} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {table.active_orders.length > 1 
                  ? `${table.active_orders.length} Groups Active` 
                  : `Active Order #${table.active_orders[0].id}`
                }
              </Typography>
            </Box>
          )}
        </Stack>
      </CardContent>

      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'flex-end', 
        p: 1, 
        gap: 1, 
        borderTop: '1px solid', 
        borderColor: 'divider',
        bgcolor: 'rgba(0,0,0,0.02)'
      }}>
        <Tooltip title="View Details">
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); onViewDetails(table); }}>
            <ViewIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={table.active_order ? "Manage Order" : "Open New Order"}>
          <IconButton 
            size="small" 
            color="primary" 
            onClick={(e) => { e.stopPropagation(); onOpenOrder(table); }}
            sx={{ 
              bgcolor: 'primary.light', 
              color: 'white',
              '&:hover': { bgcolor: 'primary.main' }
            }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Card>
  );
};

export default TableCard;
