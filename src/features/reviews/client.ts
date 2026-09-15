import { apiRequest } from "@/features/auth/client";
import type {
  CreateReplyInput,
  CreateReviewInput,
  PaginatedReviews,
  Review,
  ReviewImage,
  ReviewReply,
  UpdateReviewInput,
} from "./types";

function unwrapReviewList(data: Review[] | PaginatedReviews): Review[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

export async function listReviewsForProduct(productId: number): Promise<Review[]> {
  const data = await apiRequest<Review[] | PaginatedReviews>(
    `/api/reviews/?product=${productId}`,
    { method: "GET", auth: false },
  );
  return unwrapReviewList(data);
}

export async function createReview(body: CreateReviewInput): Promise<Review> {
  return apiRequest<Review>("/api/reviews/", { method: "POST", body });
}

export async function updateReview(
  reviewId: number,
  body: UpdateReviewInput,
): Promise<Review> {
  return apiRequest<Review>(`/api/reviews/${reviewId}/`, {
    method: "PATCH",
    body,
  });
}

export async function deleteReview(reviewId: number): Promise<void> {
  await apiRequest(`/api/reviews/${reviewId}/`, { method: "DELETE" });
}

export async function addReviewReply(
  reviewId: number,
  body: CreateReplyInput,
): Promise<ReviewReply> {
  return apiRequest<ReviewReply>(`/api/reviews/${reviewId}/replies/`, {
    method: "POST",
    body,
  });
}

export async function uploadReviewImages(
  reviewId: number,
  files: File[],
): Promise<ReviewImage[]> {
  const form = new FormData();
  for (const file of files) {
    form.append("images", file);
  }
  return apiRequest<ReviewImage[]>(`/api/reviews/${reviewId}/images/`, {
    method: "POST",
    body: form,
  });
}

export async function deleteReviewImage(
  reviewId: number,
  imageId: number,
): Promise<void> {
  await apiRequest(`/api/reviews/${reviewId}/images/${imageId}/`, {
    method: "DELETE",
  });
}
