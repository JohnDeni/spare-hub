import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import type { ProductDisplay } from "@/features/products/display";
import { currencySymbol } from "@/features/products/display";
import { useI18n } from "@/lib/i18n";
import { Link } from "@tanstack/react-router";

export function ListingCard({ listing }: { listing: ProductDisplay }) {
  const { t } = useI18n();
  const showSeller = Boolean(listing.sellerName) && !listing.sellerIsPreview;

  return (
    <Link
      to="/listings/$id"
      params={{ id: listing.id }}
      className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
    >
      <Card className="overflow-hidden border-border/70 transition-all group-hover:border-accent/60 group-hover:shadow-md h-full">
        <div className="aspect-[4/3] bg-gradient-to-br from-secondary to-muted flex items-center justify-center relative overflow-hidden">
          {listing.coverImageUrl ? (
            <img
              src={listing.coverImageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
            />
          ) : (
            <Package className="h-14 w-14 text-muted-foreground/50 transition-transform group-hover:scale-105" />
          )}
          <div className="absolute top-3 right-3">
            <Badge
              className={
                listing.stock === "in"
                  ? "bg-accent text-accent-foreground"
                  : "bg-[color:var(--gold)] text-[color:var(--gold-foreground)]"
              }
            >
              {listing.stock === "in" ? t("listings.inStock") : t("listings.lowStock")}
            </Badge>
          </div>
        </div>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium uppercase tracking-wide truncate">{listing.brand}</span>
            <span>·</span>
            <span className="capitalize shrink-0">
              {t(`browse.condition.${listing.condition}` as const)}
            </span>
          </div>
          <h3 className="mt-1.5 font-display text-base font-semibold leading-snug line-clamp-2 min-h-[2.75rem]">
            {listing.name}
          </h3>
          <div className="mt-4">
            <div className="font-display text-xl font-semibold tracking-tight">
              {currencySymbol(listing.currency)}
              {listing.price.toLocaleString()}
            </div>
            {showSeller ? (
              <div className="text-xs text-muted-foreground truncate max-w-full mt-0.5">
                {listing.sellerName}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
