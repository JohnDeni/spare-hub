import { apiRequest } from "@/features/auth/client";
import type { Category, PaginatedCategories } from "./types";

function unwrapCategoryList(data: Category[] | PaginatedCategories): Category[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

export async function listCategories(): Promise<Category[]> {
  const data = await apiRequest<Category[] | PaginatedCategories>("/api/categories/", {
    method: "GET",
    auth: false,
  });
  return unwrapCategoryList(data);
}

export async function getCategory(id: number): Promise<Category> {
  return apiRequest<Category>(`/api/categories/${id}/`, { method: "GET", auth: false });
}
