import { apiRequest } from "@/features/auth/client";
import type { UserProfile } from "@/features/auth/types";
import type {
  PaginatedProducts,
  Product,
  ProductImage,
  ProductInput,
  ProductListParams,
  ProductListResult,
} from "./types";

export function canManageProducts(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  return user.role === "seller" || user.role === "admin";
}

function unwrapProductList(data: Product[] | PaginatedProducts): ProductListResult {
  if (Array.isArray(data)) {
    return { products: data, count: data.length };
  }
  if (data && Array.isArray(data.results)) {
    return { products: data.results, count: data.count ?? data.results.length };
  }
  return { products: [], count: 0 };
}

function buildProductListUrl(params?: ProductListParams): string {
  if (!params) return "/api/products/";
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.brand) qs.set("brand", params.brand);
  if (params.currency) qs.set("currency", params.currency);
  if (params.condition) qs.set("condition", params.condition);
  if (params.category != null) qs.set("category", String(params.category));
  if (params.ordering) qs.set("ordering", params.ordering);
  if (params.limit != null) qs.set("limit", String(params.limit));
  const query = qs.toString();
  return query ? `/api/products/?${query}` : "/api/products/";
}

export async function listProducts(params?: ProductListParams): Promise<ProductListResult> {
  const data = await apiRequest<Product[] | PaginatedProducts>(buildProductListUrl(params), {
    method: "GET",
    auth: false,
  });
  return unwrapProductList(data);
}

export async function getProduct(id: number): Promise<Product> {
  return apiRequest<Product>(`/api/products/${id}/`, { method: "GET", auth: false });
}

export async function listMyProducts(): Promise<Product[]> {
  const data = await apiRequest<Product[] | PaginatedProducts>("/api/products/my/", {
    method: "GET",
  });
  return unwrapProductList(data).products;
}

export async function createProduct(body: ProductInput): Promise<Product> {
  return apiRequest<Product>("/api/products/", { method: "POST", body });
}

export async function updateProduct(id: number, body: Partial<ProductInput>): Promise<Product> {
  return apiRequest<Product>(`/api/products/${id}/`, { method: "PATCH", body });
}

export async function deleteProduct(id: number): Promise<void> {
  await apiRequest(`/api/products/${id}/`, { method: "DELETE" });
}

export async function uploadProductImages(
  productId: number,
  files: File[],
): Promise<ProductImage[]> {
  const form = new FormData();
  for (const file of files) {
    form.append("images", file);
  }
  return apiRequest<ProductImage[]>(`/api/products/${productId}/images/`, {
    method: "POST",
    body: form,
  });
}

export async function deleteProductImage(productId: number, imageId: number): Promise<void> {
  await apiRequest(`/api/products/${productId}/images/${imageId}/`, {
    method: "DELETE",
  });
}
