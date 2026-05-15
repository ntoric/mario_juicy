'use client';

import React, { createContext, useContext } from 'react';
import { toast, Toaster } from 'sonner';

interface ToastContextType {
  showToast: (message: string) => void;
  showSuccess: (summary: string, detail?: string) => void;
  showError: (summary: string, detail?: string) => void;
  showInfo: (summary: string, detail?: string) => void;
  showWarn: (summary: string, detail?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const showToast = (message: string) => {
    toast(message);
  };

  const showSuccess = (summary: string, detail?: string) => {
    toast.success(summary, {
      description: detail,
    });
  };

  const showError = (summary: string, detail?: string) => {
    toast.error(summary, {
      description: detail,
    });
  };

  const showInfo = (summary: string, detail?: string) => {
    toast.info(summary, {
      description: detail,
    });
  };

  const showWarn = (summary: string, detail?: string) => {
    toast.warning(summary, {
      description: detail,
    });
  };

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showInfo, showWarn }}>
      <Toaster 
        theme="dark"
        position="top-center" 
        closeButton 
        duration={5000}
        toastOptions={{
          style: {
            borderRadius: '0.65rem',
            border: '1px solid #333',
            background: '#121212',
            color: '#fff',
          },
        }}
      />
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
