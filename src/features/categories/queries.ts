import { queryOptions, useQuery } from "@tanstack/react-query";
import { getCategory, listCategories } from "./client";

export const categoryKeys = {
  all: ["categories"] as const,
  list: () => [...categoryKeys.all, "list"] as const,
  detail: (id: number) => [...categoryKeys.all, "detail", id] as const,
};

export const categoryQueries = {
  list: () =>
    queryOptions({
      queryKey: categoryKeys.list(),
      queryFn: listCategories,
    }),
  detail: (id: number) =>
    queryOptions({
      queryKey: categoryKeys.detail(id),
      queryFn: () => getCategory(id),
    }),
};

export function useCategories() {
  return useQuery(categoryQueries.list());
}
