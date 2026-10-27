"use client";

import { useRef, useState } from "react";
import {
  Circle,
  ImagePlus,
  MousePointer2,
  MoveUpRight,
  Redo2,
  Square,
  Type,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";

import {
  addElement,
  createElementId,
  SLIDE_HEIGHT,
  SLIDE_WIDTH,
} from "@mini-deck/deck";

import { useDeckContext } from "@/components/editor/deck-provider";
import { EmojiMenu } from "@/components/editor/emoji-menu";
import { ShapeMenu } from "@/components/editor/shape-menu";
import { ToolButton } from "@/components/editor/tool-button";
import { useI18n } from "@/components/i18n/locale-provider";
import { messageForError } from "@/lib/api-error";
import { maxImageMb, uploadImage, validateImageFile } from "@/lib/upload";
import { useEditorStore, type EditorTool } from "@/store/editor-store";

export function Toolbar({ slideId }: { slideId: string }) {
  const { t } = useI18n();
  const { deckId, token, doc, canUndo, canRedo, undo, redo, undoManager } =
    useDeckContext();
  const tool = useEditorStore((state) => state.tool);
  const setTool = useEditorStore((state) => state.setTool);
  const selectOnly = useEditorStore((state) => state.selectOnly);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const tools: Array<{ value: EditorTool; label: string; icon: React.ReactNode }> = [
    {
      value: "select",
      label: t("editor.tools.select"),
      icon: <MousePointer2 className="h-4 w-4" />,
    },
    { value: "text", label: t("editor.tools.text"), icon: <Type className="h-4 w-4" /> },
    {
      value: "rect",
      label: t("editor.tools.rectangle"),
      icon: <Square className="h-4 w-4" />,
    },
    {
      value: "ellipse",
      label: t("editor.tools.ellipse"),
      icon: <Circle className="h-4 w-4" />,
    },
    {
      value: "arrow",
      label: t("editor.tools.arrow"),
      icon: <MoveUpRight className="h-4 w-4" />,
    },
  ];

  async function onImageSelected(file: File | undefined) {
    if (!file) return;
    const invalid = validateImageFile(file);
    if (invalid) {
      toast.error(t(invalid, { maxMb: maxImageMb() }));
      return;
    }
    setUploading(true);
    try {
      const asset = await uploadImage(deckId, token, file);
      const width = Math.min(1200, Math.max(180, asset.width));
      const height = Math.max(80, (asset.height / asset.width) * width);
      const elementId = createElementId();
      addElement(doc, slideId, {
        id: elementId,
        type: "image",
        x: (SLIDE_WIDTH - width) / 2,
        y: (SLIDE_HEIGHT - height) / 2,
        width,
        height,
        rotation: 0,
        opacity: 1,
        assetId: asset.id,
      });
      selectOnly(elementId);
      setTool("select");
      undoManager.stopCapturing();
      toast.success(t("editor.imageAdded"));
    } catch (error) {
      const message = messageForError(error, "editor.imageAddError");
      toast.error(t(message.key, message.params));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="pointer-events-none absolute bottom-5 left-1/2 z-30 -translate-x-1/2">
      <div className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-xl shadow-slate-300/40 backdrop-blur">
        {tools.map((item) => (
          <ToolButton
            key={item.value}
            label={item.label}
            active={tool === item.value}
            onClick={() => setTool(item.value)}
            testId={`tool-${item.value}`}
          >
            {item.icon}
          </ToolButton>
        ))}
        <ShapeMenu tool={tool} onSelect={setTool} />
        <EmojiMenu slideId={slideId} />
        <span className="mx-1 h-6 w-px bg-slate-200" />
        <ToolButton
          label={t("editor.tools.addImage")}
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          testId="tool-image"
        >
          {uploading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
        </ToolButton>
        <span className="mx-1 h-6 w-px bg-slate-200" />
        <ToolButton
          label={t("editor.tools.undo")}
          onClick={undo}
          disabled={!canUndo}
          testId="undo"
        >
          <Undo2 className="h-4 w-4" />
        </ToolButton>
        <ToolButton
          label={t("editor.tools.redo")}
          onClick={redo}
          disabled={!canRedo}
          testId="redo"
        >
          <Redo2 className="h-4 w-4" />
        </ToolButton>
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          data-testid="image-input"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            void onImageSelected(file);
          }}
        />
      </div>
    </div>
  );
}
