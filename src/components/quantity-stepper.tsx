import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

type QuantityStepperProps = {
  id?: string;
  value: number;
  min?: number;
  max: number;
  disabled?: boolean;
  className?: string;
  onChange: (value: number) => void;
};

export function QuantityStepper({
  id,
  value,
  min = 1,
  max,
  disabled = false,
  className,
  onChange,
}: QuantityStepperProps) {
  const { t } = useI18n();
  const canDec = !disabled && value > min;
  const canInc = !disabled && value < max;

  return (
    <div
      className={cn(
        "inline-flex h-11 items-stretch overflow-hidden rounded-md border border-input bg-background shadow-sm",
        disabled && "opacity-50",
        className,
      )}
    >
      <button
        type="button"
        disabled={!canDec}
        aria-label={t("qty.decrease")}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="inline-flex w-11 items-center justify-center text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40"
      >
        <Minus className="h-4 w-4" />
      </button>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label={t("listing.placeOrder.qty")}
        disabled={disabled}
        value={Number.isFinite(value) ? String(value) : ""}
        onChange={(e) => {
          const raw = e.target.value.replace(/\D/g, "");
          if (raw === "") {
            onChange(min);
            return;
          }
          const next = Number(raw);
          if (!Number.isFinite(next)) return;
          onChange(Math.min(max, Math.max(min, next)));
        }}
        className="w-12 border-x border-input bg-transparent text-center text-sm font-medium tabular-nums text-foreground outline-none focus-visible:bg-accent/10 disabled:cursor-not-allowed"
      />
      <button
        type="button"
        disabled={!canInc}
        aria-label={t("qty.increase")}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="inline-flex w-11 items-center justify-center text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
