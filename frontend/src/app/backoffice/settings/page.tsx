"use client";

import { Box, Typography, Breadcrumbs, Link, Divider } from "@mui/material";
import TaxConfiguration from "@/components/backoffice/settings/TaxConfiguration";
import RestaurantSettings from "@/components/backoffice/settings/RestaurantSettings";
import SystemReset from "@/components/backoffice/settings/SystemReset";
import NextLink from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function SettingsPage() {
  const { isRole } = useAuth();
  const isSuperAdmin = isRole('SUPER_ADMIN');

  return (
    <Box>
      <Box sx={{ mb: 4, display: { xs: 'none', md: 'block' } }}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 1 }}>
          <Link
            component={NextLink}
            underline="hover"
            color="inherit"
            href="/backoffice"
            sx={{ fontSize: '0.875rem' }}
          >
            Backoffice
          </Link>
          <Typography color="text.primary" sx={{ fontSize: '0.875rem' }}>Settings</Typography>
        </Breadcrumbs>
        
        <Typography variant="h4" sx={{ fontWeight: 500, color: '#e9762b', fontSize: '1.5rem' }}>
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
