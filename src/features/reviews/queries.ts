import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { productKeys } from "@/features/products/queries";
import type { CreateReplyInput, CreateReviewInput, UpdateReviewInput } from "./types";
import {
  addReviewReply,
  createReview,
  deleteReview,
  deleteReviewImage,
  listReviewsForProduct,
  updateReview,
  uploadReviewImages,
} from "./client";

export const reviewKeys = {
  all: ["reviews"] as const,
  byProduct: (productId: number) => [...reviewKeys.all, "product", productId] as const,
};

function invalidateProductReviews(queryClient: ReturnType<typeof useQueryClient>, productId: number) {
  void queryClient.invalidateQueries({ queryKey: reviewKeys.byProduct(productId) });
  void queryClient.invalidateQueries({ queryKey: productKeys.detail(productId) });
  void queryClient.invalidateQueries({ queryKey: productKeys.all });
}

export const reviewQueries = {
  byProduct: (productId: number) =>
    queryOptions({
      queryKey: reviewKeys.byProduct(productId),
      queryFn: () => listReviewsForProduct(productId),
    }),
};

export function useProductReviews(productId: number, enabled = true) {
  return useQuery({
    ...reviewQueries.byProduct(productId),
    enabled: enabled && Number.isFinite(productId) && productId > 0,
  });
}

export function useCreateReview(productId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<CreateReviewInput, "product"> & { files?: File[] }) => {
      const review = await createReview({
        product: productId,
        rating: input.rating,
        comment: input.comment,
      });
      if (input.files?.length) {
        await uploadReviewImages(review.id, input.files);
      }
      return review;
    },
    onSuccess: () => invalidateProductReviews(queryClient, productId),
  });
}

export function useUpdateReview(productId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      reviewId,
      body,
    }: {
      reviewId: number;
      body: UpdateReviewInput;
    }) => updateReview(reviewId, body),
    onSuccess: () => invalidateProductReviews(queryClient, productId),
  });
}

export function useDeleteReview(productId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reviewId: number) => deleteReview(reviewId),
    onSuccess: () => invalidateProductReviews(queryClient, productId),
  });
}

export function useAddReviewReply(productId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      reviewId,
      body,
    }: {
      reviewId: number;
      body: CreateReplyInput;
    }) => addReviewReply(reviewId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reviewKeys.byProduct(productId) });
    },
  });
}

export function useUploadReviewImages(productId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId, files }: { reviewId: number; files: File[] }) =>
      uploadReviewImages(reviewId, files),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reviewKeys.byProduct(productId) });
    },
  });
}

export function useDeleteReviewImage(productId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId, imageId }: { reviewId: number; imageId: number }) =>
      deleteReviewImage(reviewId, imageId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reviewKeys.byProduct(productId) });
    },
  });
}
