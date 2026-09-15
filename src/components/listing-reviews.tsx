import { Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Loader2, Pencil, Star, Trash2 } from "lucide-react";
import { ImageLightbox } from "@/components/image-lightbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/auth-context";
import { ApiError } from "@/features/auth/client";
import {
  useAddReviewReply,
  useCreateReview,
  useDeleteReview,
  useDeleteReviewImage,
  useProductReviews,
  useUpdateReview,
  useUploadReviewImages,
} from "@/features/reviews/queries";
import type { Review, ReviewReply } from "@/features/reviews/types";
import { useI18n } from "@/lib/i18n";
import { productImageUrl } from "@/lib/product-media";
import { profileDisplayName } from "@/lib/profile";
import { toast } from "sonner";

function StarRow({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const iconClass = size === "md" ? "h-5 w-5" : "h-4 w-4";
  const rounded = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <div className="flex items-center gap-0.5 text-[color:var(--gold)]" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`${iconClass} ${i < rounded ? "fill-current" : "fill-none opacity-35"}`}
        />
      ))}
    </div>
  );
}

function RatingPicker({
  value,
  onChange,
  id,
}: {
  value: number;
  onChange: (value: number) => void;
  id: string;
}) {
  const { t } = useI18n();
  return (
    <div id={id} className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className="rounded-md p-1 text-[color:var(--gold)] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t("reviews.form.ratingValue").replace("{value}", String(star))}
          onClick={() => onChange(star)}
        >
          <Star
            className={`h-6 w-6 ${star <= value ? "fill-current" : "fill-none opacity-35"}`}
          />
        </button>
      ))}
    </div>
  );
}

function userLabel(
  reviewUser: { id: number; email: string } | undefined,
  currentUserId: number | undefined,
  profileName: string | null,
  t: ReturnType<typeof useI18n>["t"],
) {
  if (currentUserId && reviewUser?.id === currentUserId && profileName) return profileName;
  const email = reviewUser?.email?.trim() ?? "";
  if (email) return email.split("@")[0] || email;
  return t("reviews.anonymous");
}

