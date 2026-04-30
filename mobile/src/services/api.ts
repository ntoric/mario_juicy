import { Platform } from 'react-native';
import { storage } from './storage';

/**
 * API CONFIGURATION
 */
const PUBLIC_URL = 'https://mario-api.ntoric.com/api';
const LOCAL_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const LOCAL_URL = `http://${LOCAL_HOST}:8022/api`;

// Switch this to PUBLIC_URL if you want to test against the production server
const BASE_URL = LOCAL_URL; 

/**
 * Raw fetch wrapper with timeout and error handling
 */
export const rawFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = await storage.getItem('access_token');
  const storeId = await storage.getItem('active_store_id');

  const isFormData = options.body instanceof FormData;
  
  const headers = {
    ...(!isFormData && { 'Content-Type': 'application/json' }),
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(storeId && { 'X-Store-ID': storeId }),
    ...options.headers,
  } as Record<string, string>;

  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  
  try {
    console.log(`[API] FETCHING: ${url}`);
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    if (response.status === 401) {
      await storage.deleteItem('access_token');
    }
    
    return response;
  } catch (error: any) {
    console.error(`[API] Fetch Error: Failed to reach ${url}`, error);
    throw new Error(`Connection failed. Target: ${url}`);
  }
};

/**
 * Main fetcher used for API calls
 */
export const fetcher = async (endpoint: string, options: RequestInit = {}) => {
  const response = await rawFetch(endpoint, options);
  const data = await response.json().catch(() => ({}));
  
  if (!response.ok) {
    throw new Error(data.message || data.error || data.detail || 'API Error');
  }

  return data;
};
