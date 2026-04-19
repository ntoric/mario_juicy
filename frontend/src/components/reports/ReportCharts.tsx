"use client";

import React, { useMemo } from "react";
import { Box, Paper, Typography, useTheme, Tooltip as MuiTooltip } from "@mui/material";

const COLORS = ["#E9762B", "#FFD41D", "#CF0F0F", "#d35400", "#f39c12", "#c0392b", "#8d6e63"];

interface ChartProps {
  data: any[];
  title: string;
  loading?: boolean;
}

/**
 * DailySalesChart implemented with native SVG
 */
export const DailySalesChart = ({ data, title }: ChartProps) => {
  const theme = useTheme();
  
  const points = useMemo(() => {
    if (!data || data.length === 0) return "";
    
    const width = 800;
    const height = 300;
    const maxSales = Math.max(...data.map(d => Number(d.sales)), 1);

    if (data.length === 1) {
      const x = 400;
      const y = height - (Number(data[0].sales) / maxSales) * height;
      return `${x},${y}`;
    }
    
    return data.map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - (Number(d.sales) / maxSales) * height;
      return `${x},${y}`;
    }).join(" ");
  }, [data]);

  const maxVal = Math.max(...(data?.map(d => Number(d.sales)) || [0]), 1);

  return (
    <Paper sx={{ p: 3, height: 400, display: "flex", flexDirection: "column" }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>{title}</Typography>
      <Box sx={{ width: "100%", flexGrow: 1, position: "relative" }}>
        {data && data.length > 0 ? (
          <svg viewBox="0 0 800 300" width="100%" height="100%" preserveAspectRatio="none">
            <defs>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E9762B" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#E9762B" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map(v => (
              <line 
                key={v} 
                x1="0" 
                y1={300 * v} 
                x2="800" 
                y2={300 * v} 
                stroke="#e8e4d8" 
                strokeWidth="1" 
                strokeDasharray="4,4" 
              />
            ))}
            {/* Area under the line */}
            {data.length > 1 && (
              <polyline
                fill="url(#lineGradient)"
                stroke="none"
                points={`0,300 ${points} 800,300`}
              />
            )}
            {/* The actual sales line */}
            {data.length > 1 && (
              <polyline
                fill="none"
                stroke="#E9762B"
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={points}
              />
            )}
            {/* Data nodes */}
            {data.map((d, i) => {
              const x = data.length > 1 ? (i / (data.length - 1)) * 800 : 400;
              const y = 300 - (Number(d.sales) / maxVal) * 300;
              return (
                <circle 
                  key={i} 
                  cx={x} 
                  cy={y} 
                  r="4" 
                  fill="#E9762B" 
                  stroke="#fff" 
                  strokeWidth="2" 
                />
              );
            })}
          </svg>
        ) : (
          <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Typography color="text.secondary">No data available for this range</Typography>
          </Box>
        )}
      </Box>
      {/* Legend/Labels */}
      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
        {data && data.length > 0 && [data[0], data[Math.floor(data.length/2)], data[data.length-1]].map((d, i) => (
          <Typography key={i} variant="caption" color="text.secondary">
            {d.date}
          </Typography>
        ))}
      </Box>
    </Paper>
  );
};

/**
 * SalesByCategoryChart implemented with custom CSS bars
 */
export const SalesByCategoryChart = ({ data, title }: ChartProps) => {
  const maxSales = Math.max(...(data?.map(d => Number(d.sales)) || [0]), 1);

  return (
    <Paper sx={{ p: 3, height: 400, display: "flex", flexDirection: "column" }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>{title}</Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, flexGrow: 1, overflowY: "auto" }}>
        {data && data.length > 0 ? data.map((d, i) => (
          <Box key={i}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{d.category}</Typography>
              <Typography variant="body2" color="text.secondary">₹{Number(d.sales).toLocaleString()}</Typography>
            </Box>
            <Box sx={{ width: "100%", height: 12, bgcolor: "#FCF9EA", borderRadius: 6, overflow: "hidden", border: "1px solid #e8e4d8" }}>
              <Box 
                sx={{ 
                  width: `${(Number(d.sales) / maxSales) * 100}%`, 
                  height: "100%", 
                  bgcolor: "#E9762B", 
                  borderRadius: 6,
                  transition: "width 0.8s ease-in-out"
                }} 
              />
            </Box>
          </Box>
        )) : (
          <Typography color="text.secondary" sx={{ textAlign: "center", mt: 4 }}>No data available</Typography>
        )}
      </Box>
    </Paper>
  );
};

