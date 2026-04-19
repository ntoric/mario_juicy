import { fetcher } from './api';

export const setTokens = (access: string, refresh: string) => {
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
};

export const clearTokens = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

export const isAuthenticated = () => {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('access_token');
};

export const logout = async () => {
  const refreshToken = localStorage.getItem('refresh_token');
  
  if (refreshToken) {
    try {
      // Attempt to revoke the token on the backend
      await fetcher('/users/logout/', {
        method: 'POST',
        body: JSON.stringify({ refresh: refreshToken }),
      });
    } catch (error) {
      console.error('Failed to revoke token on backend:', error);
      // We continue to logout locally anyway
    }
  }

  clearTokens();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
};
