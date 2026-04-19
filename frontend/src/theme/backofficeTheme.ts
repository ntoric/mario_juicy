"use client";

import { createTheme } from "@mui/material/styles";
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
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#FFD41D", // Yellow
      contrastText: "#2c1810",
    },
    error: {
      main: "#CF0F0F", // Red
    },
    background: {
      default: "#FCF9EA", // Cream
      paper: "#ffffff",
    },
    text: {
      primary: "#2c1810", // Dark Brown
      secondary: "#5d4037", // Muted Brown
    },
    divider: "#e8e4d8",
  },
  typography: {
    fontFamily: outfit.style.fontFamily,
    h1: { fontWeight: 700, color: "#2c1810" },
    h2: { fontWeight: 700, color: "#2c1810" },
    h3: { fontWeight: 600, color: "#2c1810" },
    h4: { fontWeight: 600, color: "#2c1810" },
    h5: { fontWeight: 600, color: "#2c1810" },
    h6: { fontWeight: 600, color: "#2c1810" },
    button: {
      textTransform: "none",
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          padding: "8px 16px",
          boxShadow: "none",
          "&:hover": {
            boxShadow: "none",
          },
        },
        contained: {
          "&.MuiButton-containedPrimary": {
            backgroundColor: "#E9762B",
            "&:hover": {
              backgroundColor: "#d35400",
            },
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: "0 4px 6px -1px rgba(44, 24, 16, 0.05), 0 2px 4px -2px rgba(44, 24, 16, 0.05)",
          border: "1px solid #e8e4d8",
          backgroundColor: "#ffffff",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: "#E9762B",
          color: "#ffffff",
          border: "none",
        },
      },
    },
  },
});
