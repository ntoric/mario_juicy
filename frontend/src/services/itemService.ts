import { fetcher } from "@/lib/api";

export interface Item {
  id: number;
  category: number | null;
  category_name: string | null;
  store_id?: number;
  store_name?: string;
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
  getItems: (storeId?: string | number) => {
    const url = storeId ? `/catalogs/items/?store_id=${storeId}` : "/catalogs/items/";
    return fetcher(url);
  },
  getCategories: (storeId?: string | number) => {
    const url = storeId ? `/catalogs/categories/?store_id=${storeId}` : "/catalogs/categories/";
    return fetcher(url);
  },
  
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
