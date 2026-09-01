import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ComingSoon } from "@/components/coming-soon";
import { SiteLayout } from "@/components/site-layout";
import { ListingCard } from "@/components/listing-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import { routeVisibility } from "@/lib/route-visibility";
import { productKeys } from "@/features/products/queries";
import { listProducts } from "@/features/products/client";
import { productsToDisplay, uiConditionToApi } from "@/features/products/display";
import type { ProductConditionUi, ProductListParams } from "@/features/products/types";
import { categoryQueries } from "@/features/categories/queries";
import { categoryEmoji, slugifyCategory } from "@/features/categories/display";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Package, Search, SlidersHorizontal } from "lucide-react";

type SortKey = "relevance" | "priceAsc" | "priceDesc" | "newest";
type ConditionFilter = "all" | ProductConditionUi;

type BrowseSearch = {
  q?: string;
  condition?: ConditionFilter;
  sort?: SortKey;
  category?: string;
};

function parseCondition(v: unknown): ConditionFilter | undefined {
  if (v === "new" || v === "used" || v === "refurb") return v;
  return undefined;
}

function parseSort(v: unknown): SortKey | undefined {
  if (v === "priceAsc" || v === "priceDesc" || v === "newest") return v;
  return undefined;
}

function toListParams(
  args: {
    q?: string;
    condition?: ConditionFilter;
    sort?: SortKey;
    categorySlug?: string;
  },
  categories: { id: number; name: string }[],
): ProductListParams {
  const params: ProductListParams = {};
  const q = args.q?.trim();
  if (q) params.search = q;
  if (args.condition && args.condition !== "all") {
    params.condition = uiConditionToApi(args.condition);
  }
  if (args.sort === "priceAsc") params.ordering = "price";
  else if (args.sort === "priceDesc") params.ordering = "-price";
  else if (args.sort === "newest") params.ordering = "-created_at";
  if (args.categorySlug && args.categorySlug !== "all") {
    const match = categories.find((c) => slugifyCategory(c.name) === args.categorySlug);
    if (match) params.category = match.id;
  }
  return params;
}

export const Route = createFileRoute("/browse")({
  validateSearch: (search: Record<string, unknown>): BrowseSearch => ({
    q: typeof search.q === "string" ? search.q : undefined,
    condition: parseCondition(search.condition),
    sort: parseSort(search.sort),
    category: typeof search.category === "string" ? search.category : undefined,
  }),
  loader: async ({ context: { queryClient } }) => {
    const categories = await queryClient.ensureQueryData(categoryQueries.list());
    return { categories };
  },
  component: Browse,
});

