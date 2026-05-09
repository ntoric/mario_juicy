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
  InputAdornment,
  alpha
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  Receipt as ReceiptIcon,
  ShoppingBag as ShoppingBagIcon,
  AccountBalanceWallet as TaxIcon,
  TrendingUp as TrendingUpIcon,
  CalendarToday as CalendarIcon
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

export default function ReportsPage() {
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
      position: 'relative', 
      height: '100%', 
      display: "flex", 
      flexDirection: "column", 
      p: { xs: 2, md: 3 }, 
      overflowX: 'hidden',
      overflowY: 'auto'
    }}>
      {/* Decorative blobs */}
      <Box sx={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, background: 'radial-gradient(circle, rgba(233,118,43,0.08) 0%, transparent 70%)', borderRadius: '50%', zIndex: 0, pointerEvents: 'none' }} />
      <Box sx={{ position: 'absolute', bottom: -80, left: -80, width: 350, height: 350, background: 'radial-gradient(circle, rgba(255,184,0,0.06) 0%, transparent 70%)', borderRadius: '50%', zIndex: 0, pointerEvents: 'none' }} />

      {/* Header Row */}
      <Box sx={{ 
        mb: 4, 
        display: 'flex', 
        justifyContent: "space-between", 
        alignItems: { xs: "flex-start", sm: "center" },
        flexDirection: { xs: "column", md: "row" },
        gap: 3,
        position: 'relative',
        zIndex: 1
      }}>
        <Box>
          <Typography variant="h4" sx={{ 
            fontWeight: 950, 
            fontSize: { xs: '1.75rem', md: '2.25rem' }, 
            background: 'linear-gradient(90deg, #E9762B 0%, #FFB800 100%)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent', 
            letterSpacing: '-0.03em', 
            mb: 0.5 
          }}>
            Analytical Reports
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, opacity: 0.8 }}>
            Track your business performance and sales trends.
          </Typography>
        </Box>
        
        <Stack 
          direction={{ xs: "column", sm: "row" }} 
          spacing={2} 
          sx={{ 
            alignItems: 'center', 
            width: { xs: '100%', md: 'auto' },
            p: 1,
            bgcolor: 'rgba(233,118,43,0.04)',
            borderRadius: '20px',
            border: '1px solid rgba(233,118,43,0.1)'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: { xs: '100%', sm: 'auto' } }}>
            <TextField
              type="date"
              size="small"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              slotProps={{ 
                input: { 
                  sx: { borderRadius: '14px', height: 44, bgcolor: 'white', border: 'none', fontWeight: 700, fontSize: '0.85rem' },
                  startAdornment: <InputAdornment position="start"><CalendarIcon sx={{ fontSize: 18, color: '#E9762B' }} /></InputAdornment>
                } 
              }}
              sx={{ width: { xs: '100%', sm: 160 } }}
            />
            <Typography variant="caption" sx={{ fontWeight: 900, color: 'text.disabled', display: { xs: 'none', sm: 'block' } }}>TO</Typography>
            <TextField
              type="date"
              size="small"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              slotProps={{ 
                input: { 
                  sx: { borderRadius: '14px', height: 44, bgcolor: 'white', border: 'none', fontWeight: 700, fontSize: '0.85rem' },
                  startAdornment: <InputAdornment position="start"><CalendarIcon sx={{ fontSize: 18, color: '#E9762B' }} /></InputAdornment>
                } 
              }}
              sx={{ width: { xs: '100%', sm: 160 } }}
            />
          </Box>
          
          <Button 
            variant="contained" 
            onClick={fetchReports} 
            disabled={loading}
            sx={{ 
              height: 44, 
              minWidth: 44, 
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #E9762B 0%, #D35400 100%)',
              boxShadow: '0 8px 20px rgba(233,118,43,0.2)',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 24px rgba(233,118,43,0.3)' }
            }}
          >
            <RefreshIcon sx={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </Button>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 4, borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: 'center', flexGrow: 1, minHeight: 400 }}>
          <CircularProgress sx={{ color: '#E9762B' }} />
        </Box>
      ) : (
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          {/* Summary Stats */}
          <Grid container spacing={3} sx={{ mb: 5 }}>
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
                color="#FFB800" 
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
            mt: 4, 
            mb: 2,
            textAlign: "center", 
            p: 4, 
            borderRadius: '24px', 
            background: 'rgba(255, 255, 255, 0.5)',
            border: "1px dashed rgba(233,118,43,0.3)",
            backdropFilter: 'blur(10px)'
          }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, opacity: 0.8 }}>
              Need a more detailed CSV export? Contact your administrator for full data access.
            </Typography>
          </Box>
        </Box>
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
