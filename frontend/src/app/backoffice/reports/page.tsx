"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Grid,
  Stack,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Divider,
  Paper,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  Receipt as ReceiptIcon,
  ShoppingBag as ShoppingBagIcon,
  AccountBalanceWallet as TaxIcon,
  TrendingUp as TrendingUpIcon,
} from "@mui/icons-material";
// Helper functions for date handling without date-fns
const formatDate = (date: Date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getStartOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const getEndOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);

import { reportService, ReportSummary, DailySales, SalesByCategory, SalesByPayment, SalesByItem } from "@/services/reportService";
import SummaryCard from "@/components/reports/SummaryCard";
import {
  DailySalesChart,
  SalesByCategoryChart,
  PaymentMethodChart,
  TopItemsChart,
} from "@/components/reports/ReportCharts";

/**
 * Reports Dashboard Page
 * Displays various analytical reports and visualizations.
 */
export default function ReportsPage() {
  // Default range: current month
  const [startDate, setStartDate] = useState(formatDate(getStartOfMonth(new Date())));
  const [endDate, setEndDate] = useState(formatDate(getEndOfMonth(new Date())));
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data states
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [salesByCategory, setSalesByCategory] = useState<SalesByCategory[]>([]);
  const [salesByPayment, setSalesByPayment] = useState<SalesByPayment[]>([]);
  const [salesByItem, setSalesByItem] = useState<SalesByItem[]>([]);
  const [salesByType, setSalesByType] = useState<any[]>([]);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { start_date: startDate, end_date: endDate };
      
      const [summ, daily, cat, pay, items, type] = await Promise.all([
        reportService.getSummary(params),
        reportService.getDailySales(params),
        reportService.getSalesByCategory(params),
        reportService.getSalesByPayment(params),
        reportService.getSalesByItem(params),
        reportService.getSalesByType(params),
      ]);
      
      setSummary(summ);
      setDailySales(daily);
      setSalesByCategory(cat);
      setSalesByPayment(pay);
      setSalesByItem(items);
      setSalesByType(type);
    } catch (err: any) {
      console.error("Failed to fetch reports:", {
        status: err.status,
        message: err.message,
        data: err.data
      });
      setError(err.message || "An error occurred while fetching reports.");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    const handleRefresh = () => fetchReports();
    window.addEventListener('app-refresh', handleRefresh);
    return () => window.removeEventListener('app-refresh', handleRefresh);
  }, [fetchReports]);

  const handleFilter = () => {
    fetchReports();
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header & Filters */}
      <Box sx={{ 
        mb: 4, 
        display: { xs: 'none', md: 'flex' }, 
        justifyContent: "space-between", 
        alignItems: { xs: "flex-start", md: "center" },
        flexDirection: { xs: "column", md: "row" },
        gap: 3
      }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 500, color: '#e9762b', fontSize: '1.5rem' }}>
            Reports & Analytics
          </Typography>
        </Box>
        
        <Paper sx={{ p: 2, borderRadius: 3, display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          <TextField
            label="Start Date"
            type="date"
            size="small"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: 150 }}
          />
          <TextField
            label="End Date"
            type="date"
            size="small"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: 150 }}
          />
          <Button 
            variant="contained" 
            onClick={handleFilter} 
            disabled={loading}
            sx={{ height: 40, px: 3, borderRadius: 2 }}
          >
            Update
          </Button>
          <IconButton onClick={fetchReports} disabled={loading} color="primary">
            <RefreshIcon />
          </IconButton>
        </Paper>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 4, borderRadius: 3 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
          <CircularProgress color="inherit" />
        </Box>
      ) : (
        <>
          {/* Summary Stats */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard 
                label="Total Revenue" 
                value={`₹${summary?.total_sales.toLocaleString() || "0"}`} 
                trend="+12.5%" 
                trendType="up"
                icon={<TrendingUpIcon />} 
                color="#E9762B" 
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard 
                label="Total Orders" 
                value={summary?.total_orders || "0"} 
                trend="+5.2%" 
                trendType="up"
                icon={<ReceiptIcon />} 
                color="#FFD41D" 
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard 
                label="Avg. Order Value" 
                value={`₹${summary?.avg_order_value.toFixed(2) || "0"}`} 
                icon={<ShoppingBagIcon />} 
                color="#d35400" 
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard 
                label="Tax Collected" 
                value={`₹${summary?.total_tax.toLocaleString() || "0"}`} 
                icon={<TaxIcon />} 
                color="#CF0F0F" 
              />
            </Grid>
          </Grid>

          {/* Charts Row 1 */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, md: 8 }}>
              <DailySalesChart data={dailySales} title="Daily Sales Trend" />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <PaymentMethodChart data={salesByPayment} title="Revenue by Payment Method" />
            </Grid>
          </Grid>

          {/* Charts Row 2 */}
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <SalesByCategoryChart data={salesByCategory} title="Sales by Category" />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TopItemsChart data={salesByItem} title="Top 15 Selling Items (Qty)" />
            </Grid>
          </Grid>
          
          {/* Detailed breakdown link or footer */}
          <Box sx={{ mt: 6, textAlign: "center", p: 4, borderRadius: 4, bgcolor: "rgba(233,118,43,0.02)", border: "1px dashed #e8e4d8" }}>
            <Typography variant="body2" color="text.secondary">
              Need a more detailed CSV export? Contact your administrator for full data access.
            </Typography>
          </Box>
        </>
      )}
    </Box>
  );
}
