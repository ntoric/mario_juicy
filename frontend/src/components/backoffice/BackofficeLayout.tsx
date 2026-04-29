"use client";

import { useEffect, useState } from "react";
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
  InputBase,
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
  Refresh as RefreshIcon,
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Dashboard as DashboardIcon,
  Inventory as InventoryIcon,
  Category as CategoryIcon,
  ShoppingCart as ShoppingCartIcon,
  People as PeopleIcon,
  Assessment as BarChartIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  EventNote as ReservationIcon,
  ReceiptLong as OrdersIcon,
  Kitchen as KitchenIcon,
  TableRestaurant as TableIcon,
  ShoppingBag as ShoppingBagIcon,
  Receipt as ReceiptIcon,
  Store as StoreIcon,
  LockPerson as LockPersonIcon,
  Search as SearchIcon,
  Notifications as NotificationsIcon,
} from "@mui/icons-material";
import Avatar from "@mui/material/Avatar";
import Tooltip from "@mui/material/Tooltip";
import { useAuth } from "@/hooks/useAuth";
import { Pacifico } from "next/font/google";
import Preloader from "@/components/ui/Preloader";

const pacifico = Pacifico({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

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

const HeaderHeight = 80;

const AppBar = styled(MuiAppBar)(({ theme }) => ({
  zIndex: theme.zIndex.drawer + 1,
  backgroundColor: alpha("#ffffff", 0.9),
  backdropFilter: "blur(12px)",
  color: theme.palette.text.primary,
  boxShadow: "0 2px 20px rgba(44, 24, 16, 0.03)",
  borderBottom: "1px solid rgba(44, 24, 16, 0.05)",
  height: HeaderHeight,
  display: 'flex',
  justifyContent: 'center',
  paddingTop: "env(safe-area-inset-top, 0px)",
}));

const Drawer = styled(MuiDrawer)(({ theme, open }) => ({
  flexShrink: 0,
  whiteSpace: "nowrap",
  boxSizing: "border-box",
  height: "100vh", // Force root height
  [theme.breakpoints.up("md")]: {
    width: drawerWidth,
  },
  "& .MuiDrawer-paper": {
    backgroundColor: "#ffffff",
    display: "flex",
    flexDirection: "column",
    borderRight: '1px solid rgba(44, 24, 16, 0.05)',
    boxShadow: 'none',
  },
  [theme.breakpoints.up("md")]: {
    ...(open ? openedMixin(theme) : closedMixin(theme)),
    "& .MuiDrawer-paper": {
      ...(open ? openedMixin(theme) : closedMixin(theme)),
    },
  },
}));

const SearchArea = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: '7px',
  backgroundColor: theme.palette.background.default,
  marginLeft: theme.spacing(3),
  width: '100%',
  border: '1px solid rgba(44, 24, 16, 0.05)',
  [theme.breakpoints.up('sm')]: {
    width: 'auto',
    minWidth: '400px',
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#94a3b8',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  width: '100%',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1.2, 1, 1.2, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    width: '100%',
    fontWeight: 600,
    fontSize: '0.9rem',
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
  onClick,
}: {
  item: NavItem;
  pathname: string;
  expanded: boolean;
  onClick: () => void;
}) {
  const theme = useTheme();
  const isActive = pathname === item.path ||
    (item.path !== "/backoffice" && pathname.startsWith(item.path));

  return (
    <ListItem disablePadding sx={{ display: "block" }}>
      <Tooltip title={!expanded ? item.text : ""} placement="right">
        <ListItemButton
          onClick={onClick}
          sx={{
            minHeight: 48,
            justifyContent: expanded ? "initial" : "center",
            px: expanded ? 2.5 : 0,
            mx: expanded ? 1.5 : 0,
            borderRadius: expanded ? '7px' : 0,
            mb: 0.5,
            backgroundColor: isActive ? theme.palette.primary.main : "transparent",
            color: isActive ? "#ffffff" : theme.palette.text.secondary,
            boxShadow: isActive ? `0 8px 16px ${alpha(theme.palette.primary.main, 0.2)}` : "none",
            "&:hover": { 
              backgroundColor: isActive ? theme.palette.primary.main : alpha(theme.palette.primary.main, 0.08),
            },
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
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
  const [open, setOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null);
  const [stores, setStores] = useState<{ id: number, name: string }[]>([]);
  const { user, loading, error, hasPermission, isRole, activeStoreId, activeStore, setActiveStore } = useAuth();

  useEffect(() => {
    if (isRole('ADMIN')) {
      const { storeService } = require('@/services/storeService');
      storeService.getStores().then(setStores).catch(console.error);
    }
  }, [user]);

  const pathname = usePathname();
  const router = useRouter();
  const expanded = open || isMobile;

  const handleDrawerToggle = () => {
    if (isMobile) setMobileOpen(!mobileOpen);
    else setOpen(!open);
  };

  const handleDrawerClose = () => setOpen(false);

  // Redirection Logic: If dashboard is disabled, redirect to Table Map
  useEffect(() => {
    if (!loading && user && pathname === "/backoffice") {
      const dashboardEnabled = user.allowed_menus ? user.allowed_menus.includes('dashboard') : true;
      if (!dashboardEnabled && !isRole('SUPER_ADMIN')) {
        router.push("/backoffice/restaurant/tables");
      }
    }
  }, [user, loading, pathname, router]);

  if (error) {
    return (
      <Box sx={{ p: 4, display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', bgcolor: '#fcf9f2' }}>
        <Paper sx={{ p: 4, maxWidth: 450, borderRadius: '7px', textAlign: 'center', boxShadow: '0 20px 80px rgba(44,24,16,0.08)' }}>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>Session Error</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {error}
          </Typography>
          <Box sx={{ p: 2, bgcolor: '#2c1810', borderRadius: 3, mb: 3 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'white', display: 'block', mb: 1 }}>REQUIRED ACTION:</Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#ffb344', p: 1 }}>
              python manage.py migrate
            </Typography>
          </Box>
          <Button variant="contained" onClick={() => window.location.reload()}>
            Retry Login
          </Button>
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
        { text: "Table Map", icon: <TableIcon />, path: "/backoffice/restaurant/tables", permission: "users.view_table_layout_access", menuKey: "table_map" },
        { text: "Parcel", icon: <ShoppingBagIcon />, path: "/backoffice/restaurant/takeaway", permission: "restaurants.view_order", menuKey: "parcel" },
        { text: "Reservations", icon: <ReservationIcon />, path: "/backoffice/restaurant/reservations", permission: "restaurants.view_reservation", menuKey: "reservations" },
        { text: "Live Orders", icon: <OrdersIcon />, path: "/backoffice/restaurant/orders", permission: "restaurants.view_order", menuKey: "live_orders" },
        { text: "Kitchen Display", icon: <KitchenIcon />, path: "/backoffice/restaurant/kitchen", permission: "restaurants.view_orderitem", menuKey: "kitchen_display" },
        { text: "Billing", icon: <ReceiptIcon />, path: "/backoffice/billing", permission: "restaurants.view_invoice", menuKey: "billing" },
      ],
    },
    {
      label: "Catalog",
      items: [
        { text: "Categories", icon: <CategoryIcon />, path: "/backoffice/categories", permission: "catalogs.view_category", menuKey: "categories" },
        { text: "Items", icon: <InventoryIcon />, path: "/backoffice/items", permission: "catalogs.view_item", menuKey: "items" },
      ],
    },
    {
      label: "Analytics",
      items: [
        { text: "Reports", icon: <BarChartIcon />, path: "/backoffice/reports", permission: "users.view_reports", menuKey: "reports" },
      ],
    },
    {
      label: "System",
      items: [
        { text: "Stores", icon: <StoreIcon />, path: "/backoffice/stores", permission: "stores.view_store", menuKey: "stores" },
        { text: "Users", icon: <PeopleIcon />, path: "/backoffice/users", permission: "users.view_user", menuKey: "users" },
        { text: "Menu Permissions", icon: <LockPersonIcon />, path: "/backoffice/settings/menu-permissions", permission: "SUPER_ADMIN", menuKey: "menu_permissions" },
        { text: "Settings", icon: <SettingsIcon />, path: "/backoffice/settings", permission: "core.view_taxconfiguration", menuKey: "settings" },
      ],
    },
  ];

  const filteredSections = navSections.map(section => ({
    ...section,
    items: section.items.filter(item => {
      // 1. Absolute Store-level toggles (Applies to ALL users)
      if (activeStore) {
        if (item.menuKey === 'parcel' && !activeStore.is_take_away_enabled) return false;
        if (item.menuKey === 'reservations' && !activeStore.is_reservations_enabled) return false;
        if (item.menuKey === 'kitchen_display' && !activeStore.is_kitchen_step_enabled) return false;
      }

      // 2. Role/Permission based filtering
      if (item.permission === "SUPER_ADMIN") return isRole("SUPER_ADMIN");
      
      if (item.menuKey && user?.allowed_menus) {
        if (!user.allowed_menus.includes(item.menuKey)) return false;
      }

      return !item.permission || hasPermission(item.permission);
    })
  })).filter(section => section.items.length > 0);

  const drawerContent = (
    <>
      {isMobile && <Box sx={{ height: HeaderHeight }} />}
      <Box sx={{ 
        overflowY: "auto", 
        overflowX: "hidden", 
        flexGrow: 1, 
        minHeight: 0, // Critical for scrolling in flex column
        py: 2,
        /* Custom scrollbar for premium look */
        '&::-webkit-scrollbar': { width: '4px' },
        '&::-webkit-scrollbar-track': { background: 'transparent' },
        '&::-webkit-scrollbar-thumb': { 
          background: alpha(theme.palette.text.primary, 0.05),
          borderRadius: '10px',
        },
        '&:hover::-webkit-scrollbar-thumb': { 
          background: alpha(theme.palette.text.primary, 0.1),
        }
      }}>
        {filteredSections.map((section) => (
          <Box key={section.label}>
            <SectionLabel label={section.label} expanded={expanded} />
            <List disablePadding>
              {section.items.map((item) => (
                <SidebarItem
                  key={item.path}
                  item={item}
                  pathname={pathname}
                  expanded={expanded}
                  onClick={() => {
                    router.push(item.path);
                    if (isMobile) setMobileOpen(false);
                  }}
                />
              ))}
            </List>
          </Box>
        ))}
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
    </>
  );

  return (
    <Box sx={{ display: "flex", height: "100dvh", overflow: "hidden", backgroundColor: theme.palette.background.default }}>
      <CssBaseline />
      
      <AppBar position="fixed">
        <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 1, sm: 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {/* Brand Area */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              width: open && !isMobile ? drawerWidth - 48 : 48, 
              justifyContent: open && !isMobile ? 'flex-start' : 'center',
              mr: open && !isMobile ? 0 : 2,
              transition: theme.transitions.create(['width', 'margin'], {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
            }}>
              <Box sx={{ 
                width: 42, 
                height: 42, 
                minWidth: 42,
                bgcolor: theme.palette.primary.main, 
                borderRadius: '7px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.25)}`
              }}>
                <img src="/logo.png" alt="Mario Logo" style={{ width: '26px', height: '26px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
              </Box>
              <Typography
                variant="h5"
                sx={{ 
                  color: theme.palette.primary.main, 
                  fontWeight: 600, 
                  fontFamily: pacifico.style.fontFamily,
                  fontSize: '1.8rem',
                  mt: 0.5,
                  display: { xs: 'none', md: open ? 'block' : 'none' },
                  transition: 'opacity 0.2s ease',
                }}
              >
                Mario
              </Typography>
            </Box>

            <Tooltip title={open ? "Close Sidebar" : "Open Sidebar"}>
              <IconButton
                color="inherit"
                onClick={handleDrawerToggle}
                sx={{ 
                  display: { xs: 'none', md: 'flex' }, // Hidden on mobile
                  mr: 2, 
                  bgcolor: theme.palette.background.default, 
                  borderRadius: '7px', 
                  boxShadow: 'inset 0 0 0 1px rgba(44, 24, 16, 0.05)',
                  '&:hover': { bgcolor: theme.palette.primary.main, color: 'white' }
                }}
              >
                {open && !isMobile ? <ChevronLeftIcon /> : <MenuIcon />}
              </IconButton>
            </Tooltip>

            {!isMobile && (
              <SearchArea>
                <SearchIconWrapper><SearchIcon /></SearchIconWrapper>
                <StyledInputBase placeholder="Search items, orders, tables..." />
              </SearchArea>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <IconButton sx={{ bgcolor: theme.palette.background.default, borderRadius: '7px', border: '1px solid rgba(0,0,0,0.03)' }}>
              <NotificationsIcon sx={{ color: '#94a3b8', fontSize: 22 }} />
            </IconButton>
            
            <Box 
              onClick={(e) => setProfileAnchor(e.currentTarget)}
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1.5, 
                bgcolor: theme.palette.background.default, 
                p: 0.5, 
                pr: 2, 
                borderRadius: '7px', 
                cursor: 'pointer',
                border: '1px solid rgba(44, 24, 16, 0.05)',
                '&:hover': { opacity: 0.9, borderColor: theme.palette.primary.main }
              }}
            >
              <Avatar 
                sx={{ 
                  bgcolor: theme.palette.primary.main, 
                  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  width: 38,
                  height: 38
                }}
              >
                {user?.username?.charAt(0).toUpperCase() || "U"}
              </Avatar>
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', lineHeight: 1.2 }}>
                  {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  {user?.primary_role?.replace('_', ' ')}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Menu
            anchorEl={profileAnchor}
            open={Boolean(profileAnchor)}
            onClose={() => setProfileAnchor(null)}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            slotProps={{
              paper: {
                sx: { borderRadius: '7px', mt: 1.5, minWidth: 220, p: 1, boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }
              }
            }}
          >
            <MenuItem onClick={logout} sx={{ borderRadius: '7px', color: 'error.main', py: 1.5 }}>
              <ListItemIcon><LogoutIcon sx={{ color: 'error.main' }} /></ListItemIcon>
              Logout Account
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isMobile ? "temporary" : "permanent"}
        open={isMobile ? mobileOpen : open}
        onClose={handleDrawerToggle}
        sx={{ 
          zIndex: isMobile ? 3000 : 'inherit',
          '& .MuiDrawer-paper': { 
            width: isMobile ? drawerWidth : 'inherit', 
            height: isMobile ? '100dvh' : `calc(100% - ${HeaderHeight}px)`, 
            marginTop: isMobile ? 0 : `${HeaderHeight}px`,
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
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          bgcolor: 'background.default',
        }}
      >
        <Box sx={{ height: HeaderHeight, flexShrink: 0 }} />
        <Box 
          sx={{ 
            flexGrow: 1, 
            overflowY: "auto",
            overflowX: "hidden",
            p: { xs: 1, sm: 2, md: 3 },
            pb: { xs: 10, md: 3 }, // Added padding at bottom for mobile navigation
            transition: 'padding 0.3s ease',
            scrollBehavior: 'smooth',
          }}
        >
          {children}
        </Box>
      </Box>

      {isMobile && (
        <Paper
          sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 2000, borderTop: '1px solid #f1f5f9', borderRadius: 0 }}
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
            <BottomNavigationAction label="Tables" value="/backoffice/restaurant/tables" icon={<TableIcon />} />
            <BottomNavigationAction label="Orders" value="/backoffice/restaurant/orders" icon={<OrdersIcon />} />
            <BottomNavigationAction label="Billing" value="/backoffice/billing" icon={<ReceiptIcon />} />
            <BottomNavigationAction label="More" value="more" icon={<MenuIcon />} onClick={handleDrawerToggle} />
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
}


