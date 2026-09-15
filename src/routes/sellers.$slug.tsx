import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
import { SiteLayout } from "@/components/site-layout";
import { ListingCard } from "@/components/listing-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { routeVisibility } from "@/lib/route-visibility";
import { productQueries } from "@/features/products/queries";
import { buildSellerStorefront } from "@/features/sellers/display";
import { MapPin, Phone, Star, Store } from "lucide-react";

export const Route = createFileRoute("/sellers/$slug")({
  loader: async ({ params, context: { queryClient } }) => {
    const listResult = await queryClient.ensureQueryData(productQueries.list());
    const seller = buildSellerStorefront(listResult.products, params.slug);
    if (!seller) throw notFound();
    return { seller };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.seller.name} — Spare Hub` },
          {
            name: "description",
            content: `${loaderData.seller.name} on Spare Hub — ${loaderData.seller.listings.length} listings.`,
          },
          { property: "og:title", content: `${loaderData.seller.name} — Spare Hub` },
          {
            property: "og:description",
            content: `${loaderData.seller.listings.length} listings on Spare Hub.`,
          },
          { property: "og:type", content: "profile" },
        ]
      : [{ title: "Seller — Spare Hub" }],
  }),
  component: SellerPage,
  notFoundComponent: SellerNotFound,
});

function SellerPage() {
  if (!routeVisibility.backend.productsApiReady) return <ComingSoon showBrowse={false} />;
  const { seller } = Route.useLoaderData();
  const { t } = useI18n();

  return (
    <SiteLayout>
      <section className="border-b border-border/60 bg-field">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 grid gap-6 md:grid-cols-[auto_1fr] md:items-center">
          <div className="h-20 w-20 rounded-2xl bg-primary/10 border border-border flex items-center justify-center">
            <Store className="h-9 w-9 text-primary" />
          </div>

          <div className="min-w-0">
            <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">
              {seller.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {seller.address ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" /> {seller.address}
                </span>
              ) : null}
              {seller.reviewCount > 0 ? (
                <span className="inline-flex items-center gap-1.5">
                  <Star className="h-4 w-4 text-[color:var(--gold)]" />
                  {seller.rating.toFixed(1)} ·{" "}
                  {t("reviews.count").replace("{count}", String(seller.reviewCount))}
                </span>
              ) : null}
              {seller.phone_number ? (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-4 w-4" /> {seller.phone_number}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 grid gap-8 md:grid-cols-[1fr_280px]">
        <div>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-display text-xl font-semibold">{t("seller.allListings")}</h2>
            <span className="text-sm text-muted-foreground">
              {seller.listings.length} {t("seller.listingsCount")}
            </span>
          </div>
          {seller.listings.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("seller.noListings")}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {seller.listings.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <Card className="border-border/60">
            <CardContent className="p-5 space-y-3">
              <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t("seller.about")}
              </h3>
              <div className="text-sm text-muted-foreground space-y-1.5">
                {seller.address ? (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" /> {seller.address}
                  </div>
                ) : null}
                {seller.reviewCount > 0 ? (
                  <div className="flex items-center gap-1.5">
                    <Star className="h-4 w-4 text-[color:var(--gold)]" />
                    {seller.rating.toFixed(1)} ·{" "}
                    {t("reviews.count").replace("{count}", String(seller.reviewCount))}
                  </div>
                ) : (
                  <p>{t("reviews.empty")}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </aside>
      </section>
    </SiteLayout>
  );
}

function SellerNotFound() {
  const { t } = useI18n();
  return (
    <SiteLayout>
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-semibold">{t("seller.notFound")}</h1>
        <p className="mt-2 text-muted-foreground">{t("seller.notFoundBody")}</p>
        <Button asChild className="mt-6">
          <Link to="/browse">{t("nav.browse")}</Link>
        </Button>
      </div>
    </SiteLayout>
  );
}
