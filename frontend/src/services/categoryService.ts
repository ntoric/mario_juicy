import { fetcher } from "@/lib/api";

export interface Category {
  id: number;
  name: string;
  image: string | null;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export const categoryService = {
  getCategories: () => fetcher("/catalogs/categories/"),
  
  createCategory: (formData: FormData) => fetcher("/catalogs/categories/", {
    method: "POST",
    body: formData,
    // Note: We don't set Content-Type header here because fetch 
    // will automatically set it with the correct boundary for FormData
    headers: {
      'Accept': 'application/json',
    }
  }),
  
  updateCategory: (id: number, formData: FormData) => fetcher(`/catalogs/categories/${id}/`, {
    method: "PATCH",
    body: formData,
    headers: {
      'Accept': 'application/json',
    }
  }),
  
  deleteCategory: (id: number) => fetcher(`/catalogs/categories/${id}/`, {
    method: "DELETE",
  }),
  
  toggleStatus: (id: number) => fetcher(`/catalogs/categories/${id}/toggle_status/`, {
    method: "POST",
  }),
};
