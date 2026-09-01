import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ComingSoon } from "@/components/coming-soon";
import { SiteLayout } from "@/components/site-layout";
import { ListingCard } from "@/components/listing-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { QuantityStepper } from "@/components/quantity-stepper";
import { DescriptionContent } from "@/components/description-content";
import { ListingImageGallery } from "@/components/listing-image-gallery";
import { useI18n } from "@/lib/i18n";
import { routeVisibility } from "@/lib/route-visibility";
import { listings } from "@/lib/listings";
import { ApiError } from "@/features/auth/client";
import { productQueries, useMyProducts } from "@/features/products/queries";
import {
  currencySymbol,
  mockListingToDisplay,
  productToDisplay,
  productsToDisplay,
} from "@/features/products/display";
import { canManageProducts } from "@/features/products/client";
import { useAuth } from "@/features/auth/auth-context";
import { useCart } from "@/features/cart/cart-context";
import { initials } from "@/lib/profile";
import { toast } from "sonner";
import { ArrowLeft, Pencil, ShoppingCart, Trash2 } from "lucide-react";

export const Route = createFileRoute("/listings/$id")({
  loader: async ({ params, context: { queryClient } }) => {
    const numericId = Number(params.id);
    if (Number.isFinite(numericId)) {
      try {
        const product = await queryClient.fetchQuery(productQueries.detail(numericId));
        const listing = productToDisplay(product);
        const all = await queryClient.ensureQueryData(productQueries.list());
        const related = productsToDisplay(all.products)
          .filter(
            (l) =>
              l.id !== listing.id &&
              (listing.categorySlug
                ? l.categorySlug === listing.categorySlug
                : l.mock.category === listing.mock.category),
          )
          .slice(0, 4);
        return { listing, related, mockOnly: false as const };
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 404)) throw error;
      }
    }

    const mock = listings.find((l) => l.id === params.id);
    if (!mock) throw notFound();
    const listing = mockListingToDisplay(mock);
    const related = listings
      .filter((l) => l.id !== mock.id && l.category === mock.category)
      .slice(0, 4)
      .map((l) => mockListingToDisplay(l));
    return { listing, related, mockOnly: true as const };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.listing.name} — Spare Hub` },
          {
            name: "description",
            content: `${loaderData.listing.brand} · from ${loaderData.listing.sellerName || "Spare Hub"}.`,
          },
        ]
      : [{ title: "Listing — Spare Hub" }],
  }),
  component: ListingDetail,
  notFoundComponent: ListingNotFound,
});

function ListingDetail() {
  if (!routeVisibility.backend.productsApiReady) return <ComingSoon showBrowse={false} />;
  const { listing, related, mockOnly } = Route.useLoaderData();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: mine = [] } = useMyProducts(canManageProducts(user) && !mockOnly);
  const isOwner = !mockOnly && mine.some((p) => p.id === listing.product.id);
  const { addItem } = useCart();
  const maxQty = Math.max(0, listing.quantity);
  const [qty, setQty] = useState(maxQty > 0 ? 1 : 0);
  const [activeImage, setActiveImage] = useState(0);
  const showSeller = Boolean(listing.sellerName) && !listing.sellerIsPreview;
  const sellerInitials = initials(listing.sellerName, listing.sellerName);

  const categoryLabel =
    listing.categoryNames[0] ??
    (listing.mock.category ? t(`cat.${listing.mock.category}` as const) : null);
  const categoryIsApi = listing.categoryNames.length > 0;

  const addToCart = () => {
    if (mockOnly || isOwner) return;
    if (!Number.isFinite(qty) || qty < 1 || qty > maxQty) {
      toast.error(t("listing.placeOrder.unavailable"));
      return;
    }
    addItem({
      productId: listing.product.id,
      name: listing.name,
      brand: listing.brand,
      price: listing.product.price,
      currency: listing.currency,
      maxQuantity: maxQty,
      quantity: qty,
    });
    toast.success(t("listing.addToCart.success"), {
      action: {
        label: t("listing.viewCart"),
        onClick: () => {
          void navigate({ to: "/cart" });
        },
      },
    });
  };

  return (
    <SiteLayout>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <Link
          to="/browse"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("listing.back")}
        </Link>

        {isOwner ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link to="/sell/$id/edit" params={{ id: listing.id }}>
                <Pencil className="h-4 w-4" />
                {t("account.listings.actions.edit")}
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="gap-1.5 text-destructive hover:text-destructive"
            >
              <Link to="/sell/$id/edit" params={{ id: listing.id }} search={{ delete: true }}>
                <Trash2 className="h-4 w-4" />
                {t("products.delete")}
              </Link>
            </Button>
          </div>
        ) : null}

        <div className="mt-6 grid lg:grid-cols-[1.4fr_1fr] gap-8">
          <div>
            <ListingImageGallery
              imageUrls={listing.imageUrls}
              activeIndex={activeImage}
              onActiveIndexChange={setActiveImage}
              stockLabel={listing.stock === "in" ? t("listings.inStock") : t("listings.lowStock")}
              stockTone={listing.stock === "in" ? "in" : "low"}
              title={listing.name}
            />

            <section className="mt-10">
              <h2 className="font-display text-xl font-semibold">{t("listing.description")}</h2>
              <div className="mt-3">
                {listing.description ? (
                  <DescriptionContent value={listing.description} />
                ) : (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {t("listing.description.body")}
                  </p>
                )}
              </div>
            </section>

            <section className="mt-10">
              <h2 className="font-display text-xl font-semibold">{t("listing.specs")}</h2>
              <dl className="mt-4 grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                {[
                  { k: t("listing.spec.brand"), v: listing.brand },
                  {
                    k: t("listing.spec.condition"),
                    v: t(`browse.condition.${listing.condition}` as const),
                  },
                  ...(categoryIsApi && categoryLabel
                    ? [{ k: t("listing.spec.category"), v: categoryLabel }]
                    : []),
                  { k: t("sell.field.currency"), v: listing.currency },
                  { k: t("products.quantity"), v: String(listing.quantity) },
                  {
                    k: t("listing.spec.stock"),
                    v: listing.stock === "in" ? t("listings.inStock") : t("listings.lowStock"),
                  },
                  { k: t("listing.spec.sku"), v: listing.id },
                ].map((row) => (
                  <div
                    key={row.k}
                    className="flex justify-between gap-4 border-b border-border/50 py-2"
                  >
                    <dt className="text-muted-foreground">{row.k}</dt>
                    <dd className="font-medium text-right text-foreground">{row.v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>

          <aside className="lg:sticky lg:top-20 lg:self-start space-y-4">
            <Card className="border-border/70">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium uppercase tracking-wide">{listing.brand}</span>
                  {categoryIsApi && categoryLabel && listing.categorySlug ? (
                    <>
                      <span>·</span>
                      <Link
                        to="/c/$category"
                        params={{ category: listing.categorySlug }}
                        className="hover:text-foreground"
                      >
                        {categoryLabel}
                      </Link>
                    </>
                  ) : null}
                </div>
                <h1 className="mt-2 font-display text-2xl font-semibold leading-tight tracking-tight">
                  {listing.name}
                </h1>

                <div className="mt-5 font-display text-4xl font-semibold tracking-tight">
                  {currencySymbol(listing.currency)}
                  {listing.price.toLocaleString()}
                </div>

                {!isOwner && !mockOnly ? (
                  <div className="mt-5 space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="order-qty">{t("listing.placeOrder.qty")}</Label>
                      <QuantityStepper
                        id="order-qty"
                        value={qty}
                        min={1}
                        max={Math.max(1, maxQty)}
                        disabled={maxQty < 1}
                        onChange={setQty}
                        className="w-full max-w-[10.5rem]"
                      />
                    </div>
                    <Button
                      className="w-full h-11 gap-2"
                      disabled={maxQty < 1}
                      onClick={addToCart}
                    >
                      <ShoppingCart className="h-4 w-4" />
                      {maxQty < 1 ? t("listing.placeOrder.unavailable") : t("listing.addToCart")}
                    </Button>
                  </div>
                ) : null}

                {showSeller ? (
                  <>
                    <Separator className="my-5" />
                    <div>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        {t("listing.seller")}
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-semibold">
                          {sellerInitials}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{listing.sellerName}</div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>
          </aside>
        </div>

        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="font-display text-2xl font-semibold tracking-tight mb-6">
              {t("listing.related")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {related.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          </section>
        )}
      </div>
    </SiteLayout>
  );
}

function ListingNotFound() {
  const { t } = useI18n();
  return (
    <SiteLayout>
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-semibold">{t("listing.notFound.title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("listing.notFound.body")}</p>
        <Button asChild className="mt-6">
          <Link to="/browse">{t("nav.browse")}</Link>
        </Button>
      </div>
    </SiteLayout>
  );
}
