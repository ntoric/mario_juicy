"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { styled, useTheme, Theme, CSSObject, alpha } from "@mui/material/styles";
import { logout } from "@/lib/auth";
import {
  Box,
  useMediaQuery,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Paper,
  Button,
  BottomNavigation,
  BottomNavigationAction,
  Menu,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
} from "@mui/material";
import MuiDrawer from "@mui/material/Drawer";
import MuiAppBar, { AppBarProps as MuiAppBarProps } from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import List from "@mui/material/List";
import CssBaseline from "@mui/material/CssBaseline";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import {
  RefreshOutlined as RefreshIcon,
  MenuOutlined as MenuIcon,
  ChevronLeftOutlined as ChevronLeftIcon,
  ChevronRightOutlined as ChevronRightIcon,
  DashboardOutlined as DashboardIcon,
  Inventory2Outlined as InventoryIcon,
  CategoryOutlined as CategoryIcon,
  ShoppingCartOutlined as ShoppingCartIcon,
  PeopleOutlined as PeopleIcon,
  AssessmentOutlined as BarChartIcon,
  SettingsOutlined as SettingsIcon,
  LogoutOutlined as LogoutIcon,
  EventNoteOutlined as ReservationIcon,
  ReceiptLongOutlined as OrdersIcon,
  KitchenOutlined as KitchenIcon,
  TableRestaurantOutlined as TableIcon,
  ShoppingBagOutlined as ShoppingBagIcon,
  ReceiptOutlined as ReceiptIcon,
  StoreOutlined as StoreIcon,
  LockPersonOutlined as LockPersonIcon,

  NotificationsOutlined as NotificationsIcon,
  AddOutlined as AddIcon,
  ContactSupportOutlined as SupportIcon,
  SettingsApplicationsOutlined as SettingsApplicationsIcon,
  TrendingUpOutlined as TrendingUpIcon,
} from "@mui/icons-material";
import Fab from "@mui/material/Fab";
import { restaurantService, Table } from "@/services/restaurantService";
import OrderDialog from "@/components/backoffice/restaurant/OrderDialog";
import Avatar from "@mui/material/Avatar";
import Tooltip from "@mui/material/Tooltip";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import StoreSwitcher from './StoreSwitcher';
import NotificationDropdown from './NotificationDropdown';
import ForceChangePasswordDialog from '../auth/ForceChangePasswordDialog';

const drawerWidth = 260;

const openedMixin = (theme: Theme): CSSObject => ({
  width: drawerWidth,
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: "hidden",
  borderRight: 'none',
});

const closedMixin = (theme: Theme): CSSObject => ({
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: "hidden",
  width: `calc(${theme.spacing(8)} + 1px)`,
  [theme.breakpoints.up("sm")]: {
    width: `calc(${theme.spacing(10)} + 1px)`,
  },
  borderRight: 'none',
});

const HeaderHeight = 64;

const AppBar = styled(MuiAppBar)(({ theme }) => ({
  zIndex: theme.zIndex.drawer - 1,
  backgroundColor: alpha("#ffffff", 0.8),
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  color: theme.palette.text.primary,
  boxShadow: "none",
  borderRadius: 0,
  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
  height: HeaderHeight,
  display: 'flex',
  justifyContent: 'center',
  paddingTop: "env(safe-area-inset-top, 0px)",
  [theme.breakpoints.down("md")]: {
    backgroundColor: theme.palette.primary.main,
    color: "#ffffff",
    backdropFilter: "none",
    borderBottom: "none",
  },
}));

const Drawer = styled(MuiDrawer)(({ theme, open }) => ({
  flexShrink: 0,
  whiteSpace: "nowrap",
  boxSizing: "border-box",
  height: "100vh",
  [theme.breakpoints.up("md")]: {
    width: drawerWidth,
  },
  "& .MuiDrawer-paper": {
    backgroundColor: "#ffffff",
    display: "flex",
    flexDirection: "column",
    borderRight: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
    boxShadow: 'none',
  },
  [theme.breakpoints.up("md")]: {
    ...(open ? openedMixin(theme) : closedMixin(theme)),
    "& .MuiDrawer-paper": {
      ...(open ? openedMixin(theme) : closedMixin(theme)),
    },
  },
}));


