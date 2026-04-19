"use client";
// Force rebuild to clear stale date-fns error

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { styled, useTheme, Theme, CSSObject } from "@mui/material/styles";
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

const drawerWidth = 240;

const openedMixin = (theme: Theme): CSSObject => ({
  width: drawerWidth,
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: "hidden",
});

const closedMixin = (theme: Theme): CSSObject => ({
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: "hidden",
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up("sm")]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
});

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  // Add safe area support for mobile
  minHeight: `calc(${theme.mixins.toolbar.minHeight}px + env(safe-area-inset-top, 0px))`,
  [theme.breakpoints.up('sm')]: {
    minHeight: `calc(${theme.mixins.toolbar.minHeight}px + env(safe-area-inset-top, 0px))`,
  }
}));

interface AppBarProps extends MuiAppBarProps {
  open?: boolean;
}

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== "open",
})<AppBarProps>(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(["width", "margin"], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  backgroundColor: theme.palette.primary.main,
  color: "white",
  boxShadow: "none",
  borderBottom: "none",
  paddingTop: "env(safe-area-inset-top, 0px)",
  "& .MuiToolbar-root": {
    minHeight: theme.mixins.toolbar.minHeight,
  },
  [theme.breakpoints.up("md")]: {
    ...(open && {
      marginLeft: drawerWidth,
      width: `calc(100% - ${drawerWidth}px)`,
      transition: theme.transitions.create(["width", "margin"], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen,
      }),
    }),
  },
}));

