"use client";

import { useState, useEffect } from 'react';
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

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStoreId, setActiveStoreId] = useState<number | null>(null);
  const [activeStore, setActiveStoreData] = useState<Store | null>(null);
  const [storeLoading, setStoreLoading] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      try {
        console.log('useAuth: Fetching user profile...');
        const data = await fetcher('/users/profile/');
        console.log('useAuth: Profile fetched successfully', data);
        setUser(data);
        
        const isGlobalAdmin = data.primary_role === 'SUPER_ADMIN' || data.primary_role === 'ADMIN';

        // Load persisted store ID
        const savedStoreId = localStorage.getItem('activeStoreId');
        
        if (isGlobalAdmin) {
          if (savedStoreId) {
            setActiveStoreId(parseInt(savedStoreId));
          } else if (data.store) {
            setActiveStoreId(data.store.id);
            localStorage.setItem('activeStoreId', data.store.id.toString());
          } else {
            // Default to Main Branch (Store ID 1) for admins if no store assigned
            setActiveStoreId(1);
            localStorage.setItem('activeStoreId', '1');
          }
        } else if (data.store) {
          // If not admin, always use their assigned store
          setActiveStoreId(data.store.id);
        }
      } catch (err: any) {
        console.error('useAuth: Failed to fetch user profile:', err);
        setError(`Verification failed: ${err.message || 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, []);

  // Fetch store details whenever activeStoreId changes
  useEffect(() => {
    if (!activeStoreId) {
      setActiveStoreData(null);
      return;
    }

    // Optimization: If the activeStoreId matches user's assigned store, we can use that data initially
    // but better to fetch fresh to get latest settings
    async function fetchActiveStoreDetails() {
      setStoreLoading(true);
      try {
        const storeData = await storeService.getStore(activeStoreId!);
        setActiveStoreData(storeData);
      } catch (err) {
        console.error('useAuth: Failed to fetch active store details:', err);
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
    if (user.primary_role === 'SUPER_ADMIN') return true;
    
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
      console.error('useAuth: Failed to refresh active store details:', err);
    } finally {
      setStoreLoading(false);
    }
  };

  return { 
    user, 
    loading, 
    error, 
    hasPermission, 
    isRole,
    activeStoreId,
    activeStore,
    storeLoading,
    setActiveStore,
    refreshActiveStore
  };
}
