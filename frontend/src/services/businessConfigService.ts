import { fetcher } from "@/lib/api";

export interface BusinessConfig {
  id?: number;
  store_id: number;
  shop_name: string;
  branch: string;
  location: string;
  mobile: string;
  gstin: string;
  fssai_lic_no: string;
  created_at?: string;
  updated_at?: string;
}

export const businessConfigService = {
  getBusinessConfig: async (): Promise<BusinessConfig> => {
    return fetcher("/core/business-config/");
  },

  updateBusinessConfig: async (data: Partial<BusinessConfig>): Promise<BusinessConfig> => {
    return fetcher("/core/business-config/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};
