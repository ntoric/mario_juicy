"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, logout } from "@/lib/auth";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
    } else {
      setLoading(false);
    }
  }, [router]);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FCF9EA' }}>
        <p style={{ color: '#5d4037', fontSize: '1.25rem' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="layout-wrapper">
      <aside className="sidebar">
        <div style={{ padding: '0 1rem 2rem 1rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.5px' }}>
            POS MATRIX
          </h1>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div className="sidebar-item active">Dashboard</div>
          <div className="sidebar-item">Inventory</div>
          <div className="sidebar-item">Sales Terminal</div>
          <div className="sidebar-item">Customers</div>
          <div className="sidebar-item">Reports</div>
          <div className="sidebar-item">Settings</div>
        </nav>
        <div style={{ marginTop: 'auto', padding: '1rem' }}>
            <button 
                onClick={logout}
                className="sidebar-item" 
                style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'left', color: '#CF0F0F', fontWeight: 600 }}
            >
                Logout
            </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="app-header" style={{ marginBottom: '2rem', padding: '0', background: 'transparent', border: 'none', position: 'relative' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#2c1810' }}>Overview</h2>
            <p style={{ color: '#5d4037', fontSize: '0.875rem' }}>Welcome back to your dashboard</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button className="btn-primary">New Sale</button>
            <div style={{ width: '40px', height: '40px', background: 'var(--accent-secondary)', borderRadius: '50%' }}></div>
          </div>
        </header>
        
        <div className="animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
