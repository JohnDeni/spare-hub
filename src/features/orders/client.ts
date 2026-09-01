import { apiRequest } from "@/features/auth/client";
import type { CreateOrderInput, Order, PaginatedOrders } from "./types";

function unwrapOrderList(data: Order[] | PaginatedOrders): Order[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

export async function listOrders(): Promise<Order[]> {
  const data = await apiRequest<Order[] | PaginatedOrders>("/api/orders/", {
    method: "GET",
  });
  return unwrapOrderList(data);
}

export async function getOrder(id: number): Promise<Order> {
  return apiRequest<Order>(`/api/orders/${id}/`, { method: "GET" });
}

export async function createOrder(body: CreateOrderInput): Promise<Order> {
  return apiRequest<Order>("/api/orders/", { method: "POST", body });
}

/** Cancel a pending order. Never sets paid. */
export async function cancelOrder(id: number): Promise<Order> {
  return apiRequest<Order>(`/api/orders/${id}/`, {
    method: "PATCH",
    body: { status: "cancelled" },
  });
}
