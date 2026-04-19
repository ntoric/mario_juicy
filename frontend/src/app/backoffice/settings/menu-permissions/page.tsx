"use client";

import { Box, Typography, Breadcrumbs, Link } from "@mui/material";
import MenuManagement from "@/components/backoffice/settings/MenuManagement";
import NextLink from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function MenuPermissionsPage() {
  const { isRole, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isRole('SUPER_ADMIN')) {
      router.push("/backoffice/forbidden");
    }
  }, [loading, isRole, router]);

  if (loading) return null;
  if (!isRole('SUPER_ADMIN')) return null;

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
          <Typography color="text.primary" sx={{ fontSize: '0.875rem' }}>Menu Permissions</Typography>
        </Breadcrumbs>
        
        <Typography variant="h4" sx={{ fontWeight: 500, color: '#e9762b', fontSize: '1.5rem' }}>
          Menu Permissions
        </Typography>
      </Box>

      <Box sx={{ mt: 4 }}>
        <MenuManagement />
      </Box>
    </Box>
  );
}
