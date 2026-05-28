import { FileWithPreview } from "@/hooks/use-file-upload";
import Image from "next/image";
import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { FILTER_PRESETS, PRESET_OVERLAYS } from "./image-editor";

interface ImagePreviewProps {
  file: FileWithPreview;
  className?: string;
}

const ImagePreview = ({ file, className }: ImagePreviewProps) => {
  const [isLoading, setIsLoading] = useState(true);

  // We find the selected preset
  const preset =
    file.selectedFilter && file.selectedFilter !== "original"
      ? FILTER_PRESETS.find((p) => p.id === file.selectedFilter)
      : null;
  const overlay = preset ? PRESET_OVERLAYS[preset.id] : null;

  return (
    <figure
      className={cn(
        "relative size-84 sm:size-96 md:size-full aspect-square shrink-0",
        className,
      )}
    >
      <>
        <Image
          // ALWAYS render the un-filtered base image if we apply CSS filter, otherwise the filter is double applied
          // (once in canvas baking for editedPreview, once in css)
          src={preset ? file.preview! : file.editedPreview! || file.preview!}
          alt={`Slide ${file.id}`}
          fill
          className="object-cover rounded-lg"
          style={{ filter: preset ? preset.filter : "none" }}
          onLoad={() => setIsLoading(false)}
        />
        {overlay && overlay.overlayColor && overlay.overlayOpacity && (
          <div
            className="absolute inset-0 pointer-events-none rounded-lg z-10"
            style={{
              backgroundColor: overlay.overlayColor,
              opacity: overlay.overlayOpacity,
              mixBlendMode: "soft-light",
            }}
          />
        )}
        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/70">
            <Spinner className="size-6" />
          </div>
        )}
      </>
    </figure>
  );
};

export default ImagePreview;
