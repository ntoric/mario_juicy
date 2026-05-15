"use client";

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Box } from '@mui/material';

interface PageHeaderProps {
  children: React.ReactNode;
}

export default function PageHeader({ children }: PageHeaderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const targetNode = document.getElementById('backoffice-sub-navbar');
  
  if (!targetNode) return null;

  return createPortal(
    <Box sx={{ 
      px: { xs: 1.5, sm: 2.5 }, 
      minHeight: { xs: 60, md: 56 },
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      flexDirection: { xs: 'column', md: 'row' },
      gap: 1.5,
      '& .MuiTypography-h3, & .MuiTypography-h4': {
        fontSize: '1.25rem !important',
        fontWeight: '800 !important',
        letterSpacing: '0 !important',
      },
      '& .MuiButton-root': {
        height: '36px !important',
        fontSize: '0.75rem !important',
        px: '16px !important',
      },
      '& .MuiIconButton-root': {
        width: '36px !important',
        height: '36px !important',
      },
      '& .MuiInputBase-root': {
        height: '36px !important',
      }
    }}>
      {children}
    </Box>,
    targetNode
  );
}
