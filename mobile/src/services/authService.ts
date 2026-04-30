import { fetcher } from './api';
import { storage } from './storage';

export const authService = {
  login: async (formData: any) => {
    const data = await fetcher("/users/login/", {
      method: "POST",
      body: JSON.stringify(formData),
    });

    if (data.access) {
      await storage.setItem('access_token', data.access);
      await storage.setItem('refresh_token', data.refresh || '');
    }
    return data;
  },

  logout: async () => {
    await storage.deleteItem('access_token');
    await storage.deleteItem('refresh_token');
    await storage.deleteItem('active_store_id');
  },

  isAuthenticated: async () => {
    const token = await storage.getItem('access_token');
    return !!token;
  },

  getProfile: async () => {
    return await fetcher("/users/profile/");
  },
};
