import { fetcher } from "@/lib/api";

export interface Store {
  id: number;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  gst_number?: string;
  invoice_prefix: string;
  logo?: string;
  location?: string;
  fssai_lic_no?: string;
  mobile?: string;
  is_kitchen_step_enabled: boolean;
  is_take_away_enabled: boolean;
  is_reservations_enabled: boolean;
  is_active: boolean;
  thermal_printer_size: '2_INCH' | '3_INCH';
}

export interface StoreFormData {
  name: string;
  address: string;
  phone?: string;
  email?: string;
  gst_number?: string;
  location?: string;
  fssai_lic_no?: string;
  mobile?: string;
  invoice_prefix: string;
  is_active?: boolean;
  is_kitchen_step_enabled?: boolean;
  is_take_away_enabled?: boolean;
  is_reservations_enabled?: boolean;
  thermal_printer_size?: '2_INCH' | '3_INCH';
}

export const storeService = {
  getStores: async (): Promise<Store[]> => {
    return fetcher("/stores/");
  },

  getStore: async (id: number): Promise<Store> => {
    return fetcher(`/stores/${id}/`);
  },

  createStore: async (storeData: StoreFormData): Promise<Store> => {
    return fetcher("/stores/", {
      method: "POST",
      body: JSON.stringify(storeData),
    });
  },

  updateStore: async (id: number, storeData: Partial<StoreFormData>): Promise<Store> => {
    return fetcher(`/stores/${id}/`, {
      method: "PATCH",
      body: JSON.stringify(storeData),
    });
  },

  deleteStore: async (id: number): Promise<void> => {
    return fetcher(`/stores/${id}/`, {
      method: "DELETE",
    });
  },
  
  getDashboardStats: async (): Promise<any> => {
    return fetcher("/stores/dashboard/");
  }
};
