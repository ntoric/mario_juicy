"use client";

import { Box, Typography, Breadcrumbs, Link } from "@mui/material";
import RestaurantSettings from "@/components/backoffice/settings/RestaurantSettings";
import TaxConfiguration from "@/components/backoffice/settings/TaxConfiguration";
import BusinessConfigForm from "@/components/backoffice/settings/BusinessConfigForm";
import NextLink from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SystemSettingsPage() {
  const { isRole, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isRole('SUPER_ADMIN') && !isRole('ADMIN') && !isRole('CASHIER')) {
      router.push("/backoffice/forbidden");
    }
  }, [loading, isRole, router]);

  if (loading) return null;
  if (!isRole('SUPER_ADMIN') && !isRole('ADMIN') && !isRole('CASHIER')) return null;

  return (
    <Box sx={{ p: 3 }}>
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
          <Link
            component={NextLink}
            underline="hover"
            color="inherit"
            href="/backoffice/settings"
            sx={{ fontSize: '0.875rem' }}
          >
            Settings
          </Link>
          <Typography color="text.primary" sx={{ fontSize: '0.875rem' }}>Business Configs</Typography>
        </Breadcrumbs>
        
        <Typography variant="h4" sx={{ fontWeight: 500, color: '#e9762b', fontSize: '1.5rem' }}>
          Business Configs
        </Typography>
      </Box>

      <Box sx={{ mt: 4 }}>
        <Box sx={{ mb: 6 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>Business Details (Invoice Overrides)</Typography>
          <BusinessConfigForm />
        </Box>

        <Box sx={{ mb: 6 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>Tax Configuration</Typography>
          <TaxConfiguration />
        </Box>
        
        <Box sx={{ mb: 6 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>Restaurant Settings</Typography>
          <RestaurantSettings />
        </Box>
      </Box>
    </Box>
  );
}
