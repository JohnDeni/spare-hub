import { API_BASE_URL } from "@/features/auth/client";
import type { ProductImage } from "@/features/products/types";

/** Resolve relative media paths from the API against the API host. */
export function productImageUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = API_BASE_URL.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export function productImageUrls(images: ProductImage[] | undefined): string[] {
  if (!Array.isArray(images)) return [];
  return images.map((img) => productImageUrl(img.image));
}
