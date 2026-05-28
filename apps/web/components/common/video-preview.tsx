"use client";

import { Video, videoFeatures } from "@videojs/react/video";
import { createPlayer } from "@videojs/react";
import { FileWithPreview } from "@/hooks/use-file-upload";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

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

  const togglePlayPause = () => {
    if (!ref.current) return;

    if (ref.current.paused) {
      ref.current.play().catch(() => {});
    } else {
      ref.current.pause();
    }
  };

  return (
    <Player.Provider>
      <Player.Container
        className="relative w-84 sm:w-96 md:w-full aspect-square overflow-hidden rounded-lg bg-black cursor-pointer"
        onClick={togglePlayPause}
      >
        <Video
          ref={ref}
          src={file.preview}
          playsInline
          className="aspect-square absolute inset-0"
        />
      </Player.Container>
    </Player.Provider>
  );
};

export default VideoPreview;
