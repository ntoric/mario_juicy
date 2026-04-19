"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { Pacifico } from "next/font/google";

const pacifico = Pacifico({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

/**
 * Root page component that handles initial redirection.
 * If the user is authenticated, they are redirected to the backoffice dashboard.
 * If not, they are redirected to the login page.
 */
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Check authentication status on the client side
    if (isAuthenticated()) {
      router.push("/backoffice");
    } else {
      router.push("/login");
    }
  }, [router]);

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#E9762B', // Branded orange
      fontFamily: 'var(--font-main, "Outfit", sans-serif)',
      overflow: 'hidden'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 
          className={pacifico.className} 
          style={{ 
            color: 'white', 
            fontSize: '4rem', 
            margin: 0,
            animation: 'pulse 1.8s ease-in-out infinite',
            letterSpacing: '0.02em'
          }}
        >
          Mario
        </h1>
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 0.7; }
        }

        .logo-pulse {
          animation: pulse 1.8s ease-in-out infinite;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
    </div>
  );
}
