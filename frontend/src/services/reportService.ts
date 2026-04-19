import { fetcher } from "@/lib/api";

export interface ReportSummary {
  total_sales: number;
  total_orders: number;
  total_tax: number;
  avg_order_value: number;
  currency: string;
}

export interface SalesByType {
  type: string;
  sales: number;
  count: number;
}

export interface SalesByPayment {
  method: string;
  sales: number;
  count: number;
}

export interface DailySales {
  date: string;
  sales: number;
  count: number;
}

export interface SalesByCategory {
  category: string;
  sales: number;
  count: number;
}

export interface SalesByItem {
  item: string;
  sales: number;
  count: number;
}

export interface TaxReport {
  total_tax: number;
  subtotal: number;
  total_amount: number;
}

const getQueryString = (params?: Record<string, string | number | undefined>) => {
  if (!params) return "";
  const filteredParams = Object.entries(params)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`);
  return filteredParams.length > 0 ? `?${filteredParams.join("&")}` : "";
};

export const reportService = {
  getSummary: (params?: { start_date?: string; end_date?: string }) => 
    fetcher(`/restaurants/reports/summary/${getQueryString(params)}`),
  
  getSalesByType: (params?: { start_date?: string; end_date?: string }) => 
    fetcher(`/restaurants/reports/sales_by_type/${getQueryString(params)}`),
  
  getSalesByPayment: (params?: { start_date?: string; end_date?: string }) => 
    fetcher(`/restaurants/reports/sales_by_payment/${getQueryString(params)}`),
  
  getDailySales: (params?: { start_date?: string; end_date?: string }) => 
    fetcher(`/restaurants/reports/daily_sales/${getQueryString(params)}`),
  
  getSalesByCategory: (params?: { start_date?: string; end_date?: string }) => 
    fetcher(`/restaurants/reports/sales_by_category/${getQueryString(params)}`),
  
  getSalesByItem: (params?: { start_date?: string; end_date?: string }) => 
    fetcher(`/restaurants/reports/sales_by_item/${getQueryString(params)}`),
  
  getTaxReport: (params?: { start_date?: string; end_date?: string }) => 
    fetcher(`/restaurants/reports/tax_report/${getQueryString(params)}`),
};
