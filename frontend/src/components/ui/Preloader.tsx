"use client";

import React from 'react';
import { Box, Typography } from '@mui/material';

interface PreloaderProps {
  fullScreen?: boolean;
  size?: number;
  message?: string;
  blur?: boolean;
}

const Preloader: React.FC<PreloaderProps> = ({ 
  fullScreen = true, 
  size = 120, 
  message = "Loading...",
  blur = true
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: fullScreen ? 'fixed' : 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        backgroundColor: blur ? 'rgba(252, 249, 234, 0.7)' : 'rgba(252, 249, 234, 1)',
        backdropFilter: blur ? 'blur(10px)' : 'none',
        transition: 'all 0.3s ease',
      }}
    >
      <style>{`
        @keyframes pulse-float {
          0% {
            transform: translateY(0px) scale(1);
            filter: drop-shadow(0 5px 15px rgba(233, 118, 43, 0.2));
          }
          50% {
            transform: translateY(-10px) scale(1.05);
            filter: drop-shadow(0 20px 30px rgba(233, 118, 43, 0.4));
          }
          100% {
            transform: translateY(0px) scale(1);
            filter: drop-shadow(0 5px 15px rgba(233, 118, 43, 0.2));
          }
        }

        @keyframes shimmer {
          0% { opacity: 0.5; }
          50% { opacity: 1; }
          100% { opacity: 0.5; }
        }
      `}</style>

      <Box
        sx={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'pulse-float 3s ease-in-out infinite',
          mb: 3,
        }}
      >
        <img 
          src="/logo.png" 
          alt="Mario POS" 
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'contain' 
          }} 
        />
      </Box>

      {message && (
        <Typography
          variant="body1"
          sx={{
            fontWeight: 600,
            color: '#E9762B',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontSize: '0.75rem',
            animation: 'shimmer 2s ease-in-out infinite',
          }}
        >
          {message}
        </Typography>
      )}
    </Box>
  );
};

export default Preloader;
