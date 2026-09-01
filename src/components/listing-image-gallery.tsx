import { useState } from "react";
import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ImageLightbox } from "@/components/image-lightbox";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type ListingImageGalleryProps = {
  imageUrls: string[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  stockLabel: string;
  stockTone: "in" | "low";
  title: string;
};

export function ListingImageGallery({
  imageUrls,
  activeIndex,
  onActiveIndexChange,
  stockLabel,
  stockTone,
  title,
}: ListingImageGalleryProps) {
  const { t } = useI18n();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const heroImage = imageUrls[activeIndex] ?? imageUrls[0] ?? null;

  const openLightbox = (index: number) => {
    onActiveIndexChange(index);
    setLightboxOpen(true);
  };

  return (
    <>
      <div className="aspect-[4/3] rounded-2xl border border-border/70 bg-gradient-to-br from-secondary to-muted flex items-center justify-center relative overflow-hidden">
        {heroImage ? (
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-zoom-in"
            aria-label={t("listing.gallery.open")}
            onClick={() => openLightbox(activeIndex)}
          >
            <img src={heroImage} alt="" className="h-full w-full object-cover" />
          </button>
        ) : (
          <Package className="h-24 w-24 text-muted-foreground/40" />
        )}
        <div className="pointer-events-none absolute top-4 right-4">
          <Badge
            className={
              stockTone === "in"
                ? "bg-accent text-accent-foreground"
                : "bg-[color:var(--gold)] text-[color:var(--gold-foreground)]"
            }
          >
            {stockLabel}
          </Badge>
        </div>
      </div>

      {imageUrls.length > 1 ? (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {imageUrls.map((url, index) => (
            <li key={url} className="shrink-0">
              <button
                type="button"
                aria-label={t("listing.gallery.open")}
                onClick={() => openLightbox(index)}
                className={cn(
                  "h-16 w-16 overflow-hidden rounded-lg border cursor-zoom-in",
                  index === activeIndex ? "border-primary ring-1 ring-primary" : "border-border/60",
                )}
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {heroImage ? (
        <ImageLightbox
          images={imageUrls}
          index={activeIndex}
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
          onIndexChange={onActiveIndexChange}
          title={title}
        />
      ) : null}
    </>
  );
}
