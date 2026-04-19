"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogIn, User, Lock, Loader2, Store } from "lucide-react";
import { fetcher } from "@/lib/api";
import { setTokens, isAuthenticated } from "@/lib/auth";
import { Pacifico } from "next/font/google";
import Preloader from "@/components/ui/Preloader";
import "./login.css";

const pacifico = Pacifico({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export default function LoginPage() {
  const router = useRouter();
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  useEffect(() => {
    if (isAuthenticated()) {
      router.push("/backoffice");
    } else {
      setIsAuthenticating(false);
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await fetcher("/users/login/", {
        method: "POST",
        body: JSON.stringify(formData),
      });

      setTokens(data.access, data.refresh);
      toast.success("Welcome back!", {
        description: "You have successfully logged in.",
      });
      router.push("/backoffice");
    } catch (error: any) {
      toast.error("Login Failed", {
        description: error.message || "Invalid username or password.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (isAuthenticating) {
    return <Preloader fullScreen message="Checking session..." />;
  }

  return (
    <div className={`login-container animate-fade-in`}>
      {/* Branding section for mobile/desktop */}
      <div className="login-brand-section">
        <div className="brand-icon-wrapper" style={{ overflow: 'hidden', padding: 0, backgroundColor: 'white', borderRadius: '22px', border: '2px solid #E9762B' }}>
          <img 
            src="/logo.png" 
            alt="Mario Logo" 
            style={{ width: '100%', height: '100%', objectFit: 'contain', animation: 'pulse-float 4s ease-in-out infinite' }} 
          />
        </div>
        <h2 className={`mobile-brand-title ${pacifico.className}`}>Mario</h2>
      </div>

      <div className="login-card">
        <header className="login-header">
          <h1 className={`login-title ${pacifico.className}`}>Mario</h1>
          <p className="login-subtitle">Enter your credentials to access the POS</p>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: loading ? '#cbd5e1' : '#E9762B' }}>
                <User size={18} />
              </span>
              <input
                type="text"
                name="username"
                className="form-input"
                placeholder="Username"
                value={formData.username}
                onChange={handleChange}
                required
                disabled={loading}
                style={{ paddingLeft: '48px' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: loading ? '#cbd5e1' : '#E9762B' }}>
                <Lock size={18} />
              </span>
              <input
                type="password"
                name="password"
                className="form-input"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
                style={{ paddingLeft: '48px' }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <Loader2 className="animate-spin" size={20} />
                Authenticating...
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <LogIn size={20} />
                Access Dashboard
              </span>
            )}
          </button>
        </form>

        <footer className="login-footer">
          <p>Unable to log in? <a href="#">Support</a></p>
        </footer>
      </div>
    </div>
  );
}
