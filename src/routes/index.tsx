import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ComingSoon } from "@/components/coming-soon";
import { SiteLayout } from "@/components/site-layout";
import { ListingCard } from "@/components/listing-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { productQueries } from "@/features/products/queries";
import { productsToDisplay } from "@/features/products/display";
import { categoryQueries } from "@/features/categories/queries";
import { categoryEmoji, slugifyCategory } from "@/features/categories/display";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ArrowRight, Package, Search } from "lucide-react";
import heroField from "@/assets/hero-field.jpg";
import { routeVisibility } from "@/lib/route-visibility";

export const Route = createFileRoute("/")({
  loader: async ({ context: { queryClient } }) => {
    const [listResult, categories] = await Promise.all([
      queryClient.ensureQueryData(productQueries.list()),
      routeVisibility.backend.categoriesApiReady
        ? queryClient.ensureQueryData(categoryQueries.list())
        : Promise.resolve([]),
    ]);
    return { listResult, categories };
  },
  component: Index,
});

function Index() {
  if (!routeVisibility.backend.productsApiReady) return <ComingSoon showBrowse={false} />;

  const { t } = useI18n();
  const navigate = useNavigate();
  const { listResult, categories } = Route.useLoaderData();
  const displays = productsToDisplay(listResult.products);
  const featured = displays.slice(0, 8);
  const [queryDraft, setQueryDraft] = useState("");
  const debouncedQuery = useDebouncedValue(queryDraft, 400);

  const countForCategory = (categoryId: number) =>
    listResult.products.filter((p) => p.category?.some((c) => c.id === categoryId)).length;

  const goBrowse = (raw: string) => {
    const q = raw.trim();
    void navigate({ to: "/browse", search: q ? { q } : {} });
  };

  useEffect(() => {
    if (!debouncedQuery.trim()) return;
    goBrowse(debouncedQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- navigate once per debounced query
  }, [debouncedQuery]);

  const onSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    goBrowse(queryDraft);
  };

  return (
    <SiteLayout>
      <section className="relative overflow-hidden border-b border-border/60 bg-[color:var(--primary)]">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <img
            src={heroField}
            alt=""
            width={1920}
            height={1080}
            className="h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[color:var(--primary)] via-[color:var(--primary)]/85 to-[color:var(--primary)]/30" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-background" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-14 pb-20 md:pt-20 md:pb-28">
          <div className="max-w-2xl text-[color:var(--primary-foreground)]">
            <p className="font-display text-sm font-medium tracking-wide text-[color:var(--primary-foreground)]/80">
              Spare Hub
            </p>
            <h1 className="mt-4 font-display font-semibold leading-[0.95] tracking-[-0.03em] text-5xl sm:text-6xl md:text-7xl">
              {t("hero.title")}
            </h1>
            <p className="mt-5 max-w-xl text-base md:text-lg text-[color:var(--primary-foreground)]/85">
              {t("hero.subtitle")}
            </p>

            <form
              onSubmit={onSearch}
              className="relative z-10 mt-7 flex gap-2 max-w-xl rounded-2xl bg-background p-1.5 shadow-2xl ring-1 ring-[color:var(--primary-foreground)]/10"
            >
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  name="q"
                  type="search"
                  value={queryDraft}
                  onChange={(e) => setQueryDraft(e.target.value)}
                  placeholder={t("hero.searchPlaceholder")}
                  className="relative z-10 h-12 w-full cursor-text border-0 bg-transparent pl-10 text-base text-foreground shadow-none focus-visible:ring-0"
                  autoComplete="off"
                  aria-label={t("hero.searchPlaceholder")}
                />
              </div>
              <Button type="submit" size="lg" className="relative z-10 h-12 shrink-0 px-6">
                {t("hero.searchCta")}
              </Button>
            </form>
          </div>
        </div>
      </section>

      {routeVisibility.backend.categoriesApiReady && categories.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
                {t("cats.title")}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">{t("cats.subtitle")}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {categories.map((c) => {
              const slug = slugifyCategory(c.name);
              const emoji = categoryEmoji(c);
              const count = countForCategory(c.id);
              return (
                <Link key={c.id} to="/c/$category" params={{ category: slug }} className="group">
                  <Card className="h-full border-border/70 transition-all hover:border-accent/60 hover:shadow-sm hover:-translate-y-0.5">
                    <CardContent className="p-4">
                      <div className="mb-2 flex h-9 items-center">
                        {emoji ? (
                          <span className="text-3xl">{emoji}</span>
                        ) : (
                          <Package className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      <div className="font-display font-semibold text-sm leading-tight line-clamp-2">
                        {c.name}
                      </div>
                      <div className="text-xs text-accent mt-2 font-medium">{count}</div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
              {t("listings.title")}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{t("listings.subtitle")}</p>
          </div>
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link to="/browse">
              {t("listings.viewAll")} <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {featured.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>

        <div className="sm:hidden mt-6 flex justify-center">
          <Button asChild variant="outline">
            <Link to="/browse">{t("listings.viewAll")}</Link>
          </Button>
        </div>
      </section>
    </SiteLayout>
  );
}
