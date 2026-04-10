"use client";

import { useEffect, useRef, useState } from "react";
import { extractFrames } from "@/lib/video-utils";
import { LoaderCircle } from "lucide-react";

type Frame = {
  time: number;
  url: string;
};

function toFrameLabel(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";

  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const secs = total % 60;

  return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default function VideoFramePicker({
  src,
  frameCount = 20,
  onChange,
}: {
  src: string;
  frameCount?: number;
  onChange?: (time: number) => void;
}) {
  const [frames, setFrames] = useState<Frame[]>([]);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadFrames() {
      setFrames([]);
      setDuration(0);
      setCurrentTime(0);
      setIsLoading(true);

      const loadedFrames: Frame[] = [];
      const estimatedTimes: number[] = [];

      try {
        await extractFrames({
          src,
          signal: controller.signal,
          timestampsInSeconds: ({ durationInSeconds }) => {
            const totalDuration = Math.max(0, durationInSeconds ?? 0);
            setDuration(totalDuration);

            if (frameCount <= 0 || totalDuration <= 0) {
              return [];
            }

            const step = totalDuration / frameCount;

            for (let i = 0; i < frameCount; i++) {
              estimatedTimes.push(Math.min(totalDuration, step * i));
            }

            return estimatedTimes;
          },
          onVideoSample: (sample) => {
            const width = sample.displayWidth || 1;
            const height = sample.displayHeight || 1;
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;

            const context = canvas.getContext("2d");
            if (!context) {
              sample.close();
              return;
            }

            sample.draw(context, 0, 0);

            loadedFrames.push({
              time: estimatedTimes[loadedFrames.length] ?? 0,
              url: canvas.toDataURL("image/jpeg", 0.78),
            });

            sample.close();
          },
        });

        if (!controller.signal.aborted) {
          setFrames(loadedFrames);
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        console.error("Failed to extract video frames", error);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadFrames();

    return () => {
      controller.abort();
    };
  }, [src, frameCount]);

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    onChange?.(time * 1000);
  };

  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    isDragging.current = true;

    startX.current = e.pageX - containerRef.current.offsetLeft;
    scrollLeft.current = containerRef.current.scrollLeft;
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    e.preventDefault();

    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    containerRef.current.scrollLeft = scrollLeft.current - walk;
  };

  const stopDragging = () => {
    isDragging.current = false;
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (!containerRef.current) return;
    isDragging.current = true;

    startX.current = e.touches[0]!.pageX - containerRef.current.offsetLeft;
    scrollLeft.current = containerRef.current.scrollLeft;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || !containerRef.current) return;

    const x = e.touches[0]!.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    containerRef.current.scrollLeft = scrollLeft.current - walk;
  };

  const onTouchEnd = () => {
    isDragging.current = false;
  };

  return (
    <div className="max-w-93 space-y-4 rounded-lg bg-background">
      <h3 className="text-xl font-semibold">Cover photo</h3>
      <div className="relative overflow-hidden rounded-md border bg-muted/30 p-1">
        <div
          ref={containerRef}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={stopDragging}
          onMouseLeave={stopDragging}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="flex gap-1 overflow-x-auto select-none cursor-grab no-scrollbar scroll-smooth active:cursor-grabbing"
        >
          {isLoading
            ? Array.from({ length: Math.max(frameCount, 8) }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 w-20 flex shrink-0 items-center justify-center animate-pulse rounded-md border bg-muted"
                >
                  <LoaderCircle className="animate-spin" />
                </div>
              ))
            : null}

          {frames.map((frame, i) => (
            <img
              key={i}
              src={frame.url}
              draggable={false}
              onClick={() => handleSeek(frame.time)}
              alt={`Frame at ${toFrameLabel(frame.time)}`}
              className={`h-16 w-20 shrink-0 rounded-md border-2 object-cover transition ${
                Math.abs(frame.time - currentTime) < Math.max(duration / Math.max(frameCount, 1), 0.2)
                  ? "border-primary"
                  : "border-transparent opacity-80"
              }`}
            />
          ))}
        </div>

        {!isLoading && frames.length === 0 ? (
          <div className="flex h-16 items-center justify-center text-xs text-muted-foreground">No frames available</div>
        ) : null}
      </div>
    </div>
  );
}