/**
 * PaymentMethodChart implemented with CSS conic-gradient
 */
export const PaymentMethodChart = ({ data, title }: ChartProps) => {
  const total = useMemo(() => data?.reduce((acc, curr) => acc + Number(curr.sales), 0) || 0, [data]);
  
  const donutGradient = useMemo(() => {
    if (!data || data.length === 0 || total === 0) return "transparent";
    let currentPercentage = 0;
    const sectors = data.map((d, i) => {
      const percentage = (Number(d.sales) / total) * 100;
      const start = currentPercentage;
      currentPercentage += percentage;
      return `${COLORS[i % COLORS.length]} ${start}% ${currentPercentage}%`;
    });
    return `conic-gradient(${sectors.join(", ")})`;
  }, [data, total]);

  return (
    <Paper sx={{ p: 3, height: 400, display: "flex", flexDirection: "column" }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>{title}</Typography>
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexGrow: 1, gap: 4 }}>
        {data && data.length > 0 ? (
          <>
            <Box sx={{ 
              width: 160, 
              height: 160, 
              borderRadius: "50%", 
              background: donutGradient,
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
              "&::after": {
                content: '""',
                position: "absolute",
                width: 100,
                height: 100,
                bgcolor: "background.paper",
                borderRadius: "50%"
              }
            }}>
                <Typography variant="h6" sx={{ zIndex: 1, fontWeight: 700 }}>Pos</Typography>
            </Box>
            <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 2 }}>
              {data.map((d, i) => (
                <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: COLORS[i % COLORS.length] }} />
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>{d.method}</Typography>
                </Box>
              ))}
            </Box>
          </>
        ) : (
          <Typography color="text.secondary">No data available</Typography>
        )}
      </Box>
    </Paper>
  );
};

/**
 * TopItemsChart implemented with custom vertical bars
 */
export const TopItemsChart = ({ data, title }: ChartProps) => {
  const maxCount = Math.max(...(data?.map(d => Number(d.count)) || [0]), 1);

  return (
    <Paper sx={{ p: 3, height: 400, display: "flex", flexDirection: "column" }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>{title}</Typography>
      <Box sx={{ display: "flex", alignItems: "flex-end", gap: 2, flexGrow: 1, px: 2, pb: 2 }}>
        {data && data.length > 0 ? data.slice(0, 10).map((d, i) => (
           <MuiTooltip key={i} title={`${d.item}: ${d.count} units`} arrow>
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
              <Box 
                sx={{ 
                  width: "100%", 
                  height: `${(Number(d.count) / maxCount) * 200}px`, 
                  bgcolor: "#FFD41D", 
                  borderRadius: "4px 4px 0 0",
                  transition: "height 0.8s ease-out",
                  "&:hover": { bgcolor: "#f1c40f" }
                }} 
              />
              <Typography 
                variant="caption" 
                sx={{ 
                  whiteSpace: "nowrap", 
                  overflow: "hidden", 
                  textOverflow: "ellipsis", 
                  width: "100%", 
                  textAlign: "center",
                  fontSize: 10,
                  transform: "rotate(-45deg)",
                  mt: 1,
                  color: "text.secondary"
                }}
              >
                {d.item}
              </Typography>
            </Box>
          </MuiTooltip>
        )) : (
          <Box sx={{ width: "100%", textAlign: "center", mt: 4 }}>
            <Typography color="text.secondary">No data available</Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
};
