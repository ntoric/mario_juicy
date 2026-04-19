import { fetcher } from "@/lib/api";

export interface Item {
  id: number;
  category: number | null;
  category_name: string | null;
  code: string | null;
  name: string;
  image: string | null;
  description: string | null;
  price: string; // Decimal is returned as string from DRF
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  image: string | null;
  is_enabled: boolean;
}

export const itemService = {
  getItems: () => fetcher("/catalogs/items/"),
  getCategories: () => fetcher("/catalogs/categories/"),
  
  createItem: (formData: FormData) => fetcher("/catalogs/items/", {
    method: "POST",
    body: formData,
    headers: {
      'Accept': 'application/json',
    }
  }),
  
  updateItem: (id: number, formData: FormData) => fetcher(`/catalogs/items/${id}/`, {
    method: "PATCH",
    body: formData,
    headers: {
      'Accept': 'application/json',
    }
  }),
  
  deleteItem: (id: number) => fetcher(`/catalogs/items/${id}/`, {
    method: "DELETE",
  }),
  
  toggleStatus: (id: number) => fetcher(`/catalogs/items/${id}/toggle_status/`, {
    method: "POST",
  }),
};
