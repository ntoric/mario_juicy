"use client";

import { Box, Typography, Breadcrumbs, Link, Divider, CircularProgress } from "@mui/material";
import TaxConfiguration from "@/components/backoffice/settings/TaxConfiguration";
import RestaurantSettings from "@/components/backoffice/settings/RestaurantSettings";
import SystemReset from "@/components/backoffice/settings/SystemReset";
import NextLink from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function SettingsPage() {
  const { isRole, loading } = useAuth();
  const isSuperAdmin = isRole('SUPER_ADMIN');

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
          Settings
        </Typography>
      </Box>

      <Box sx={{ mt: 4 }}>
        <Box sx={{ mb: 6 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>Tax Configuration</Typography>
          <TaxConfiguration />
        </Box>

        {isSuperAdmin && (
          <Box sx={{ mb: 6 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>Restaurant Settings</Typography>
            <RestaurantSettings />
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
