import { fetcher } from "./api";
import { Table, Order, OrderItem, Category, MenuItem } from "../types/restaurant";

export const restaurantService = {
  // Tables
  getTables: (): Promise<Table[]> => fetcher("/restaurants/tables/"),
  releaseTable: (tableId: number): Promise<void> =>
    fetcher(`/restaurants/tables/${tableId}/release/`, { method: "POST" }),
  
  // Orders
  getOrders: (params?: any): Promise<Order[]> => {
    let query = '';
    if (params) {
      query = '?' + new URLSearchParams(params).toString();
    }
    return fetcher(`/restaurants/orders/${query}`);
  },
  getOrder: (id: number): Promise<Order> => fetcher(`/restaurants/orders/${id}/`),
  createOrder: (data: { 
    table?: number; 
    order_type?: 'DINE_IN' | 'TAKE_AWAY'; 
    notes?: string;
    customer_name?: string;
    customer_mobile?: string;
    number_of_persons?: number;
  }): Promise<Order> => fetcher("/restaurants/orders/", {
    method: "POST",
    body: JSON.stringify(data),
  }),

  addItemToOrder: (orderId: number, data: { item: number; quantity: number; notes?: string }): Promise<OrderItem> =>
    fetcher(`/restaurants/orders/${orderId}/add_item/`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  sendToKitchen: (orderId: number): Promise<void> =>
    fetcher(`/restaurants/orders/${orderId}/send_to_kitchen/`, {
      method: "POST",
    }),

  checkout: (orderId: number, data: { payment_method: string; mark_as_paid: boolean; notes?: string }): Promise<any> =>
    fetcher(`/restaurants/orders/${orderId}/checkout/`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  cancelOrder: (orderId: number, reason: string): Promise<void> =>
    fetcher(`/restaurants/orders/${orderId}/cancel_order/`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  // Kitchen / KDS
  getKitchenItems: (): Promise<any[]> => fetcher("/restaurants/kitchen/"),
  attendItem: (itemId: number): Promise<void> =>
    fetcher(`/restaurants/kitchen/${itemId}/attend/`, { method: "POST" }),
  readyItem: (itemId: number): Promise<void> =>
    fetcher(`/restaurants/kitchen/${itemId}/ready/`, { method: "POST" }),
  rejectItem: (itemId: number, reason: string): Promise<void> =>
    fetcher(`/restaurants/kitchen/${itemId}/reject/`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  // Menu
  getCategories: (): Promise<Category[]> => fetcher("/catalogs/categories/"),
  getItems: (categoryId?: number): Promise<MenuItem[]> => 
    fetcher(`/catalogs/items/${categoryId ? `?category=${categoryId}` : ''}`),
};
