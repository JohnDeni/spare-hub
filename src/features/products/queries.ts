import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProductInput, ProductListParams } from "./types";
import {
  createProduct,
  deleteProduct,
  deleteProductImage,
  getProduct,
  listMyProducts,
  listProducts,
  updateProduct,
  uploadProductImages,
} from "./client";

export const productKeys = {
  all: ["products"] as const,
  list: (params?: ProductListParams) => [...productKeys.all, "list", params ?? {}] as const,
  detail: (id: number) => [...productKeys.all, "detail", id] as const,
  mine: () => [...productKeys.all, "mine"] as const,
};

export const productQueries = {
  list: (params?: ProductListParams) =>
    queryOptions({
      queryKey: productKeys.list(params),
      queryFn: () => listProducts(params),
    }),
  detail: (id: number) =>
    queryOptions({
      queryKey: productKeys.detail(id),
      queryFn: () => getProduct(id),
    }),
  mine: () =>
    queryOptions({
      queryKey: productKeys.mine(),
      queryFn: listMyProducts,
    }),
};

export function useProducts(params?: ProductListParams) {
  return useQuery(productQueries.list(params));
}

export function useProduct(id: number) {
  return useQuery({ ...productQueries.detail(id), enabled: Number.isFinite(id) });
}

export function useMyProducts(enabled = true) {
  return useQuery({ ...productQueries.mine(), enabled });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ProductInput) => createProduct(body),
    onSuccess: (product) => {
      queryClient.setQueryData(productKeys.detail(product.id), product);
      void queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export function useUpdateProduct(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<ProductInput>) => updateProduct(id, body),
    onSuccess: (product) => {
      queryClient.setQueryData(productKeys.detail(product.id), product);
      void queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteProduct(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export function useUploadProductImages(productId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (files: File[]) => uploadProductImages(productId, files),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productKeys.detail(productId) });
      void queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export function useDeleteProductImage(productId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (imageId: number) => deleteProductImage(productId, imageId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: productKeys.detail(productId) });
      void queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}