// ── Sidebar section/item types ────────────────────────────────────────────────

interface NavItem {
  text: string;
  icon: React.ReactNode;
  path: string;
  permission?: string;
  menuKey?: string;
}

interface NavSection {
  label: string;       // section heading
  items: NavItem[];
}

// ── NavItem renderer ──────────────────────────────────────────────────────────

function SidebarItem({
  item,
  pathname,
  expanded,
  allPaths,
  onClick,
}: {
  item: NavItem;
  pathname: string;
  expanded: boolean;
  allPaths: string[];
  onClick: () => void;
}) {
  const theme = useTheme();

  // A more-specific sibling path matches if another nav item's path:
  //   1. starts with this item's path (i.e. is a child route)
  //   2. AND the current pathname starts with that sibling path
  // In that case, the sibling should be active — not this one.
  const hasMoreSpecificMatch = allPaths.some(
    (p) =>
      p !== item.path &&
      p.startsWith(item.path) &&
      (pathname === p || pathname.startsWith(p + '/'))
  );

  const isActive =
    pathname === item.path ||
    (!hasMoreSpecificMatch &&
      item.path !== "/backoffice" &&
      pathname.startsWith(item.path + '/'));

  return (
    <ListItem disablePadding sx={{ display: "block" }}>
      <Tooltip title={!expanded ? item.text : ""} placement="right">
        <ListItemButton
          onClick={onClick}
          sx={{
            minHeight: 48,
            justifyContent: expanded ? "initial" : "center",
            px: 2.5,
            mx: 1.5,
            borderRadius: '0.65rem',
            mb: 0.5,
            backgroundColor: isActive ? alpha(theme.palette.primary.main, 1) : "transparent",
            color: isActive ? "#ffffff" : theme.palette.text.secondary,
            boxShadow: isActive ? `0 6px 12px ${alpha(theme.palette.primary.main, 0.25)}` : "none",
            "&:hover": {
              backgroundColor: isActive ? theme.palette.primary.main : alpha(theme.palette.primary.main, 0.08),
              transform: isActive ? 'none' : 'translateX(4px)',
            },
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: expanded ? 40 : 0,
              mr: expanded ? 2 : 0,
              display: 'flex',
              justifyContent: "center",
              alignItems: 'center',
              color: isActive ? "#ffffff" : "inherit",
            }}
          >
            {item.icon}
          </ListItemIcon>
          <ListItemText
            primary={item.text}
            sx={{
              display: expanded ? "block" : "none",
              opacity: expanded ? 1 : 0,
              '& .MuiListItemText-primary': {
                fontSize: '0.85rem',
                fontWeight: isActive ? 800 : 700
              },
            }}
          />
        </ListItemButton>
      </Tooltip>
    </ListItem>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ label, expanded }: { label: string; expanded: boolean }) {
  if (!expanded) return <Divider sx={{ borderColor: "rgba(44, 24, 16, 0.03)", my: 1.5, mx: 2 }} />;
  return (
    <Typography
      variant="caption"
      sx={{
        px: 4,
        pt: 1.5,
        pb: 1,
        display: "block",
        color: "#94a3b8",
        fontWeight: 800,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        fontSize: "0.65rem",
      }}
    >
      {label}
    </Typography>
  );
}

// ── Main Layout ───────────────────────────────────────────────────────────────

