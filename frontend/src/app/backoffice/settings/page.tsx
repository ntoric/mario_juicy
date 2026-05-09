"use client";

import { Box, Typography, Breadcrumbs, Link, Divider, CircularProgress } from "@mui/material";
import SystemReset from "@/components/backoffice/settings/SystemReset";
import NextLink from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function SettingsPage() {
  const { isRole, hasPermission, loading } = useAuth();
  const isSuperAdmin = isRole('SUPER_ADMIN');
  const canManageSettings = hasPermission('store_settings');

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, md: 2 } }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 500, color: '#e9762b', fontSize: '1.25rem' }}>
          System Configs
        </Typography>
      </Box>

      <Box sx={{ mt: 4 }}>

        {isSuperAdmin && (
          <Box sx={{ mb: 6 }}>
            <Divider sx={{ my: 6 }} />
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, color: 'error.main' }}>
              Advanced System Operations
            </Typography>
            <SystemReset />
          </Box>
        )}
      </Box>
    </Box>
  );
}
