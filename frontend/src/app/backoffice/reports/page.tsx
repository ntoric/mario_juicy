"use client";
import { useTheme, alpha } from "@mui/material/styles";
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
  InputAdornment
} from "@mui/material";
import {
  RefreshOutlined as RefreshIcon,
  ReceiptOutlined as ReceiptIcon,
  ShoppingBagOutlined as ShoppingBagIcon,
  AccountBalanceWalletOutlined as TaxIcon,
  TrendingUpOutlined as TrendingUpIcon,
  CalendarTodayOutlined as CalendarIcon
} from "@mui/icons-material";

// Helper functions for date handling
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
import PageHeader from "@/components/backoffice/PageHeader";

export default function ReportsPage() {
  const theme = useTheme();
  const [startDate, setStartDate] = useState(formatDate(getStartOfMonth(new Date())));
  const [endDate, setEndDate] = useState(formatDate(getEndOfMonth(new Date())));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      console.error("Failed to fetch reports:", err);
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

  return (
    <Box sx={{
      p: { xs: 1.5, md: 2 },
      pb: 4,
    }}>
      {/* Header Row — portalled into sub-navbar */}
      <PageHeader>
        <Box>
          <Typography variant="h4" sx={{
            fontWeight: 800,
            background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em',
          }}>
            Analytical Reports
          </Typography>
        </Box>

        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: 'center',
            p: 0.75,
            bgcolor: alpha(theme.palette.primary.main, 0.04),
            borderRadius: '0.65rem',
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              type="date"
              size="small"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              slotProps={{
                input: {
                  sx: { borderRadius: '0.5rem', bgcolor: 'white', fontWeight: 700, fontSize: '0.8rem' },
                  startAdornment: <InputAdornment position="start"><CalendarIcon sx={{ fontSize: 16, color: theme.palette.primary.main }} /></InputAdornment>
                }
              }}
              sx={{ width: 145 }}
            />
            <Typography variant="caption" sx={{ fontWeight: 900, color: 'text.disabled' }}>TO</Typography>
            <TextField
              type="date"
              size="small"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              slotProps={{
                input: {
                  sx: { borderRadius: '0.5rem', bgcolor: 'white', fontWeight: 700, fontSize: '0.8rem' },
                  startAdornment: <InputAdornment position="start"><CalendarIcon sx={{ fontSize: 16, color: theme.palette.primary.main }} /></InputAdornment>
                }
              }}
              sx={{ width: 145 }}
            />
          </Box>

          <Button
            variant="contained"
            onClick={fetchReports}
            disabled={loading}
            sx={{
              minWidth: 36,
              width: 36,
              height: 36,
              p: 0,
              borderRadius: '0.5rem',
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.25)}`,
              '&:hover': { transform: 'translateY(-1px)', boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.3)}` }
            }}
          >
            <RefreshIcon sx={{ fontSize: 18, animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </Button>
        </Stack>
      </PageHeader>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '0.65rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: 'center', minHeight: 400 }}>
          <CircularProgress sx={{ color: theme.palette.primary.main }} />
        </Box>
      ) : (
        <>
          {/* Summary Stats */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard
                label="Total Revenue"
                value={`₹${summary?.total_sales.toLocaleString() || "0"}`}
                trend="+12.5%"
                trendType="up"
                icon={<TrendingUpIcon />}
                color={theme.palette.primary.main}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard
                label="Total Orders"
                value={summary?.total_orders || "0"}
                trend="+5.2%"
                trendType="up"
                icon={<ReceiptIcon />}
                color={theme.palette.secondary.main}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <SummaryCard
                label="Avg. Order Value"
                value={`₹${summary?.avg_order_value.toFixed(2) || "0"}`}
                icon={<ShoppingBagIcon />}
                color={theme.palette.primary.dark}
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

          {/* Charts Rows */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, lg: 8 }}>
              <DailySalesChart data={dailySales} title="Daily Sales Trend" />
            </Grid>
            <Grid size={{ xs: 12, lg: 4 }}>
              <PaymentMethodChart data={salesByPayment} title="Revenue by Payment" />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <SalesByCategoryChart data={salesByCategory} title="Sales by Category" />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TopItemsChart data={salesByItem} title="Top Selling Items (Qty)" />
            </Grid>
          </Grid>

          {/* Footer Info Box */}
          <Box sx={{
            textAlign: "center",
            p: 3,
            borderRadius: '0.65rem',
            background: 'rgba(255, 255, 255, 0.5)',
            border: `1px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
          }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, opacity: 0.8 }}>
              Need a more detailed CSV export? Contact your administrator for full data access.
            </Typography>
          </Box>
        </>
      )}

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Box>
  );
}
