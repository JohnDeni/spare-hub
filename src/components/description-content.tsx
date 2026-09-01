import { sanitizeDescriptionHtml, valueToEditorHtml } from "@/lib/description-html";
import { cn } from "@/lib/utils";

type DescriptionContentProps = {
  value: string;
  className?: string;
};

/** Renders a listing description (HTML or legacy plain text). */
export function DescriptionContent({ value, className }: DescriptionContentProps) {
  const html = sanitizeDescriptionHtml(valueToEditorHtml(value));
  if (!html) return null;

  return (
    <div
      className={cn(
        "text-sm text-muted-foreground leading-relaxed",
        "[&_p]:mt-3 [&_p:first-child]:mt-0",
        "[&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1",
        "[&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1",
        "[&_strong]:font-semibold [&_strong]:text-foreground",
        "[&_em]:italic",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
