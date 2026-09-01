import type { ProductCurrency } from "@/features/products/types";

export type CartItem = {
  productId: number;
  name: string;
  brand: string;
  price: string;
  currency: ProductCurrency;
  quantity: number;
  maxQuantity: number;
};

export type CartState = {
  items: CartItem[];
};
