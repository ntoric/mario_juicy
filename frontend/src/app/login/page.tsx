"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { LogIn, User, Lock, Loader2, Store, Settings } from "lucide-react";
import { fetcher } from "@/lib/api";
import { setTokens, isAuthenticated } from "@/lib/auth";
// import Preloader from "@/components/ui/Preloader";
import "./login.css";

export default function LoginPage() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const { fetchProfile } = useAuth();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  useEffect(() => {
    // Safety timeout to prevent getting stuck on "Checking session"
    const timeout = setTimeout(() => {
      setIsAuthenticating(false);
    }, 2000);

    if (isAuthenticated()) {
      router.push("/backoffice");
    } else {
      setIsAuthenticating(false);
      clearTimeout(timeout);
    }

    return () => clearTimeout(timeout);
  }, [router]);

  const [showSettings, setShowSettings] = useState(false);
  const [customApiUrl, setCustomApiUrl] = useState("");

  useEffect(() => {
    const storedUrl = localStorage.getItem('custom_api_url');
    if (storedUrl) setCustomApiUrl(storedUrl);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await fetcher("/users/login/", {
        method: "POST",
        body: JSON.stringify(formData),
      });

      setTokens(data.access, data.refresh);
      await fetchProfile();
      showSuccess("Welcome back!", "You have successfully logged in.");
      router.push("/backoffice");
    } catch (error: any) {
      showError("Login Failed", error.message || "Invalid username or password.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = () => {
    if (customApiUrl) {
      localStorage.setItem('custom_api_url', customApiUrl);
    } else {
      localStorage.removeItem('custom_api_url');
    }
    setShowSettings(false);
    showSuccess("Settings Saved", "The API URL has been updated.");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // if (isAuthenticating) {
  //   return <Preloader fullScreen message="Checking session..." />;
  // }

  return (
    <div className={`login-container animate-fade-in`}>

      <div className="login-card">

        <header className="login-header" style={{ marginBottom: "0px" }}>
          <img
            src="/mario_juicy_logo.png"
            alt="Mario Logo"
            style={{ width: '50%', height: '50%', objectFit: 'contain', animation: 'pulse-float 4s ease-in-out infinite', marginBottom: "2px", }}
          />
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
          <p>Unable to log in? <a href="mailto:mariojuicy2026@gmail.com">Support</a></p>
        </footer>
      </div>

      {/* Server Settings Modal */}
      {showSettings && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '0.65rem',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ marginBottom: '10px', fontSize: '1.25rem', fontWeight: 700, color: '#2c1810' }}>Server Settings</h3>
            <p style={{ marginBottom: '20px', fontSize: '0.9rem', color: '#666' }}>
              Configure the API server address. This is required for mobile devices to connect to your local server.
            </p>

            <div className="form-group">
              <label className="form-label">API Base URL</label>
              <input
                type="text"
                className="form-input"
                placeholder="http://192.168.1.5:8022/api"
                value={customApiUrl}
                onChange={(e) => setCustomApiUrl(e.target.value)}
              />
              <p style={{ fontSize: '0.75rem', color: '#E9762B', marginTop: '8px' }}>
                Example: http://[YOUR_IP]:8022/api
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '30px' }}>
              <button
                onClick={() => setShowSettings(false)}
                className="form-input"
                style={{ flex: 1, backgroundColor: '#f5f5f5', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                className="login-button"
                style={{ flex: 1, marginTop: 0 }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
