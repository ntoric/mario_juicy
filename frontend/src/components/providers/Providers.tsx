'use client';

import React from 'react';
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { backofficeTheme } from "@/theme/backofficeTheme";
import { WebSocketProvider } from '../../context/WebSocketContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={backofficeTheme}>
        <CssBaseline />
        <WebSocketProvider>
          {children}
        </WebSocketProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
