import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { authService } from '../services/authService';
import { storage } from '../services/storage';

interface AuthContextType {
  user: any;
  loading: boolean;
  activeStoreId: string | null;
  login: (formData: any) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'login';

    if (!user && !inAuthGroup) {
      router.replace('/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, segments, loading]);

  async function checkAuth() {
    try {
      const authenticated = await authService.isAuthenticated();
      if (authenticated) {
        const profile = await authService.getProfile();
        setUser(profile);
        
        // Handle Store ID
        const savedStoreId = await storage.getItem('active_store_id');
        if (profile.store?.id) {
          const sId = profile.store.id.toString();
          setActiveStoreId(sId);
          await storage.setItem('active_store_id', sId);
        } else if (savedStoreId) {
          setActiveStoreId(savedStoreId);
        }
      }
    } catch (error) {
      console.error('Check auth failed:', error);
    } finally {
      setLoading(false);
    }
  }

  const login = async (formData: any) => {
    await authService.login(formData);
    const profile = await authService.getProfile();
    setUser(profile);
    
    if (profile.store?.id) {
      const sId = profile.store.id.toString();
      setActiveStoreId(sId);
      await storage.setItem('active_store_id', sId);
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setActiveStoreId(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, activeStoreId, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
