import { fetcher } from "@/lib/api";

export interface Table {
  id: number;
  number: string;
  capacity: number;
  status: 'VACANT' | 'PARTIALLY_OCCUPIED' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE';
  current_occupancy?: number;
  is_active: boolean;
  pos_x: number;
  pos_y: number;
  shape: 'RECT' | 'CIRCLE';
  active_order?: Order;
  active_orders?: Order[];
}

export interface OrderItem {
  id: number;
  order: number;
  order_table_number: string;
  order_table_id: number;
  item: number;
  item_details: {
    id: number;
    name: string;
    price: string;
    image: string | null;
  };
  quantity: number;
  price: string;
  status: 'ORDERED' | 'AWAITING' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED' | 'REJECTED';
  notes: string | null;
  rejection_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: number;
  table: number | null;
  table_number: string;
  waiter: number;
  waiter_name: string;
  customer_name: string | null;
  customer_mobile: string | null;
  status: 'ORDER_TAKEN' | 'AWAITING' | 'PREPARING' | 'READY' | 'SERVED' | 'COMPLETED' | 'PAID' | 'CANCELLED' | 'REJECTED' | 'RETURNED';
  number_of_persons: number;
  order_type: 'DINE_IN' | 'TAKE_AWAY';
  total_amount: string;
  notes: string | null;
  items: OrderItem[];
  invoice?: any;
  created_at: string;
  updated_at: string;
}


export interface Reservation {
  id: number;
  table: number;
  table_number: string;
  customer_name: string;
  customer_phone: string;
  reservation_time: string;
  number_of_guests: number;
  status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  notes: string | null;
}

export const restaurantService = {
  // Tables
  getTables: () => fetcher("/restaurants/tables/"),
  createTable: (data: Partial<Table>) => fetcher("/restaurants/tables/", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  updateTable: (id: number, data: Partial<Table>) => fetcher(`/restaurants/tables/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  }),
  updateTablePosition: (id: number, pos_x: number, pos_y: number, shape?: string) =>
    fetcher(`/restaurants/tables/${id}/update_position/`, {
      method: "PATCH",
      body: JSON.stringify({ pos_x, pos_y, shape }),
    }),
  releaseTable: (id: number) => fetcher(`/restaurants/tables/${id}/release/`, {
    method: "POST",
  }),

  recalculateAllTableStatuses: () => fetcher(`/restaurants/tables/recalculate_all/`, {
    method: "POST",
  }),
  deleteTable: (id: number) => fetcher(`/restaurants/tables/${id}/`, {
    method: "DELETE",
  }),

  // Orders
  getOrders: () => fetcher("/restaurants/orders/"),
  getOrder: (id: number) => fetcher(`/restaurants/orders/${id}/`),
  createOrder: (data: { 
    table?: number; 
    order_type?: 'DINE_IN' | 'TAKE_AWAY'; 
    notes?: string;
    customer_name?: string;
    customer_mobile?: string;
    number_of_persons?: number;
  }) => fetcher("/restaurants/orders/", {
    method: "POST",
    body: JSON.stringify(data),
  }),

  updateOrder: (id: number, data: Partial<Order>) => fetcher(`/restaurants/orders/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  }),
  deleteOrder: (id: number) => fetcher(`/restaurants/orders/${id}/`, {
    method: "DELETE",
  }),
  addItemToOrder: (orderId: number, data: { item: number; quantity: number; notes?: string }) =>
    fetcher(`/restaurants/orders/${orderId}/add_item/`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  sendToKitchen: (orderId: number) =>
    fetcher(`/restaurants/orders/${orderId}/send_to_kitchen/`, {
      method: "POST",
    }),
  recalculateOrderTotal: (orderId: number) => fetcher(`/restaurants/orders/${orderId}/recalculate_total/`, {
    method: "POST",
  }),
  serveAllReady: (orderId: number) => fetcher(`/restaurants/orders/${orderId}/serve_all_ready/`, {
    method: "POST",
  }),
  updatePaymentStatus: (orderId: number, status: string) =>
    fetcher(`/restaurants/orders/${orderId}/update_payment_status/`, {
      method: "POST",
      body: JSON.stringify({ status }),
    }),
  checkout: (orderId: number, data: { payment_method: string; mark_as_paid?: boolean; gst_type?: string }) => 
    fetcher(`/restaurants/orders/${orderId}/checkout/`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  returnOrder: (orderId: number) => fetcher(`/restaurants/orders/${orderId}/return_order/`, {
    method: "POST",
  }),
  cancelOrder: (orderId: number, reason: string) => fetcher(`/restaurants/orders/${orderId}/cancel_order/`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  }),
  changeOrderTable: (orderId: number, targetTableId: number, numberOfPersons?: number) =>
    fetcher(`/restaurants/orders/${orderId}/change_table/`, {
      method: "POST",
      body: JSON.stringify({ 
        target_table_id: targetTableId,
        number_of_persons: numberOfPersons
      }),
    }),
  getPendingSettlements: () => fetcher("/restaurants/orders/pending_settlements/"),
  getInvoices: () => fetcher("/restaurants/invoices/"),
  downloadInvoicePDF: (invoiceId: number) => 
    fetch(`/api/restaurants/invoices/${invoiceId}/download_pdf/`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'X-Store-ID': localStorage.getItem('active_store_id') || '1'
      }
    }).then(res => res.blob()),


  // Order Items
  updateOrderItem: (id: number, data: Partial<OrderItem>) => fetcher(`/restaurants/order-items/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  }),
  deleteOrderItem: (id: number) => fetcher(`/restaurants/order-items/${id}/`, {
    method: "DELETE",
  }),

  // Kitchen Display
  getKitchenItems: () => fetcher("/restaurants/kitchen/"),
  attendItem: (id: number) => fetcher(`/restaurants/kitchen/${id}/attend/`, { method: "POST" }),
  readyItem: (id: number) => fetcher(`/restaurants/kitchen/${id}/ready/`, { method: "POST" }),
  rejectItem: (id: number, note: string) => fetcher(`/restaurants/kitchen/${id}/reject/`, { 
    method: "POST",
    body: JSON.stringify({ note }),
  }),

  // Reservations
  getReservations: () => fetcher("/restaurants/reservations/"),
  createReservation: (data: Partial<Reservation>) => fetcher("/restaurants/reservations/", {
    method: "POST",
    body: JSON.stringify(data),
  }),
  updateReservation: (id: number, data: Partial<Reservation>) => fetcher(`/restaurants/reservations/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  }),
  deleteReservation: (id: number) => fetcher(`/restaurants/reservations/${id}/`, {
    method: "DELETE",
  }),
};
