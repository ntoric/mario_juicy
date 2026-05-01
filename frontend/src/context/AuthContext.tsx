"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetcher } from '@/lib/api';
import { Store, storeService } from '@/services/storeService';

interface UserProfile {
  id: number;
  username: string;
  email: string;
  roles: string[];
  primary_role: string;
  permissions: string[];
  allowed_menus: string[] | null;
  first_name: string;
  last_name: string;
  store: Store | null;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  activeStoreId: number | null;
  activeStore: Store | null;
  storeLoading: boolean;
  hasPermission: (permission: string) => boolean;
  isRole: (role: string) => boolean;
  setActiveStore: (id: number | null) => void;
  refreshActiveStore: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStoreId, setActiveStoreId] = useState<number | null>(null);
  const [activeStore, setActiveStoreData] = useState<Store | null>(null);
  const [storeLoading, setStoreLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      console.log('AuthContext: Fetching user profile...');
      const data = await fetcher('/users/profile/');
      console.log('AuthContext: Profile fetched successfully', data);
      setUser(data);
      
      const isGlobalAdmin = data.primary_role === 'SUPER_ADMIN' || data.primary_role === 'ADMIN';
      const savedStoreId = localStorage.getItem('activeStoreId');
      
      if (isGlobalAdmin) {
        if (savedStoreId) {
          setActiveStoreId(parseInt(savedStoreId));
        } else if (data.store) {
          setActiveStoreId(data.store.id);
          localStorage.setItem('activeStoreId', data.store.id.toString());
        } else {
          setActiveStoreId(1);
          localStorage.setItem('activeStoreId', '1');
        }
      } else if (data.store) {
        setActiveStoreId(data.store.id);
      }
    } catch (err: any) {
      console.error('AuthContext: Failed to fetch user profile:', err);
      if (err.status === 401) {
        logout();
        return;
      }
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [fetchProfile]);

  useEffect(() => {
    if (!activeStoreId) {
      setActiveStoreData(null);
      return;
    }

    async function fetchActiveStoreDetails() {
      setStoreLoading(true);
      try {
        const storeData = await storeService.getStore(activeStoreId!);
        setActiveStoreData(storeData);
      } catch (err) {
        console.error('AuthContext: Failed to fetch active store details:', err);
      } finally {
        setStoreLoading(false);
      }
    }

    fetchActiveStoreDetails();
  }, [activeStoreId]);

  const setActiveStore = (id: number | null) => {
    setActiveStoreId(id);
    if (id) {
      localStorage.setItem('activeStoreId', id.toString());
    } else {
      localStorage.removeItem('activeStoreId');
    }
  };

  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (user.primary_role === 'SUPER_ADMIN' || user.primary_role === 'ADMIN') return true;
    return user.permissions.includes(permission) || user.permissions.includes(`users.${permission}`);
  };

  const isRole = (role: string) => {
    const r = role.toUpperCase();
    if (r === 'ADMIN') return user?.primary_role === 'ADMIN' || user?.primary_role === 'SUPER_ADMIN';
    return user?.primary_role === r;
  };

  const refreshActiveStore = async () => {
    if (!activeStoreId) return;
    setStoreLoading(true);
    try {
      const storeData = await storeService.getStore(activeStoreId);
      setActiveStoreData(storeData);
    } catch (err) {
      console.error('AuthContext: Failed to refresh active store details:', err);
    } finally {
      setStoreLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('activeStoreId');
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      error, 
      hasPermission, 
      isRole,
      activeStoreId,
      activeStore,
      storeLoading,
      setActiveStore,
      refreshActiveStore,
      logout
    }}>
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
