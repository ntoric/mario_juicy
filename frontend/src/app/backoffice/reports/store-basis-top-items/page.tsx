"use client";
import { useTheme } from "@mui/material/styles";
import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Stack,
  Button,
  TextField,
  CircularProgress,
  Alert,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  alpha,
  Chip,
  MenuItem
} from "@mui/material";
import {
  RefreshOutlined as RefreshIcon,
  CalendarTodayOutlined as CalendarIcon,
  StoreOutlined as StoreIcon,
  Inventory2Outlined as ItemIcon
} from "@mui/icons-material";
import { reportService, StoreBasisTopItem } from "@/services/reportService";
import PageHeader from "@/components/backoffice/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { storeService, Store } from "@/services/storeService";

const formatDate = (date: Date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getStartOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const getEndOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);

export default function StoreBasisTopItemsPage() {
  const theme = useTheme();
  const [startDate, setStartDate] = useState(formatDate(getStartOfMonth(new Date())));
  const [endDate, setEndDate] = useState(formatDate(getEndOfMonth(new Date())));

  const { isRole, activeStoreId } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<StoreBasisTopItem[]>([]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await reportService.getStoreBasisTopItems({
        start_date: startDate,
        end_date: endDate,
        store_id: activeStoreId || undefined
      });
      setItems(data || []);
    } catch (err: any) {
      console.error("Failed to fetch top items:", err);
      setError(err.message || "An error occurred while fetching top items.");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, activeStoreId]);


  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 }, height: '100%', overflowY: 'auto' }}>
      <PageHeader>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, fontSize: '2rem', background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', mb: 0.5 }}>
            Top Items by Store
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{
          p: 1, bgcolor: alpha(theme.palette.primary.main, 0.04), borderRadius: '0.65rem', border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}` }}>
            <TextField
            type="date"
            size="small"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            slotProps={{ 
              input: { 
                startAdornment: <InputAdornment position="start"><CalendarIcon sx={{ fontSize: 18, color: theme.palette.primary.main }} /></InputAdornment>,
                sx: { borderRadius: '0.65rem' }
              } 
            }}
          />
          <TextField
            type="date"
            size="small"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            slotProps={{ 
              input: { 
                startAdornment: <InputAdornment position="start"><CalendarIcon sx={{ fontSize: 18, color: theme.palette.primary.main }} /></InputAdornment>,
                sx: { borderRadius: '0.65rem' }
              } 
            }}
          />
          <Button 
            variant="contained" 
            onClick={ fetchItems } 
            sx={{ height: 48, px: 3, borderRadius: '0.65rem', background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)` }}
          >
            <RefreshIcon sx={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </Button>
        </Stack>
      </PageHeader>

      {error && <Alert severity="error" sx={{ mb: 4 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress sx={{ color: theme.palette.primary.main }} /></Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: '0.65rem', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.05)' }}>
          <Table>
            <TableHead sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Store</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Item Name</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Qty Sold</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>Revenue</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items?.map((row, index) => (
                <TableRow key={`${row.store_id}-${row.item_name}-${index}`} sx={{ '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) } }}>
        <TableCell>
          <Chip
            icon={<StoreIcon sx={{ fontSize: 16 }} />}
            label={row.store_name}
            size="small"
            sx={{ fontWeight: 700, bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main, border: 'none' }}
          />
        </TableCell>
        <TableCell>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <ItemIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{row.item_name}</Typography>
          </Stack>
        </TableCell>
        <TableCell align="right" sx={{ fontWeight: 700 }}>{row.quantity}</TableCell>
        <TableCell align="right" sx={{ fontWeight: 800, color: theme.palette.primary.main }}>₹{row.revenue.toLocaleString()}</TableCell>
      </TableRow>
              ))}
      {(!items || items.length === 0) && (
        <TableRow>
          <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>No item data found for the selected period.</TableCell>
        </TableRow>
      )}
    </TableBody>
          </Table >
        </TableContainer>
      )}

      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </Box>
  );
}
