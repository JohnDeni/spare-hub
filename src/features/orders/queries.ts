import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateOrderInput } from "./types";
import { cancelOrder, createOrder, getOrder, listOrders } from "./client";

export const orderKeys = {
  all: ["orders"] as const,
  list: () => [...orderKeys.all, "list"] as const,
  detail: (id: number) => [...orderKeys.all, "detail", id] as const,
};

export const orderQueries = {
  list: () =>
    queryOptions({
      queryKey: orderKeys.list(),
      queryFn: listOrders,
    }),
  detail: (id: number) =>
    queryOptions({
      queryKey: orderKeys.detail(id),
      queryFn: () => getOrder(id),
    }),
};

export function useOrders(enabled = true) {
  return useQuery({ ...orderQueries.list(), enabled });
}

export function useOrder(id: number, enabled = true) {
  return useQuery({ ...orderQueries.detail(id), enabled: enabled && Number.isFinite(id) });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateOrderInput) => createOrder(body),
    onSuccess: (order) => {
      queryClient.setQueryData(orderKeys.detail(order.id), order);
      void queryClient.invalidateQueries({ queryKey: orderKeys.list() });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => cancelOrder(id),
    onSuccess: (order) => {
      queryClient.setQueryData(orderKeys.detail(order.id), order);
      void queryClient.invalidateQueries({ queryKey: orderKeys.list() });
    },
  });
}