function formatReviewDate(iso: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function ReplyTree({
  replies,
  depth = 0,
  onReply,
  canReply,
  locale,
  currentUserId,
  profileName,
}: {
  replies: ReviewReply[];
  depth?: number;
  onReply: (parentId: number) => void;
  canReply: boolean;
  locale: string;
  currentUserId?: number;
  profileName: string | null;
}) {
  const { t } = useI18n();
  if (!replies.length) return null;

  return (
    <ul className={`space-y-3 ${depth > 0 ? "mt-3 border-l border-border/60 pl-3" : "mt-3"}`}>
      {replies.map((reply) => (
        <li key={reply.id} className="space-y-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm font-medium">
              {userLabel(reply.user, currentUserId, profileName, t)}
            </span>
            <time className="text-xs text-muted-foreground">
              {formatReviewDate(reply.created_at, locale)}
            </time>
          </div>
          <p className="text-sm text-foreground whitespace-pre-wrap">{reply.message}</p>
          {canReply ? (
            <button
              type="button"
              className="text-xs text-primary hover:underline underline-offset-4"
              onClick={() => onReply(reply.id)}
            >
              {t("reviews.reply.action")}
            </button>
          ) : null}
          <ReplyTree
            replies={reply.child_replies ?? []}
            depth={depth + 1}
            onReply={onReply}
            canReply={canReply}
            locale={locale}
            currentUserId={currentUserId}
            profileName={profileName}
          />
        </li>
      ))}
    </ul>
  );
}

function ReviewCard({
  review,
  productId,
  locale,
}: {
  review: Review;
  productId: number;
  locale: string;
}) {
  const { t } = useI18n();
  const { status, user } = useAuth();
  const isMine = Boolean(user && review.user?.id === user.user.id);
  const profileName = user
    ? profileDisplayName(user.first_name, user.last_name, user.user.email)
    : null;
  const updateReview = useUpdateReview(productId);
  const deleteReview = useDeleteReview(productId);
  const addReply = useAddReviewReply(productId);
  const uploadImages = useUploadReviewImages(productId);
  const deleteImage = useDeleteReviewImage(productId);

  const [editing, setEditing] = useState(false);
  const [editRating, setEditRating] = useState(review.rating);
  const [editComment, setEditComment] = useState(review.comment ?? "");
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyParent, setReplyParent] = useState<number | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const imageUrls = (review.images ?? []).map((img) => productImageUrl(img.image));

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const saveEdit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await updateReview.mutateAsync({
        reviewId: review.id,
        body: { rating: editRating, comment: editComment.trim() },
      });
      setEditing(false);
      toast.success(t("reviews.updated"));
    } catch {
      toast.error(t("reviews.error.generic"));
    }
  };

  const onDelete = async () => {
    try {
      await deleteReview.mutateAsync(review.id);
      toast.success(t("reviews.deleted"));
    } catch {
      toast.error(t("reviews.error.generic"));
    }
  };

  const submitReply = async (e: FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;
    try {
      await addReply.mutateAsync({
        reviewId: review.id,
        body: {
          message: replyMessage.trim(),
          parent_reply: replyParent,
        },
      });
      setReplyMessage("");
      setReplyParent(null);
      setReplyOpen(false);
      toast.success(t("reviews.reply.success"));
    } catch (error) {
      toast.error(
        error instanceof ApiError && error.status === 401
          ? t("reviews.error.auth")
          : t("reviews.error.generic"),
      );
    }
  };

  const onUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      await uploadImages.mutateAsync({
        reviewId: review.id,
        files: Array.from(files),
      });
      toast.success(t("reviews.images.success"));
    } catch {
      toast.error(t("reviews.error.generic"));
    }
  };

  return (
    <article className="rounded-xl border border-border/60 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-medium text-sm">
          {userLabel(review.user, user?.user.id, profileName, t)}
        </div>
        <div className="flex items-center gap-2">
          <time className="text-xs text-muted-foreground">
            {formatReviewDate(review.created_at, locale)}
          </time>
          {isMine ? (
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setEditing((v) => !v);
                  setEditRating(review.rating);
                  setEditComment(review.comment ?? "");
                }}
                aria-label={t("reviews.edit")}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => void onDelete()}
                disabled={deleteReview.isPending}
                aria-label={t("reviews.delete")}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {editing ? (
        <form onSubmit={saveEdit} className="space-y-3">
          <RatingPicker id={`edit-rating-${review.id}`} value={editRating} onChange={setEditRating} />
          <Textarea
            value={editComment}
            onChange={(e) => setEditComment(e.target.value)}
            rows={3}
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={updateReview.isPending}>
              {t("reviews.save")}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>
              {t("reviews.cancel")}
            </Button>
          </div>
        </form>
      ) : (
        <>
          <StarRow rating={review.rating} />
          {review.comment ? (
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {review.comment}
            </p>
          ) : null}
        </>
      )}

      {imageUrls.length > 0 ? (
        <>
          <ul className="flex flex-wrap gap-2">
            {review.images.map((img, index) => (
              <li key={img.id} className="relative">
                <button
                  type="button"
                  className="h-16 w-16 overflow-hidden rounded-lg border border-border/60 cursor-zoom-in"
                  aria-label={t("listing.gallery.open")}
                  onClick={() => openLightbox(index)}
                >
                  <img
                    src={productImageUrl(img.image)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
                {isMine ? (
                  <button
                    type="button"
                    className="absolute -right-1 -top-1 rounded-full bg-background border border-border p-0.5 text-destructive"
                    aria-label={t("reviews.images.delete")}
                    onClick={(e) => {
                      e.stopPropagation();
                      void deleteImage.mutateAsync({ reviewId: review.id, imageId: img.id });
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          <ImageLightbox
            images={imageUrls}
            index={lightboxIndex}
            open={lightboxOpen}
            onOpenChange={setLightboxOpen}
            onIndexChange={setLightboxIndex}
            title={t("reviews.title")}
          />
        </>
      ) : null}

      {isMine ? (
        <div>
          <Label htmlFor={`review-images-${review.id}`} className="text-xs text-muted-foreground">
            {t("reviews.images.add")}
          </Label>
          <input
            id={`review-images-${review.id}`}
            type="file"
            accept="image/*"
            multiple
            className="mt-1 block w-full text-xs text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium"
            onChange={(e) => {
              void onUpload(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      ) : null}

      <ReplyTree
        replies={review.replies ?? []}
        canReply={status === "authenticated"}
        onReply={(parentId) => {
          setReplyParent(parentId);
          setReplyOpen(true);
        }}
        locale={locale}
        currentUserId={user?.user.id}
        profileName={profileName}
      />

      {status === "authenticated" ? (
        replyOpen ? (
          <form onSubmit={submitReply} className="space-y-2 border-t border-border/50 pt-3">
            <Label htmlFor={`reply-${review.id}`}>{t("reviews.reply.label")}</Label>
            <Textarea
              id={`reply-${review.id}`}
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              rows={2}
              placeholder={t("reviews.reply.placeholder")}
              required
            />
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={addReply.isPending}>
                {t("reviews.reply.submit")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setReplyOpen(false);
                  setReplyParent(null);
                  setReplyMessage("");
                }}
              >
                {t("reviews.cancel")}
              </Button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            className="text-xs text-primary hover:underline underline-offset-4"
            onClick={() => {
              setReplyParent(null);
              setReplyOpen(true);
            }}
          >
            {t("reviews.reply.action")}
          </button>
        )
      ) : null}
    </article>
  );
}

type ListingReviewsProps = {
  productId: number;
  averageRating: number;
  reviewCount: number;
  canReview: boolean;
};

export function ListingReviews({
  productId,
  averageRating,
  reviewCount,
  canReview,
}: ListingReviewsProps) {
  const { t, lang } = useI18n();
  const { status } = useAuth();
  const { data: reviews = [], isLoading } = useProductReviews(productId);
  const createReview = useCreateReview(productId);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const summaryCount = Math.max(reviewCount, reviews.length);
  const summaryRating =
    summaryCount === 0
      ? 0
      : reviewCount > 0 && averageRating > 0
        ? averageRating
        : reviews.reduce((sum, r) => sum + r.rating, 0) / Math.max(reviews.length, 1);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (createReview.isPending) return;
    try {
      await createReview.mutateAsync({
        rating,
        comment: comment.trim(),
        files,
      });
      setComment("");
      setFiles([]);
      setRating(5);
      toast.success(t("reviews.success"));
    } catch (error) {
      toast.error(
        error instanceof ApiError && error.status === 401
          ? t("reviews.error.auth")
          : t("reviews.error.generic"),
      );
    }
  };

  const locale = lang === "uk" ? "uk-UA" : "en-US";
  const showForm = canReview && status === "authenticated";
  const showSignIn = canReview && status !== "authenticated";
  const showOwnerNote = !canReview && status === "authenticated";

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-xl font-semibold">{t("reviews.title")}</h2>
        {summaryCount > 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <StarRow rating={summaryRating} size="md" />
            <span>
              {summaryRating.toFixed(1)} ·{" "}
              {t("reviews.count").replace("{count}", String(summaryCount))}
            </span>
          </div>
        ) : null}
      </div>

      {showForm ? (
        <form
          onSubmit={onSubmit}
          className="mt-6 rounded-xl border border-border/60 p-4 space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="review-rating">{t("reviews.form.rating")}</Label>
            <RatingPicker id="review-rating" value={rating} onChange={setRating} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="review-comment">{t("reviews.form.comment")}</Label>
            <Textarea
              id="review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder={t("reviews.form.commentPlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="review-files">{t("reviews.images.add")}</Label>
            <input
              id="review-files"
              type="file"
              accept="image/*"
              multiple
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />
          </div>
          <Button type="submit" disabled={createReview.isPending} className="gap-2">
            {createReview.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("reviews.form.submit")}
          </Button>
        </form>
      ) : showSignIn ? (
        <p className="mt-4 text-sm text-muted-foreground">
          {t("reviews.form.signIn")}{" "}
          <Link to="/login" className="text-primary underline-offset-4 hover:underline">
            {t("nav.signin")}
          </Link>
        </p>
      ) : showOwnerNote ? (
        <p className="mt-4 text-sm text-muted-foreground">{t("reviews.form.ownListing")}</p>
      ) : null}

      <div className="mt-6 space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("reviews.loading")}</p>
        ) : reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("reviews.empty")}</p>
        ) : (
          reviews.map((review) => (
            <ReviewCard key={review.id} review={review} productId={productId} locale={locale} />
          ))
        )}
      </div>
    </section>
  );
}
