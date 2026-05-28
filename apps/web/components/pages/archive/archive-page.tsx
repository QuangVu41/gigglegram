"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import {
  ChevronLeft,
  MoreHorizontal,
  Grid3X3,
  History,
  RotateCcw,
  Music,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useUserArchivedPosts,
  useUserArchivedStories,
} from "@/hooks/use-archive";
import { getMediaUrl } from "@/lib/utils";
import { format } from "date-fns";
import { vi, enUS } from "date-fns/locale";
import { useLocale } from "next-intl";
import NextImage from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import Footer from "@/components/common/footer";
import { StoryViewer } from "@/components/pages/home/story-viewer";
import { useDeleteStory } from "@/hooks/use-stories";
import { authClient } from "@/lib/auth/auth-client";
import { UserWithStories } from "@/components/pages/home/stories-header";
import { SavedAudioTab } from "./saved-audio-tab";

export function ArchivePage() {
  const t = useTranslations("ArchivePage");
  const router = useRouter();
  const locale = useLocale();
  const dateLocale = locale === "vi" ? vi : enUS;

  const { data: archivedPosts, isLoading: isLoadingPosts } =
    useUserArchivedPosts();
  const { data: archivedStories, isLoading: isLoadingStories } =
    useUserArchivedStories();
  const { mutate: deleteStory } = useDeleteStory();
  const { data: session } = authClient.useSession();

  const [viewerOpen, setViewerOpen] = useState(false);
  const [initialStoryIndex, setInitialStoryIndex] = useState(0);

  const allStories = archivedStories?.pages.flatMap((page) => page.data) || [];

  const storyViewerUsers: UserWithStories[] = session?.user
    ? [
        {
          ...session.user,
          stories: allStories,
        } as UserWithStories,
      ]
    : [];

  const handleStoryClick = (index: number) => {
    setInitialStoryIndex(index);
    setViewerOpen(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 sticky top-0 bg-background z-50">
        <div className="flex items-center gap-4 max-w-4xl mx-auto w-full">
          <button
            onClick={() => router.back()}
            className="p-1 hover:bg-muted rounded-full transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-bold">{t("title")}</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
        <Tabs defaultValue="stories" className="flex-1 flex flex-col gap-0">
          <TabsList className="flex justify-center gap-16 md:gap-24 w-full h-auto bg-transparent border-b border-border p-0 rounded-none">
            <TabsTrigger
              value="stories"
              className="flex items-center justify-center py-4 px-2 border-0 data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:border-b-4 text-muted-foreground data-[state=active]:bg-transparent! rounded-none transition-none mt-px shadow-none!"
            >
              <History className="w-6! h-6!" />
            </TabsTrigger>
            <TabsTrigger
              value="posts"
              className="flex items-center justify-center py-4 px-2 border-0 data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:border-b-4 text-muted-foreground data-[state=active]:bg-transparent! rounded-none transition-none mt-px shadow-none!"
            >
              <Grid3X3 className="w-6! h-6!" />
            </TabsTrigger>
            <TabsTrigger
              value="audio"
              className="flex items-center justify-center py-4 px-2 border-0 data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:border-b-4 text-muted-foreground data-[state=active]:bg-transparent! rounded-none transition-none mt-px shadow-none!"
            >
              <Music className="w-6! h-6!" />
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="stories"
            className="flex-1 p-0 m-0 focus-visible:outline-none mt-0"
          >
            <div className="p-4 text-center text-[13px] text-muted-foreground bg-muted/20 mb-4">
              {t("storiesArchiveInfo")}
            </div>

            {isLoadingStories ? (
              <div className="grid grid-cols-3 gap-0.5 md:gap-1">
                {[...Array(9)].map((_, i) => (
                  <Skeleton key={i} className="aspect-3/4 rounded-none" />
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-0.5 md:gap-1">
                  {archivedStories?.pages
                    .flatMap((page) => page.data)
                    .map((story, index) => (
                      <div
                        key={story.id}
                        className="relative aspect-3/4 bg-muted group cursor-pointer overflow-hidden"
                        onClick={() => handleStoryClick(index)}
                      >
                        <NextImage
                          src={getMediaUrl(
                            story.thumbnailUrl,
                            "story",
                            story.mediaType,
                          )}
                          alt="Archived story"
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          sizes="(max-width: 768px) 33vw, 300px"
                        />
                        <div className="absolute top-2 left-2 bg-background/90 dark:bg-background/80 px-2 py-1 rounded shadow-sm border border-border/50 min-w-[36px]">
                          <div className="flex flex-col items-center leading-none gap-0.5">
                            <span className="text-[11px] font-bold text-foreground">
                              {format(new Date(story.createdAt), "d", {
                                locale: dateLocale,
                              })}
                            </span>
                            <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider">
                              {format(new Date(story.createdAt), "MMM", {
                                locale: dateLocale,
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
                {archivedStories?.pages?.[0]?.data.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
                    <div className="w-16 h-16 rounded-full border-2 border-muted-foreground/20 flex items-center justify-center mb-4">
                      <History className="w-8 h-8 opacity-20" />
                    </div>
                    <p className="text-sm font-medium">{t("noStories")}</p>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent
            value="posts"
            className="flex-1 p-0 m-0 focus-visible:outline-none mt-0"
          >
            {isLoadingPosts ? (
              <div className="grid grid-cols-3 gap-0.5 md:gap-1">
                {[...Array(9)].map((_, i) => (
                  <Skeleton key={i} className="aspect-3/4 rounded-none" />
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-0.5 md:gap-1">
                  {archivedPosts?.pages
                    .flatMap((page) => page.data)
                    .map((post) => (
                      <Link
                        key={post.id}
                        href={`/p/${post.id}`}
                        scroll={false}
                        className="relative aspect-3/4 bg-muted group cursor-pointer overflow-hidden"
                      >
                        <NextImage
                          src={getMediaUrl(
                            post.postMedia[0]?.thumbnailUrl ||
                              post.postMedia[0]?.mediaUrl,
                            "post",
                            post.postMedia[0]?.mediaType,
                          )}
                          alt="Archived post"
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          sizes="(max-width: 768px) 33vw, 300px"
                        />
                      </Link>
                    ))}
                </div>
                {archivedPosts?.pages?.[0]?.data.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
                    <div className="w-16 h-16 rounded-full border-2 border-muted-foreground/20 flex items-center justify-center mb-4">
                      <Grid3X3 className="w-8 h-8 opacity-20" />
                    </div>
                    <p className="text-sm font-medium">{t("noPosts")}</p>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent
            value="audio"
            className="flex-1 p-0 m-0 focus-visible:outline-none mt-0"
          >
            <SavedAudioTab />
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <div className="hidden md:block py-12 px-4 mt-auto">
        <Footer />
      </div>

      {viewerOpen && storyViewerUsers.length > 0 && (
        <StoryViewer
          users={storyViewerUsers}
          initialUserIndex={0}
          initialStoryIndex={initialStoryIndex}
          onClose={() => setViewerOpen(false)}
          onDeleteStory={(_, storyId) => {
            deleteStory(storyId);
            setViewerOpen(false);
          }}
          deleteLabel={t("deleteStoryConfirmTitle")}
          deleteDescription={t("deleteStoryConfirmDescription")}
        />
      )}
    </div>
  );
}
