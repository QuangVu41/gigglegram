"use client";

import { useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useUserPosts } from "@/hooks/use-user-posts";
import { useUserSavedPosts } from "@/hooks/use-user-saved-posts";
import { useUserTaggedPosts } from "@/hooks/use-user-tagged-posts";
import {
  Field,
  FieldLabel,
  FieldContent,
  FieldError,
} from "@/components/ui/field";
import {
  Grid3X3,
  Loader2,
  Clapperboard,
  Copy,
  Bookmark,
  Eye,
  Plus,
  ChevronLeft,
  MoreVertical,
  Trash2,
  Edit3,
  Check,
  UserSquare2,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getMediaUrl } from "@/lib/utils";
import { PostGridSkeleton } from "./profile-skeleton";
import { SensitiveContentOverlay } from "@/components/common/sensitive-content-overlay";
import { toast } from "sonner";
import {
  useUserSavedCollections,
  useUserSavedCollection,
  useCreateCollection,
  useUpdateCollection,
  useDeleteCollection,
  useAddPostsToCollection,
  useDeletePostsFromCollection,
} from "@/hooks/use-user-saved-collections";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function SafeImage({ src, alt, ...props }: any) {
  const [error, setError] = useState(false);
  return (
    <Image
      {...props}
      src={error ? "/placeholder-image.png" : src}
      alt={alt}
      onError={() => setError(true)}
    />
  );
}

interface ProfilePostGridProps {
  userId: string;
  isOwnProfile?: boolean;
}

