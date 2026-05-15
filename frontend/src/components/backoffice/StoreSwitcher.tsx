"use client";

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Menu, 
  MenuItem, 
  Button, 
  CircularProgress,
  alpha,
  useTheme
} from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import StoreIcon from '@mui/icons-material/StoreOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDownOutlined';
import { useAuth } from '@/context/AuthContext';
import { storeService, Store } from '@/services/storeService';

interface StoreSwitcherProps {
  fullWidth?: boolean;
  sx?: SxProps<Theme>;
}

const StoreSwitcher: React.FC<StoreSwitcherProps> = ({ fullWidth = false, sx }) => {
  const theme = useTheme();
  const { user, activeStoreId, setActiveStore, activeStore } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const isSuperAdmin = user?.roles.includes('SUPER_ADMIN');

  useEffect(() => {
    if (isSuperAdmin) {
      const fetchStores = async () => {
        setLoading(true);
        try {
          const data = await storeService.getStores();
          setStores(data);
        } catch (err) {
          console.error('Failed to fetch stores:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchStores();
    }
  }, [isSuperAdmin]);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (isSuperAdmin) {
      setAnchorEl(event.currentTarget);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelectStore = (storeId: number) => {
    setActiveStore(storeId);
    handleClose();
    // Force a page refresh to reload all data for the new store
    window.location.reload();
  };

  if (!user) return null;
  
  // For non-super admins, just show the store name without the switcher functionality
  if (!isSuperAdmin) {
    return (
      <Box sx={[{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1, 
        px: 1.5, 
        py: 0.5, 
        bgcolor: alpha(theme.palette.primary.main, 0.05),
        borderRadius: '0.65rem',
        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
      }, ...(Array.isArray(sx) ? sx : [sx])]}>
        <StoreIcon sx={{ fontSize: 20, color: theme.palette.primary.main }} />
        <Typography variant="body2" sx={{ fontWeight: 800, color: theme.palette.primary.main }}>
          {activeStore?.name || 'Loading Store...'}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={[{ width: fullWidth ? '100%' : 'auto' }, ...(Array.isArray(sx) ? sx : [sx])]}>
      <Button
        variant="outlined"
        onClick={handleClick}
        startIcon={<StoreIcon />}
        fullWidth={fullWidth}
        endIcon={<KeyboardArrowDownIcon />}
        sx={{
          borderRadius: '0.65rem',
          textTransform: 'none',
          fontWeight: 800,
          borderColor: alpha(theme.palette.primary.main, 0.2),
          color: theme.palette.primary.main,
          bgcolor: alpha(theme.palette.primary.main, 0.05),
          px: 2,
          justifyContent: fullWidth ? 'space-between' : 'center',
          '&:hover': {
            borderColor: theme.palette.primary.main,
            bgcolor: alpha(theme.palette.primary.main, 0.1),
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden' }}>
          <Typography variant="body2" sx={{ fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {activeStore?.name || 'Select Store'}
          </Typography>
        </Box>
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        slotProps={{
          paper: {
            className: 'glass-effect',
            sx: {
              mt: 1,
              minWidth: 200,
              borderRadius: '0.65rem',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
            }
          }
        }}
      >
        {loading ? (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          stores.map((store) => (
            <MenuItem 
              key={store.id} 
              onClick={() => handleSelectStore(store.id)}
              selected={store.id === activeStoreId}
              sx={{ 
                py: 1.5, 
                px: 2,
                fontWeight: 700,
                fontSize: '0.85rem',
                gap: 1
              }}
            >
              <StoreIcon sx={{ fontSize: 18, color: store.id === activeStoreId ? theme.palette.primary.main : 'inherit' }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                  {store.name}
                </Typography>
                {!store.is_active && (
                  <Typography variant="caption" color="error" sx={{ fontWeight: 600 }}>
                    Inactive
                  </Typography>
                )}
              </Box>
            </MenuItem>
          ))
        )}
      </Menu>
    </Box>
  );
};

export default StoreSwitcher;
