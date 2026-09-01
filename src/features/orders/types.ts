export type OrderStatus = "pending" | "paid" | "cancelled";

export type OrderProductHistory = {
  product_history_id: number;
  name: string;
  brand: string;
  description: string;
  price: string;
  currency: string;
  condition: string;
  quantity: number;
};

export type OrderDetail = {
  id: number;
  product?: number;
  product_id?: number;
  product_history: OrderProductHistory;
  quantity: number;
};

export type Order = {
  id: number;
  user: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  details: OrderDetail[];
};

export type CreateOrderInput = {
  details: Array<{ product: number; quantity: number }>;
};

export type PaginatedOrders = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Order[];
};