export function ProfilePostGrid({
  userId,
  isOwnProfile = false,
}: ProfilePostGridProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tabParam = searchParams.get("tab") || "posts";

  const [activeTab, setActiveTab] = useState(tabParam);
  const [selectedCollectionId, setSelectedCollectionId] = useState<
    string | null
  >(null);

  // Modals / State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPostIdsForNew, setSelectedPostIdsForNew] = useState<string[]>(
    [],
  );

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState("");

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [isAddPostsOpen, setIsAddPostsOpen] = useState(false);
  const [selectedPostIdsToAdd, setSelectedPostIdsToAdd] = useState<string[]>(
    [],
  );

  // Selection mode for removing posts from collection
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedPostIdsToRemove, setSelectedPostIdsToRemove] = useState<
    string[]
  >([]);

  useEffect(() => {
    setActiveTab(tabParam);
    // Reset collection view if tab changes
    if (tabParam !== "saved") {
      setSelectedCollectionId(null);
      setIsSelectMode(false);
      setSelectedPostIdsToRemove([]);
    }
  }, [tabParam]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Queries
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useUserPosts(userId, {
      enabled: activeTab === "posts",
    });

  const {
    data: savedData,
    fetchNextPage: fetchNextSavedPage,
    hasNextPage: hasNextSavedPage,
    isFetchingNextPage: isFetchingNextSavedPage,
    isLoading: isSavedLoading,
  } = useUserSavedPosts({
    enabled: activeTab === "saved", // Fetch saved posts for collection actions / "All Posts" view
  });

  const {
    data: collectionsData,
    fetchNextPage: fetchNextCollectionsPage,
    hasNextPage: hasNextCollectionsPage,
    isFetchingNextPage: isFetchingNextCollectionsPage,
    isLoading: isCollectionsLoading,
  } = useUserSavedCollections({
    enabled:
      activeTab === "saved" && selectedCollectionId === null && isOwnProfile,
  });

  const { data: singleCollection, isLoading: isSingleCollectionLoading } =
    useUserSavedCollection(selectedCollectionId as string, {
      enabled:
        activeTab === "saved" &&
        selectedCollectionId !== null &&
        selectedCollectionId !== "all" &&
        isOwnProfile,
    });

  const {
    data: taggedData,
    fetchNextPage: fetchNextTaggedPage,
    hasNextPage: hasNextTaggedPage,
    isFetchingNextPage: isFetchingNextTaggedPage,
    isLoading: isTaggedLoading,
  } = useUserTaggedPosts(userId, {
    enabled: activeTab === "tagged",
  });

  // Mutations
  const createCollectionMutation = useCreateCollection();
  const updateCollectionMutation = useUpdateCollection();
  const deleteCollectionMutation = useDeleteCollection();
  const addPostsMutation = useAddPostsToCollection();
  const removePostsMutation = useDeletePostsFromCollection();

  const t = useTranslations("ProfilePage");
  const format = useFormatter();

  const createCollectionSchema = z.object({
    name: z.string().min(1, t("savedCollections.nameRequired")).trim(),
  });

  type CreateCollectionValues = z.infer<typeof createCollectionSchema>;

  const form = useForm<CreateCollectionValues>({
    resolver: zodResolver(createCollectionSchema),
    defaultValues: {
      name: "",
    },
  });

  useEffect(() => {
    if (!isCreateOpen) {
      form.reset({ name: "" });
      setSelectedPostIdsForNew([]);
    }
  }, [isCreateOpen, form]);

  const { ref, inView } = useInView();
  const { ref: savedRef, inView: savedInView } = useInView();
  const { ref: collectionsRef, inView: collectionsInView } = useInView();
  const { ref: taggedRef, inView: taggedInView } = useInView();

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    if (savedInView && hasNextSavedPage && !isFetchingNextSavedPage) {
      fetchNextSavedPage();
    }
  }, [
    savedInView,
    hasNextSavedPage,
    isFetchingNextSavedPage,
    fetchNextSavedPage,
  ]);

  useEffect(() => {
    if (
      collectionsInView &&
      hasNextCollectionsPage &&
      !isFetchingNextCollectionsPage
    ) {
      fetchNextCollectionsPage();
    }
  }, [
    collectionsInView,
    hasNextCollectionsPage,
    isFetchingNextCollectionsPage,
    fetchNextCollectionsPage,
  ]);

  useEffect(() => {
    if (taggedInView && hasNextTaggedPage && !isFetchingNextTaggedPage) {
      fetchNextTaggedPage();
    }
  }, [
    taggedInView,
    hasNextTaggedPage,
    isFetchingNextTaggedPage,
    fetchNextTaggedPage,
  ]);

  const posts = data?.pages.flatMap((page) => page.data) || [];
  const savedPosts = savedData?.pages.flatMap((page) => page.data) || [];
  const collections = collectionsData?.pages.flatMap((page) => page.data) || [];
  const taggedPosts = taggedData?.pages.flatMap((page) => page.data) || [];

  const collectionPosts =
    singleCollection?.savedPosts?.map((sp) => sp.post) || [];

  // Create handler
  const handleCreateCollection = (values: CreateCollectionValues) => {
    createCollectionMutation.mutate(
      {
        name: values.name.trim(),
        savedPostIds: selectedPostIdsForNew,
      },
      {
        onSuccess: () => {
          toast.success(t("savedCollections.createdSuccess"));
          setIsCreateOpen(false);
          setSelectedPostIdsForNew([]);
        },
        onError: () => {
          toast.error(t("savedCollections.cancel"));
        },
      },
    );
  };

  // Update handler
  const handleUpdateCollection = () => {
    if (!editName.trim()) return;
    updateCollectionMutation.mutate(
      {
        collectionId: selectedCollectionId!,
        name: editName.trim(),
      },
      {
        onSuccess: () => {
          toast.success(t("savedCollections.updatedSuccess"));
          setIsEditOpen(false);
        },
      },
    );
  };

  // Delete handler
  const handleDeleteCollection = () => {
    deleteCollectionMutation.mutate(selectedCollectionId!, {
      onSuccess: () => {
        toast.success(t("savedCollections.deletedSuccess"));
        setIsDeleteOpen(false);
        setSelectedCollectionId(null);
      },
    });
  };

  // Add posts handler
  const handleAddPosts = () => {
    if (selectedPostIdsToAdd.length === 0) return;
    addPostsMutation.mutate(
      {
        collectionId: selectedCollectionId!,
        postIds: selectedPostIdsToAdd,
      },
      {
        onSuccess: () => {
          toast.success(t("savedCollections.addedSuccess"));
          setIsAddPostsOpen(false);
          setSelectedPostIdsToAdd([]);
        },
      },
    );
  };

  // Remove posts handler
  const handleRemovePosts = () => {
    if (selectedPostIdsToRemove.length === 0) return;
    removePostsMutation.mutate(
      {
        collectionId: selectedCollectionId!,
        postIds: selectedPostIdsToRemove,
      },
      {
        onSuccess: () => {
          toast.success(t("savedCollections.removedSuccess"));
          setIsSelectMode(false);
          setSelectedPostIdsToRemove([]);
        },
      },
    );
  };

  const toggleSelectPostForNew = (id: string) => {
    setSelectedPostIdsForNew((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleSelectPostToAdd = (id: string) => {
    setSelectedPostIdsToAdd((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const toggleSelectPostToRemove = (id: string) => {
    setSelectedPostIdsToRemove((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  return (
    <Tabs
      defaultValue="posts"
      value={activeTab}
      onValueChange={handleTabChange}
      className="w-full gap-0"
    >
      <TabsList className="flex justify-center gap-16 md:gap-24 w-full h-auto bg-transparent border-b border-border p-0 rounded-none">
        <TabsTrigger
          value="posts"
          className="flex items-center justify-center py-4 px-2 border-0 data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:border-b-4 text-muted-foreground data-[state=active]:bg-transparent! rounded-none transition-none -mt-px shadow-none!"
        >
          <Grid3X3 className="w-6! h-6!" />
        </TabsTrigger>
        {isOwnProfile && (
          <TabsTrigger
            value="saved"
            className="flex items-center justify-center py-4 px-2 border-0 data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:border-b-4 text-muted-foreground data-[state=active]:bg-transparent! rounded-none transition-none -mt-px shadow-none!"
          >
            <Bookmark className="w-6! h-6!" />
          </TabsTrigger>
        )}
        <TabsTrigger
          value="tagged"
          className="flex items-center justify-center py-4 px-2 border-0 data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:border-b-4 text-muted-foreground data-[state=active]:bg-transparent! rounded-none transition-none -mt-px shadow-none!"
        >
          <UserSquare2 className="w-6! h-6!" />
        </TabsTrigger>
      </TabsList>

      {/* Posts Tab */}
      <TabsContent value="posts" className="mt-0">
        {isLoading ? (
          <PostGridSkeleton />
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 gap-4 text-center">
            <div className="p-4 border-2 border-foreground rounded-full">
              <Grid3X3 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold">{t("noPostsYet")}</h3>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5 md:gap-1">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/p/${post.id}`}
                scroll={false}
                className="relative aspect-3/4 group overflow-hidden bg-muted"
              >
                <SafeImage
                  src={getMediaUrl(
                    post.postMedia[0]?.mediaType?.startsWith("video/")
                      ? post.postMedia[0]?.thumbnailUrl
                      : post.postMedia[0]?.mediaUrl,
                    "post",
                    post.postMedia[0]?.mediaType,
                  )}
                  alt={post.caption || ""}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                  sizes="(max-width: 768px) 33vw, 33vw"
                />
                {post.postMedia.some(
                  (m: any) => m.moderationStatus === "flagged",
                ) && <SensitiveContentOverlay size="sm" />}
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white font-semibold"></div>
                <div className="absolute top-2 right-2 text-white drop-shadow-md z-10 pointer-events-none">
                  {post.isReel ? (
                    <Clapperboard className="w-5 h-5" />
                  ) : post.postMedia.length > 1 ? (
                    <Copy className="w-4 h-4 fill-white/20" />
                  ) : null}
                </div>
                {post.isReel && (
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs font-bold drop-shadow-md z-10 pointer-events-none">
                    <Eye className="w-4 h-4" />
                    <span>
                      {format.number(post.viewsCount || 0, {
                        notation: "compact",
                      })}
                    </span>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}

        {isFetchingNextPage && (
          <div ref={ref} className="h-20 flex justify-center items-center">
            <Loader2 className="w-6! h-6! animate-spin text-muted-foreground" />
          </div>
        )}
      </TabsContent>

      {/* Saved Tab */}
      {isOwnProfile && (
        <TabsContent value="saved" className="mt-0">
          {/* Case 1: Grid of collections */}
          {selectedCollectionId === null ? (
            isCollectionsLoading ? (
              <PostGridSkeleton />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 md:gap-6 p-4">
                {/* Create New Collection Button */}
                <div
                  className="flex flex-col gap-1.5 cursor-pointer group"
                  onClick={() => setIsCreateOpen(true)}
                >
                  <div className="relative aspect-3/4 w-full overflow-hidden rounded-md border border-dashed border-muted-foreground/30 hover:border-foreground/45 bg-muted/10 hover:bg-muted/20 transition-all flex flex-col items-center justify-center gap-2 shadow-sm">
                    <Plus className="h-8 w-8 text-muted-foreground/70" />
                  </div>
                  <div className="flex flex-col px-1">
                    <span className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                      {t("savedCollections.newCollection")}
                    </span>
                    <span className="text-xs text-muted-foreground/50">
                      &nbsp;
                    </span>
                  </div>
                </div>

                {/* All Saved Posts Card */}
                <div
                  className="flex flex-col gap-1.5 cursor-pointer group"
                  onClick={() => setSelectedCollectionId("all")}
                >
                  <div className="relative aspect-3/4 w-full overflow-hidden rounded-md border border-border bg-muted shadow-sm transition-shadow group-hover:shadow-md">
                    {savedPosts[0] ? (
                      <Image
                        src={getMediaUrl(
                          savedPosts[0].postMedia[0]?.mediaType?.startsWith(
                            "video/",
                          )
                            ? savedPosts[0].postMedia[0]?.thumbnailUrl
                            : savedPosts[0].postMedia[0]?.mediaUrl,
                          "post",
                          savedPosts[0].postMedia[0]?.mediaType,
                        )}
                        alt="All Saved Posts"
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        sizes="(max-width: 768px) 33vw, 33vw"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-muted/40">
                        <Bookmark className="h-10 w-10 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col px-1">
                    <span className="text-sm font-semibold truncate text-foreground group-hover:text-primary transition-colors">
                      {t("savedCollections.allSaved")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t("savedCollections.postsCount", {
                        count: savedPosts.length,
                      })}
                    </span>
                  </div>
                </div>

                {/* Other collections list */}
                {collections.map((col) => {
                  const firstPost = col.savedPosts?.[0]?.post;
                  return (
                    <div
                      key={col.id}
                      className="flex flex-col gap-1.5 cursor-pointer group"
                      onClick={() => setSelectedCollectionId(col.id)}
                    >
                      <div className="relative aspect-3/4 w-full overflow-hidden rounded-md border border-border bg-muted shadow-sm transition-shadow group-hover:shadow-md">
                        {firstPost ? (
                          <Image
                            src={getMediaUrl(
                              firstPost.postMedia[0]?.mediaType?.startsWith(
                                "video/",
                              )
                                ? firstPost.postMedia[0]?.thumbnailUrl
                                : firstPost.postMedia[0]?.mediaUrl,
                              "post",
                              firstPost.postMedia[0]?.mediaType,
                            )}
                            alt={col.name}
                            fill
                            className="object-cover transition-transform group-hover:scale-105"
                            sizes="(max-width: 768px) 33vw, 33vw"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-muted/40">
                            <Bookmark className="h-10 w-10 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col px-1">
                        <span className="text-sm font-semibold truncate text-foreground group-hover:text-primary transition-colors">
                          {col.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {t("savedCollections.postsCount", {
                            count: col.postsCount,
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : selectedCollectionId === "all" ? (
            /* Case 2: Drill down into "All Saved Posts" */
            <div className="flex flex-col w-full">
              <div className="flex items-center gap-2 py-4 px-4 border-b border-border bg-background">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedCollectionId(null)}
                  className="h-8 w-8 text-muted-foreground"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="flex flex-col">
                  <h2 className="text-sm font-bold text-foreground">
                    {t("savedCollections.allSaved")}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {t("savedCollections.postsCount", {
                      count: savedPosts.length,
                    })}
                  </span>
                </div>
              </div>

              {isSavedLoading ? (
                <PostGridSkeleton />
              ) : savedPosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 gap-4 text-center">
                  <div className="p-4 border-2 border-foreground rounded-full">
                    <Bookmark className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-bold">{t("noSavedPosts")}</h3>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-0.5 md:gap-1 mt-0.5">
                  {savedPosts.map((post) => (
                    <Link
                      key={post.id}
                      href={`/p/${post.id}`}
                      scroll={false}
                      className="relative aspect-3/4 group overflow-hidden bg-muted"
                    >
                      <SafeImage
                        src={getMediaUrl(
                          post.postMedia[0]?.mediaType?.startsWith("video/")
                            ? post.postMedia[0]?.thumbnailUrl
                            : post.postMedia[0]?.mediaUrl,
                          "post",
                          post.postMedia[0]?.mediaType,
                        )}
                        alt={post.caption || ""}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        sizes="(max-width: 768px) 33vw, 33vw"
                      />
                      {post.postMedia.some(
                        (m: any) => m.moderationStatus === "flagged",
                      ) && <SensitiveContentOverlay size="sm" />}
                      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white font-semibold"></div>
                      <div className="absolute top-2 right-2 text-white drop-shadow-md z-10 pointer-events-none">
                        {post.isReel ? (
                          <Clapperboard className="w-5 h-5" />
                        ) : post.postMedia.length > 1 ? (
                          <Copy className="w-4 h-4 fill-white/20" />
                        ) : null}
                      </div>
                      {post.isReel && (
                        <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs font-bold drop-shadow-md z-10 pointer-events-none">
                          <Eye className="w-4 h-4" />
                          <span>
                            {format.number(post.viewsCount || 0, {
                              notation: "compact",
                            })}
                          </span>
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              )}

              {isFetchingNextSavedPage && (
                <div
                  ref={savedRef}
                  className="h-20 flex justify-center items-center"
                >
                  <Loader2 className="w-6! h-6! animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          ) : (
            /* Case 3: Drill down into a specific custom collection */
            <div className="flex flex-col w-full">
              <div className="flex items-center justify-between py-4 px-4 border-b border-border bg-background">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedCollectionId(null);
                      setIsSelectMode(false);
                      setSelectedPostIdsToRemove([]);
                    }}
                    className="h-8 w-8 text-muted-foreground"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <div className="flex flex-col">
                    <h2 className="text-sm font-bold text-foreground">
                      {singleCollection?.name}
                    </h2>
                    <span className="text-xs text-muted-foreground">
                      {isSelectMode
                        ? t("savedCollections.itemsSelected", {
                            count: selectedPostIdsToRemove.length,
                          })
                        : t("savedCollections.postsCount", {
                            count: singleCollection?.postsCount || 0,
                          })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isSelectMode && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsSelectMode(false);
                          setSelectedPostIdsToRemove([]);
                        }}
                        className="font-medium h-8 text-xs"
                      >
                        {t("savedCollections.cancel")}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={selectedPostIdsToRemove.length === 0}
                        onClick={handleRemovePosts}
                        className="font-medium h-8 text-xs"
                      >
                        {t("savedCollections.deleteBtn")}
                      </Button>
                    </div>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditName(singleCollection?.name || "");
                          setIsEditOpen(true);
                        }}
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        {t("savedCollections.editName")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setIsAddPostsOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        {t("savedCollections.addPosts")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setIsSelectMode(true);
                          setSelectedPostIdsToRemove([]);
                        }}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        {t("savedCollections.selectPosts")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setIsDeleteOpen(true)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t("savedCollections.deleteCollection")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {isSingleCollectionLoading ? (
                <PostGridSkeleton />
              ) : collectionPosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 gap-4 text-center">
                  <div className="p-4 border-2 border-foreground rounded-full">
                    <Bookmark className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-bold">
                    {t("savedCollections.noSavedPostsInCollection")}
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddPostsOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t("savedCollections.addPosts")}
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-0.5 md:gap-1 mt-0.5">
                  {collectionPosts.map((post) => (
                    <div
                      key={post.id}
                      className="relative aspect-3/4 group bg-muted"
                    >
                      {isSelectMode ? (
                        <div
                          className="absolute inset-0 z-20 cursor-pointer"
                          onClick={() => toggleSelectPostToRemove(post.id)}
                        >
                          <div className="absolute top-2 right-2 z-30">
                            <Checkbox
                              checked={selectedPostIdsToRemove.includes(
                                post.id,
                              )}
                              onCheckedChange={() =>
                                toggleSelectPostToRemove(post.id)
                              }
                              className="h-5 w-5 bg-white border-2 border-primary/50 data-[state=checked]:bg-primary"
                            />
                          </div>
                          <div
                            className={`absolute inset-0 bg-black/40 transition-opacity ${selectedPostIdsToRemove.includes(post.id) ? "opacity-100" : "opacity-0"}`}
                          />
                        </div>
                      ) : (
                        <Link
                          href={`/p/${post.id}`}
                          scroll={false}
                          className="absolute inset-0 z-10"
                        >
                          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white font-semibold"></div>
                        </Link>
                      )}

                      <SafeImage
                        src={getMediaUrl(
                          post.postMedia[0]?.mediaType?.startsWith("video/")
                            ? post.postMedia[0]?.thumbnailUrl
                            : post.postMedia[0]?.mediaUrl,
                          "post",
                          post.postMedia[0]?.mediaType,
                        )}
                        alt={post.caption || ""}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 33vw, 33vw"
                      />
                      {post.postMedia.some(
                        (m: any) => m.moderationStatus === "flagged",
                      ) && <SensitiveContentOverlay size="sm" />}

                      <div className="absolute top-2 right-2 text-white drop-shadow-md z-10 pointer-events-none">
                        {post.isReel ? (
                          <Clapperboard className="w-5 h-5" />
                        ) : post.postMedia.length > 1 ? (
                          <Copy className="w-4 h-4 fill-white/20" />
                        ) : null}
                      </div>
                      {post.isReel && (
                        <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs font-bold drop-shadow-md z-10 pointer-events-none">
                          <Eye className="w-4 h-4" />
                          <span>
                            {format.number(post.viewsCount || 0, {
                              notation: "compact",
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Dialog: Create Collection */}
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-6">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">
                  {t("savedCollections.newCollection")}
                </DialogTitle>
              </DialogHeader>

              <form
                onSubmit={form.handleSubmit(handleCreateCollection)}
                className="flex flex-col flex-1 overflow-hidden"
              >
                <div className="flex flex-col gap-4 py-2 flex-1 overflow-y-auto min-h-[200px] px-1 mb-4">
                  <Controller
                    name="name"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="new-collection-name">
                          {t("savedCollections.collectionName")}
                        </FieldLabel>
                        <FieldContent>
                          <Input
                            id="new-collection-name"
                            placeholder={t(
                              "savedCollections.collectionNamePlaceholder",
                            )}
                            {...field}
                          />
                        </FieldContent>
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />

                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold">
                      {t("savedCollections.addItems")}
                    </label>
                    {savedPosts.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">
                        {t("noSavedPosts")}
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 gap-1">
                        {savedPosts.map((post) => (
                          <div
                            key={post.id}
                            className="relative aspect-3/4 bg-muted cursor-pointer rounded-sm overflow-hidden"
                            onClick={() => toggleSelectPostForNew(post.id)}
                          >
                            <SafeImage
                              src={getMediaUrl(
                                post.postMedia[0]?.mediaType?.startsWith(
                                  "video/",
                                )
                                  ? post.postMedia[0]?.thumbnailUrl
                                  : post.postMedia[0]?.mediaUrl,
                                "post",
                                post.postMedia[0]?.mediaType,
                              )}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="100px"
                            />
                            <div
                              className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity ${selectedPostIdsForNew.includes(post.id) ? "opacity-100" : "opacity-0"}`}
                            >
                              <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-white border-2 border-white shadow-md">
                                <Check className="h-4 w-4" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <DialogFooter className="flex-row justify-end gap-2 pt-4 border-t border-border mt-auto shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateOpen(false)}
                  >
                    {t("savedCollections.cancel")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={createCollectionMutation.isPending}
                  >
                    {t("savedCollections.create")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Dialog: Edit Collection Name */}
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>{t("savedCollections.editName")}</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder={t("savedCollections.collectionNamePlaceholder")}
                  className="focus-visible:ring-primary"
                />
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                  {t("savedCollections.cancel")}
                </Button>
                <Button
                  onClick={handleUpdateCollection}
                  disabled={!editName.trim()}
                >
                  {t("savedCollections.save")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Dialog: Delete Collection Confirmation */}
          <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>{t("savedCollections.deleteConfirm")}</DialogTitle>
                <DialogDescription className="pt-2">
                  {t("savedCollections.deleteWarning")}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-row justify-stretch gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteOpen(false)}
                  className="flex-1"
                >
                  {t("savedCollections.cancel")}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteCollection}
                  className="flex-1"
                >
                  {t("savedCollections.deleteBtn")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Dialog: Add Posts to Collection */}
          <Dialog open={isAddPostsOpen} onOpenChange={setIsAddPostsOpen}>
            <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-6">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">
                  {t("savedCollections.addPosts")}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  {t("savedCollections.addItems")}
                </DialogDescription>
              </DialogHeader>

              <div className="py-2 flex-1 overflow-y-auto min-h-[200px] pr-1">
                {savedPosts.filter(
                  (sp) => !collectionPosts.some((cp) => cp.id === sp.id),
                ).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-10">
                    {t("noSavedPosts")}
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-1">
                    {savedPosts
                      .filter(
                        (sp) => !collectionPosts.some((cp) => cp.id === sp.id),
                      )
                      .map((post) => (
                        <div
                          key={post.id}
                          className="relative aspect-3/4 bg-muted cursor-pointer rounded-sm overflow-hidden"
                          onClick={() => toggleSelectPostToAdd(post.id)}
                        >
                          <SafeImage
                            src={getMediaUrl(
                              post.postMedia[0]?.mediaType?.startsWith("video/")
                                ? post.postMedia[0]?.thumbnailUrl
                                : post.postMedia[0]?.mediaUrl,
                              "post",
                              post.postMedia[0]?.mediaType,
                            )}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="100px"
                          />
                          <div
                            className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity ${selectedPostIdsToAdd.includes(post.id) ? "opacity-100" : "opacity-0"}`}
                          >
                            <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-white border-2 border-white shadow-md">
                              <Check className="h-4 w-4" />
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <DialogFooter className="flex-row justify-end gap-2 pt-4 border-t border-border mt-auto">
                <Button
                  variant="outline"
                  onClick={() => setIsAddPostsOpen(false)}
                >
                  {t("savedCollections.cancel")}
                </Button>
                <Button
                  onClick={handleAddPosts}
                  disabled={selectedPostIdsToAdd.length === 0}
                >
                  {t("savedCollections.save")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {isFetchingNextCollectionsPage && (
            <div
              ref={collectionsRef}
              className="h-20 flex justify-center items-center"
            >
              <Loader2 className="w-6! h-6! animate-spin text-muted-foreground" />
            </div>
          )}
        </TabsContent>
      )}

      {/* Tagged Tab */}
      <TabsContent value="tagged" className="mt-0">
        {isTaggedLoading ? (
          <PostGridSkeleton />
        ) : taggedPosts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 gap-4 text-center">
            <div className="p-4 border-2 border-foreground rounded-full">
              <UserSquare2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold">{t("noTaggedPosts")}</h3>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5 md:gap-1">
            {taggedPosts.map((post) => (
              <Link
                key={post.id}
                href={`/p/${post.id}`}
                scroll={false}
                className="relative aspect-3/4 group overflow-hidden bg-muted"
              >
                <SafeImage
                  src={getMediaUrl(
                    post.postMedia[0]?.mediaType?.startsWith("video/")
                      ? post.postMedia[0]?.thumbnailUrl
                      : post.postMedia[0]?.mediaUrl,
                    "post",
                    post.postMedia[0]?.mediaType,
                  )}
                  alt={post.caption || ""}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                  sizes="(max-width: 768px) 33vw, 33vw"
                />
                {post.postMedia.some(
                  (m: any) => m.moderationStatus === "flagged",
                ) && <SensitiveContentOverlay size="sm" />}
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white font-semibold"></div>
                <div className="absolute top-2 right-2 text-white drop-shadow-md z-10 pointer-events-none">
                  {post.isReel ? (
                    <Clapperboard className="w-5 h-5" />
                  ) : post.postMedia.length > 1 ? (
                    <Copy className="w-4 h-4 fill-white/20" />
                  ) : null}
                </div>
                {post.isReel && (
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-xs font-bold drop-shadow-md z-10 pointer-events-none">
                    <Eye className="w-4 h-4" />
                    <span>
                      {format.number(post.viewsCount || 0, {
                        notation: "compact",
                      })}
                    </span>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}

        {isFetchingNextTaggedPage && (
          <div
            ref={taggedRef}
            className="h-20 flex justify-center items-center"
          >
            <Loader2 className="w-6! h-6! animate-spin text-muted-foreground" />
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
