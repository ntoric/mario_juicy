"use client";
import { useTheme } from "@mui/material/styles";
import React, { createContext, useContext, useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Typography,
  Box,
  alpha
} from '@mui/material';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  severity?: 'info' | 'warning' | 'error';
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({ message: '' });
  const resolveRef = useRef<(value: boolean) => void>(undefined);

  const confirm = (data: ConfirmOptions | string) => {
    const opts = typeof data === 'string' ? { message: data } : data;
    setOptions(opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  };

  const handleClose = (value: boolean) => {
    setOpen(false);
    if (resolveRef.current) {
      resolveRef.current(value);
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Dialog
        open={open}
        onClose={() => handleClose(false)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: '0.65rem',
              p: 1,
              maxWidth: 400,
              width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.1)'
            }
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 1000, pb: 1, fontSize: '1.25rem' }}>
          {options.title || 'Confirm Action'}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>
            {options.message}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1, gap: 1.5 }}>
          <Button 
            onClick={() => handleClose(false)} 
            sx={{ fontWeight: 900, color: 'text.disabled' }}
          >
            {options.cancelLabel || 'CANCEL'}
          </Button>
          <Button
            variant="contained"
            onClick={() => handleClose(true)}
            sx={{
              borderRadius: '0.65rem',
              fontWeight: 1000,
              bgcolor: options.severity === 'error' ? '#d32f2f' : '#E9762B',
              '&:hover': {
                bgcolor: options.severity === 'error' ? '#c62828' : '#d66a27'
              }
            }}
          >
            {options.confirmLabel || 'CONFIRM'}
          </Button>
        </DialogActions>
      </Dialog>
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const theme = useTheme();

  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};
