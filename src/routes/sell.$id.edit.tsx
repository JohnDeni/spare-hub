import { createFileRoute, Link, notFound, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useI18n } from "@/lib/i18n";
import { ArrowLeft, Check, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { routeVisibility } from "@/lib/route-visibility";
import { ApiError } from "@/features/auth/client";
import {
  productQueries,
  useDeleteProduct,
  useMyProducts,
  useUpdateProduct,
} from "@/features/products/queries";
import { apiConditionToUi, productToDisplay, uiConditionToApi } from "@/features/products/display";
import type { ProductConditionUi, ProductCurrency } from "@/features/products/types";
import { useSellerGuard } from "@/features/products/use-seller-guard";
import { categoryQueries } from "@/features/categories/queries";

type EditSearch = { delete?: boolean };

export const Route = createFileRoute("/sell/$id/edit")({
  validateSearch: (search: Record<string, unknown>): EditSearch => ({
    delete: search.delete === true || search.delete === "true",
  }),
  loader: async ({ params, context: { queryClient } }) => {
    const id = Number(params.id);
    if (!Number.isFinite(id)) throw notFound();
    try {
      const [product, categories] = await Promise.all([
        queryClient.ensureQueryData(productQueries.detail(id)),
        routeVisibility.backend.categoriesApiReady
          ? queryClient.ensureQueryData(categoryQueries.list())
          : Promise.resolve([]),
      ]);
      return { product, display: productToDisplay(product), categories };
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) throw notFound();
      throw error;
    }
  },
  component: SellEdit,
});

function SellEdit() {
  if (!routeVisibility.header.sell) return <ComingSoon />;
  const { t } = useI18n();
  const navigate = useNavigate();
  const router = useRouter();
  const { product, display, categories } = Route.useLoaderData();
  const { delete: openDeleteOnMount } = Route.useSearch();
  const { ready } = useSellerGuard(`/sell/${product.id}/edit`);
  const { data: mine = [], isLoading: mineLoading } = useMyProducts(ready);
  const updateProduct = useUpdateProduct(product.id);
  const deleteProduct = useDeleteProduct();
  const { mock } = display;

  const [name, setName] = useState(product.name);
  const [brand, setBrand] = useState(product.brand);
  const [description, setDescription] = useState(product.description ?? "");
  const [condition, setCondition] = useState<ProductConditionUi>(apiConditionToUi(product.condition));
  const [currency, setCurrency] = useState<ProductCurrency>(product.currency);
  const [price, setPrice] = useState(String(Number(product.price)));
  const [quantity, setQuantity] = useState(String(product.quantity));
  const [categoryId, setCategoryId] = useState(
    product.category?.[0] ? String(product.category[0].id) : "",
  );
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (openDeleteOnMount) setDeleteOpen(true);
  }, [openDeleteOnMount]);

  useEffect(() => {
    if (ready && !mineLoading && !mine.some((p) => p.id === product.id)) {
      navigate({ to: "/account/listings" });
    }
  }, [ready, mineLoading, mine, product.id, navigate]);

  const canSave =
    name.trim() !== "" &&
    brand.trim() !== "" &&
    !isDescriptionEmpty(description) &&
    price.trim() !== "" &&
    Number.isFinite(Number(price)) &&
    Number(price) >= 0 &&
    Number(quantity) >= 0;

  const save = async () => {
    try {
      await updateProduct.mutateAsync({
        name: name.trim(),
        brand: brand.trim(),
        description: description.trim(),
        condition: uiConditionToApi(condition),
        currency,
        price: Number(price).toFixed(2),
        quantity: Number(quantity),
        ...(categoryId ? { category_ids: [Number(categoryId)] } : {}),
      });
      await router.invalidate();
      toast.success(t("products.saved"));
      navigate({ to: "/listings/$id", params: { id: String(product.id) } });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t("products.error.forbidden"));
    }
  };

  const remove = async () => {
    try {
      await deleteProduct.mutateAsync(product.id);
      toast.success(t("products.deleted"));
      navigate({ to: "/account/listings" });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t("products.error.forbidden"));
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

  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
        <Link
          to="/listings/$id"
          params={{ id: String(product.id) }}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {display.name}
        </Link>

        <header className="mt-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">{t("products.edit.title")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("products.edit.subtitle")}</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" />
            {t("products.delete")}
          </Button>
        </header>

        <Card className="mt-6 border-border/70">
          <CardContent className="p-6 sm:p-8 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="name">{t("sell.field.title")}</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="brand">{t("sell.field.brand")}</Label>
              <Input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} className="h-11" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="desc">{t("sell.field.description")}</Label>
              <DescriptionEditor
                id="desc"
                value={description}
                onChange={setDescription}
                placeholder={t("sell.field.description.ph")}
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t("sell.field.condition")}</Label>
              <Select value={condition} onValueChange={(v) => setCondition(v as ProductConditionUi)}>
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

            <div className="grid sm:grid-cols-[1fr_120px] gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="price">{t("sell.field.price")}</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("sell.field.currency")}</Label>
                <Select value={currency} onValueChange={(v) => setCurrency(v as ProductCurrency)}>
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
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="h-11"
              />
            </div>

            {routeVisibility.backend.categoriesApiReady && categories.length > 0 ? (
              <div className="space-y-1.5">
                <Label>{t("sell.field.category")}</Label>
                <Select value={categoryId || undefined} onValueChange={setCategoryId}>
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
              <Input readOnly value={mock.location} className={mockFieldClass} />
            </MockFieldShell>
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" asChild>
            <Link to="/account/listings">{t("sell.back")}</Link>
          </Button>
          <Button onClick={() => void save()} disabled={!canSave || updateProduct.isPending} className="gap-1.5">
            {updateProduct.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {t("account.save")}
          </Button>
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("products.deleteConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("products.deleteConfirm.body")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("sell.back")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void remove();
              }}
            >
              {deleteProduct.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("products.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SiteLayout>
  );
}
