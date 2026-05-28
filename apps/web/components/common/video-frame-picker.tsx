"use client";

import { useEffect, useRef, useState } from "react";
import { extractFrames } from "@/lib/video-utils";
import Image from "next/image";
import { LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("Common");
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

        console.error(
          t("videoFramePicker.errors.failedToExtractFrames"),
          error,
        );
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
  }, [src, frameCount, t]);

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
    <div className="w-full space-y-4 bg-background">
      <h3 className="text-xl font-bold">{t("videoFramePicker.title")}</h3>
      <div className="relative w-full">
        <div
          ref={containerRef}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={stopDragging}
          onMouseLeave={stopDragging}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className="flex overflow-x-scroll select-none cursor-grab no-scrollbar scroll-smooth active:cursor-grabbing pl-1 py-4"
        >
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-24 w-18 flex shrink-0 items-center justify-center animate-pulse bg-muted border-r border-background/20 last:border-0 ${
                    i === 0 ? "rounded-l-lg" : ""
                  } ${i === 5 ? "rounded-r-lg" : ""}`}
                >
                  <LoaderCircle className="animate-spin text-muted-foreground w-5 h-5" />
                </div>
              ))
            : null}

          {frames.map((frame, i) => {
            const isSelected =
              Math.abs(frame.time - currentTime) <
              Math.max(duration / Math.max(frameCount, 1), 0.2);
            return (
              <div
                key={i}
                onClick={() => handleSeek(frame.time)}
                className={`relative shrink-0 cursor-pointer transition-transform duration-200 ${
                  isSelected ? "z-10 scale-[1.1]" : "z-0 scale-100"
                }`}
              >
                <Image
                  src={frame.url}
                  draggable={false}
                  alt={t("videoFramePicker.frameAlt", {
                    time: toFrameLabel(frame.time),
                  })}
                  width={72}
                  height={96}
                  unoptimized
                  className={`h-24 w-18 object-cover pointer-events-none ${
                    isSelected
                      ? "rounded-xl border-[3px] border-white shadow-md shadow-black/20"
                      : "rounded-none"
                  } ${!isSelected && i === 0 ? "rounded-l-lg" : ""} ${
                    !isSelected && i === frames.length - 1 ? "rounded-r-lg" : ""
                  }`}
                />
              </div>
            );
          })}
        </div>

        {!isLoading && frames.length === 0 ? (
          <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">
            {t("videoFramePicker.empty")}
          </div>
        ) : null}
      </div>
    </div>
  );
}
