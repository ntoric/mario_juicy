import { fetcher } from "./api";

export interface ReportSummary {
  total_sales: number;
  total_orders: number;
  avg_order_value: number;
  total_tax: number;
}

export const reportService = {
  getSummary: (params: any): Promise<ReportSummary> => {
    const query = new URLSearchParams(params).toString();
    return fetcher(`/restaurants/reports/summary/?${query}`);
  },
  getDailySales: (params: any): Promise<any[]> => {
    const query = new URLSearchParams(params).toString();
    return fetcher(`/restaurants/reports/daily_sales/?${query}`);
  },
  getSalesByCategory: (params: any): Promise<any[]> => {
    const query = new URLSearchParams(params).toString();
    return fetcher(`/restaurants/reports/sales_by_category/?${query}`);
  },
  getSalesByPayment: (params: any): Promise<any[]> => {
    const query = new URLSearchParams(params).toString();
    return fetcher(`/restaurants/reports/sales_by_payment/?${query}`);
  },
  getSalesByItem: (params: any): Promise<any[]> => {
    const query = new URLSearchParams(params).toString();
    return fetcher(`/restaurants/reports/sales_by_item/?${query}`);
  },
  getSalesByType: (params: any): Promise<any[]> => {
    const query = new URLSearchParams(params).toString();
    return fetcher(`/restaurants/reports/sales_by_type/?${query}`);
  },
};
