import type { Order } from "./types";
import type { ProductCurrency } from "@/features/products/types";

/** Sum line totals (price × qty) grouped by currency. */
export function orderTotalsByCurrency(order: Order): Partial<Record<ProductCurrency, number>> {
  return order.details.reduce<Partial<Record<ProductCurrency, number>>>((acc, line) => {
    const currency = line.product_history.currency as ProductCurrency;
    const amount = Number(line.product_history.price) * line.quantity;
    if (!Number.isFinite(amount)) return acc;
    acc[currency] = (acc[currency] ?? 0) + amount;
    return acc;
  }, {});
}

export function orderItemCount(order: Order): number {
  return order.details.reduce((sum, line) => sum + line.quantity, 0);
}
