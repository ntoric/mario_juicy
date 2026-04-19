"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { backofficeTheme } from "@/theme/backofficeTheme";
import BackofficeLayout from "@/components/backoffice/BackofficeLayout";
import { Pacifico } from "next/font/google";

const pacifico = Pacifico({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export default function BackofficeRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      if (!isAuthenticated()) {
        router.push("/login");
      } else {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router, pathname]);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#E9762B' }}>
        <h1 
          className={pacifico.className} 
          style={{ 
            color: 'white', 
            fontSize: '3.5rem', 
            margin: 0,
            animation: 'pulse 1.8s ease-in-out infinite',
            letterSpacing: '0.02em'
          }}
        >
          Mario
        </h1>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes pulse {
            0% { transform: scale(1); opacity: 0.7; }
            50% { transform: scale(1.1); opacity: 1; }
            100% { transform: scale(1); opacity: 0.7; }
          }
        ` }} />
      </div>
    );
  }

  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={backofficeTheme}>
        <CssBaseline />
        <BackofficeLayout>
          {children}
        </BackofficeLayout>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
