"use client";

import { Video, videoFeatures } from "@videojs/react/video";
import { createPlayer, PlayButton } from "@videojs/react";
import { Play } from "lucide-react";
import { FileWithPreview } from "@/hooks/use-file-upload";
import { useEffect, useRef } from "react";

interface VideoPreviewProps {
  file: FileWithPreview;
  onVideoRef?: (videoElement: HTMLVideoElement | null) => void;
}

export const Player = createPlayer({ features: videoFeatures });

const VideoPreview = ({ file, onVideoRef }: VideoPreviewProps) => {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (onVideoRef) {
      onVideoRef(ref.current);
    }
  }, [onVideoRef]);

  return (
    <Player.Provider>
      <Player.Container className="relative w-113.5 aspect-square overflow-hidden rounded-lg bg-black">
        <Video ref={ref} src={file.preview} playsInline className="aspect-square absolute inset-0" />
        <PlayButton
          render={(props, state) => (
            <button
              {...props}
              type="button"
              className="absolute inset-0 z-10 flex items-center justify-center bg-transparent px-4 py-2 text-sm font-medium text-white transition cursor-pointer"
            >
              {state.paused ? <Play /> : ""}
            </button>
          )}
        />
      </Player.Container>
    </Player.Provider>
  );
};

export default VideoPreview;
