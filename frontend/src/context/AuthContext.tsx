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
  fetchProfile: () => Promise<void>;
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
      
      const isSuperAdmin = data.primary_role === 'SUPER_ADMIN';
      const savedStoreId = localStorage.getItem('activeStoreId');
      
      if (isSuperAdmin) {
        if (savedStoreId) {
          setActiveStoreId(parseInt(savedStoreId));
        } else if (data.store) {
          setActiveStoreId(data.store.id);
          localStorage.setItem('activeStoreId', data.store.id.toString());
        } else {
          setActiveStoreId(1); // Default to store 1 if nothing else
          localStorage.setItem('activeStoreId', '1');
        }
      } else if (data.store) {
        // Force Store Admin or other roles to their assigned store
        setActiveStoreId(data.store.id);
        localStorage.setItem('activeStoreId', data.store.id.toString());
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

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    const role = user.primary_role?.toUpperCase();
    if (role === 'SUPER_ADMIN') return true;

    // Check menu-based permissions
    if (user.allowed_menus?.includes(permission)) return true;

    // Mapping for legacy permission strings to new menu-based keys
    const legacyMapping: Record<string, string> = {
      'manage_table_layout_access': 'table_layout',
      'view_table_layout_access': 'tables_access',
      'access_to_payment_management': 'billing',
      'restaurants.view_order': 'live_order',
      'restaurants.add_order': 'tables_access',
      'restaurants.change_order': 'live_order',
      'restaurants.delete_order': 'live_order',
      'restaurants.view_reservation': 'reservation',
      'restaurants.add_reservation': 'reservation',
      'restaurants.change_reservation': 'reservation',
      'restaurants.view_invoice': 'billing',
      'restaurants.view_table': 'tables_access',
      'catalogs.view_category': 'categories',
      'catalogs.add_category': 'categories',
      'catalogs.change_category': 'categories',
      'catalogs.delete_category': 'categories',
      'catalogs.view_item': 'items',
      'catalogs.add_item': 'items',
      'catalogs.change_item': 'items',
      'catalogs.delete_item': 'items',
      'users.view_user': 'users_management',
      'users.add_user': 'users_management',
      'users.change_user': 'users_management',
      'users.delete_user': 'users_management',
      'core.view_taxconfiguration': 'store_settings',
      'core.change_taxconfiguration': 'store_settings',
    };

    const mappedPermission = legacyMapping[permission];
    if (mappedPermission && user.allowed_menus?.includes(mappedPermission)) return true;

    // Special case for take order: can be either tables or parcel or live order
    if (permission === 'access_to_take_order') {
        return (
          hasPermission('tables_access') || 
          hasPermission('parcel_order') || 
          hasPermission('live_order')
        );
    }

    // Reverse check: if we are checking for a modern key (e.g. 'tables_access'),
    // see if the user has any of the legacy permissions that map to it.
    for (const [legacyKey, modernKey] of Object.entries(legacyMapping)) {
      if (modernKey === permission && user.permissions.includes(legacyKey)) {
        return true;
      }
    }

    return !!(user.permissions.includes(permission) || user.permissions.includes(`users.${permission}`));
  };

  const isRole = (role: string) => {
    if (!user) return false;
    const r = role.toUpperCase();
    const userRole = user.primary_role?.toUpperCase();
    
    if (r === 'ADMIN') {
      return userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'STORE_ADMIN' || userRole === 'STORE ADMIN';
    }
    
    return userRole === r || userRole?.replace(' ', '_') === r || userRole?.replace('_', ' ') === r;
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
      fetchProfile,
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
