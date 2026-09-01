import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { routeVisibility } from "@/lib/route-visibility";
import { ComingSoon } from "@/components/coming-soon";
import { orderQueries } from "@/features/orders/queries";
import type { OrderStatus } from "@/features/orders/types";
import { orderItemCount, orderTotalsByCurrency } from "@/features/orders/totals";
import { currencySymbol } from "@/features/products/display";
import type { ProductCurrency } from "@/features/products/types";
import { ChevronRight, Package, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/account/orders/")({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(orderQueries.list()),
  component: AccountOrders,
});

function statusLabel(status: OrderStatus, t: ReturnType<typeof useI18n>["t"]) {
  if (status === "cancelled") return t("account.orders.status.cancelled");
  if (status === "paid") return t("account.orders.status.paid");
  return t("account.orders.status.pending");
}

function AccountOrders() {
  if (!routeVisibility.accountTabs.orders) return <ComingSoon embedded />;
  const { t } = useI18n();
  const orders = Route.useLoaderData();

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-xl font-semibold">{t("account.orders.title")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("account.orders.subtitle")}</p>
      </header>

      {orders.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="p-10 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <ShoppingBag className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-display text-lg font-semibold">{t("account.orders.emptyTitle")}</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              {t("account.orders.emptyBody")}
            </p>
            <Button asChild className="mt-5 gap-2">
              <Link to="/browse">
                <Package className="h-4 w-4" />
                {t("nav.browse")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const first = order.details[0]?.product_history;
            const itemCount = orderItemCount(order);
            const totals = Object.entries(orderTotalsByCurrency(order)) as [
              ProductCurrency,
              number,
            ][];
            const summary = first
              ? t("account.orders.summary")
                  .replace("{name}", first.name)
                  .replace("{count}", String(itemCount))
              : t("cart.totalItems").replace("{count}", String(itemCount));

            return (
              <Link
                key={order.id}
                to="/account/orders/$orderId"
                params={{ orderId: String(order.id) }}
                className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card className="border-border/60 transition-colors hover:border-accent/50">
                  <CardContent className="p-4 sm:p-5 flex items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display font-semibold">
                          {t("account.orders.detail.title").replace("{id}", String(order.id))}
                        </span>
                        <Badge variant="outline" className="font-normal">
                          {statusLabel(order.status, t)}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground truncate">{summary}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {t("account.orders.detail.placed")}:{" "}
                        {new Date(order.created_at).toLocaleDateString()}
                        {totals.length > 0 ? (
                          <>
                            {" · "}
                            {totals
                              .map(
                                ([currency, amount]) =>
                                  `${currencySymbol(currency)}${amount.toLocaleString()}`,
                              )
                              .join(" · ")}
                          </>
                        ) : null}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
