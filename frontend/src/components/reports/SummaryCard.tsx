import React from "react";
import { Card, CardContent, Typography, Box } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";

interface SummaryCardProps {
  label: string;
  value: string | number;
  trend?: string;
  trendType?: "up" | "down";
  icon: React.ReactNode;
  color: string;
}

export default function SummaryCard({ label, value, trend, trendType, icon, color }: SummaryCardProps) {
  return (
    <Card sx={{ height: '100%', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ 
            p: 1.5, 
            borderRadius: 3, 
            backgroundColor: `${color}15`, 
            color: color,
            display: 'flex',
            boxShadow: `0 8px 16px -4px ${color}20`
          }}>
            {icon}
          </Box>
          {trend && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.5, borderRadius: 1.5, bgcolor: trendType === "up" ? "#10b98115" : "#ef444415" }}>
              {trendType === "up" ? <TrendingUpIcon sx={{ fontSize: 16, color: '#10b981' }} /> : <TrendingDownIcon sx={{ fontSize: 16, color: '#ef4444' }} />}
              <Typography variant="caption" sx={{ fontWeight: 700, color: trendType === "up" ? '#10b981' : '#ef4444' }}>
                {trend}
              </Typography>
            </Box>
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 600, letterSpacing: '0.01em' }}>
          {label}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}
