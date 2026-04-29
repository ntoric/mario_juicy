"use client";

import { createTheme, alpha } from "@mui/material/styles";
import { Outfit } from "next/font/google";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const backofficeTheme = createTheme({
  palette: {
    primary: {
      main: "#E9762B", // Orange
      light: "#FF9D5C",
      dark: "#B85C1D",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#FFD41D", // Yellow
      light: "#FFE36D",
      dark: "#C7A600",
      contrastText: "#2c1810",
    },
    error: {
      main: "#CF0F0F", // Red
    },
    background: {
      default: "#fcf9f2", // Slightly refined Cream
      paper: "#ffffff",
    },
    text: {
      primary: "#2c1810", // Dark Brown
      secondary: "#7b6158", // Muted Brown
    },
    action: {
      selected: alpha("#E9762B", 0.12),
      hover: alpha("#E9762B", 0.06),
    },
    divider: "#e8e4d8",
  },
  typography: {
    fontFamily: outfit.style.fontFamily,
    h1: { fontWeight: 800, color: "#2c1810" },
    h2: { fontWeight: 800, color: "#2c1810" },
    h3: { fontWeight: 700, color: "#2c1810" },
    h4: { fontWeight: 700, color: "#2c1810" },
    h5: { fontWeight: 700, color: "#2c1810" },
    h6: { fontWeight: 700, color: "#2c1810" },
    button: {
      textTransform: "none",
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 7,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          padding: "10px 24px",
          borderRadius: "7px",
          boxShadow: "none",
          fontWeight: 700,
          "&:hover": {
            boxShadow: "0 8px 20px rgba(233, 118, 43, 0.15)",
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: "7px",
          boxShadow: "0 4px 20px 0 rgba(44, 24, 16, 0.03)",
          border: "1px solid rgba(44, 24, 16, 0.05)",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: "7px",
          boxShadow: "0 10px 40px rgba(44, 24, 16, 0.04)",
          border: "1px solid rgba(232, 228, 216, 0.5)",
          backgroundColor: "#ffffff",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: "#ffffff",
          color: "#2c1810",
          borderRight: "1px solid rgba(44, 24, 16, 0.05)",
          boxShadow: "none",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "rgba(255, 255, 255, 0.8)",
          backdropFilter: "blur(12px)",
          color: "#2c1810",
          boxShadow: "none",
          borderBottom: "1px solid rgba(44, 24, 16, 0.05)",
        },
      },
    },
  },
});

