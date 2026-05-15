"use client";
import { useTheme , alpha} from "@mui/material/styles";
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
  InputAdornment,
} from "@mui/material";
import {
  Refresh as RefreshIcon,
  Receipt as ReceiptIcon,
  Store as StoreIcon,
  TrendingUp as TrendingUpIcon,
  CalendarToday as CalendarIcon
} from "@mui/icons-material";
import { reportService, BusinessStatistics } from "@/services/reportService";
import SummaryCard from "@/components/reports/SummaryCard";
import { useAuth } from "@/hooks/useAuth";
import PageHeader from "@/components/backoffice/PageHeader";

const formatDate = (date: Date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getStartOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const getEndOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);

export default function BusinessStatisticsPage() {
  const theme = useTheme();
  const [startDate, setStartDate] = useState(formatDate(getStartOfMonth(new Date())));
  const [endDate, setEndDate] = useState(formatDate(getEndOfMonth(new Date())));
  
  const { activeStoreId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<BusinessStatistics | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await reportService.getBusinessStatistics({ start_date: startDate, end_date: endDate });
      setStats(data);
    } catch (err: any) {
      console.error("Failed to fetch business stats:", err);
      setError(err.message || "An error occurred while fetching business statistics.");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, activeStoreId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 }, height: '100%', overflowY: 'auto' }}>
      <PageHeader>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, fontSize: '2rem', background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', mb: 0.5 }}>
            Business Statistics
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ p: 1, bgcolor: alpha(theme.palette.primary.main, 0.04), borderRadius: '0.65rem', border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}` }}>
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
            onClick={fetchStats} 
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
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <SummaryCard 
              label={`Total Revenue (${activeStoreId ? 'Selected Store' : 'All Stores'})`} 
              value={`₹${stats?.total_revenue.toLocaleString() || "0"}`} 
              icon={<TrendingUpIcon />} 
              color={theme.palette.primary.main} 
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <SummaryCard 
              label="Total Orders" 
              value={stats?.total_orders || "0"} 
              icon={<ReceiptIcon />} 
              color={theme.palette.secondary.main} 
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <SummaryCard 
              label="Active Stores" 
              value={stats?.total_stores || "0"} 
              icon={<StoreIcon />} 
              color={theme.palette.primary.dark} 
            />
          </Grid>
        </Grid>
      )}

      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </Box>
  );
}
