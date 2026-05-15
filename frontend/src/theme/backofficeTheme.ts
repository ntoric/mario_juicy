"use client";

import { createTheme, alpha } from "@mui/material/styles";
import { Outfit } from "next/font/google";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const backofficeTheme = createTheme({
  palette: {
    primary: {
      main: "#E9762B",
      light: "#FF9D5C",
      dark: "#B85C1D",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#FFD41D",
      light: "#FFE36D",
      dark: "#C7A600",
      contrastText: "#2c1810",
    },
    error: {
      main: "#CF0F0F",
    },
    background: {
      default: "#fcf9f2",
      paper: "#ffffff",
    },
    text: {
      primary: "#2c1810",
      secondary: "#7b6158",
    },
    action: {
      selected: alpha("#E9762B", 0.12),
      hover: alpha("#E9762B", 0.06),
    },
    divider: "rgba(44, 24, 16, 0.06)",
  },
  typography: {
    fontFamily: outfit.style.fontFamily,
    fontSize: 14,
    h1: { fontWeight: 800, color: "#2c1810", letterSpacing: "-0.025em" },
    h2: { fontWeight: 800, color: "#2c1810", letterSpacing: "-0.02em" },
    h3: { fontWeight: 700, color: "#2c1810", letterSpacing: "-0.015em" },
    h4: { fontWeight: 700, color: "#2c1810", letterSpacing: "-0.01em" },
    h5: { fontWeight: 700, color: "#2c1810" },
    h6: { fontWeight: 700, color: "#2c1810" },
    body1: { lineHeight: 1.6 },
    body2: { lineHeight: 1.5 },
    button: {
      textTransform: "none",
      fontWeight: 600,
      letterSpacing: "0.01em",
    },
    caption: {
      letterSpacing: "0.02em",
    },
  },
  shape: {
    borderRadius: 10, // ≈ 0.65rem — universal base unit
  },
  transitions: {
    easing: {
      easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
      easeOut: "cubic-bezier(0, 0, 0.2, 1)",
      easeIn: "cubic-bezier(0.4, 0, 1, 1)",
      sharp: "cubic-bezier(0.4, 0, 0.6, 1)",
    },
    duration: {
      shortest: 100,
      shorter: 150,
      short: 200,
      standard: 250,
      complex: 350,
      enteringScreen: 225,
      leavingScreen: 175,
    },
  },
  components: {
    // ── Buttons ──────────────────────────────────────────────────
    MuiButton: {
      defaultProps: {
        disableElevation: true,
        disableRipple: false,
      },
      styleOverrides: {
        root: {
          borderRadius: "0.65rem",
          boxShadow: "none",
          fontWeight: 600,
          fontSize: "0.875rem",
          transition: "all 0.18s cubic-bezier(0.4, 0, 0.2, 1)",
          "&:hover": {
            boxShadow: "none",
            transform: "translateY(-1px)",
          },
          "&:active": {
            transform: "translateY(0)",
          },
        },
      },
    },

    // ── Icon Buttons ─────────────────────────────────────────────
    MuiIconButton: {
      defaultProps: { disableRipple: false },
      styleOverrides: {
        root: {
          borderRadius: "0.65rem",
          transition: "all 0.18s cubic-bezier(0.4, 0, 0.2, 1)",
          "&:hover": { transform: "scale(1.05)" },
          "&:active": { transform: "scale(0.97)" },
        },
      },
    },

    // ── Paper / Cards ─────────────────────────────────────────────
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: "0.65rem",
          boxShadow: "none",
          backgroundImage: "none",
        },
        elevation1: {
          boxShadow: "0 2px 8px rgba(44, 24, 16, 0.06)",
        },
        elevation2: {
          boxShadow: "0 4px 16px rgba(44, 24, 16, 0.08)",
        },
      },
    },

    // ── Card ──────────────────────────────────────────────────────
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: "0.65rem",
          boxShadow: "none",
          border: "1px solid rgba(44, 24, 16, 0.06)",
          backgroundColor: "#ffffff",
          backgroundImage: "none",
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
        },
      },
    },

    // ── Drawer (sidebar) ──────────────────────────────────────────
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: "#ffffff",
          color: "#2c1810",
          borderRight: "none",
          boxShadow: "none",
        },
      },
    },

    // ── AppBar ────────────────────────────────────────────────────
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "rgba(252, 249, 242, 0.92)",
          backdropFilter: "blur(16px) saturate(180%)",
          WebkitBackdropFilter: "blur(16px) saturate(180%)",
          color: "#2c1810",
          boxShadow: "none",
          borderBottom: "none",
          borderRadius: 0,
        },
      },
    },

    // ── Inputs / TextFields ───────────────────────────────────────
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: "0.65rem",
          transition: "box-shadow 0.18s ease, border-color 0.18s ease",
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: alpha("#E9762B", 0.4),
          },
          "&.Mui-focused": {
            boxShadow: `0 0 0 3px ${alpha("#E9762B", 0.12)}`,
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#E9762B",
            borderWidth: "1.5px",
          },
        },
        notchedOutline: {
          borderColor: "rgba(44, 24, 16, 0.12)",
          transition: "border-color 0.18s ease",
        },
      },
    },

    // ── Select ────────────────────────────────────────────────────
    MuiSelect: {
      styleOverrides: {
        icon: {
          color: alpha("#2c1810", 0.4),
        },
      },
    },

    // ── Menu / Dropdown ───────────────────────────────────────────
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: "0.65rem",
          boxShadow: "0 8px 32px rgba(44, 24, 16, 0.12)",
          border: "1px solid rgba(44, 24, 16, 0.06)",
          backgroundImage: "none",
        },
      },
    },

    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: "0.65rem",
          transition: "background 0.14s ease",
          fontSize: "0.875rem",
          fontWeight: 500,
          "&:hover": {
            backgroundColor: alpha("#E9762B", 0.06),
          },
          "&.Mui-selected": {
            backgroundColor: alpha("#E9762B", 0.1),
            "&:hover": { backgroundColor: alpha("#E9762B", 0.14) },
          },
        },
      },
    },

    // ── Tooltip ───────────────────────────────────────────────────
    MuiTooltip: {
      defaultProps: {
        arrow: true,
        enterDelay: 300,
        enterNextDelay: 100,
      },
      styleOverrides: {
        tooltip: {
          borderRadius: "0.65rem",
          fontSize: "0.75rem",
          fontWeight: 600,
          backgroundColor: "#2c1810",
          padding: "5px 10px",
        },
        arrow: {
          color: "#2c1810",
        },
      },
    },

    // ── Chip ─────────────────────────────────────────────────────
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: "0.65rem",
          fontWeight: 600,
          fontSize: "0.75rem",
          height: "26px",
        },
      },
    },

    // ── Table ─────────────────────────────────────────────────────
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: "1px solid rgba(44, 24, 16, 0.05)",
          fontSize: "0.875rem",
          padding: "10px 16px",
        },
        head: {
          fontWeight: 700,
          fontSize: "0.75rem",
          letterSpacing: "0.05em",
          color: alpha("#2c1810", 0.5),
          textTransform: "uppercase",
          backgroundColor: "transparent",
        },
      },
    },

    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: "background-color 0.14s ease",
          "&:last-child td": { borderBottom: 0 },
        },
      },
    },

    // ── Dialog / Modal ────────────────────────────────────────────
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: "0.65rem",
          boxShadow: "0 24px 64px rgba(44, 24, 16, 0.14)",
          backgroundImage: "none",
        },
        backdrop: {
          backgroundColor: "rgba(44, 24, 16, 0.3)",
          backdropFilter: "blur(4px)",
        },
      },
    },

    // ── Tabs ──────────────────────────────────────────────────────
    MuiTab: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: "0.875rem",
          textTransform: "none",
          minHeight: "48px",
          transition: "color 0.18s ease",
        },
      },
    },

    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: "2px",
          borderRadius: "0.65rem 0.65rem 0 0",
        },
      },
    },

    // ── Snackbar / Alert ──────────────────────────────────────────
    MuiSnackbar: {
      styleOverrides: {
        root: {
          "& .MuiSnackbarContent-root": {
            borderRadius: "0.65rem",
          },
        },
      },
    },

    // ── Skeleton ──────────────────────────────────────────────────
    MuiSkeleton: {
      defaultProps: { animation: "wave" },
      styleOverrides: {
        root: { borderRadius: "0.65rem" },
      },
    },

    // ── LinearProgress ────────────────────────────────────────────
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: "0.65rem", height: "4px" },
      },
    },

    // ── Switch ────────────────────────────────────────────────────
    MuiSwitch: {
      styleOverrides: {
        root: {
          padding: 6,
        },
        thumb: {
          boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
        },
        track: {
          borderRadius: "100px",
          opacity: 0.25,
        },
      },
    },

    // ── List Item Buttons ─────────────────────────────────────────
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: "0.65rem",
          transition: "background 0.14s ease, transform 0.14s ease",
        },
      },
    },

    // ── Divider ───────────────────────────────────────────────────
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: "rgba(44, 24, 16, 0.06)",
        },
      },
    },
  },
});
