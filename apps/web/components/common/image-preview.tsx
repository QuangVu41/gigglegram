import { FileWithPreview } from "@/hooks/use-file-upload";
import Image from "next/image";
import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface ImagePreviewProps {
  file: FileWithPreview;
  className?: string;
}

const ImagePreview = ({ file, className }: ImagePreviewProps) => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <figure className={cn("relative size-113.5 aspect-square shrink-0", className)}>
      <>
        <Image
          src={file.editedPreview! || file.preview!}
          alt={`Slide ${file.id}`}
          fill
          className="object-cover rounded-lg"
          onLoad={() => setIsLoading(false)}
        />
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70">
            <Spinner className="size-6" />
          </div>
        )}
      </>
    </figure>
  );
};

export default ImagePreview;
