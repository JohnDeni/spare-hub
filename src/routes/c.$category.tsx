import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
import { SiteLayout } from "@/components/site-layout";
import { ListingCard } from "@/components/listing-card";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { routeVisibility } from "@/lib/route-visibility";
import { productQueries } from "@/features/products/queries";
import { productsToDisplay } from "@/features/products/display";
import { categoryQueries } from "@/features/categories/queries";
import { findCategoryBySlug } from "@/features/categories/display";
import { ArrowLeft, Package } from "lucide-react";

export const Route = createFileRoute("/c/$category")({
  loader: async ({ params, context: { queryClient } }) => {
    const categories = await queryClient.ensureQueryData(categoryQueries.list());
    const category = findCategoryBySlug(categories, params.category);
    if (!category) throw notFound();
    const listResult = await queryClient.ensureQueryData(
      productQueries.list({ category: category.id }),
    );
    return { category, products: listResult.products, count: listResult.count };
  },
  component: CategoryPage,
});

function CategoryPage() {
  if (!routeVisibility.backend.productsApiReady) return <ComingSoon showBrowse={false} />;
  const { category, products, count } = Route.useLoaderData();
  const { t } = useI18n();
  const items = productsToDisplay(products);

  return (
    <SiteLayout>
      <section className="border-b border-border bg-field">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <Link
            to="/browse"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("nav.browse")}
          </Link>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">
                {category.name}
              </h1>
              <p className="text-xs text-muted-foreground mt-2">
                {count} {t("category.results")}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        {items.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-xl">
            <p className="text-muted-foreground">{t("category.empty")}</p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/browse">{t("nav.browse")}</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {items.map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
