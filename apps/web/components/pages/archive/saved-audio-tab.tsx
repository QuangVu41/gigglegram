"use client";

import { useUserSavedAudio } from "@/hooks/use-archive";
import { useAudioActions } from "@/hooks/use-audio";
import { Button } from "@/components/ui/button";
import { Play, Pause, Bookmark, Music, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, useRef, useEffect } from "react";
import { getMediaUrl, cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface SavedAudioRowProps {
  audio: any;
  currentlyPlayingId: string | null;
  onPlayToggle: (id: string, url: string) => void;
}

function SavedAudioRow({ audio, currentlyPlayingId, onPlayToggle }: SavedAudioRowProps) {
  const t = useTranslations("ArchivePage");
  const isPlaying = currentlyPlayingId === audio.id;
  const { saveAudio, isSaving, currentUserId } = useAudioActions(audio.id);

  // By default, since it is in the saved tab, if not loaded or missing saved relation, treat as saved
  const isSaved = audio.savedAudioTracks?.some((saved: any) => saved.userId === currentUserId) ?? true;

  const audioTitle = audio.title || `Original Sound - ${audio.uploader?.name || "Unknown"}`;

  return (
    <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors border-b border-border/40">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Album Art / Preview Play Overlay */}
        <div className="relative w-14 h-14 rounded-md overflow-hidden shrink-0 border border-border/80 group">
          <Image
            src={audio.thumbnailUrl || audio.uploader?.image ? `/${audio.uploader.image}` : "/default-avatar.png"}
            alt={audioTitle}
            fill
            className="object-cover"
          />
          <div
            className={cn(
              "absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity cursor-pointer",
              isPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100",
            )}
            onClick={() => onPlayToggle(audio.id, getMediaUrl(audio.audioUrl, "post", "video/mp4"))}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 text-white fill-white" />
            ) : (
              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
            )}
          </div>
        </div>

        {/* Title & Info */}
        <div className="flex-1 min-w-0">
          <Link href={`/explore/audio/${audio.id}`} className="hover:underline block font-medium text-sm truncate">
            {audioTitle}
          </Link>
          <Link
            href={`/${audio.uploader?.username}`}
            className="hover:underline block text-xs text-muted-foreground truncate mt-0.5"
          >
            {audio.uploader?.name}
          </Link>
          <span className="inline-block text-[11px] text-muted-foreground mt-1 bg-muted px-2 py-0.5 rounded-full">
            {audio.postsCount?.toLocaleString() || 0} {t("posts") || "posts"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-muted/80"
          onClick={() => onPlayToggle(audio.id, getMediaUrl(audio.audioUrl, "post", "video/mp4"))}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-foreground" />
          ) : (
            <Play className="w-4 h-4 fill-foreground ml-0.5" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-muted/80 text-foreground"
          onClick={() => saveAudio(isSaved)}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : (
            <Bookmark className={cn("w-4 h-4", isSaved && "fill-foreground")} />
          )}
        </Button>
      </div>
    </div>
  );
}

export function SavedAudioTab() {
  const t = useTranslations("ArchivePage");
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useUserSavedAudio();

  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlayToggle = (id: string, url: string) => {
    if (currentlyPlayingId === id) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setCurrentlyPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setCurrentlyPlayingId(id);

      const audioObj = new Audio(url);
      audioRef.current = audioObj;
      audioObj.play().catch((err) => {
        console.error("Audio playback error:", err);
        setCurrentlyPlayingId(null);
      });
      audioObj.onended = () => {
        setCurrentlyPlayingId(null);
      };
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col divide-y divide-border/40">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <Skeleton className="w-14 h-14 rounded-md" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="w-8 h-8 rounded-full" />
              <Skeleton className="w-8 h-8 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const allAudios = data?.pages.flatMap((page) => page.data) || [];

  if (allAudios.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
        <div className="w-16 h-16 rounded-full border-2 border-muted-foreground/20 flex items-center justify-center mb-4">
          <Music className="w-8 h-8 opacity-20" />
        </div>
        <p className="text-sm font-medium">{t("noAudio")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-col divide-y divide-border/40">
        {allAudios.map((audio) => (
          <SavedAudioRow
            key={audio.id}
            audio={audio}
            currentlyPlayingId={currentlyPlayingId}
            onPlayToggle={handlePlayToggle}
          />
        ))}
      </div>

      {hasNextPage && (
        <div className="flex justify-center p-4">
          <Button variant="outline" size="sm" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}
