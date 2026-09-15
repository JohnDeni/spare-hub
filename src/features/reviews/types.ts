export type ReviewUser = {
  id: number;
  email: string;
};

export type ReviewImage = {
  id: number;
  image: string;
  created_at: string;
};

export type ReviewReply = {
  id: number;
  user: ReviewUser;
  message: string;
  parent_reply: number | null;
  child_replies: ReviewReply[];
  created_at: string;
};

export type Review = {
  id: number;
  product: number;
  user: ReviewUser;
  rating: number;
  comment: string;
  replies: ReviewReply[];
  images: ReviewImage[];
  created_at: string;
  updated_at: string;
};

export type PaginatedReviews = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Review[];
};

export type CreateReviewInput = {
  product: number;
  rating: number;
  comment?: string;
};

export type UpdateReviewInput = {
  rating?: number;
  comment?: string;
};

export type CreateReplyInput = {
  message: string;
  parent_reply?: number | null;
};
