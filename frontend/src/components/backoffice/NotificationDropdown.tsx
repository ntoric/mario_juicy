"use client";

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Badge,
  Popover,
  List,
  ListItem,
  ListItemText,
  Divider,
  Button,
  alpha,
  useTheme,
  CircularProgress,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Circle as CircleIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';
import { notificationService, Notification } from '@/services/notificationService';
import { useRouter } from 'next/navigation';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export default function NotificationDropdown() {
  const theme = useTheme();
  const router = useRouter();
  const { user, activeStoreId } = useAuth();
  const { showInfo } = useToast();
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    } finally {
      setLoading(false);
    }
  };

  // Real-time notification handler
  useWebSocket('NEW_NOTIFICATION', (newNotification: Notification) => {
    // Only add if it belongs to this store
    if (activeStoreId && newNotification.store_id === activeStoreId) {
      // If it's targeted to a user, check if it's the current user
      if (!newNotification.user_id || newNotification.user_id === user?.id) {
        setNotifications(prev => {
          // Avoid duplicates if any
          if (prev.some(n => n.id === newNotification.id)) return prev;
          return [newNotification, ...prev].slice(0, 50);
        });
        setUnreadCount(prev => prev + 1);
        
        // Show a brief toast for new notifications
        showInfo(newNotification.title, newNotification.message);
      }
    }
  });

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => prev.map((n: Notification) => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark as read", error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map((n: Notification) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read", error);
    }
  };

  const handleNotificationClick = (n: Notification) => {
    if (!n.is_read) handleMarkAsRead(n.id);
    if (n.link) router.push(n.link);
    handleClose();
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const open = Boolean(anchorEl);
  const id = open ? 'notification-popover' : undefined;

  return (
    <>
      <IconButton 
        onClick={handleClick}
        sx={{
          bgcolor: { xs: alpha('#ffffff', 0.15), md: theme.palette.background.default },
          borderRadius: '7px',
          border: { xs: '1px solid rgba(255,255,255,0.1)', md: '1px solid rgba(0,0,0,0.03)' },
          '&:hover': { bgcolor: { xs: alpha('#ffffff', 0.25), md: alpha(theme.palette.primary.main, 0.08) } }
        }}
      >
        <Badge badgeContent={unreadCount} color="error" overlap="circular">
          <NotificationsIcon sx={{ color: { xs: '#ffffff', md: '#94a3b8' }, fontSize: 22 }} />
        </Badge>
      </IconButton>

      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        slotProps={{
          paper: {
            sx: {
              width: 360,
              maxHeight: 500,
              borderRadius: '16px',
              mt: 1.5,
              boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
              border: '1px solid #f1f5f9',
              display: 'flex',
              flexDirection: 'column'
            }
          }
        }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9' }}>
          <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1rem' }}>
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Button size="small" onClick={handleMarkAllRead} sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
              Mark all as read
            </Button>
          )}
        </Box>

        <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
          {loading && notifications.length === 0 ? (
            <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
              <CircularProgress size={24} />
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                No notifications yet
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {notifications.map((n) => (
                <React.Fragment key={n.id}>
                  <ListItem 
                    onClick={() => handleNotificationClick(n)}
                    sx={{ 
                      p: 2, 
                      cursor: 'pointer',
                      bgcolor: n.is_read ? 'transparent' : alpha(theme.palette.primary.main, 0.03),
                      '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05) },
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 2
                    }}
                  >
                    {!n.is_read ? (
                      <CircleIcon sx={{ color: theme.palette.primary.main, fontSize: 10, mt: 1 }} />
                    ) : (
                      <Box sx={{ width: 10 }} />
                    )}
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5, color: n.is_read ? 'text.primary' : theme.palette.primary.main }}>
                        {n.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem', lineHeight: 1.4, mb: 1 }}>
                        {n.message}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <TimeIcon sx={{ fontSize: 14, color: '#94a3b8' }} />
                        <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>
                          {formatRelativeTime(n.created_at)}
                        </Typography>
                      </Box>
                    </Box>
                  </ListItem>
                  <Divider sx={{ borderColor: '#f1f5f9' }} />
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>

        <Box sx={{ p: 1.5, textAlign: 'center', borderTop: '1px solid #f1f5f9' }}>
          <Button fullWidth size="small" sx={{ fontWeight: 700, color: 'text.secondary' }}>
            View all activity
          </Button>
        </Box>
      </Popover>
    </>
  );
}
