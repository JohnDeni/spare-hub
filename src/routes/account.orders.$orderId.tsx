import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { routeVisibility } from "@/lib/route-visibility";
import { ComingSoon } from "@/components/coming-soon";
import { ApiError } from "@/features/auth/client";
import { orderQueries, useCancelOrder } from "@/features/orders/queries";
import type { OrderStatus } from "@/features/orders/types";
import { orderTotalsByCurrency } from "@/features/orders/totals";
import { currencySymbol } from "@/features/products/display";
import type { ProductCurrency } from "@/features/products/types";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/account/orders/$orderId")({
  loader: async ({ params, context: { queryClient } }) => {
    const id = Number(params.orderId);
    if (!Number.isFinite(id)) throw notFound();
    try {
      return await queryClient.ensureQueryData(orderQueries.detail(id));
    } catch (error) {
      if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
        throw notFound();
      }
      throw error;
    }
  },
  component: OrderDetail,
});

function statusLabel(status: OrderStatus, t: ReturnType<typeof useI18n>["t"]) {
  if (status === "cancelled") return t("account.orders.status.cancelled");
  if (status === "paid") return t("account.orders.status.paid");
  return t("account.orders.status.pending");
}

function OrderDetail() {
  if (!routeVisibility.accountTabs.orders) return <ComingSoon embedded />;
  const { t } = useI18n();
  const router = useRouter();
  const order = Route.useLoaderData();
  const cancelOrder = useCancelOrder();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const canCancel = order.status === "pending";
  const totals = Object.entries(orderTotalsByCurrency(order)) as [ProductCurrency, number][];

  const onCancel = async () => {
    try {
      await cancelOrder.mutateAsync(order.id);
      await router.invalidate();
      toast.success(t("account.orders.cancelled"));
      setConfirmOpen(false);
    } catch {
      toast.error(t("auth.error.generic"));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/account/orders"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("account.orders.back")}
        </Link>
        <header className="mt-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold">
              {t("account.orders.detail.title").replace("{id}", String(order.id))}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {t("account.orders.detail.placed")}: {new Date(order.created_at).toLocaleString()}
            </p>
          </div>
          <Badge variant="outline" className="font-normal w-fit">
            {statusLabel(order.status, t)}
          </Badge>
        </header>
      </div>

      <Card className="border-border/60">
        <CardContent className="p-6 space-y-4">
          <h3 className="font-display font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            {t("account.orders.detail.items")}
          </h3>
          <ul className="divide-y divide-border/60">
            {order.details.map((line) => {
              const ph = line.product_history;
              const productId = line.product_id;
              const lineTotal = Number(ph.price) * line.quantity;
              const title = (
                <div className="font-medium truncate">{ph.name}</div>
              );
              return (
                <li key={line.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="min-w-0">
                    {productId ? (
                      <Link
                        to="/listings/$id"
                        params={{ id: String(productId) }}
                        className="hover:underline"
                      >
                        {title}
                      </Link>
                    ) : (
                      title
                    )}
                    <div className="text-sm text-muted-foreground">
                      {ph.brand} · {currencySymbol(ph.currency as ProductCurrency)}
                      {Number(ph.price).toLocaleString()} × {line.quantity}
                    </div>
                  </div>
                  <div className="font-display font-semibold shrink-0">
                    {currencySymbol(ph.currency as ProductCurrency)}
                    {lineTotal.toLocaleString()}
                  </div>
                </li>
              );
            })}
          </ul>
          {totals.length > 0 ? (
            <div className="pt-4 border-t border-border/60 flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">{t("cart.total")}</span>
              <div className="text-right">
                {totals.map(([currency, amount]) => (
                  <div key={currency} className="font-display text-xl font-semibold tracking-tight">
                    {currencySymbol(currency)}
                    {amount.toLocaleString()}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {canCancel ? (
        <div className="flex justify-end">
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmOpen(true)}
          >
            {t("account.orders.cancel")}
          </Button>
        </div>
      ) : null}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("account.orders.cancelConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("account.orders.cancelConfirm.body")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("sell.back")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void onCancel();
              }}
            >
              {cancelOrder.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("account.orders.cancel")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
