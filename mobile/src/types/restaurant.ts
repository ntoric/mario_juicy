export interface Table {
  id: number;
  number: string;
  capacity: number;
  status: 'VACANT' | 'PARTIALLY_OCCUPIED' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE';
  current_occupancy?: number;
  is_active: boolean;
  pos_x: number;
  pos_y: number;
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

export interface Category {
  id: number;
  name: string;
  description: string;
  image: string | null;
  is_active: boolean;
}

export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: string;
  image: string | null;
  category: number;
  category_name: string;
  is_active: boolean;
  is_available: boolean;
}
