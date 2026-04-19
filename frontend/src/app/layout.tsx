import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "POS Matrix | Premium Retail POS",
  description: "Next-generation retail management system",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "POS Matrix",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#E9762B",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        <Toaster position="top-center" richColors expand />
        {children}
      </body>
    </html>
  );
}
