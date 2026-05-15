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

export interface BusinessStatistics {
  total_revenue: number;
  total_orders: number;
  total_stores: number;
}

export interface StoreBasisSales {
  store_id: number;
  store_name: string;
  sales: number;
  count: number;
}

export interface StoreBasisTopItem {
  store_id: number;
  store_name: string;
  item_name: string;
  quantity: number;
  revenue: number;
}

const getQueryString = (params?: Record<string, string | number | undefined>) => {
  if (!params) return "";
  const filteredParams = Object.entries(params)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`);
  return filteredParams.length > 0 ? `?${filteredParams.join("&")}` : "";
};

export const reportService = {
  getSummary: (params?: { start_date?: string; end_date?: string; store_id?: string | number }) => 
    fetcher(`/restaurants/reports/summary/${getQueryString(params)}`),
  
  getSalesByType: (params?: { start_date?: string; end_date?: string; store_id?: string | number }) => 
    fetcher(`/restaurants/reports/sales_by_type/${getQueryString(params)}`),
  
  getSalesByPayment: (params?: { start_date?: string; end_date?: string; store_id?: string | number }) => 
    fetcher(`/restaurants/reports/sales_by_payment/${getQueryString(params)}`),
  
  getDailySales: (params?: { start_date?: string; end_date?: string; store_id?: string | number }) => 
    fetcher(`/restaurants/reports/daily_sales/${getQueryString(params)}`),
  
  getSalesByCategory: (params?: { start_date?: string; end_date?: string; store_id?: string | number }) => 
    fetcher(`/restaurants/reports/sales_by_category/${getQueryString(params)}`),
  
  getSalesByItem: (params?: { start_date?: string; end_date?: string; store_id?: string | number }) => 
    fetcher(`/restaurants/reports/sales_by_item/${getQueryString(params)}`),
  
  getTaxReport: (params?: { start_date?: string; end_date?: string; store_id?: string | number }) => 
    fetcher(`/restaurants/reports/tax_report/${getQueryString(params)}`),

  getBusinessStatistics: (params?: { start_date?: string; end_date?: string; store_id?: string | number }) => 
    fetcher(`/reports/business-statistics/${getQueryString(params)}`),

  getStoreBasisSales: (params?: { start_date?: string; end_date?: string; store_id?: string | number }) => 
    fetcher(`/reports/store-basis-sales/${getQueryString(params)}`),

  getStoreBasisTopItems: (params?: { start_date?: string; end_date?: string; store_id?: string | number }) => 
    fetcher(`/reports/store-basis-top-items/${getQueryString(params)}`),
};
