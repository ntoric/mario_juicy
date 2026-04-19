const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

/**
 * Raw fetch wrapper to handle headers and logging
 */
export const rawFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  const storeId = typeof window !== 'undefined' ? localStorage.getItem('activeStoreId') : null;

  const isFormData = options.body instanceof FormData;
  
  const headers = {
    ...(!isFormData && { 'Content-Type': 'application/json' }),
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(storeId && { 'X-Store-ID': storeId }),
    ...options.headers,
  } as Record<string, string>;

  const url = `${BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
      }
    }
    
    return response;
  } catch (error: any) {
    console.error(`API Fetch Error: Failed to reach ${url}`, error);
    throw error;
  }
};

/**
 * Main fetcher used for SWR and API calls
 */
export const fetcher = async (endpoint: string, options: RequestInit = {}) => {
  const response = await rawFetch(endpoint, options);
  const data = await response.json().catch(() => ({}));
  
  if (!response.ok) {
    let message = 'An error occurred';
    if (data.detail) message = data.detail;
    else if (data.message) message = data.message;
    else if (data.error) message = data.error;
    else if (typeof data === 'object' && Object.keys(data).length > 0) {
      // Map DRF field errors to a readable string: "field: error, field: error"
      const fields = Object.entries(data)
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
        .join(' | ');
      message = `Validation failed: ${fields}`;
    }

    const error = new Error(message) as any;
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};
