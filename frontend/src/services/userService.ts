import { fetcher } from "@/lib/api";

export interface User {
  id: number;
  username: string;
  email?: string;
  groups: string[];
  role?: string;
  is_active: boolean;
  store?: {
    id: number;
    name: string;
    invoice_prefix: string;
  };
}

export interface UserFormData {
  username: string;
  password?: string;
  role: string;
  email?: string;
  is_active?: boolean;
  store?: number;
}

export const userService = {
  getUsers: async (): Promise<User[]> => {
    return fetcher("/users/management/");
  },

  createUser: async (userData: UserFormData): Promise<User> => {
    return fetcher("/users/management/", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  },

  updateUser: async (id: number, userData: Partial<UserFormData>): Promise<User> => {
    return fetcher(`/users/management/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(userData),
    });
  },

  deleteUser: async (id: number): Promise<void> => {
    return fetcher(`/users/management/${id}/`, {
      method: "DELETE",
    });
  },

  toggleStatus: async (id: number, currentStatus: boolean): Promise<User> => {
    return fetcher(`/users/management/${id}/`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: !currentStatus }),
    });
  }
};
