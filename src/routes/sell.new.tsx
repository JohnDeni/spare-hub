import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ComingSoon } from "@/components/coming-soon";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DescriptionEditor } from "@/components/description-editor";
import { isDescriptionEmpty } from "@/lib/description-html";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { MockFieldShell, mockFieldClass } from "@/components/mock-field-shell";
import { useI18n } from "@/lib/i18n";
import { listings } from "@/lib/listings";
import { uiConditionToApi } from "@/features/products/display";
import type { ProductConditionUi, ProductCurrency } from "@/features/products/types";
import { categoryQueries } from "@/features/categories/queries";
import { ArrowLeft, ArrowRight, Check, Loader2, PartyPopper } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { routeVisibility } from "@/lib/route-visibility";
import { useCreateProduct } from "@/features/products/queries";
import { useSellerGuard } from "@/features/products/use-seller-guard";
import { ApiError } from "@/features/auth/client";

export const Route = createFileRoute("/sell/new")({
  loader: ({ context: { queryClient } }) =>
    routeVisibility.backend.categoriesApiReady
      ? queryClient.ensureQueryData(categoryQueries.list())
      : Promise.resolve([]),
  component: SellNew,
});

type FormState = {
  name: string;
  description: string;
  brand: string;
  condition: ProductConditionUi;
  price: string;
  quantity: string;
  currency: ProductCurrency;
  categoryId: string;
};

const initial: FormState = {
  name: "",
  description: "",
  brand: "",
  condition: "new",
  price: "",
  quantity: "1",
  currency: "EUR",
  categoryId: "",
};

