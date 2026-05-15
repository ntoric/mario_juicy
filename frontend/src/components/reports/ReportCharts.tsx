"use client";
import { alpha } from "@mui/material/styles";

import React, { useMemo, useCallback } from "react";
import { Box, Paper, Typography, useTheme, Tooltip as MuiTooltip } from "@mui/material";

const COLORS = ["#E9762B", "#FFB800", "#CF0F0F", "#d35400", "#f39c12", "#c0392b", "#8d6e63"];

interface ChartProps {
  data: any[];
  title: string;
  loading?: boolean;
}

/**
 * Finds the closest scrollable ancestor of `el` (excluding itself).
 * Used to forward wheel events from chart widgets to the page scroller.
 */
function getScrollableParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node) {
    const { overflowY } = window.getComputedStyle(node);
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

/**
 * Returns an onWheel handler that forwards scroll to the nearest scrollable ancestor.
 * This prevents chart containers (overflow:hidden / internal overflowY:auto) from
 * swallowing wheel events when the pointer is hovering over them.
 */
function useForwardWheel() {
  return useCallback((e: React.WheelEvent<HTMLElement>) => {
    const scrollable = getScrollableParent(e.currentTarget as HTMLElement);
    if (scrollable) {
      scrollable.scrollTop += e.deltaY;
    }
  }, []);
}

const ChartContainer = ({ children, title }: { children: React.ReactNode, title: string }) => {
  const forwardWheel = useForwardWheel();
  return (
    <Paper
      onWheel={forwardWheel}
      sx={{
        p: 3,
        height: 400,
        display: "flex",
        flexDirection: "column",
        borderRadius: '0.65rem',
        border: '1px solid rgba(255, 255, 255, 0.8)',
        background: 'rgba(255, 255, 255, 0.75)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
        overflow: 'hidden'
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 900, mb: 3, color: '#2c1810', fontSize: '1.1rem', letterSpacing: '-0.01em' }}>{title}</Typography>
      {children}
    </Paper>
  );
};

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
    <ChartContainer title={title}>
      <Box sx={{ width: "100%", flexGrow: 1, position: "relative" }}>
        {data && data.length > 0 ? (
          <svg viewBox="0 0 800 300" width="100%" height="100%" preserveAspectRatio="none">
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E9762B" stopOpacity="0.15" />
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
                stroke={alpha(theme.palette.primary.main, 0.1)} 
                strokeWidth = "1" 
                strokeDasharray = "4,4"
              />
            ))}
            {/* Area under the line */}
            {data.length > 1 && (
              <polyline
                fill="url(#areaGradient)"
                stroke="none"
                points={`0,300 ${points} 800,300`}
              />
            )}
            {/* The actual sales line */}
            {data.length > 1 && (
              <polyline
                fill="none"
                stroke="#E9762B"
                strokeWidth="4"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={points}
                style={{ filter: `drop-shadow(0px 4px 8px ${alpha(theme.palette.primary.main, 0.2)})` }}
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
                  r="5"
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
      <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
        {data && data.length > 0 && [data[0], data[Math.floor(data.length / 2)], data[data.length - 1]].map((d, i) => (
          <Typography key={i} variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', opacity: 0.8 }}>
            {d.date}
          </Typography>
        ))}
      </Box>
    </ChartContainer>
  );
};

/**
 * SalesByCategoryChart implemented with custom CSS bars
 */
export const SalesByCategoryChart = ({ data, title }: ChartProps) => {
  const theme = useTheme();
  const maxSales = Math.max(...(data?.map(d => Number(d.sales)) || [0]), 1);
  const forwardWheel = useForwardWheel();

  return (
    <ChartContainer title={title}>
      <Box onWheel={forwardWheel} sx={{ display: "flex", flexDirection: "column", gap: 2.5, flexGrow: 1, overflowY: "auto", pr: 1 }}>
        {data && data.length > 0 ? data.map((d, i) => (
          <Box key={i}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.75 }}>
              <Typography variant="body2" sx={{ fontWeight: 800, color: '#2c1810' }}>{d.category}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 900, color: '#E9762B' }}>₹{Number(d.sales).toLocaleString()}</Typography>
            </Box>
            <Box sx={{ width: "100%", height: 10, bgcolor: alpha(theme.palette.primary.main, 0.06), borderRadius: '0.65rem', overflow: "hidden" }}>
              <Box
                sx={{
                  width: `${(Number(d.sales) / maxSales) * 100}%`,
                  height: "100%",
                  background: 'linear-gradient(90deg, #E9762B 0%, #FFB800 100%)',
                  borderRadius: '0.65rem',
                  transition: "width 1s cubic-bezier(0.4, 0, 0.2, 1)"
                }}
              />
            </Box>
          </Box>
        )) : (
          <Typography color="text.secondary" sx={{ textAlign: "center", mt: 4 }}>No data available</Typography>
        )}
      </Box>
    </ChartContainer>
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
    <ChartContainer title={title}>
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexGrow: 1, gap: 4 }}>
        {data && data.length > 0 ? (
          <>
            <Box sx={{
              width: 170,
              height: 170,
              borderRadius: "50%",
              background: donutGradient,
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 12px 24px rgba(0,0,0,0.1)",
              transition: 'transform 0.3s ease',
              '&:hover': { transform: 'scale(1.05)' },
              "&::after": {
                content: '""',
                position: "absolute",
                width: 110,
                height: 110,
                bgcolor: "white",
                borderRadius: "50%",
                boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.05)'
              }
            }}>
              <Box sx={{ zIndex: 1, textAlign: 'center' }}>
                <Typography variant="h5" sx={{ fontWeight: 950, color: '#2c1810' }}>Pos</Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block' }}>REVENUE</Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 2.5 }}>
              {data.map((d, i) => (
                <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box sx={{ width: 12, height: 12, borderRadius: '0.65rem', bgcolor: COLORS[i % COLORS.length] }} />
                  <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>{d.method}</Typography>
                </Box>
              ))}
            </Box>
          </>
        ) : (
          <Typography color="text.secondary">No data available</Typography>
        )}
      </Box>
    </ChartContainer>
  );
};

/**
 * TopItemsChart implemented with custom vertical bars
 */
export const TopItemsChart = ({ data, title }: ChartProps) => {
  const theme = useTheme();
  const maxCount = Math.max(...(data?.map(d => Number(d.count)) || [0]), 1);

  return (
    <ChartContainer title={title}>
      <Box sx={{ display: "flex", alignItems: "flex-end", gap: { xs: 1, sm: 2 }, flexGrow: 1, px: 1, pb: 4 }}>
        {data && data.length > 0 ? data.slice(0, 10).map((d, i) => (
          <MuiTooltip key={i} title={`${d.item}: ${d.count} units`} arrow>
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5 }}>
              <Box
                sx={{
                  width: "100%",
                  height: `${(Number(d.count) / maxCount) * 180}px`,
                  background: 'linear-gradient(180deg, #FFB800 0%, #E9762B 100%)',
                  borderRadius: '0.65rem 0.65rem 0 0',
                  transition: "height 1s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.1)}`,
                  "&:hover": { filter: 'brightness(1.1)', transform: 'translateY(-2px)' }
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
                  fontWeight: 800,
                  transform: "rotate(-45deg)",
                  mt: 1.5,
                  color: "text.secondary",
                  opacity: 0.8
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
    </ChartContainer>
  );
};
