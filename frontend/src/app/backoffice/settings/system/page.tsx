"use client";
import { useTheme, alpha } from "@mui/material/styles";

import { Box, Typography, Breadcrumbs, Link } from "@mui/material";
import RestaurantSettings from "@/components/backoffice/settings/RestaurantSettings";
import TaxConfiguration from "@/components/backoffice/settings/TaxConfiguration";
import BusinessConfigForm from "@/components/backoffice/settings/BusinessConfigForm";
import NextLink from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import PageHeader from "@/components/backoffice/PageHeader";


export default function SystemSettingsPage() {
  const theme = useTheme();

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
      <PageHeader>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, color: theme.palette.primary.main, fontSize: '2rem' }}>
            Business Configs
          </Typography>
        </Box>
      </PageHeader>

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