function SellNew() {
  if (!routeVisibility.header.sell) return <ComingSoon />;
  const { t } = useI18n();
  const navigate = useNavigate();
  const categories = Route.useLoaderData();
  const { ready } = useSellerGuard("/sell/new");
  const createProduct = useCreateProduct();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(initial);
  const [done, setDone] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const totalSteps = 2;
  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const previewMock = listings[0]!;
  const requireCategory = routeVisibility.backend.categoriesApiReady && categories.length > 0;

  const canContinue =
    step === 1
      ? form.name.trim() !== "" &&
        !isDescriptionEmpty(form.description) &&
        form.brand.trim() !== "" &&
        (!requireCategory || form.categoryId !== "")
      : form.price.trim() !== "" &&
        Number.isFinite(Number(form.price)) &&
        Number(form.price) >= 0 &&
        Number(form.quantity) >= 0;

  const submit = async () => {
    try {
      const product = await createProduct.mutateAsync({
        name: form.name.trim(),
        brand: form.brand.trim(),
        description: form.description.trim(),
        condition: uiConditionToApi(form.condition),
        currency: form.currency,
        price: Number(form.price).toFixed(2),
        quantity: Number(form.quantity),
        ...(form.categoryId ? { category_ids: [Number(form.categoryId)] } : {}),
      });
      setCreatedId(String(product.id));
      setDone(true);
      toast.success(t("sell.review.published"));
    } catch (error) {
      const message =
        error instanceof ApiError &&
        typeof error.data === "object" &&
        error.data &&
        "detail" in error.data
          ? String((error.data as { detail: unknown }).detail)
          : error instanceof ApiError
            ? error.message
            : t("products.error.notSeller");
      toast.error(message.includes("seller") ? t("products.error.notSeller") : message);
    }
  };

  if (!ready) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-7xl px-4 py-20 flex justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </SiteLayout>
    );
  }

  if (done) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-xl px-4 py-24 text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-accent/15 text-accent flex items-center justify-center">
            <PartyPopper className="h-7 w-7" />
          </div>
          <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight">
            {t("sell.review.published")}
          </h1>
          <p className="mt-2 text-muted-foreground">{t("sell.review.publishedBody")}</p>
          <div className="mt-6 flex justify-center gap-2">
            <Button onClick={() => { setForm(initial); setStep(1); setDone(false); }} variant="outline">
              {t("sell.review.another")}
            </Button>
            <Button onClick={() => navigate({ to: "/account/listings" })}>
              {t("sell.review.viewListings")}
            </Button>
            {createdId ? (
              <Button variant="secondary" onClick={() => navigate({ to: "/listings/$id", params: { id: createdId } })}>
                {t("account.listings.actions.view")}
              </Button>
            ) : null}
          </div>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
        <Link
          to="/sell"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("nav.sell")}
        </Link>

        <header className="mt-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {t("sell.step")} {step} {t("sell.of")} {totalSteps}
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
            {t("sell.new.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t("sell.new.subtitle")}</p>
        </header>

        <ol className="mt-6 flex items-center gap-2">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((n) => (
            <li key={n} className="flex-1">
              <div
                className={cn(
                  "h-1.5 rounded-full transition-colors",
                  n <= step ? "bg-primary" : "bg-border",
                )}
              />
            </li>
          ))}
        </ol>

        <Card className="mt-6 border-border/70">
          <CardContent className="p-6 sm:p-8">
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="font-display text-xl font-semibold">{t("sell.step2.title")}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{t("sell.step2.subtitle")}</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="name">{t("sell.field.title")}</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder={t("sell.field.title.ph")}
                    className="h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="brand">{t("sell.field.brand")}</Label>
                  <Input
                    id="brand"
                    value={form.brand}
                    onChange={(e) => update("brand", e.target.value)}
                    placeholder={t("sell.field.brand.ph")}
                    className="h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="desc">{t("sell.field.description")}</Label>
                  <DescriptionEditor
                    id="desc"
                    value={form.description}
                    onChange={(v) => update("description", v)}
                    placeholder={t("sell.field.description.ph")}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>{t("sell.field.condition")}</Label>
                  <Select value={form.condition} onValueChange={(v) => update("condition", v as ProductConditionUi)}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">{t("browse.condition.new")}</SelectItem>
                      <SelectItem value="used">{t("browse.condition.used")}</SelectItem>
                      <SelectItem value="refurb">{t("browse.condition.refurb")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {requireCategory ? (
                  <div className="space-y-1.5">
                    <Label>{t("sell.field.category")}</Label>
                    <Select
                      value={form.categoryId || undefined}
                      onValueChange={(v) => update("categoryId", v)}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder={t("sell.field.category.placeholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                <MockFieldShell label={t("sell.field.location")}>
                  <Input readOnly value={previewMock.location} className={mockFieldClass} />
                </MockFieldShell>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="font-display text-xl font-semibold">{t("sell.step3.title")}</h2>
                  <p className="text-sm text-muted-foreground mt-1">{t("sell.step3.subtitle")}</p>
                </div>

                <div className="grid sm:grid-cols-[1fr_120px] gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="price">{t("sell.field.price")}</Label>
                    <Input
                      id="price"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={form.price}
                      onChange={(e) => update("price", e.target.value)}
                      placeholder="0"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("sell.field.currency")}</Label>
                    <Select value={form.currency} onValueChange={(v) => update("currency", v as ProductCurrency)}>
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR">EUR €</SelectItem>
                        <SelectItem value="USD">USD $</SelectItem>
                        <SelectItem value="UAH">UAH ₴</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="qty">{t("products.quantity")}</Label>
                  <Input
                    id="qty"
                    type="number"
                    min="0"
                    value={form.quantity}
                    onChange={(e) => update("quantity", e.target.value)}
                    className="h-11"
                  />
                </div>

                <dl className="divide-y divide-border/60 text-sm">
                  {[
                    { k: t("sell.field.title"), v: form.name || "—" },
                    { k: t("sell.field.brand"), v: form.brand || "—" },
                    {
                      k: t("sell.field.category"),
                      v: categories.find((c) => String(c.id) === form.categoryId)?.name || "—",
                    },
                    { k: t("sell.field.condition"), v: t(`browse.condition.${form.condition}` as const) },
                    { k: t("sell.field.price"), v: form.price ? `${form.currency} ${Number(form.price).toLocaleString()}` : "—" },
                    { k: t("products.quantity"), v: form.quantity || "—" },
                  ].map((row) => (
                    <div key={row.k} className="flex justify-between gap-6 py-3">
                      <dt className="text-muted-foreground">{row.k}</dt>
                      <dd className="font-medium text-foreground text-right max-w-[60%]">{row.v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("sell.back")}
          </Button>

          {step < totalSteps ? (
            <Button
              onClick={() => setStep((s) => Math.min(totalSteps, s + 1))}
              disabled={!canContinue}
              className="gap-1.5"
            >
              {t("sell.next")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={() => void submit()} disabled={!canContinue || createProduct.isPending} className="gap-1.5">
              {createProduct.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {t("sell.submit")}
            </Button>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
