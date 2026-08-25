import { useEffect, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { sanitizeDescriptionHtml, valueToEditorHtml } from "@/lib/description-html";
import { cn } from "@/lib/utils";

type DescriptionEditorProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function DescriptionEditor({
  id,
  value,
  onChange,
  placeholder,
  className,
}: DescriptionEditorProps) {
  const { t } = useI18n();
  const lastEmitted = useRef(value);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        code: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        strike: false,
        orderedList: false,
      }),
    ],
    content: valueToEditorHtml(value),
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        class: cn(
          "min-h-[8.5rem] px-3 py-2 text-sm leading-relaxed outline-none",
          "[&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
          "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1",
          "[&_strong]:font-semibold [&_em]:italic",
        ),
        role: "textbox",
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor: ed }) => {
      const next = ed.isEmpty ? "" : sanitizeDescriptionHtml(ed.getHTML());
      lastEmitted.current = next;
      onChange(next);
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    editor.commands.setContent(valueToEditorHtml(value), { emitUpdate: false });
  }, [editor, value]);

  if (!editor) return null;

  return (
    <div
      className={cn(
        "rounded-md border border-input bg-transparent shadow-sm focus-within:ring-1 focus-within:ring-ring",
        className,
      )}
    >
      <div className="flex items-center gap-0.5 border-b border-border/60 px-1.5 py-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", editor.isActive("bold") && "bg-accent text-accent-foreground")}
          aria-label={t("sell.field.description.bold")}
          aria-pressed={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", editor.isActive("italic") && "bg-accent text-accent-foreground")}
          aria-label={t("sell.field.description.italic")}
          aria-pressed={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8",
            editor.isActive("bulletList") && "bg-accent text-accent-foreground",
          )}
          aria-label={t("sell.field.description.list")}
          aria-pressed={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </Button>
      </div>
      <div className="relative">
        {editor.isEmpty && placeholder ? (
          <p className="pointer-events-none absolute left-3 top-2 text-sm text-muted-foreground">
            {placeholder}
          </p>
        ) : null}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
