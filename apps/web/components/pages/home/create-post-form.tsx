"use client";

import { createPortal } from "react-dom";
import { createPostSchema, CreatePostSchemaType } from "@/schemas/posts";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { useCreatePostStore } from "@/components/pages/home/create-post-provider";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import TextareaMention, { TextareaMentionRef } from "@/components/common/textarea-mention";
import {
  MapPin,
  SettingsIcon,
  Sparkles,
  UserRoundPlus,
  UserRoundSearch,
  Music,
  Play,
  Pause,
  Check,
  Bookmark,
  Loader2,
  Search,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useAudio, useAudioList, AudioTrack } from "@/hooks/use-audio";
import { useUserSavedAudio } from "@/hooks/use-archive";
import Image from "next/image";
import { cn, getMediaUrl } from "@/lib/utils";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { useDebouncedCallback } from "use-debounce";
import { Combobox as ComboboxBaseUi } from "@base-ui/react";
import { Spinner } from "@/components/ui/spinner";
import React, { useEffect, useRef, useState } from "react";
import UserSearchItem from "@/components/common/user-search-item";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { axiosGateway, OkResponse } from "@/lib/axios-config";
import { posts } from "@repo/database";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, usePathname } from "next/navigation";
import { authClient } from "@/lib/auth/auth-client";
import { DialogClose } from "@/components/ui/dialog";

interface AudioTabContentProps {
  type: "all" | "trending" | "original";
  search: string;
  selectedId: string | null;
  onSelect: (audio: any) => void;
  currentlyPlayingId: string | null;
  onPlayToggle: (id: string, url: string) => void;
}

