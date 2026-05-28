"use client";

import { AudioTrack, useAudioActions } from "@/hooks/use-audio";
import { Button } from "@/components/ui/button";
import { Play, Pause, Bookmark } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, useRef, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { getMediaUrl, cn } from "@/lib/utils";

interface AudioHeaderProps {
  audio: AudioTrack;
}

export function AudioHeader({ audio }: AudioHeaderProps) {
  const t = useTranslations("AudioPage");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { saveAudio, isSaving, currentUserId } = useAudioActions(audio.id);
  const isSaved = audio.savedAudioTracks?.some((saved) => saved.userId === currentUserId) ?? false;

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSliderChange = (value: number[]) => {
    if (audioRef.current && typeof value[0] === "number") {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const audioTitle =
    audio.title || `${t("originalSound")} - ${audio.uploader.name}`;

  return (
    <div className="flex flex-col w-full border-b border-border mb-8 px-4 md:px-0 py-8">
      <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-start">
        {/* Album Art / Uploader Avatar */}
        <div className="relative w-32 h-32 md:w-44 md:h-44 rounded-lg overflow-hidden border border-border shadow-md group">
          <Image
            src={
              audio.thumbnailUrl || audio.uploader?.image
                ? `/${audio.uploader.image}`
                : "/default-avatar.png"
            }
            alt={audioTitle}
            fill
            className="object-cover"
          />
          <div
            className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            onClick={togglePlay}
          >
            {isPlaying ? (
              <Pause className="w-12 h-12 text-white fill-white" />
            ) : (
              <Play className="w-12 h-12 text-white fill-white ml-1" />
            )}
          </div>
        </div>

        {/* Audio Info */}
        <div className="flex flex-col flex-1 text-center md:text-left">
          <h1 className="text-2xl md:text-3xl font-bold">{audioTitle}</h1>
          <Link
            href={`/${audio.uploader.username}`}
            className="hover:underline"
          >
            <p className="text-lg font-medium text-muted-foreground mt-1">
              {audio.uploader.name}
            </p>
          </Link>
          <p className="text-sm text-muted-foreground mt-2">
            {audio.postsCount.toLocaleString()} {t("posts")}
          </p>

          <div className="flex flex-wrap gap-3 mt-6 justify-center md:justify-start">
            <Button
              className="w-full md:w-auto"
              variant={isSaved ? "secondary" : "default"}
              onClick={() => saveAudio(isSaved)}
              disabled={isSaving}
            >
              <Bookmark className={cn("w-4 h-4 mr-2", isSaved && "fill-current")} />
              {isSaved ? t("savedAudio") : t("saveAudio")}
            </Button>
          </div>

          {/* Simple Audio Player */}
          <div className="w-full mt-8 flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0"
              onClick={togglePlay}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 fill-current" />
              ) : (
                <Play className="w-6 h-6 fill-current ml-0.5" />
              )}
            </Button>

            <div className="flex-1 flex gap-1">
              <Slider
                value={[currentTime]}
                max={duration || 100}
                step={0.1}
                onValueChange={handleSliderChange}
                className="w-full"
              />
              <span className="text-xs">{formatTime(currentTime)}</span>
            </div>
          </div>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={getMediaUrl(audio.audioUrl, "post", "video/mp4")}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />
    </div>
  );
}
