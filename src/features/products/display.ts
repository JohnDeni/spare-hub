import { listings, type Listing } from "@/lib/listings";
import type { Lang } from "@/lib/i18n";
import { routeVisibility } from "@/lib/route-visibility";
import { slugifyCategory } from "@/features/categories/display";
import type {
  Product,
  ProductConditionApi,
  ProductConditionUi,
  ProductCurrency,
  ProductSeller,
} from "./types";

export type ProductDisplay = {
  id: string;
  product: Product;
  name: string;
  description: string;
  price: number;
  quantity: number;
  stock: "in" | "low";
  brand: string;
  condition: ProductConditionUi;
  currency: ProductCurrency;
  sellerName: string;
  sellerIsPreview: boolean;
  /** API category names when present; empty if none. */
  categoryNames: string[];
  /** Slug of first API category, or mock category key for links. */
  categorySlug: string;
  mock: Pick<
    Listing,
    "category" | "location" | "verified" | "rating" | "reviews" | "emoji"
  >;
};

export function apiConditionToUi(condition: ProductConditionApi): ProductConditionUi {
  return condition === "refurbished" ? "refurb" : condition;
}

export function uiConditionToApi(condition: ProductConditionUi): ProductConditionApi {
  return condition === "refurb" ? "refurbished" : condition;
}

function mockSeedForProduct(product: Product) {
  return listings[Math.abs(product.id) % listings.length]!;
}

export function mockExtrasForProduct(product: Product): ProductDisplay["mock"] {
  const seed = mockSeedForProduct(product);
  return {
    category: seed.category,
    location: seed.location,
    verified: seed.verified,
    rating: seed.rating,
    reviews: seed.reviews,
    emoji: seed.emoji,
  };
}

function sellerDisplayFromProduct(product: Product, seed: Listing) {
  if (!routeVisibility.backend.productSellerInApi) {
    return { sellerName: seed.seller, sellerIsPreview: true };
  }

  const seller = product.seller;
  if (seller && typeof seller === "object") {
    const s = seller as ProductSeller;
    const sellerName = (s.display_name || s.company_name || "").trim();
    return {
      sellerName,
      sellerIsPreview: false,
    };
  }

  return { sellerName: "", sellerIsPreview: false };
}

export function productToDisplay(product: Product): ProductDisplay {
  const seed = mockSeedForProduct(product);
  const seller = sellerDisplayFromProduct(product, seed);
  const apiCategories = Array.isArray(product.category) ? product.category : [];
  const categoryNames = apiCategories.map((c) => c.name).filter(Boolean);
  const categorySlug =
    categoryNames[0] != null ? slugifyCategory(categoryNames[0]) : seed.category;

  return {
    id: String(product.id),
    product,
    name: product.name,
    description: product.description ?? "",
    price: Number(product.price),
    quantity: product.quantity,
    stock: product.quantity > 5 ? "in" : "low",
    brand: product.brand ?? "",
    condition: apiConditionToUi(product.condition ?? "new"),
    currency: product.currency ?? "USD",
    ...seller,
    categoryNames,
    categorySlug,
    mock: mockExtrasForProduct(product),
  };
}

export function productsToDisplay(products: Product[] | null | undefined): ProductDisplay[] {
  if (!Array.isArray(products)) return [];
  return products.map(productToDisplay);
}

export function mockListingToDisplay(listing: Listing, lang: Lang = "en"): ProductDisplay {
  return {
    id: listing.id,
    product: {
      id: 0,
      seller: null,
      name: listing.title[lang],
      brand: listing.brand,
      description: "",
      price: String(listing.price),
      currency: listing.currency,
      condition: uiConditionToApi(listing.condition),
      quantity: listing.stock === "in" ? 12 : 3,
      category: [],
      created_at: "",
      updated_at: "",
      deleted_at: null,
    },
    name: listing.title[lang],
    description: "",
    price: listing.price,
    quantity: listing.stock === "in" ? 12 : 3,
    stock: listing.stock,
    brand: listing.brand,
    condition: listing.condition,
    currency: listing.currency,
    sellerName: listing.seller,
    sellerIsPreview: true,
    categoryNames: [],
    categorySlug: listing.category,
    mock: {
      category: listing.category,
      location: listing.location,
      verified: listing.verified,
      rating: listing.rating,
      reviews: listing.reviews,
      emoji: listing.emoji,
    },
  };
}

export function currencySymbol(currency: ProductCurrency | Listing["currency"]) {
  if (currency === "EUR") return "€";
  if (currency === "UAH") return "₴";
  return "$";
}

/** Primary category label: API name when present, else mock i18n key path handled by caller. */
export function primaryCategoryLabel(display: ProductDisplay): string | null {
  return display.categoryNames[0] ?? null;
}
