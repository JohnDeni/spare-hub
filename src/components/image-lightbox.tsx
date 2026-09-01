import * as Dialog from "@radix-ui/react-dialog";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const MIN_SCALE = 1;
const MAX_SCALE = 4;

type ImageLightboxProps = {
  images: string[];
  index: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIndexChange: (index: number) => void;
  title?: string;
};

export function ImageLightbox({
  images,
  index,
  open,
  onOpenChange,
  onIndexChange,
  title,
}: ImageLightboxProps) {
  const { t } = useI18n();
  const [scale, setScale] = useState(MIN_SCALE);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const current = images[index];
  const hasMultiple = images.length > 1;

  const resetView = useCallback(() => {
    setScale(MIN_SCALE);
    setPan({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (open) resetView();
  }, [open, index, resetView]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
        return;
      }
      if (!hasMultiple) return;
      if (event.key === "ArrowLeft") {
        onIndexChange((index - 1 + images.length) % images.length);
      }
      if (event.key === "ArrowRight") {
        onIndexChange((index + 1) % images.length);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, hasMultiple, index, images.length, onIndexChange, onOpenChange]);

  const zoomIn = () => setScale((value) => Math.min(MAX_SCALE, value + 0.5));
  const zoomOut = () => {
    setScale((value) => {
      const next = Math.max(MIN_SCALE, value - 0.5);
      if (next === MIN_SCALE) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const onWheel = (event: React.WheelEvent) => {
    event.preventDefault();
    if (event.deltaY < 0) zoomIn();
    else zoomOut();
  };

  const onPointerDown = (event: React.PointerEvent) => {
    if (scale <= MIN_SCALE) return;
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      panX: pan.x,
      panY: pan.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!dragRef.current) return;
    setPan({
      x: dragRef.current.panX + (event.clientX - dragRef.current.x),
      y: dragRef.current.panY + (event.clientY - dragRef.current.y),
    });
  };

  const onPointerUp = (event: React.PointerEvent) => {
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const goPrev = () => onIndexChange((index - 1 + images.length) % images.length);
  const goNext = () => onIndexChange((index + 1) % images.length);

  if (!current) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/90 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed inset-0 z-50 flex flex-col outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          aria-describedby={undefined}
        >
          <Dialog.Title className="sr-only">
            {title ?? t("listing.gallery.open")}
          </Dialog.Title>

          <div className="flex items-center justify-between gap-3 px-4 py-3 text-foreground/90">
            <div className="text-sm tabular-nums">
              {hasMultiple
                ? t("listing.gallery.counter")
                    .replace("{current}", String(index + 1))
                    .replace("{total}", String(images.length))
                : null}
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-foreground/90 hover:bg-white/10 hover:text-foreground"
                aria-label={t("listing.gallery.zoomOut")}
                onClick={zoomOut}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-foreground/90 hover:bg-white/10 hover:text-foreground"
                aria-label={t("listing.gallery.zoomIn")}
                onClick={zoomIn}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-foreground/90 hover:bg-white/10 hover:text-foreground"
                aria-label={t("listing.gallery.reset")}
                onClick={resetView}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-foreground/90 hover:bg-white/10 hover:text-foreground"
                aria-label={t("listing.gallery.close")}
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="relative flex-1 min-h-0">
            {hasMultiple ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute left-3 top-1/2 z-10 h-10 w-10 -translate-y-1/2 text-foreground/90 hover:bg-white/10 hover:text-foreground"
                  aria-label={t("listing.gallery.previous")}
                  onClick={goPrev}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-3 top-1/2 z-10 h-10 w-10 -translate-y-1/2 text-foreground/90 hover:bg-white/10 hover:text-foreground"
                  aria-label={t("listing.gallery.next")}
                  onClick={goNext}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            ) : null}

            <div
              ref={viewportRef}
              className={cn(
                "flex h-full items-center justify-center px-14 pb-6 touch-none",
                scale > MIN_SCALE ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in",
              )}
              onWheel={onWheel}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onDoubleClick={() => {
                if (scale > MIN_SCALE) resetView();
                else setScale(2);
              }}
            >
              <img
                src={current}
                alt=""
                draggable={false}
                className="max-h-full max-w-full select-none object-contain transition-transform duration-150"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                }}
              />
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
