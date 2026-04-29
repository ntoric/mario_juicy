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

import { alpha } from "@mui/material";

export default function SummaryCard({ label, value, trend, trendType, icon, color }: SummaryCardProps) {
  return (
    <Card sx={{ 
      height: '100%', 
      borderRadius: '7px', 
      border: '1px solid #e8e4d8', 
      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
      transition: 'all 0.2s', 
      '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' } 
    }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ 
            p: 1.2, 
            borderRadius: '7px', 
            backgroundColor: alpha(color, 0.08), 
            color: color,
            display: 'flex',
          }}>
            {React.cloneElement(icon as React.ReactElement<any>, { sx: { fontSize: 20 } })}
          </Box>
          {trend && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 0.5, 
              px: 1, 
              py: 0.3, 
              borderRadius: '5px', 
              bgcolor: trendType === "up" ? alpha("#10b981", 0.08) : alpha("#ef4444", 0.08) 
            }}>
              {trendType === "up" ? <TrendingUpIcon sx={{ fontSize: 14, color: '#10b981' }} /> : <TrendingDownIcon sx={{ fontSize: 14, color: '#ef4444' }} />}
              <Typography variant="caption" sx={{ fontWeight: 800, color: trendType === "up" ? '#10b981' : '#ef4444', fontSize: '0.65rem' }}>
                {trend}
              </Typography>
            </Box>
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
          {label}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 900, color: '#1a1a1a' }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}
