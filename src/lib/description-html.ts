import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = ["p", "br", "strong", "em", "b", "i", "ul", "ol", "li"];

/** Strip HTML to plain text for emptiness checks. */
export function descriptionPlainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function isDescriptionEmpty(html: string): boolean {
  return descriptionPlainText(html).length === 0;
}

/** Sanitize stored/displayed description HTML. */
export function sanitizeDescriptionHtml(html: string): string {
  if (!html.trim() || isDescriptionEmpty(html)) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: [],
  }).trim();
}

/** Load API value into the editor (plain text or HTML). */
export function valueToEditorHtml(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    return sanitizeDescriptionHtml(trimmed) || "";
  }
  const escaped = trimmed
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .split(/\n\n+/)
    .map((block) => `<p>${block.replace(/\n/g, "<br>")}</p>`)
    .join("");
}
