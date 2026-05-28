"use client";

import { useEffect, useRef, useState } from "react";
import { FileWithPreview } from "@/hooks/use-file-upload";
import { cn } from "@/lib/utils";
import NextImage from "next/image";
import { useTranslations } from "next-intl";
import { useDebouncedCallback } from "use-debounce";

export type FilterPreset = {
  id: string;
  filter: string;
  overlayColor?: string;
  overlayOpacity?: number;
};

interface ImageEditorProps {
  editingFile: FileWithPreview;
  onEditFile?: (editedFile: FileWithPreview) => void;
  className?: string;
}

export const FILTER_PRESETS: FilterPreset[] = [
  { id: "original", filter: "none" },
  {
    id: "aden",
    filter: "sepia(0.2) contrast(0.9) brightness(1.05) saturate(0.85)",
  },
  { id: "clarendon", filter: "contrast(1.2) saturate(1.35) brightness(1.08)" },
  {
    id: "crema",
    filter: "sepia(0.25) contrast(0.9) brightness(1.1) saturate(0.8)",
  },
  { id: "gingham", filter: "brightness(1.05) contrast(0.95) saturate(0.85)" },
  { id: "juno", filter: "contrast(1.15) saturate(1.4) brightness(1.05)" },
  { id: "lark", filter: "brightness(1.08) saturate(1.15) contrast(0.95)" },
  { id: "ludwig", filter: "contrast(1.1) saturate(1.12) brightness(1.03)" },
  { id: "moon", filter: "grayscale(1) contrast(1.1) brightness(1.05)" },
  { id: "perpetua", filter: "contrast(1.05) brightness(1.08) saturate(1.2)" },
  {
    id: "reyes",
    filter: "sepia(0.2) brightness(1.12) contrast(0.9) saturate(0.75)",
  },
  {
    id: "slumber",
    filter: "sepia(0.35) saturate(0.9) brightness(1.02) contrast(0.9)",
  },
];

export const PRESET_OVERLAYS: Record<
  string,
  Pick<FilterPreset, "overlayColor" | "overlayOpacity">
> = {
  aden: { overlayColor: "#e6c8a4", overlayOpacity: 0.1 },
  crema: { overlayColor: "#f4d8b8", overlayOpacity: 0.12 },
  gingham: { overlayColor: "#f5ede0", overlayOpacity: 0.12 },
  moon: { overlayColor: "#7a7a7a", overlayOpacity: 0.08 },
  perpetua: { overlayColor: "#005b9a", overlayOpacity: 0.08 },
  reyes: { overlayColor: "#f7d9b1", overlayOpacity: 0.1 },
  slumber: { overlayColor: "#5f4235", overlayOpacity: 0.1 },
};

const FILTER_PREVIEW_IMAGE_SRC = "/filter-preview.jpg";

const loadImage = (src: string, errorMessage: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(errorMessage));
    image.src = src;
  });

const getSourceUrl = (file: FileWithPreview) => {
  if (file.preview) {
    return file.preview;
  }

  if (!(file.file instanceof File)) {
    return file.file.url;
  }

  return null;
};

export const mergePreset = (preset: FilterPreset): FilterPreset => {
  const overlay = PRESET_OVERLAYS[preset.id];
  if (!overlay) {
    return preset;
  }

  return {
    ...preset,
    ...overlay,
  };
};

const ImageEditor = ({
  editingFile,
  onEditFile,
  className,
}: ImageEditorProps) => {
  const t = useTranslations("Common");
  const selectedFilter = editingFile.selectedFilter ?? "original";
  const [selectedFilterId, setSelectedFilterId] = useState("original");

  useEffect(() => {
    setSelectedFilterId(selectedFilter);
  }, [editingFile.id, selectedFilter]);

  const generateFilteredFile = useDebouncedCallback(
    async (preset: FilterPreset, currentFile: FileWithPreview) => {
      if (!currentFile.file.type.startsWith("image/")) {
        return;
      }

      if (preset.id === "original") {
        onEditFile?.({
          ...currentFile,
          selectedFilter: preset.id,
          file: currentFile.file,
        });
        return;
      }

      const sourceUrl = getSourceUrl(currentFile);

      if (!sourceUrl) {
        return;
      }

      try {
        const image = await loadImage(
          sourceUrl,
          t("imageEditor.errors.unableToLoad"),
        );
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;

        const context = canvas.getContext("2d");
        if (!context) {
          return;
        }

        context.filter = preset.filter;
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        if (preset.overlayColor && preset.overlayOpacity) {
          context.save();
          context.globalCompositeOperation = "soft-light";
          context.fillStyle = preset.overlayColor;
          context.globalAlpha = preset.overlayOpacity;
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.restore();
        }

        const outputType = currentFile.file.type || "image/jpeg";
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((blobValue) => resolve(blobValue), outputType, 0.95);
        });

        if (!blob) {
          return;
        }

        const edited = new File([blob], currentFile.file.name, {
          type: outputType,
          lastModified: Date.now(),
        });

        onEditFile?.({
          ...currentFile,
          selectedFilter: preset.id,
          file: edited,
          // We deliberately don't set a new preview, relying on the original one with CSS
        });
      } catch {
        // Ignore or handle
      }
    },
    400,
  );

  return (
    <div className={cn("space-y-3 px-2 pb-2 shrink-0 flex-1", className)}>
      <h3 className="text-lg font-semibold">{t("imageEditor.title")}</h3>
      <div className="grid grid-cols-4 gap-1">
        {FILTER_PRESETS.map((preset) => {
          const previewPreset = mergePreset(preset);
          const isActive = selectedFilterId === preset.id;
          const presetLabel = t(`imageEditor.filters.${preset.id}`);

          return (
            <button
              key={preset.id}
              type="button"
              className={cn(
                "group space-y-1.5 aspect-square rounded-md border p-1 text-left transition",
                isActive
                  ? "border-primary"
                  : "border-border hover:border-primary/40",
              )}
              onClick={() => {
                setSelectedFilterId(preset.id);
                // Immediately notify parent about selectedFilter so ImagePreview updates instantly
                onEditFile?.({ ...editingFile, selectedFilter: preset.id });
                generateFilteredFile(preset, editingFile);
              }}
            >
              <div className="relative aspect-square overflow-hidden rounded-sm bg-muted">
                <NextImage
                  src={FILTER_PREVIEW_IMAGE_SRC}
                  alt={presetLabel}
                  className="h-full w-full object-cover"
                  fill
                  style={{ filter: previewPreset.filter }}
                />
                {previewPreset.overlayColor && previewPreset.overlayOpacity ? (
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      backgroundColor: previewPreset.overlayColor,
                      opacity: previewPreset.overlayOpacity,
                      mixBlendMode: "soft-light",
                    }}
                  />
                ) : null}
              </div>
              <p
                className={cn(
                  "truncate text-xs",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                {presetLabel}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ImageEditor;