const Drawer = styled(MuiDrawer, {
  shouldForwardProp: (prop) => prop !== "open",
})<{ open?: boolean }>(({ theme, ...props }) => {
  const open = props.open;
  return {
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: "nowrap",
    boxSizing: "border-box",
    "& .MuiDrawer-paper": {
      backgroundColor: theme.palette.primary.main,
      display: "flex",
      flexDirection: "column",
      borderRight: 'none',
    },
    [theme.breakpoints.up("md")]: {
      ...(open ? {
        ...openedMixin(theme),
        "& .MuiDrawer-paper": {
          ...openedMixin(theme),
          backgroundColor: theme.palette.primary.main,
        },
      } : {
        ...closedMixin(theme),
        "& .MuiDrawer-paper": {
          ...closedMixin(theme),
          backgroundColor: theme.palette.primary.main,
        },
      }),
    },
  };
});

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
  const isActive = pathname === item.path ||
    (item.path !== "/backoffice" && pathname.startsWith(item.path));

  return (
    <ListItem disablePadding sx={{ display: "block" }}>
      <Tooltip title={!expanded ? item.text : ""} placement="right">
        <ListItemButton
          onClick={onClick}
          sx={{
            minHeight: 44,
            justifyContent: expanded ? "initial" : "center",
            px: 2.5,
            mx: 0.5,
            borderRadius: 1.5,
            mb: 0.25,
            backgroundColor: isActive ? "rgba(255,255,255,0.12)" : "transparent",
            "&:hover": { backgroundColor: "rgba(255,255,255,0.07)" },
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: 0,
              mr: expanded ? 1.5 : "auto",
              justifyContent: "center",
              color: isActive ? "white" : "rgba(255,255,255,0.65)",
            }}
          >
            {item.icon}
          </ListItemIcon>
          <ListItemText
            primary={item.text}
            sx={{
              opacity: expanded ? 1 : 0,
              color: isActive ? 'white' : 'rgba(255,255,255,0.8)',
              '& .MuiListItemText-primary': { fontSize: '0.82rem', fontWeight: isActive ? 700 : 500 },
            }}
          />
        </ListItemButton>
      </Tooltip>
    </ListItem>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ label, expanded }: { label: string; expanded: boolean }) {
  if (!expanded) return <Divider sx={{ borderColor: "rgba(255,255,255,0.1)", my: 0.5 }} />;
  return (
    <Typography
      variant="caption"
      sx={{
        px: 3,
        pt: 1.5,
        pb: 0.5,
        display: "block",
        color: "rgba(255,255,255,0.35)",
        fontWeight: 700,
        letterSpacing: "0.08em",
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

  if (loading) {
    return <Preloader fullScreen message="Setting up your dashboard..." />;
  }

  if (error) {
    return (
      <Box sx={{ p: 4, display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', bgcolor: '#FCF9EA' }}>
        <Paper sx={{ p: 4, maxWidth: 450, borderRadius: 3, textAlign: 'center', boxShadow: '0 10px 40px rgba(44,24,16,0.05)' }}>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 2 }}>Session Error</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {error}
          </Typography>
          <Box sx={{ p: 2, bgcolor: '#fff4f4', borderRadius: 2, mb: 3, border: '1px solid #ffebeb' }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#CF0F0F' }}>REQUIRED ACTION:</Typography>
            <Typography variant="body2" color="error" sx={{ mt: 1, fontFamily: 'monospace', bgcolor: '#2c1810', color: '#fff', p: 1, borderRadius: 1 }}>
              docker-compose exec web python manage.py migrate
            </Typography>
          </Box>
          <Button variant="contained" onClick={() => window.location.reload()} sx={{ bgcolor: '#E9762B', '&:hover': { bgcolor: '#d35400' } }}>
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
        { text: "Dashboard", icon: <DashboardIcon fontSize="small" />, path: "/backoffice", menuKey: "dashboard" },
      ],
    },
    {
      label: "Restaurant",
      items: [
        { text: "Table Map", icon: <TableIcon fontSize="small" />, path: "/backoffice/restaurant/tables", permission: "users.view_table_layout_access", menuKey: "table_map" },
        { text: "Parcel", icon: <ShoppingBagIcon fontSize="small" />, path: "/backoffice/restaurant/takeaway", permission: "restaurants.view_order", menuKey: "parcel" },
        { text: "Reservations", icon: <ReservationIcon fontSize="small" />, path: "/backoffice/restaurant/reservations", permission: "restaurants.view_reservation", menuKey: "reservations" },
        { text: "Live Orders", icon: <OrdersIcon fontSize="small" />, path: "/backoffice/restaurant/orders", permission: "restaurants.view_order", menuKey: "live_orders" },
        { text: "Kitchen Display", icon: <KitchenIcon fontSize="small" />, path: "/backoffice/restaurant/kitchen", permission: "restaurants.view_orderitem", menuKey: "kitchen_display" },
        { text: "Billing", icon: <ReceiptIcon fontSize="small" />, path: "/backoffice/billing", permission: "restaurants.view_invoice", menuKey: "billing" },
      ],
    },
    {
      label: "Catalog",
      items: [
        { text: "Categories", icon: <CategoryIcon fontSize="small" />, path: "/backoffice/categories", permission: "catalogs.view_category", menuKey: "categories" },
        { text: "Items", icon: <InventoryIcon fontSize="small" />, path: "/backoffice/items", permission: "catalogs.view_item", menuKey: "items" },
      ],
    },
    {
      label: "Analytics",
      items: [
        { text: "Reports", icon: <BarChartIcon fontSize="small" />, path: "/backoffice/reports", permission: "users.view_reports", menuKey: "reports" },
      ],
    },
    {
      label: "System",
      items: [
        { text: "Stores", icon: <StoreIcon fontSize="small" />, path: "/backoffice/stores", permission: "stores.view_store", menuKey: "stores" },
        { text: "Users", icon: <PeopleIcon fontSize="small" />, path: "/backoffice/users", permission: "users.view_user", menuKey: "users" },
        { text: "Menu Permissions", icon: <LockPersonIcon fontSize="small" />, path: "/backoffice/settings/menu-permissions", permission: "SUPER_ADMIN", menuKey: "menu_permissions" },
        { text: "Settings", icon: <SettingsIcon fontSize="small" />, path: "/backoffice/settings", permission: "core.view_taxconfiguration", menuKey: "settings" },
      ],
    },
  ];

  // Filter sections and items based on permissions and allowed menus
  const filteredSections = navSections.map(section => ({
    ...section,
    items: section.items.filter(item => {
      // 1. Check Super Admin permission bypass
      if (item.permission === "SUPER_ADMIN") return isRole("SUPER_ADMIN");

      // 2. Check Role-based Menu Access (from backend)
      if (item.menuKey && user?.allowed_menus !== undefined && user?.allowed_menus !== null) {
        if (!user.allowed_menus.includes(item.menuKey)) {
          return false;
        }
      }

      // 4. Take Away feature toggle
      if (item.menuKey === 'parcel' && activeStore && !activeStore.is_take_away_enabled) {
        return false;
      }

      // 5. Reservations feature toggle
      if (item.menuKey === 'reservations' && activeStore && !activeStore.is_reservations_enabled) {
        return false;
      }

      // 5. Check regular permissions
      return !item.permission || hasPermission(item.permission);
    })
  })).filter(section => section.items.length > 0);

  const drawerContent = (
    <>
      <DrawerHeader sx={{ bgcolor: theme.palette.primary.main, gap: 1.5, px: 2, justifyContent: expanded ? 'flex-end' : 'center' }}>
        {expanded && (
          <>
            <Box sx={{ 
              width: 32, 
              height: 32, 
              bgcolor: 'white', 
              borderRadius: 1, 
              overflow: 'hidden', 
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <img src="/logo.png" alt="Mario Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </Box>
            <Typography
              variant="h6"
              sx={{ 
                color: "white", 
                flexGrow: 1, 
                fontWeight: 400, 
                fontSize: '1.4rem',
                lineHeight: 1,
                mt: 0.5,
                fontFamily: pacifico.style.fontFamily
              }}
            >
              Mario
            </Typography>
          </>
        )}
        {!isMobile && expanded && (
          <IconButton onClick={handleDrawerClose} sx={{ color: "white" }}>
            {theme.direction === "rtl" ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        )}
      </DrawerHeader>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

      {/* Scrollable nav area */}
      <Box sx={{ overflowY: "auto", overflowX: "hidden", flexGrow: 1, py: 1 }}>
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

      {/* Logout at bottom */}
      <Box sx={{ mt: 'auto' }}>
        <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />
        <Box sx={{ p: 1, pb: isMobile ? 'calc(16px + env(safe-area-inset-bottom))' : 1 }}>
          <ListItem disablePadding>
            <Tooltip title={!expanded ? "Logout" : ""} placement="right">
              <ListItemButton
                onClick={logout}
                sx={{
                  minHeight: 48,
                  justifyContent: expanded ? "initial" : "center",
                  px: 2.5,
                  borderRadius: 2,
                  color: "#FF5252",
                  "&:hover": {
                    backgroundColor: "rgba(255,82,82,0.12)",
                    "& .MuiListItemIcon-root": { color: "#FF5252" },
                    "& .MuiListItemText-primary": { color: "#FF5252" }
                  },
                }}
              >
                <ListItemIcon
                  sx={{ minWidth: 0, mr: expanded ? 1.5 : "auto", justifyContent: "center", color: "#FF5252" }}
                >
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Logout"
                  sx={{
                    opacity: expanded ? 1 : 0,
                    color: '#FF5252',
                    '& .MuiListItemText-primary': { fontSize: '0.875rem', fontWeight: 700 },
                  }}
                />
              </ListItemButton>
            </Tooltip>
          </ListItem>
        </Box>
      </Box>
    </>
  );

  return (
    <Box sx={{ display: "flex", height: "100dvh", overflow: "hidden" }}>
      <CssBaseline />
      <AppBar position="fixed" open={open}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerToggle}
            edge="start"
            sx={{ marginRight: 5, ...(open && !isMobile && { display: "none" }) }}
          >
            <MenuIcon />
          </IconButton>
          {(isMobile || !open) && (
            <Stack 
              direction="row" 
              spacing={1.5} 
              sx={{ 
                flexGrow: 1, 
                alignItems: 'center', 
                justifyContent: isMobile ? 'center' : 'flex-start',
                ml: isMobile ? -5 : 0 // center offset for back button space
              }}
            >
              <Box sx={{ 
                width: 34, 
                height: 34, 
                bgcolor: 'white', 
                borderRadius: 1, 
                overflow: 'hidden', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <img src="/logo.png" alt="Mario Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </Box>
              <Typography
                variant="h6"
                noWrap
                sx={{
                  fontWeight: 400,
                  fontSize: '1.4rem',
                  color: 'white',
                  letterSpacing: '0.02em',
                  lineHeight: 1,
                  fontFamily: pacifico.style.fontFamily
                }}
              >
                Mario
              </Typography>
            </Stack>
          )}

          {(!isMobile && open) && <Box sx={{ flexGrow: 1 }} />}

          {isMobile && (
            <IconButton
              color="inherit"
              onClick={() => window.dispatchEvent(new CustomEvent('app-refresh'))}
              sx={{ mr: 1 }}
            >
              <RefreshIcon />
            </IconButton>
          )}

          {user?.primary_role === 'SUPER_ADMIN' && (
            <FormControl size="small" sx={{ minWidth: 200, mr: 2 }}>
              <Select
                value={activeStoreId || ""}
                onChange={(e) => setActiveStore(Number(e.target.value))}
                displayEmpty
                sx={{
                  borderRadius: 2,
                  bgcolor: "#FCF9EA",
                  "& .MuiSelect-select": { py: 1, px: 2, fontWeight: 600, fontSize: "0.875rem" },
                }}
              >
                <MenuItem value="" disabled>Select Store</MenuItem>
                {stores.map(store => (
                  <MenuItem key={store.id} value={store.id}>{store.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Box
            id="profile-anchor"
            aria-controls={profileAnchor ? 'profile-menu' : undefined}
            aria-haspopup="true"
            aria-expanded={profileAnchor ? 'true' : undefined}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              cursor: 'pointer',
              '&:hover': { opacity: 0.8 },
              position: 'relative'
            }}
            onClick={(e) => setProfileAnchor(e.currentTarget)}
          >
            <Box sx={{ textAlign: "right", display: { xs: "none", sm: "block" } }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username || "Loading..."}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.primary_role?.replace('_', ' ') || "Fetching..."}
              </Typography>
            </Box>
            <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
              {user?.username?.charAt(0).toUpperCase() || "U"}
            </Avatar>
          </Box>

          <Menu
            id="profile-menu"
            anchorEl={profileAnchor}
            open={Boolean(profileAnchor)}
            onClose={() => setProfileAnchor(null)}
            onClick={() => setProfileAnchor(null)}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            disableScrollLock
            slotProps={{
              paper: {
                elevation: 3,
                sx: {
                  borderRadius: 1.25,
                  mt: 1.5,
                  minWidth: 180,
                  border: '1px solid #e8e4d8',
                  '& .MuiMenuItem-root': {
                    px: 2,
                    py: 1.2,
                    fontWeight: 600,
                    fontSize: '0.875rem'
                  }
                }
              }
            }}
          >
              <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #f5f5f5', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {user?.email || (user?.username + '@pos.com')}
                </Typography>
              </Box>

              <MenuItem onClick={logout} sx={{ color: '#FF5252', '&:hover': { bgcolor: 'rgba(255,82,82,0.08)' } }}>
                <ListItemIcon sx={{ color: '#FF5252', minWidth: '32px !important' }}>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                Logout Account
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

      {/* Mobile Drawer */}
      <MuiDrawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: drawerWidth,
            bgcolor: theme.palette.primary.main,
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        {drawerContent}
      </MuiDrawer>

      {/* Desktop Drawer */}
      <Drawer
        variant="permanent"
        open={open}
        sx={{
          display: { xs: "none", md: "flex" },
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
          backgroundColor: theme.palette.background.default,
          width: "100%",
        }}
      >
        <DrawerHeader />
        <Box sx={{
          flexGrow: 1,
          overflow: "auto",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          pb: isMobile ? 'calc(100px + env(safe-area-inset-bottom, 0px))' : 0 // space for bottom navigation + extra safe buffer
        }}>
          {children}
        </Box>
      </Box>

      {/* Bottom Navigation for Mobile */}
      {isMobile && (
        <Paper
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 2000, // Show above everything (Dialogs are 1300)
            borderTop: '1px solid #e8e4d8',
            borderRadius: 0
          }}
          elevation={4}
        >
          <BottomNavigation
            showLabels
            value={pathname}
            onChange={(event, newValue) => {
              if (typeof newValue === "string") {
                router.push(newValue);
              }
            }}
            sx={{
              height: 'calc(56px + env(safe-area-inset-bottom))',
              pb: 'env(safe-area-inset-bottom)',
              '& .Mui-selected': { color: theme.palette.primary.main }
            }}
          >
            {(user?.allowed_menus?.includes('dashboard') || isRole('SUPER_ADMIN')) ? (
              <BottomNavigationAction
                label="Dashboard"
                value="/backoffice"
                icon={<DashboardIcon />}
              />
            ) : (user?.allowed_menus?.includes('reservations') || isRole('SUPER_ADMIN')) && (activeStore?.is_reservations_enabled !== false) ? (
              <BottomNavigationAction
                label="Reservations"
                value="/backoffice/restaurant/reservations"
                icon={<ReservationIcon />}
              />
            ) : null}
            <BottomNavigationAction
              label="Tables"
              value="/backoffice/restaurant/tables"
              icon={<TableIcon />}
            />
            <BottomNavigationAction
              label="Orders"
              value="/backoffice/restaurant/orders"
              icon={<OrdersIcon />}
            />
            <BottomNavigationAction
              label="Billing"
              value="/backoffice/billing"
              icon={<ReceiptIcon />}
            />
            <BottomNavigationAction
              label="More"
              icon={<MenuIcon />}
              onClick={handleDrawerToggle}
            />
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
}
