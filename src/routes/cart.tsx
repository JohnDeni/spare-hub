import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { QuantityStepper } from "@/components/quantity-stepper";
import { useI18n } from "@/lib/i18n";
import { useCart } from "@/features/cart/cart-context";
import { useAuth } from "@/features/auth/auth-context";
import { useCreateOrder } from "@/features/orders/queries";
import { currencySymbol } from "@/features/products/display";
import type { ProductCurrency } from "@/features/products/types";
import { Loader2, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/cart")({
  component: CartPage,
});

function CartPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { status } = useAuth();
  const { items, setQuantity, removeItem, clear, itemCount } = useCart();
  const createOrder = useCreateOrder();

  const totalsByCurrency = items.reduce<Partial<Record<ProductCurrency, number>>>((acc, item) => {
    const line = Number(item.price) * item.quantity;
    acc[item.currency] = (acc[item.currency] ?? 0) + line;
    return acc;
  }, {});
  const totalEntries = Object.entries(totalsByCurrency) as [ProductCurrency, number][];

  const checkout = async () => {
    if (items.length === 0) return;
    if (status !== "authenticated") {
      void navigate({ to: "/login", search: { redirect: "/cart" } });
      return;
    }
    try {
      const order = await createOrder.mutateAsync({
        details: items.map((i) => ({ product: i.productId, quantity: i.quantity })),
      });
      clear();
      toast.success(t("cart.checkout.success"));
      void navigate({ to: "/account/orders/$orderId", params: { orderId: String(order.id) } });
    } catch {
      toast.error(t("cart.checkout.error"));
    }
  };

  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
        <header className="mb-8">
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t("cart.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("cart.subtitle")}</p>
        </header>

        {items.length === 0 ? (
          <Card className="border-border/60">
            <CardContent className="p-10 text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <ShoppingBag className="h-5 w-5 text-primary" />
              </div>
              <h2 className="font-display text-lg font-semibold">{t("cart.emptyTitle")}</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                {t("cart.emptyBody")}
              </p>
              <Button asChild className="mt-5">
                <Link to="/browse">{t("nav.browse")}</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("cart.totalItems").replace("{count}", String(itemCount))}
            </p>
            {items.map((item) => {
              const lineTotal = Number(item.price) * item.quantity;
              return (
                <Card key={item.productId} className="border-border/60">
                  <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <Link
                        to="/listings/$id"
                        params={{ id: String(item.productId) }}
                        className="font-display font-semibold hover:underline"
                      >
                        {item.name}
                      </Link>
                      <p className="text-sm text-muted-foreground mt-0.5">{item.brand}</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {currencySymbol(item.currency)}
                        {Number(item.price).toLocaleString()} × {item.quantity}
                      </p>
                      <p className="font-display font-semibold mt-0.5">
                        {currencySymbol(item.currency)}
                        {lineTotal.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <QuantityStepper
                        value={item.quantity}
                        min={1}
                        max={item.maxQuantity}
                        onChange={(v) => setQuantity(item.productId, v)}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeItem(item.productId)}
                        aria-label={t("cart.remove")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            <Card className="border-border/60">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-muted-foreground">{t("cart.total")}</span>
                  <div className="text-right">
                    {totalEntries.map(([currency, amount]) => (
                      <div key={currency} className="font-display text-xl font-semibold tracking-tight">
                        {currencySymbol(currency)}
                        {amount.toLocaleString()}
                      </div>
                    ))}
                  </div>
                </div>
                <Separator />
                <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
                  <Button variant="outline" asChild>
                    <Link to="/browse">{t("nav.browse")}</Link>
                  </Button>
                  <Button
                    className="gap-2"
                    disabled={createOrder.isPending}
                    onClick={() => void checkout()}
                  >
                    {createOrder.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShoppingBag className="h-4 w-4" />
                    )}
                    {t("cart.checkout")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
