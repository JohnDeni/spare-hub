import type { Category } from "@/features/categories/types";

export type ProductConditionApi = "new" | "used" | "refurbished";
export type ProductConditionUi = "new" | "used" | "refurb";
export type ProductCurrency = "USD" | "EUR" | "UAH";

export type ProductSeller = {
  id: number;
  company_name: string;
  address?: string;
  phone_number?: string;
  /** Optional; API currently exposes company_name only. */
  display_name?: string;
};

export type Product = {
  id: number;
  seller: number | ProductSeller | null;
  name: string;
  brand: string;
  description: string;
  price: string;
  currency: ProductCurrency;
  condition: ProductConditionApi;
  quantity: number;
  category?: Category[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ProductInput = {
  name: string;
  brand: string;
  description: string;
  price: string;
  currency: ProductCurrency;
  condition: ProductConditionApi;
  quantity: number;
  category_ids?: number[];
};

export type ProductListParams = {
  search?: string;
  brand?: string;
  currency?: ProductCurrency;
  condition?: ProductConditionApi;
  /** Category id — filters via ?category= on the API. */
  category?: number;
  ordering?: string;
  limit?: number;
};

export type PaginatedProducts = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Product[];
};

export type ProductListResult = {
  products: Product[];
  count: number;
};