export default function BackofficeLayout({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null);
  const { user, loading, error, hasPermission, isRole, activeStoreId, activeStore, setActiveStore } = useAuth();
  const { showError, showInfo } = useToast();

  const [quickOrderOpen, setQuickOrderOpen] = useState(false);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [selectedTableForOrder, setSelectedTableForOrder] = useState<Table | null>(null);
  const [availableTables, setAvailableTables] = useState<Table[]>([]);
  const [fetchingTables, setFetchingTables] = useState(false);
  const [isParcel, setIsParcel] = useState(false);

  // Pull to refresh logic
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartRef = useRef<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (contentRef.current && contentRef.current.scrollTop === 0) {
      touchStartRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartRef.current !== null && contentRef.current && contentRef.current.scrollTop === 0) {
      const currentY = e.touches[0].clientY;
      const distance = currentY - touchStartRef.current;
      if (distance > 0) {
        setPullDistance(Math.min(distance * 0.5, 80));
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 50) {
      handleRefresh();
    }
    setPullDistance(0);
    touchStartRef.current = null;
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Give a small delay for visual feedback then reload
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const handleOpenQuickOrder = async () => {
    setIsParcel(false);
    setSelectedTableForOrder(null);
    setQuickOrderOpen(true);
    setFetchingTables(true);
    try {
      const data = await restaurantService.getTables();
      setAvailableTables(data || []);
    } catch (e) {
      showError("Error", "Failed to load tables");
    } finally {
      setFetchingTables(false);
    }
  };

  const pathname = usePathname();
  const router = useRouter();
  const expanded = open || isMobile;

  const handleDrawerToggle = () => {
    if (isMobile) setMobileOpen(!mobileOpen);
    else setOpen(!open);
  };

  // Redirection Logic: If dashboard is disabled, redirect to Table Map
  useEffect(() => {
    if (!loading && user && pathname === "/backoffice") {
      const dashboardEnabled = user.allowed_menus ? user.allowed_menus.includes('dashboard') : true;
      if (!dashboardEnabled && !isRole('SUPER_ADMIN')) {
        router.push("/backoffice/restaurant/tables");
      }
    }
  }, [user, loading, pathname, router]);

  // Click Away logic for sidebar
  useEffect(() => {
    if (isMobile) return;

    function handleClickOutside(event: MouseEvent) {
      if (open && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, isMobile]);

  if (error) {
    return (
      <Box sx={{ p: 4, display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', bgcolor: '#fcf9f2' }}>
        <Paper sx={{ p: 6, maxWidth: 500, borderRadius: '0.65rem', textAlign: 'center', boxShadow: '0 20px 80px rgba(44,24,16,0.08)', border: '1px solid rgba(44,24,16,0.05)' }}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
            <Box sx={{ p: 2, bgcolor: alpha(theme.palette.error.main, 0.1), borderRadius: '50%' }}>
              <LogoutIcon color="error" sx={{ fontSize: 40 }} />
            </Box>
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 2, color: theme.palette.text.primary }}>Connection Issue</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.6 }}>
            {error.includes('Failed to fetch')
              ? "We're having trouble connecting to the server. Please check your internet connection or try again in a few moments."
              : error}
          </Typography>
          <Stack direction="row" spacing={2} sx={{ justifyContent: 'center' }}>
            <Button
              variant="outlined"
              onClick={() => logout()}
              sx={{ borderRadius: '0.65rem', px: 4 }}
            >
              Back to Login
            </Button>
            <Button
              variant="contained"
              onClick={() => window.location.reload()}
              sx={{ borderRadius: '0.65rem', px: 4, boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.3)}` }}
            >
              Retry Connection
            </Button>
          </Stack>
        </Paper>
      </Box>
    );
  }

  const navSections: NavSection[] = [
    {
      label: "General",
      items: [
        { text: "Dashboard", icon: <DashboardIcon />, path: "/backoffice", menuKey: "dashboard" },
      ],
    },
    {
      label: "Restaurant",
      items: [
        { text: "Table Map", icon: <TableIcon />, path: "/backoffice/restaurant/tables", menuKey: "tables_access" },
        { text: "Parcel", icon: <ShoppingBagIcon />, path: "/backoffice/restaurant/takeaway", menuKey: "parcel_order" },
        { text: "Reservations", icon: <ReservationIcon />, path: "/backoffice/restaurant/reservations", menuKey: "reservation" },
        { text: "Live Orders", icon: <OrdersIcon />, path: "/backoffice/restaurant/orders", menuKey: "live_order" },
        { text: "Kitchen Display", icon: <KitchenIcon />, path: "/backoffice/restaurant/kitchen", menuKey: "kitchen_display" },
        { text: "Billing", icon: <ReceiptIcon />, path: "/backoffice/billing", menuKey: "billing" },
      ],
    },
    {
      label: "Catalog",
      items: [
        { text: "Categories", icon: <CategoryIcon />, path: "/backoffice/categories", menuKey: "categories" },
        { text: "Items", icon: <InventoryIcon />, path: "/backoffice/items", menuKey: "items" },
      ],
    },
    {
      label: "Analytics",
      items: [
        { text: "Reports", icon: <BarChartIcon />, path: "/backoffice/reports", menuKey: "reports" },
      ],
    },
    {
      label: "Business Overview",
      items: [
        { text: "Business Stats", icon: <TrendingUpIcon />, path: "/backoffice/reports/business-statistics", menuKey: "business_statistics" },
        { text: "Store Sales", icon: <ReceiptIcon />, path: "/backoffice/reports/store-basis-sales", menuKey: "store_sales_reports" },
        { text: "Top Items by Store", icon: <InventoryIcon />, path: "/backoffice/reports/store-basis-top-items", menuKey: "store_top_items_reports" },
      ],
    },
    {
      label: "System",
      items: [
        { text: "Stores", icon: <StoreIcon />, path: "/backoffice/stores", menuKey: "stores", permission: "SUPER_ADMIN" },
        { text: "Users", icon: <PeopleIcon />, path: "/backoffice/users", menuKey: "users_management" },
        { text: "Business Config", icon: <SettingsApplicationsIcon />, path: "/backoffice/settings/system", menuKey: "settings_system" },
        { text: "System Config", icon: <SettingsIcon />, path: "/backoffice/settings", menuKey: "store_settings", permission: "SUPER_ADMIN" },
        { text: "Support", icon: <SupportIcon />, path: "/backoffice/support", menuKey: "support" },
      ],
    },
  ];

  const filteredSections = navSections.map(section => ({
    ...section,
    items: section.items.filter(item => {
      // 1. Absolute Store-level toggles (Applies to ALL users)
      if (['parcel_order', 'reservation', 'kitchen_display'].includes(item.menuKey || '')) {
        if (!activeStore) return false;

        if (item.menuKey === 'parcel_order' && !activeStore.is_take_away_enabled) return false;
        if (item.menuKey === 'reservation' && !activeStore.is_reservations_enabled) return false;
        if (item.menuKey === 'kitchen_display' && !activeStore.is_kitchen_step_enabled) return false;
      }

      // 2. Role-based filtering
      if (isRole("SUPER_ADMIN")) return true;
      if (item.permission === "SUPER_ADMIN") return false;

      // Table Map, Parcel, Reservation, Live Orders, Kitchen Display: All roles (toggles already handled above)
      if (['tables_access', 'parcel_order', 'reservation', 'live_order', 'kitchen_display'].includes(item.menuKey || '')) {
        // Business Owner specifically does not have Floor Map (tables_access)
        if (item.menuKey === 'tables_access' && isRole('BUSINESS_OWNER')) return false;
        return true;
      }

      // Billing: Administrator, Cashier
      if (item.menuKey === 'billing') {
        return isRole('ADMIN') || isRole('CASHIER');
      }

      // Business Config: Administrator, Cashier
      if (item.menuKey === 'settings_system') {
        return isRole('ADMIN') || isRole('CASHIER');
      }

      // Business Owner Specifics
      if (['business_statistics', 'store_sales_reports', 'store_top_items_reports'].includes(item.menuKey || '')) {
        return isRole('BUSINESS_OWNER') || isRole('SUPER_ADMIN');
      }

      // Stores: Super Admin and Business Owner
      if (item.menuKey === 'stores') {
        return isRole('SUPER_ADMIN') || isRole('BUSINESS_OWNER');
      }

      // Users: Administrator, Manager, Business Owner
      if (item.menuKey === 'users_management') {
        return isRole('ADMIN') || isRole('MANAGER') || isRole('BUSINESS_OWNER');
      }

      // Dashboard: Administrator, Manager, Business Owner
      if (item.menuKey === 'dashboard') {
        return isRole('ADMIN') || isRole('MANAGER') || isRole('BUSINESS_OWNER');
      }

      // Reports: Administrator, Manager, Business Owner
      if (item.menuKey === 'reports') {
        return isRole('ADMIN') || isRole('MANAGER') || isRole('BUSINESS_OWNER');
      }

      // Categories, Items: Administrator, Manager, Cashier, Business Owner
      if (['categories', 'items'].includes(item.menuKey || '')) {
        return isRole('ADMIN') || isRole('MANAGER') || isRole('CASHIER') || isRole('BUSINESS_OWNER');
      }

      // Support: All roles
      if (item.menuKey === 'support') return true;

      // Default to permission check or existing allowed_menus
      if (item.menuKey && user?.allowed_menus) {
        return user.allowed_menus.includes(item.menuKey);
      }

      return !item.permission || hasPermission(item.permission);
    })
  })).filter(section => section.items.length > 0);

  const drawerContent = (
    <Box ref={sidebarRef} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {!isMobile && (
        <Box sx={{
          height: HeaderHeight,
          display: 'flex',
          alignItems: 'center',
          px: 2.5,
          justifyContent: expanded ? 'flex-start' : 'center',
          bgcolor: 'white',
          flexShrink: 0,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.05)}`,
        }}>
          <Box sx={{
            width: 38,
            height: 38,
            minWidth: 38,
            bgcolor: 'white',
            borderRadius: '0.65rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.15)}`,
            border: `1.5px solid ${theme.palette.primary.main}`,
            flexShrink: 0,
          }}>
            <img src="/mario_juicy_logo.png" alt="Mario Logo" style={{ width: '26px', height: '26px', objectFit: 'contain' }} />
          </Box>
          {expanded && (
            <Typography
              variant="h6"
              sx={{
                ml: 1.5,
                fontWeight: 900,
                color: theme.palette.primary.main,
                fontFamily: "'Pacifico', cursive",
                fontSize: '1.25rem',
                whiteSpace: 'nowrap',
                letterSpacing: '0.02em',
              }}
            >
              Mario Juicy
            </Typography>
          )}
        </Box>
      )}
      {isMobile && (
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(44, 24, 16, 0.05)', bgcolor: '#fcfcfc' }}>
          <StoreSwitcher fullWidth />
        </Box>
      )}
      <Box sx={{
        overflowY: "auto",
        overflowX: "hidden",
        flexGrow: 1,
        minHeight: 0,
        py: 2,
        '&::-webkit-scrollbar': { width: '4px' },
        '&::-webkit-scrollbar-track': { background: 'transparent' },
        '&::-webkit-scrollbar-thumb': {
          background: alpha(theme.palette.text.primary, 0.05),
          borderRadius: '0.65rem',
        },
        '&:hover::-webkit-scrollbar-thumb': {
          background: alpha(theme.palette.text.primary, 0.1),
        }
      }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          filteredSections.map((section) => {
            // Flat list of all visible nav paths — used to detect more-specific active matches
            const allPaths = filteredSections.flatMap((s) => s.items.map((i) => i.path));
            return (
              <Box key={section.label}>
                <SectionLabel label={section.label} expanded={expanded} />
                <List disablePadding>
                  {section.items.map((item) => (
                    <SidebarItem
                      key={item.path}
                      item={item}
                      pathname={pathname}
                      expanded={expanded}
                      allPaths={allPaths}
                      onClick={() => {
                        if (!open && !isMobile) setOpen(true);
                        router.push(item.path);
                        if (isMobile) setMobileOpen(false);
                      }}
                    />
                  ))}
                </List>
              </Box>
            );
          })
        )}
      </Box>

      <Box sx={{ p: 2, pb: isMobile ? 'calc(16px + env(safe-area-inset-bottom))' : 4 }}>
        <Divider sx={{ borderColor: alpha(theme.palette.text.primary, 0.05), mb: 2 }} />
        <ListItem disablePadding>
          <Tooltip title={!expanded ? "Logout" : ""} placement="right">
            <ListItemButton
              onClick={logout}
              sx={{
                minHeight: 48,
                justifyContent: expanded ? "initial" : "center",
                px: 2.5,
                borderRadius: 0,
                color: theme.palette.error.main,
                backgroundColor: alpha(theme.palette.error.main, 0.05),
                "&:hover": { backgroundColor: alpha(theme.palette.error.main, 0.12) },
              }}
            >
              <ListItemIcon sx={{ minWidth: 0, mr: expanded ? 2 : "auto", justifyContent: "center", color: 'inherit' }}>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText
                primary="Logout"
                sx={{
                  display: expanded ? "block" : "none",
                  '& .MuiListItemText-primary': { fontWeight: 800, fontSize: '0.9rem' }
                }}
              />
            </ListItemButton>
          </Tooltip>
        </ListItem>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", height: "100dvh", overflow: "hidden", backgroundColor: theme.palette.background.default }}>
      <CssBaseline />

      {/* Inactive Store Overlay */}
      {activeStore && !activeStore.is_active && !isRole('SUPER_ADMIN') && !pathname.includes('/support') && (
        <Box sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          bgcolor: 'rgba(255,255,255,0.95)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          p: 3
        }}>
          <Box sx={{
            width: 100,
            height: 100,
            bgcolor: alpha(theme.palette.error.main, 0.1),
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 3
          }}>
            <StoreIcon sx={{ fontSize: 60, color: 'error.main' }} />
          </Box>
          <Typography variant="h3" sx={{ fontWeight: 900, mb: 2, color: 'error.main' }}>
            Store Inactive
          </Typography>
          <Typography variant="h6" sx={{ color: 'text.secondary', mb: 4, maxWidth: 600 }}>
            This store is currently inactive. You cannot perform any operations at this time.
            Please contact your administrator or support for more details.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="contained" size="large" onClick={logout} sx={{ fontWeight: 800, px: 4, py: 1.5 }}>
              Sign Out
            </Button>
            <Button variant="outlined" size="large" href="/backoffice/support" sx={{ fontWeight: 800, px: 4, py: 1.5 }}>
              Contact Support
            </Button>
          </Box>
        </Box>
      )}

      <Drawer
        variant={isMobile ? "temporary" : "permanent"}
        open={isMobile ? mobileOpen : open}
        onClose={handleDrawerToggle}
        sx={{
          zIndex: isMobile ? 3000 : 'inherit',
          '& .MuiDrawer-paper': {
            width: isMobile ? drawerWidth : 'inherit',
            height: '100vh',
            marginTop: 0,
            zIndex: isMobile ? 3000 : 'inherit',
            overflow: 'hidden',
            transition: theme.transitions.create(['width', 'margin'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          }
        }}
      >
        {drawerContent}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          bgcolor: 'background.default',
          position: 'relative'
        }}
      >
        <AppBar position="relative" elevation={0} sx={{ flexShrink: 0 }}>
          <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 1, sm: 2.5 }, minHeight: `${HeaderHeight}px !important` }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {isMobile && (
                <Box sx={{
                  mr: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Box sx={{
                    width: 42,
                    height: 42,
                    minWidth: 42,
                    bgcolor: 'white',
                    borderRadius: '0.65rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                    border: '1.5px solid rgba(255,255,255,0.3)'
                  }}>
                    <img src="/mario_juicy_logo.png" alt="Mario Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
                  </Box>
                </Box>
              )}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
              {!isMobile && <StoreSwitcher sx={{ height: 44 }} />}

              {!isMobile && (
                <Tooltip title="Refresh Application">
                  <IconButton
                    onClick={handleRefresh}
                    sx={{
                      bgcolor: alpha(theme.palette.primary.main, 0.04),
                      borderRadius: '0.65rem',
                      width: 44,
                      height: 44,
                      border: '1px solid',
                      borderColor: alpha(theme.palette.primary.main, 0.08),
                      '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) }
                    }}
                  >
                    <RefreshIcon sx={{ color: theme.palette.primary.main, fontSize: 20, animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
                  </IconButton>
                </Tooltip>
              )}

              <NotificationDropdown />

              <Box
                onClick={(e) => setProfileAnchor(e.currentTarget)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.2,
                  cursor: 'pointer',
                  p: '4px',
                  pr: 1.5,
                  height: 44,
                  borderRadius: '0.65rem',
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                  border: '1px solid',
                  borderColor: alpha(theme.palette.primary.main, 0.08),
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    borderColor: alpha(theme.palette.primary.main, 0.15)
                  }
                }}
              >
                <Avatar
                  sx={{
                    width: 34,
                    height: 34,
                    fontSize: '0.85rem',
                    fontWeight: 900,
                    bgcolor: 'white',
                    color: theme.palette.primary.main,
                    border: `1.5px solid ${alpha(theme.palette.primary.main, 0.2)}`
                  }}
                >
                  {user?.username?.[0]?.toUpperCase() || 'A'}
                </Avatar>
                <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: '#1e293b', lineHeight: 1, fontSize: '0.85rem' }}>
                    {user?.username || 'Admin'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, fontSize: '0.7rem' }}>
                    {user?.primary_role?.replace('_', ' ') || 'Staff'}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Menu
              anchorEl={profileAnchor}
              open={Boolean(profileAnchor)}
              onClose={() => setProfileAnchor(null)}
              slotProps={{
                paper: {
                  sx: {
                    mt: 1.5,
                    minWidth: 200,
                    borderRadius: '0.65rem',
                    border: '1px solid #f1f5f9',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
                    '& .MuiMenuItem-root': {
                      px: 2,
                      py: 1.5,
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05) }
                    }
                  }
                }
              }}
            >
              <MenuItem onClick={() => { setProfileAnchor(null); logout(); }} sx={{ color: 'error.main' }}>
                Sign Out
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>
        <Box id="backoffice-sub-navbar" sx={{ flexShrink: 0, zIndex: 1099, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: alpha('#2c1810', 0.05) }} />

        <Box
          ref={contentRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          sx={{
            position: "relative",
            flexGrow: 1,
            overflowY: "auto",
            overflowX: "hidden",
            p: 0,
            transition: 'padding 0.3s ease',
            scrollBehavior: 'smooth',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'transparent'
          }}
        >
          {/* Pull to refresh indicator */}
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: pullDistance,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            transition: 'height 0.1s ease',
            zIndex: 10,
            bgcolor: alpha(theme.palette.primary.main, 0.05)
          }}>
            <RefreshIcon sx={{
              color: theme.palette.primary.main,
              transform: `rotate(${pullDistance * 4}deg)`,
              opacity: pullDistance / 50
            }} />
          </Box>

          {children}
        </Box>

        <style dangerouslySetInnerHTML={{
          __html: `
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        ` }} />

        {isMobile && (
          <>
            <Fab
              color="primary"
              aria-label="add"
              onClick={handleOpenQuickOrder}
              sx={{
                position: 'fixed',
                bottom: 'calc(10px + env(safe-area-inset-bottom))',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 2001,
                width: 54,
                height: 54,
                bgcolor: theme.palette.primary.main,
                boxShadow: `0 8px 25px ${alpha(theme.palette.primary.main, 0.4)}`,
                border: '4px solid white',
                '&:hover': { bgcolor: theme.palette.primary.dark }
              }}
            >
              <AddIcon sx={{ fontSize: 28, color: 'white' }} />
            </Fab>

            <Paper
              sx={{
                position: 'relative',
                flexShrink: 0,
                zIndex: 2000,
                borderTop: '1px solid #f1f5f9',
                borderRadius: 0
              }}
              elevation={4}
            >
              <BottomNavigation
                showLabels
                value={pathname}
                onChange={(e, val) => {
                  if (val === 'more') {
                    handleDrawerToggle();
                    return;
                  }
                  if (val && typeof val === 'string' && val.startsWith('/')) {
                    router.push(val);
                  }
                }}
                sx={{ height: 'calc(64px + env(safe-area-inset-bottom))', pb: 'env(safe-area-inset-bottom)' }}
              >
                <BottomNavigationAction
                  label="Tables"
                  value="/backoffice/restaurant/tables"
                  icon={<TableIcon />}
                  onClick={() => { if (pathname === "/backoffice/restaurant/tables") window.dispatchEvent(new CustomEvent('close-dialogs')); }}
                />
                <BottomNavigationAction
                  label="Orders"
                  value="/backoffice/restaurant/orders"
                  icon={<OrdersIcon />}
                  onClick={() => { if (pathname === "/backoffice/restaurant/orders") window.dispatchEvent(new CustomEvent('close-dialogs')); }}
                  sx={{ mr: 4 }}
                />
                <BottomNavigationAction
                  label="Parcel"
                  value="/backoffice/restaurant/takeaway"
                  icon={<ShoppingBagIcon />}
                  onClick={() => { if (pathname === "/backoffice/restaurant/takeaway") window.dispatchEvent(new CustomEvent('close-dialogs')); }}
                  sx={{ ml: 4 }}
                />
                <BottomNavigationAction
                  label="More"
                  value="more"
                  icon={<MenuIcon />}
                  onClick={handleDrawerToggle}
                />
              </BottomNavigation>
            </Paper>
          </>
        )}

        <Dialog
          open={quickOrderOpen}
          onClose={() => setQuickOrderOpen(false)}
          fullWidth
          maxWidth="sm"
          slotProps={{
            paper: {
              sx: { borderRadius: '0.65rem' }
            }
          }}
        >
          <DialogTitle sx={{ fontWeight: 900 }}>Select Table</DialogTitle>
          <DialogContent>
            {fetchingTables ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
                <Box>
                <Button
                  variant={isParcel ? "contained" : "outlined"}
                  fullWidth
                  color="secondary"
                  onClick={() => {
                    setIsParcel(true);
                    setSelectedTableForOrder(null);
                  }}
                  startIcon={<ShoppingBagIcon />}
                  sx={{
                    height: 60,
                    fontWeight: 800,
                    borderRadius: '0.65rem',
                    mb: 2,
                    mt: 1
                  }}
                >
                  Parcel (Take Away)
                </Button>

                <Divider sx={{ mb: 2, fontWeight: 700, color: 'text.secondary', fontSize: '0.7rem' }}>OR SELECT TABLE</Divider>

                <Grid container spacing={2}>
                  {availableTables.map(table => (
                    <Grid key={table.id} size={{ xs: 4 }}>
                      <Button
                        variant={selectedTableForOrder?.id === table.id ? "contained" : "outlined"}
                        fullWidth
                        onClick={() => {
                          setSelectedTableForOrder(table);
                          setIsParcel(false);
                        }}
                        sx={{
                          height: 60,
                          fontWeight: 800,
                          borderRadius: '0.65rem'
                        }}
                      >
                        {table.number}
                      </Button>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setQuickOrderOpen(false)} sx={{ fontWeight: 800 }}>Cancel</Button>
            <Button
              disabled={!selectedTableForOrder && !isParcel}
              variant="contained"
              onClick={() => {
                setQuickOrderOpen(false);
                setOrderDialogOpen(true);
              }}
              sx={{ fontWeight: 800, borderRadius: '0.65rem' }}
            >
              Continue
            </Button>
          </DialogActions>
        </Dialog>

        <OrderDialog
          open={orderDialogOpen}
          onClose={() => {
            setOrderDialogOpen(false);
            setSelectedTableForOrder(null);
            setIsParcel(false);
          }}
          table={selectedTableForOrder as any}
          onOrderUpdated={() => {
            // Dispatch event to refresh table map if we're on that page
            window.dispatchEvent(new CustomEvent('refresh-tables'));
            window.dispatchEvent(new CustomEvent('refresh-orders'));
          }}
        />
        <ForceChangePasswordDialog />
      </Box>
    </Box>
  );
}
