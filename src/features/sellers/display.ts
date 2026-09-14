import type { Product, ProductSeller } from "@/features/products/types";
import { productsToDisplay, type ProductDisplay } from "@/features/products/display";
import { slugifySellerName } from "./slug";

export { slugifySellerName };

export function sellerFromProduct(product: Product): ProductSeller | null {
  const seller = product.seller;
  if (seller && typeof seller === "object") return seller;
  return null;
}

export type SellerStorefront = {
  id: number;
  name: string;
  slug: string;
  address?: string;
  phone_number?: string;
  listings: ProductDisplay[];
  rating: number;
  reviewCount: number;
};

export function buildSellerStorefront(
  products: Product[],
  slug: string,
): SellerStorefront | null {
  const matches = products.filter((p) => {
    const seller = sellerFromProduct(p);
    if (!seller) return false;
    const name = (seller.company_name || seller.display_name || "").trim();
    const candidate = slugifySellerName(name || `seller-${seller.id}`);
    return candidate === slug || String(seller.id) === slug;
  });
  if (!matches.length) return null;

  const seller = sellerFromProduct(matches[0]!)!;
  const listings = productsToDisplay(matches);
  const withReviews = listings.filter((l) => l.reviewCount > 0);
  const reviewCount = listings.reduce((sum, l) => sum + l.reviewCount, 0);
  const rating =
    withReviews.length > 0
      ? withReviews.reduce((sum, l) => sum + l.rating * l.reviewCount, 0) /
        Math.max(reviewCount, 1)
      : 0;
  const name =
    (seller.company_name || seller.display_name || "").trim() || `Seller #${seller.id}`;

  return {
    id: seller.id,
    name,
    slug,
    address: seller.address,
    phone_number: seller.phone_number,
    listings,
    rating,
    reviewCount,
  };
}