function AudioTabContent({
  type,
  search,
  selectedId,
  onSelect,
  currentlyPlayingId,
  onPlayToggle,
}: AudioTabContentProps) {
  const t = useTranslations("CreatePostStepper");
  const params: any = { limit: 10, keyword: search || undefined };
  if (type === "trending") params.isTrending = true;
  if (type === "original") params.isOriginal = true;

  const { data, isLoading } = useAudioList(params);

  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <Skeleton className="w-12 h-12 rounded-md" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const list = data?.data || [];

  if (list.length === 0) {
    return <div className="text-center py-6 text-sm text-muted-foreground">{t("form.noAudioFound")}</div>;
  }

  const getAudioThumbnail = (audio: any) => {
    if (audio.thumbnailUrl) return audio.thumbnailUrl;
    if (audio.uploader?.image) {
      if (audio.uploader.image.startsWith("http") || audio.uploader.image.startsWith("/")) {
        return audio.uploader.image;
      }
      return `/${audio.uploader.image}`;
    }
    return "/default-avatar.png";
  };

  return (
    <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
      {list.map((audio: any) => {
        const isSelected = selectedId === audio.id;
        const isPlaying = currentlyPlayingId === audio.id;
        const title = audio.title || `Original Sound - ${audio.uploader?.name || "Unknown"}`;

        return (
          <div
            key={audio.id}
            onClick={() => onSelect(audio)}
            className={cn(
              "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors",
              isSelected ? "bg-accent/60" : "hover:bg-muted/50",
            )}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="relative w-12 h-12 rounded-md overflow-hidden shrink-0 border border-border/80 group">
                <Image src={getAudioThumbnail(audio)} alt={title} fill className="object-cover" />
                <div
                  className={cn(
                    "absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity cursor-pointer",
                    isPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlayToggle(audio.id, getMediaUrl(audio.audioUrl, "post", "video/mp4"));
                  }}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 text-white fill-white" />
                  ) : (
                    <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                  )}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate">{title}</p>
                <p className="text-xs text-muted-foreground truncate">{audio.uploader?.name}</p>
                <span className="text-xs text-muted-foreground block mt-0.5">{audio.postsCount || 0} posts</span>
              </div>
            </div>
            <div className="flex items-center gap-2 pl-2">
              {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface SavedAudioTabContentProps {
  search: string;
  selectedId: string | null;
  onSelect: (audio: any) => void;
  currentlyPlayingId: string | null;
  onPlayToggle: (id: string, url: string) => void;
}

function SavedAudioTabContent({
  search,
  selectedId,
  onSelect,
  currentlyPlayingId,
  onPlayToggle,
}: SavedAudioTabContentProps) {
  const t = useTranslations("CreatePostStepper");
  const { data, isLoading } = useUserSavedAudio(search || undefined);

  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <Skeleton className="w-12 h-12 rounded-md" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const list = data?.pages.flatMap((page) => page.data) || [];

  if (list.length === 0) {
    return <div className="text-center py-6 text-sm text-muted-foreground">{t("form.noAudioFound")}</div>;
  }

  const getAudioThumbnail = (audio: any) => {
    if (audio.thumbnailUrl) return audio.thumbnailUrl;
    if (audio.uploader?.image) {
      if (audio.uploader.image.startsWith("http") || audio.uploader.image.startsWith("/")) {
        return audio.uploader.image;
      }
      return `/${audio.uploader.image}`;
    }
    return "/default-avatar.png";
  };

  return (
    <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
      {list.map((audio: any) => {
        const isSelected = selectedId === audio.id;
        const isPlaying = currentlyPlayingId === audio.id;
        const title = audio.title || `Original Sound - ${audio.uploader?.name || "Unknown"}`;

        return (
          <div
            key={audio.id}
            onClick={() => onSelect(audio)}
            className={cn(
              "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors",
              isSelected ? "bg-accent/60" : "hover:bg-muted/50",
            )}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="relative w-12 h-12 rounded-md overflow-hidden shrink-0 border border-border/80 group">
                <Image src={getAudioThumbnail(audio)} alt={title} fill className="object-cover" />
                <div
                  className={cn(
                    "absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity cursor-pointer",
                    isPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlayToggle(audio.id, getMediaUrl(audio.audioUrl, "post", "video/mp4"));
                  }}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 text-white fill-white" />
                  ) : (
                    <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                  )}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate">{title}</p>
                <p className="text-xs text-muted-foreground truncate">{audio.uploader?.name}</p>
                <span className="text-xs text-muted-foreground block mt-0.5">{audio.postsCount || 0} posts</span>
              </div>
            </div>
            <div className="flex items-center gap-2 pl-2">
              {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface AudioSelectorProps {
  value: string | null | undefined;
  onChange: (id: string | undefined) => void;
}

function AudioSelector({ value, onChange }: AudioSelectorProps) {
  const t = useTranslations("CreatePostStepper");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchVal, setSearchVal] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  const handleSearch = useDebouncedCallback((val: string) => {
    setDebouncedSearch(val);
  }, 300);

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

  const handleSelect = (audio: any) => {
    if (value === audio.id) {
      onChange(undefined);
    } else {
      onChange(audio.id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <InputGroup className="mt-1">
        <InputGroupAddon>
          <Search className="h-4 w-4 text-muted-foreground" />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          placeholder={t("form.searchAudioPlaceholder")}
          value={searchVal}
          onChange={(e) => {
            setSearchVal(e.target.value);
            handleSearch(e.target.value);
          }}
        />
      </InputGroup>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-9">
          <TabsTrigger value="all" className="text-xs">
            {t("form.audioTabs.all")}
          </TabsTrigger>
          <TabsTrigger value="trending" className="text-xs">
            {t("form.audioTabs.trending")}
          </TabsTrigger>
          <TabsTrigger value="original" className="text-xs">
            {t("form.audioTabs.original")}
          </TabsTrigger>
          <TabsTrigger value="saved" className="text-xs">
            {t("form.audioTabs.saved")}
          </TabsTrigger>
        </TabsList>

        <div className="mt-2">
          <TabsContent value="all" className="mt-0">
            {activeTab === "all" && (
              <AudioTabContent
                type="all"
                search={debouncedSearch}
                selectedId={value ?? null}
                onSelect={handleSelect}
                currentlyPlayingId={currentlyPlayingId}
                onPlayToggle={handlePlayToggle}
              />
            )}
          </TabsContent>
          <TabsContent value="trending" className="mt-0">
            {activeTab === "trending" && (
              <AudioTabContent
                type="trending"
                search={debouncedSearch}
                selectedId={value ?? null}
                onSelect={handleSelect}
                currentlyPlayingId={currentlyPlayingId}
                onPlayToggle={handlePlayToggle}
              />
            )}
          </TabsContent>
          <TabsContent value="original" className="mt-0">
            {activeTab === "original" && (
              <AudioTabContent
                type="original"
                search={debouncedSearch}
                selectedId={value ?? null}
                onSelect={handleSelect}
                currentlyPlayingId={currentlyPlayingId}
                onPlayToggle={handlePlayToggle}
              />
            )}
          </TabsContent>
          <TabsContent value="saved" className="mt-0">
            {activeTab === "saved" && (
              <SavedAudioTabContent
                search={debouncedSearch}
                selectedId={value ?? null}
                onSelect={handleSelect}
                currentlyPlayingId={currentlyPlayingId}
                onPlayToggle={handlePlayToggle}
              />
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

const items = [
  {
    value: "settings",
    icon: <SettingsIcon className="text-muted-foreground size-4" />,
  },
];

const CreatePostForm = () => {
  const { data: session } = authClient.useSession();
  const queryClient = useQueryClient();
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const formId = "create-post-form";
  const anchor = useComboboxAnchor();
  const tagPeopleAnchor = useComboboxAnchor();
  const isLoading = useCreatePostStore((state) => state.isLoading);
  const selectedFiles = useCreatePostStore((state) => state.selectedFiles);
  const selectedFileIndex = useCreatePostStore((state) => state.selectedFileIndex);
  const locations = useCreatePostStore((state) => state.locations);
  const fetchLocations = useCreatePostStore((state) => state.fetchLocations);
  const collaborators = useCreatePostStore((state) => state.collaborators);
  const fetchCollaborators = useCreatePostStore((state) => state.fetchCollaborators);
  const clearCollaborators = useCreatePostStore((state) => state.clearCollaborators);
  const clearLocations = useCreatePostStore((state) => state.clearLocations);
  const media = selectedFiles.map((file) => file.editedFile ?? file.file);
  const [collabValue, setCollabValue] = useState("");
  const [shareButtonPortalTarget, setShareButtonPortalTarget] = useState<HTMLElement | null>(null);
  const [tagPeoplePortalTarget, setTagPeoplePortalTarget] = useState<HTMLElement | null>(null);
  const [tagPeopleInputValue, setTagPeopleInputValue] = useState("");
  const [taggedUsernames, setTaggedUsernames] = useState<string[]>([]);
  const [taggedUsersByUsername, setTaggedUsersByUsername] = useState<Record<string, string>>({});
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [isGeneratingHashtags, setIsGeneratingHashtags] = useState(false);
  const textareaMentionRef = useRef<TextareaMentionRef>(null);
  const router = useRouter();
  const pathname = usePathname();

  const videoMetadata = selectedFiles
    .filter((file) => file.file.type.startsWith("video/"))
    .map((file) => ({
      name: file.file.name,
      millisecondsToExtractThumbnail: file.millisecondsToExtractThumbnail,
      audioOmitted: file.audioOmitted,
    }));

  const t = useTranslations("CreatePostStepper");
  const locale = useLocale();
  const tValidation = useTranslations("CreatePostStepper.validation");
  const form = useForm<CreatePostSchemaType>({
    resolver: zodResolver(createPostSchema(tValidation)),
    defaultValues: {
      caption: "",
      locationId: "",
      audioId: "",
      commentsDisabled: false,
      likesHidden: false,
      hashtagIds: [],
      newHashtags: [],
      collaboratorIds: [],
      videoMetadata: videoMetadata,
      taggedUsers: [],
      media: media as File[],
    },
  });
  const { isSubmitting } = form.formState;
  const selectedAudioId = form.watch("audioId");
  const { data: selectedAudio } = useAudio(selectedAudioId || "");

  const handleLocationChange = useDebouncedCallback((value: string) => {
    if (value) fetchLocations({ keyword: value });
    else clearLocations();
  }, 300);

  const handleCollaboratorChange = useDebouncedCallback((value: string) => {
    if (value) fetchCollaborators({ keyword: value });
    else clearCollaborators();
  }, 300);

  const handleSubmit = async (data: CreatePostSchemaType) => {
    try {
      const formData = new FormData();
      if (data.caption) formData.append("caption", data.caption);
      if (data.locationId) formData.append("locationId", data.locationId);
      if (data.audioId) formData.append("audioId", data.audioId);
      if (typeof data.commentsDisabled === "boolean")
        formData.append("commentsDisabled", String(data.commentsDisabled));
      if (typeof data.likesHidden === "boolean") formData.append("likesHidden", String(data.likesHidden));
      if (data.hashtagIds) data.hashtagIds.forEach((id) => formData.append("hashtagIds[]", id));
      if (data.newHashtags) data.newHashtags.forEach((hashtag) => formData.append("newHashtags[]", hashtag));
      if (data.collaboratorIds)
        data.collaboratorIds.forEach((collab) => formData.append("collaboratorIds[]", collab.userId));
      if (data.videoMetadata)
        data.videoMetadata.forEach((metadata, index) => {
          if (metadata.name != null) formData.append(`videoMetadata[${index}][name]`, metadata.name);
          if (metadata.millisecondsToExtractThumbnail != null)
            formData.append(
              `videoMetadata[${index}][millisecondsToExtractThumbnail]`,
              String(metadata.millisecondsToExtractThumbnail),
            );
          if (metadata.audioOmitted != null)
            formData.append(`videoMetadata[${index}][audioOmitted]`, String(metadata.audioOmitted));
        });
      if (data.taggedUsers)
        data.taggedUsers.forEach((user, index) => {
          formData.append(`taggedUsers[${index}][userId]`, user.userId);
          formData.append(`taggedUsers[${index}][xPosition]`, String(user.xPosition));
          formData.append(`taggedUsers[${index}][yPosition]`, String(user.yPosition));
          formData.append(`taggedUsers[${index}][mediaDisplayOrder]`, String(user.mediaDisplayOrder));
        });
      data.media.forEach((file) => formData.append("media", file));

      const res = await axiosGateway.post<OkResponse<typeof posts.$inferSelect>>("/api/posts", formData);

      if (res.data.success) {
        toast.success(t("form.successMessage"));
        queryClient.invalidateQueries({ queryKey: ["feed"] });
        if (pathname?.startsWith("/dashboard")) {
          queryClient.invalidateQueries({ queryKey: ["posts"] });
        }
      }
      if (session && !pathname?.startsWith("/dashboard")) {
        router.push(`/${session.user.username}`);
      }
    } catch (error) {
    } finally {
      closeBtnRef.current?.click();
    }
  };

  const handleGenerateCaption = async () => {
    if (media.length === 0) {
      toast.error(tValidation("atLeastOneMedia"));
      return;
    }
    setIsGeneratingCaption(true);
    try {
      const formData = new FormData();
      media.forEach((m) => {
        if (m instanceof Blob) {
          formData.append("media", m as Blob);
        }
      });

      const res = await axiosGateway.post<OkResponse<string>>("/api/posts/generate-caption", formData, {
        params: { lang: locale },
      });

      let currentCaption = form.getValues("caption") || "";
      currentCaption = currentCaption.replace(/<p>(.*?)<\/p>/g, "$1");
      form.setValue("caption", `${currentCaption}${currentCaption ? "\n" : ""}${res.data.data}`, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
      toast.success(t("actions.captionGenerated"));
    } catch (error) {
      console.error(error);
      toast.error(t("actions.failedToGenerateCaption"));
    } finally {
      setIsGeneratingCaption(false);
    }
  };

  const handleGenerateHashtags = async () => {
    if (media.length === 0) {
      toast.error(tValidation("atLeastOneMedia"));
      return;
    }
    setIsGeneratingHashtags(true);
    try {
      const formData = new FormData();
      media.forEach((m) => {
        if (m instanceof Blob) {
          formData.append("media", m as Blob);
        }
      });

      const res = await axiosGateway.post<OkResponse<{ id?: string; name: string; isNew: boolean }[]>>(
        "/api/posts/generate-hashtags",
        formData,
      );

      const tags = res.data.data;
      if (tags.length === 0) {
        toast.info(t("actions.noHashtagsSuggested"));
        return;
      }

      tags.forEach((tag) => {
        textareaMentionRef.current?.insertHashtag(tag);
      });

      toast.success(t("actions.hashtagsGenerated"));
    } catch (error) {
      console.error(error);
      toast.error(t("actions.failedToGenerateHashtags"));
    } finally {
      setIsGeneratingHashtags(false);
    }
  };

  useEffect(() => {
    setShareButtonPortalTarget(document.getElementById("create-post-share-btn"));
    setTagPeoplePortalTarget(document.getElementById("create-post-tag-people"));
  }, []);

  useEffect(() => {
    if (collaborators.length === 0) return;

    setTaggedUsersByUsername((prev) => {
      const next = { ...prev };

      for (const user of collaborators) {
        next[user.username] = user.id;
      }

      return next;
    });
  }, [collaborators]);

  return (
    <form id={formId} className="flex-1 shrink-0 no-scrollbar w-full" onSubmit={form.handleSubmit(handleSubmit)}>
      <FieldGroup className="gap-2">
        <Controller
          name="caption"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <TextareaMention
                ref={textareaMentionRef}
                readOnly={isSubmitting}
                value={field.value}
                onChange={field.onChange}
                placeholder={t("form.captionPlaceholder")}
                onMentionIdsChange={(ids) => {
                  form.setValue("hashtagIds", ids, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  });
                }}
                onNewHashtagsChange={(hashtags) => {
                  form.setValue("newHashtags", hashtags, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  });
                }}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Field className="justify-end gap-2" orientation="horizontal">
          <Button
            size="xs"
            type="button"
            onClick={handleGenerateHashtags}
            disabled={isGeneratingHashtags || isGeneratingCaption}
          >
            <LoadingSwap isLoading={isGeneratingHashtags}>
              {t("actions.generateHashtags")} <Sparkles />
            </LoadingSwap>
          </Button>
          <Button
            size="xs"
            type="button"
            className="bg-tertiary hover:bg-tertiary/80"
            onClick={handleGenerateCaption}
            disabled={isGeneratingCaption || isGeneratingHashtags}
          >
            <LoadingSwap isLoading={isGeneratingCaption}>
              {t("actions.generateCaption")} <Sparkles />
            </LoadingSwap>
          </Button>
        </Field>
        <Controller
          name="locationId"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <Combobox
                items={locations}
                filter={null}
                onInputValueChange={(value) => {
                  handleLocationChange(value);
                }}
                onValueChange={(value) => {
                  if (locations) {
                    const selectedLocation = locations.find((loc) => loc.name === value);
                    if (selectedLocation) field.onChange(selectedLocation.id);
                  }
                }}
              >
                <ComboboxInput disabled={isSubmitting} placeholder={t("form.locationPlaceholder")} showClear>
                  <InputGroupAddon>
                    <MapPin />
                  </InputGroupAddon>
                </ComboboxInput>
                <ComboboxContent className="w-60">
                  {isLoading && (
                    <ComboboxBaseUi.Status className="flex items-center justify-center p-2">
                      <Spinner className="size-5" />
                    </ComboboxBaseUi.Status>
                  )}
                  {locations.length === 0 && !isLoading && <ComboboxEmpty>{t("form.emptyLocations")}</ComboboxEmpty>}
                  <ComboboxList>
                    {(item) => (
                      <ComboboxItem key={item.id} value={item.name}>
                        {item.name}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="collaboratorIds"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <Combobox
                disabled={isSubmitting}
                multiple
                autoHighlight
                filter={null}
                inputValue={collabValue}
                items={collaborators}
                onInputValueChange={(value) => {
                  setCollabValue(value);
                  handleCollaboratorChange(value);
                }}
                onValueChange={(value) => {
                  const collab = collaborators.find((candidate) => value.includes(candidate.username));
                  if (collab) {
                    const prev = form.getValues("collaboratorIds") || [];
                    field.onChange([...prev, { userId: collab.id, username: collab.username }]);
                  } else {
                    const prev = form.getValues("collaboratorIds") || [];
                    field.onChange(prev.filter((candidate) => value.includes(candidate.username)));
                  }
                  setCollabValue("");
                }}
              >
                <ComboboxChips ref={anchor} className="w-full max-w-none">
                  <ComboboxValue>
                    {(values) => (
                      <React.Fragment>
                        <InputGroupAddon className={values.length > 0 ? "pl-1.5" : "pl-0.5"}>
                          <UserRoundPlus />
                        </InputGroupAddon>
                        {values.map((value: string) => (
                          <ComboboxChip key={value}>{value}</ComboboxChip>
                        ))}
                        <ComboboxChipsInput
                          disabled={isSubmitting}
                          placeholder={values.length > 0 ? "" : t("form.collaboratorsPlaceholder")}
                          className="placeholder:text-muted-foreground"
                        />
                      </React.Fragment>
                    )}
                  </ComboboxValue>
                </ComboboxChips>
                <ComboboxContent anchor={anchor}>
                  {isLoading && (
                    <ComboboxBaseUi.Status className="flex items-center justify-center p-2">
                      <Spinner className="size-5" />
                    </ComboboxBaseUi.Status>
                  )}
                  {collaborators?.length === 0 && !isLoading && (
                    <ComboboxEmpty>{t("form.emptyCollaborators")}</ComboboxEmpty>
                  )}
                  <ComboboxList>
                    {(item) => (
                      <ComboboxItem key={item.id} value={item.username}>
                        <UserSearchItem user={item} />
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Accordion type="single" defaultValue="settings" collapsible className="space-y-3">
          {items.map((item) => (
            <AccordionItem
              key={item.value}
              value={item.value}
              className="border-border last:border-b bg-card rounded-lg border px-2 **:data-[slot=accordion-content]:p-0!"
            >
              <AccordionTrigger className="items-center px-1 py-3 font-semibold hover:no-underline">
                <div className="flex items-center gap-1.5">
                  <div>{item.icon}</div>
                  <span>{t("form.advancedSettings")}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-2 px-2 pt-0 pb-4 leading-relaxed">
                <Controller
                  name="likesHidden"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <FieldLabel htmlFor="switch-like-hidden">
                      <Field data-invalid={fieldState.invalid} className="flex-row">
                        <FieldContent>
                          <FieldTitle>{t("form.likesHiddenTitle")}</FieldTitle>
                          <FieldDescription>{t("form.likesHiddenDescription")}</FieldDescription>
                        </FieldContent>
                        <Switch
                          disabled={isSubmitting}
                          id="switch-like-hidden"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    </FieldLabel>
                  )}
                />
                <Controller
                  name="commentsDisabled"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <FieldLabel htmlFor="switch-comments-disabled">
                      <Field data-invalid={fieldState.invalid} className="flex-row">
                        <FieldContent>
                          <FieldTitle>{t("form.commentsDisabledTitle")}</FieldTitle>
                          <FieldDescription>{t("form.commentsDisabledDescription")}</FieldDescription>
                        </FieldContent>
                        <Switch
                          disabled={isSubmitting}
                          id="switch-comments-disabled"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    </FieldLabel>
                  )}
                />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <Accordion type="single" collapsible className="space-y-3">
          <AccordionItem
            value="audio"
            className="border-border last:border-b bg-card rounded-lg border px-2 **:data-[slot=accordion-content]:p-0!"
          >
            <AccordionTrigger className="items-center px-1 py-3 font-semibold hover:no-underline">
              <div className="flex items-center justify-between w-full pr-4">
                <div className="flex items-center gap-1.5">
                  <Music className="text-muted-foreground size-4" />
                  <span>{t("form.selectAudio")}</span>
                </div>
                {selectedAudio && (
                  <span className="text-xs text-primary font-normal truncate max-w-[150px]">
                    {selectedAudio.title || `Original - ${selectedAudio.uploader?.name}`}
                  </span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground space-y-2 px-2 pt-0 pb-4 leading-relaxed">
              {selectedAudio && (
                <div className="flex items-center justify-between p-2 mb-3 bg-muted/40 rounded-lg border border-border/60">
                  <div className="flex items-center gap-2 min-w-0">
                    <Music className="w-4 h-4 text-primary shrink-0 animate-pulse" />
                    <span className="text-xs font-semibold truncate">
                      {selectedAudio.title || `Original Sound - ${selectedAudio.uploader?.name || "Unknown"}`}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="text-destructive hover:text-destructive/80 text-xs h-6 px-2 shrink-0"
                    onClick={() => form.setValue("audioId", undefined, { shouldDirty: true })}
                  >
                    {t("form.removeAudio")}
                  </Button>
                </div>
              )}
              <AudioSelector
                value={form.watch("audioId")}
                onChange={(id) => {
                  form.setValue("audioId", id, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  });
                }}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        {tagPeoplePortalTarget &&
          createPortal(
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline">
                  <UserRoundSearch />
                  {t("actions.tagPeople")}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" side="top" sideOffset={8} className="w-80 p-1.5 rounded-lg">
                <Controller
                  name="taggedUsers"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <Combobox
                        disabled={isSubmitting}
                        multiple
                        autoHighlight
                        filter={null}
                        inputValue={tagPeopleInputValue}
                        items={collaborators}
                        value={taggedUsernames}
                        onInputValueChange={(value) => {
                          setTagPeopleInputValue(value);
                          handleCollaboratorChange(value);
                        }}
                        onValueChange={(values) => {
                          const currentTaggedUsers = form.getValues("taggedUsers") || [];
                          const currentTaggedUsersMap = new Map(
                            currentTaggedUsers.map((taggedUser) => [taggedUser.userId, taggedUser]),
                          );

                          const nextTaggedUsers = values.flatMap((username) => {
                            const userId =
                              taggedUsersByUsername[username] ||
                              collaborators.find((candidate) => candidate.username === username)?.id;

                            if (!userId) return [];

                            const existingTag = currentTaggedUsersMap.get(userId);

                            return [
                              {
                                userId,
                                xPosition: existingTag?.xPosition ?? 0,
                                yPosition: existingTag?.yPosition ?? 0,
                                mediaDisplayOrder: existingTag?.mediaDisplayOrder ?? selectedFileIndex,
                              },
                            ];
                          });

                          field.onChange(nextTaggedUsers);
                          setTaggedUsernames(values);
                          setTagPeopleInputValue("");
                        }}
                      >
                        <ComboboxChips ref={tagPeopleAnchor} className="w-full max-w-none">
                          <ComboboxValue>
                            {(values) => (
                              <React.Fragment>
                                {values.map((value: string) => (
                                  <ComboboxChip key={value}>{value}</ComboboxChip>
                                ))}
                                <ComboboxChipsInput
                                  disabled={isSubmitting}
                                  placeholder={values.length > 0 ? "" : t("form.tagPeoplePlaceholder")}
                                  className="placeholder:text-muted-foreground"
                                />
                              </React.Fragment>
                            )}
                          </ComboboxValue>
                        </ComboboxChips>
                        <ComboboxContent anchor={tagPeopleAnchor}>
                          {isLoading && (
                            <ComboboxBaseUi.Status className="flex items-center justify-center p-2">
                              <Spinner className="size-5" />
                            </ComboboxBaseUi.Status>
                          )}
                          {collaborators.length === 0 && !isLoading && (
                            <ComboboxEmpty>{t("form.emptyUsers")}</ComboboxEmpty>
                          )}
                          <ComboboxList>
                            {(item) => (
                              <ComboboxItem key={item.id} value={item.username}>
                                <UserSearchItem user={item} />
                              </ComboboxItem>
                            )}
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </PopoverContent>
            </Popover>,
            tagPeoplePortalTarget,
          )}
        {shareButtonPortalTarget &&
          createPortal(
            <Button type="submit" form={formId} disabled={isSubmitting}>
              <LoadingSwap isLoading={isSubmitting}>{t("actions.share")}</LoadingSwap>
            </Button>,
            shareButtonPortalTarget,
          )}
        <DialogClose ref={closeBtnRef} />
      </FieldGroup>
    </form>
  );
};

export default CreatePostForm;
