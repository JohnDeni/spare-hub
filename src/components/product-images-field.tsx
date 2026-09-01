import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { productImageUrl } from "@/lib/product-media";
import type { ProductImage } from "@/features/products/types";
import {
  useDeleteProductImage,
  useUploadProductImages,
} from "@/features/products/queries";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type DraftProps = {
  mode: "draft";
  files: File[];
  onChange: (files: File[]) => void;
};

type ProductProps = {
  mode: "product";
  productId: number;
  images: ProductImage[];
};

type ProductImagesFieldProps = DraftProps | ProductProps;

function useDraftPreviews(files: File[]) {
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, [files]);

  return previews;
}

export function ProductImagesField(props: ProductImagesFieldProps) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const productId = props.mode === "product" ? props.productId : 0;

  const uploadImages = useUploadProductImages(productId);
  const deleteImage = useDeleteProductImage(productId);
  const draftPreviews = useDraftPreviews(props.mode === "draft" ? props.files : []);

  const onPickFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const picked = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (!picked.length) return;

    if (props.mode === "draft") {
      props.onChange([...props.files, ...picked]);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    try {
      await uploadImages.mutateAsync(picked);
      toast.success(t("sell.field.photos.uploaded"));
    } catch {
      toast.error(t("sell.field.photos.error"));
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onRemoveDraft = (index: number) => {
    if (props.mode !== "draft") return;
    props.onChange(props.files.filter((_, i) => i !== index));
  };

  const onRemoveProduct = async (imageId: number) => {
    if (props.mode !== "product") return;
    setDeletingId(imageId);
    try {
      await deleteImage.mutateAsync(imageId);
    } catch {
      toast.error(t("sell.field.photos.error"));
    } finally {
      setDeletingId(null);
    }
  };

  const isUploading = props.mode === "product" && uploadImages.isPending;
  const hasImages =
    props.mode === "draft" ? props.files.length > 0 : props.images.length > 0;

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => void onPickFiles(e.target.files)}
      />

      {hasImages ? (
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {props.mode === "draft"
            ? draftPreviews.map((src, index) => (
                <li
                  key={`${src}-${index}`}
                  className="relative aspect-square overflow-hidden rounded-xl border border-border/60 bg-muted/30"
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="absolute top-2 right-2 h-8 w-8"
                    aria-label={t("sell.field.photos.delete")}
                    onClick={() => onRemoveDraft(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))
            : props.images.map((img) => (
                <li
                  key={img.id}
                  className="relative aspect-square overflow-hidden rounded-xl border border-border/60 bg-muted/30"
                >
                  <img
                    src={productImageUrl(img.image)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="absolute top-2 right-2 h-8 w-8"
                    disabled={deletingId === img.id && deleteImage.isPending}
                    aria-label={t("sell.field.photos.delete")}
                    onClick={() => void onRemoveProduct(img.id)}
                  >
                    {deletingId === img.id && deleteImage.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </li>
              ))}
        </ul>
      ) : null}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isUploading}
        className={cn("gap-2", !hasImages && "w-full sm:w-auto")}
        onClick={() => inputRef.current?.click()}
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImagePlus className="h-4 w-4" />
        )}
        {t("sell.field.photos.add")}
      </Button>
      <p className="text-xs text-muted-foreground">{t("sell.field.photos.hint")}</p>
    </div>
  );
}
