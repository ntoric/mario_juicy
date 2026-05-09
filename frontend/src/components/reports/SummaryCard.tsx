import React from "react";
import { Card, CardContent, Typography, Box, alpha } from "@mui/material";
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
    <Card sx={{ 
      height: '100%', 
      borderRadius: '20px', 
      border: '1px solid rgba(255, 255, 255, 0.8)', 
      background: 'rgba(255, 255, 255, 0.75)',
      backdropFilter: 'blur(20px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
      position: 'relative',
      overflow: 'hidden',
      '&:hover': { 
        transform: 'translateY(-4px)', 
        boxShadow: '0 12px 40px rgba(0,0,0,0.08)',
        '& .icon-box': {
          transform: 'scale(1.1) rotate(-5deg)',
          boxShadow: `0 8px 20px ${alpha(color, 0.2)}`
        }
      } 
    }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5 }}>
          <Box className="icon-box" sx={{ 
            p: 1.5, 
            borderRadius: '16px', 
            backgroundColor: alpha(color, 0.1), 
            color: color,
            display: 'flex',
            transition: 'all 0.3s ease',
            boxShadow: `0 4px 12px ${alpha(color, 0.1)}`
          }}>
            {React.cloneElement(icon as React.ReactElement<any>, { sx: { fontSize: 24 } })}
          </Box>
          {trend && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 0.5, 
              px: 1.2, 
              py: 0.5, 
              borderRadius: '10px', 
              bgcolor: trendType === "up" ? alpha("#10b981", 0.1) : alpha("#ef4444", 0.1),
              border: `1px solid ${trendType === "up" ? alpha("#10b981", 0.2) : alpha("#ef4444", 0.2)}`
            }}>
              {trendType === "up" ? <TrendingUpIcon sx={{ fontSize: 16, color: '#10b981' }} /> : <TrendingDownIcon sx={{ fontSize: 16, color: '#ef4444' }} />}
              <Typography variant="caption" sx={{ fontWeight: 900, color: trendType === "up" ? '#059669' : '#dc2626', fontSize: '0.7rem' }}>
                {trend}
              </Typography>
            </Box>
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75, fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 }}>
          {label}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 950, color: '#2c1810', letterSpacing: '-0.02em' }}>
          {value}
        </Typography>
      </CardContent>
      {/* Subtle decorative background gradient */}
      <Box sx={{ 
        position: 'absolute', 
        bottom: -20, 
        right: -20, 
        width: 100, 
        height: 100, 
        background: `radial-gradient(circle, ${alpha(color, 0.05)} 0%, transparent 70%)`,
        borderRadius: '50%',
        zIndex: 0
      }} />
    </Card>
  );
}