function Browse() {
  const { t } = useI18n();
  const navigate = useNavigate({ from: "/browse" });
  const { categories } = Route.useLoaderData();
  const search = Route.useSearch();

  const condition = search.condition ?? "all";
  const sort = search.sort ?? "relevance";
  const categorySlug = search.category ?? "all";

  const [queryDraft, setQueryDraft] = useState(() => search.q ?? "");
  const debouncedQuery = useDebouncedValue(queryDraft, 200);
  /** Last `q` we wrote to the URL — ignore echo updates from our own navigate. */
  const lastPushedQ = useRef((search.q ?? "").trim());

  // Push debounced text to the URL (shareable), without reading it back into the input.
  useEffect(() => {
    const next = debouncedQuery.trim();
    if (next === lastPushedQ.current) return;
    lastPushedQ.current = next;
    void navigate({
      replace: true,
      search: (prev) => ({
        ...prev,
        q: next || undefined,
      }),
    });
  }, [debouncedQuery, navigate]);

  // Apply external URL changes only (back/forward, clear from elsewhere).
  useEffect(() => {
    const urlQ = (search.q ?? "").trim();
    if (urlQ === lastPushedQ.current) return;
    lastPushedQ.current = urlQ;
    setQueryDraft(urlQ);
  }, [search.q]);

  const listParams = toListParams(
    {
      q: debouncedQuery,
      condition,
      sort,
      categorySlug,
    },
    categories,
  );

  const { data: listResult, isFetching } = useQuery({
    queryKey: productKeys.list(listParams),
    queryFn: () => listProducts(listParams),
    enabled: routeVisibility.backend.productsApiReady,
    placeholderData: keepPreviousData,
  });

  if (!routeVisibility.backend.productsApiReady) return <ComingSoon showBrowse={false} />;

  const displays = productsToDisplay(listResult?.products);
  const resultCount = listResult?.count ?? 0;

  const hasFilters =
    debouncedQuery.trim() !== "" ||
    categorySlug !== "all" ||
    condition !== "all" ||
    sort !== "relevance";

  const selectedCategory = categories.find((c) => slugifyCategory(c.name) === categorySlug);

  const patchSearch = (patch: Partial<BrowseSearch>) => {
    void navigate({
      search: (prev) => ({
        q: patch.q !== undefined ? patch.q || undefined : prev.q,
        condition:
          patch.condition !== undefined
            ? patch.condition === "all"
              ? undefined
              : patch.condition
            : prev.condition,
        sort:
          patch.sort !== undefined
            ? patch.sort === "relevance"
              ? undefined
              : patch.sort
            : prev.sort,
        category:
          patch.category !== undefined
            ? patch.category === "all"
              ? undefined
              : patch.category
            : prev.category,
      }),
    });
  };

  const clear = () => {
    lastPushedQ.current = "";
    setQueryDraft("");
    void navigate({ search: {} });
  };

  return (
    <SiteLayout>
      <section className="border-b border-border bg-field">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {t("browse.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t("browse.subtitle")}</p>

          <div className="mt-5 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                value={queryDraft}
                onChange={(e) => setQueryDraft(e.target.value)}
                placeholder={t("hero.searchPlaceholder")}
                className="pl-10 h-11 bg-background"
                autoComplete="off"
                aria-label={t("hero.searchPlaceholder")}
              />
            </div>
            <Select value={sort} onValueChange={(v) => patchSearch({ sort: v as SortKey })}>
              <SelectTrigger className="sm:w-56 h-11 bg-background">
                <SelectValue placeholder={t("browse.sort")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">{t("browse.sort.relevance")}</SelectItem>
                <SelectItem value="priceAsc">{t("browse.sort.priceAsc")}</SelectItem>
                <SelectItem value="priceDesc">{t("browse.sort.priceDesc")}</SelectItem>
                <SelectItem value="newest">{t("browse.sort.newest")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-[260px_1fr] gap-8">
          <aside className="space-y-6">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-display font-semibold">{t("browse.filters")}</h2>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clear} className="ml-auto h-7 text-xs">
                  {t("browse.clear")}
                </Button>
              )}
            </div>

            {routeVisibility.backend.categoriesApiReady ? (
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground mb-2 block">
                  {t("cats.title")}
                </Label>
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => patchSearch({ category: "all" })}
                    className={`w-full text-left rounded-md px-2.5 py-1.5 text-sm transition ${
                      categorySlug === "all"
                        ? "bg-accent/10 font-medium text-foreground"
                        : "hover:bg-accent/5 text-muted-foreground"
                    }`}
                  >
                    {t("browse.category.all")}
                  </button>
                  {categories.map((c) => {
                    const slug = slugifyCategory(c.name);
                    const emoji = categoryEmoji(c);
                    return (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => patchSearch({ category: slug })}
                        className={`w-full text-left flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition ${
                          categorySlug === slug
                            ? "bg-accent/10 font-medium text-foreground"
                            : "hover:bg-accent/5 text-muted-foreground"
                        }`}
                      >
                        {emoji ? (
                          <span>{emoji}</span>
                        ) : (
                          <Package className="h-4 w-4 shrink-0" />
                        )}
                        <span className="flex-1 truncate">{c.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground mb-2 block">
                {t("browse.condition")}
              </Label>
              <Select
                value={condition}
                onValueChange={(v) => patchSearch({ condition: v as ConditionFilter })}
              >
                <SelectTrigger className="h-10 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("browse.condition.all")}</SelectItem>
                  <SelectItem value="new">{t("browse.condition.new")}</SelectItem>
                  <SelectItem value="used">{t("browse.condition.used")}</SelectItem>
                  <SelectItem value="refurb">{t("browse.condition.refurb")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </aside>

          <div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-4">
              <span>
                {t("browse.results").replace("{count}", String(resultCount))}
                {isFetching ? "…" : ""}
              </span>
              {debouncedQuery.trim() ? (
                <Badge variant="secondary" className="font-normal">
                  {debouncedQuery.trim()}
                </Badge>
              ) : null}
              {selectedCategory ? (
                <Badge variant="secondary" className="font-normal">
                  {selectedCategory.name}
                </Badge>
              ) : null}
              {condition !== "all" ? (
                <Badge variant="secondary" className="font-normal capitalize">
                  {t(`browse.condition.${condition}` as const)}
                </Badge>
              ) : null}
            </div>

            {displays.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-border rounded-xl">
                <p className="text-muted-foreground">{t("browse.empty")}</p>
                <Button variant="outline" size="sm" onClick={clear} className="mt-4">
                  {t("browse.clear")}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {displays.map((l) => (
                  <ListingCard key={l.id} listing={l} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
