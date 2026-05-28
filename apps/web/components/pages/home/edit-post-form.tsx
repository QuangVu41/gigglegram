"use client";

import { createPortal } from "react-dom";
import { updatePostSchema, UpdatePostSchemaType } from "@/schemas/posts";
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
import TextareaMention, {
  TextareaMentionRef,
} from "@/components/common/textarea-mention";
import {
  MapPin,
  SettingsIcon,
  Sparkles,
  UserRoundPlus,
  UserRoundSearch,
} from "lucide-react";
import { toast } from "sonner";
import { axiosGateway, OkResponse } from "@/lib/axios-config";
import { useRef } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import UserSearchItem from "@/components/common/user-search-item";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { InputGroupAddon } from "@/components/ui/input-group";
import { useDebouncedCallback } from "use-debounce";
import { Combobox as ComboboxBaseUi } from "@base-ui/react";
import { Spinner } from "@/components/ui/spinner";
import React, { useEffect, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { usePostActions } from "@/hooks/use-post-actions";
import { PostWithRelations } from "@/hooks/use-feed";

const items = [
  {
    value: "settings",
    icon: <SettingsIcon className="text-muted-foreground size-4" />,
  },
];

interface EditPostFormProps {
  post: PostWithRelations;
  onSuccess: () => void;
  queryKeyToUpdate?: string[];
}

const EditPostForm = ({
  post,
  onSuccess,
  queryKeyToUpdate,
}: EditPostFormProps) => {
  const formId = "edit-post-form";
  const isLoading = useCreatePostStore((state) => state.isLoading);
  const locations = useCreatePostStore((state) => state.locations);
  const fetchLocations = useCreatePostStore((state) => state.fetchLocations);
  const clearLocations = useCreatePostStore((state) => state.clearLocations);
  const anchor = useComboboxAnchor();
  const tagPeopleAnchor = useComboboxAnchor();
  const collaborators = useCreatePostStore((state) => state.collaborators);
  const fetchCollaborators = useCreatePostStore(
    (state) => state.fetchCollaborators,
  );
  const clearCollaborators = useCreatePostStore(
    (state) => state.clearCollaborators,
  );
  const [tagPeopleInputValue, setTagPeopleInputValue] = useState("");
  const [collabValue, setCollabValue] = useState("");
  const [taggedUsernames, setTaggedUsernames] = useState<string[]>(
    post.postUserTags?.map((tag) => tag.user.username) || [],
  );
  const [taggedUsersByUsername, setTaggedUsersByUsername] = useState<
    Record<string, string>
  >({});
  const [shareButtonPortalTarget, setShareButtonPortalTarget] =
    useState<HTMLElement | null>(null);
  const [tagPeoplePortalTarget, setTagPeoplePortalTarget] =
    useState<HTMLElement | null>(null);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [isGeneratingHashtags, setIsGeneratingHashtags] = useState(false);
  const textareaMentionRef = useRef<TextareaMentionRef>(null);

  const { updatePostAsync, isUpdating } = usePostActions(queryKeyToUpdate);

  const t = useTranslations("CreatePostStepper");
  const locale = useLocale();
  const tValidation = useTranslations("CreatePostStepper.validation");
  const tFeed = useTranslations("HomePage.feed");
  const form = useForm<UpdatePostSchemaType>({
    resolver: zodResolver(updatePostSchema(tValidation)),
    defaultValues: {
      caption: (function () {
        let text = post.caption || "";
        post.postHashtags?.forEach((tag) => {
          const regex = new RegExp(
            `data-id=\"__new_hashtag__:${tag.hashtag.name}\"`,
            "g",
          );
          text = text.replace(regex, `data-id="${tag.hashtag.id}"`);
        });
        return text;
      })(),
      locationId: post.locationId || "",
      commentsDisabled: post.commentsDisabled || false,
      likesHidden: post.likesHidden || false,
      hashtagIds: post.postHashtags.map((tag) => tag.hashtagId),
      newHashtags: [],
      collaboratorIds: post.postCollaborators.map((collaborator) => ({
        userId: collaborator.userId,
        username: collaborator.user.username,
      })),
      taggedUsers:
        post.postUserTags?.map((tag) => ({
          id: tag.id,
          userId: tag.userId,
          xPosition: parseFloat(tag.xPosition) || 0,
          yPosition: parseFloat(tag.yPosition) || 0,
          mediaDisplayOrder: 0,
        })) || [],
    },
  });
  const { isSubmitting } = form.formState;

  const handleLocationChange = useDebouncedCallback((value: string) => {
    if (value) fetchLocations({ keyword: value });
    else clearLocations();
  }, 300);

  const handleCollaboratorChange = useDebouncedCallback((value: string) => {
    if (value) fetchCollaborators({ keyword: value });
    else clearCollaborators();
  }, 300);

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

  useEffect(() => {
    if (post.postUserTags) {
      setTaggedUsersByUsername((prev) => {
        const next = { ...prev };
        for (const tag of post.postUserTags) {
          next[tag.user.username] = tag.user.id;
        }
        return next;
      });
    }
  }, [post.postUserTags]);

  const handleSubmit = async (data: UpdatePostSchemaType) => {
    const collaboratorIds =
      data.collaboratorIds?.map((collaborator) => collaborator.userId) || [];
    try {
      await updatePostAsync(post.id, { ...data, collaboratorIds });
      onSuccess();
    } catch (error) {
      // Error is handled by usePostActions toast
    }
  };

  const handleGenerateCaption = async () => {
    setIsGeneratingCaption(true);
    try {
      const mediaBlobs = await Promise.all(
        post.postMedia.map((m) => fetch(m.mediaUrl).then((r) => r.blob())),
      );
      const mediaFiles = mediaBlobs.map(
        (blob, i) => new File([blob], `media-${i}`, { type: blob.type }),
      );

      const formData = new FormData();
      mediaFiles.forEach((file) => formData.append("media", file));

      const res = await axiosGateway.post<OkResponse<string>>(
        "/api/posts/generate-caption",
        formData,
        {
          params: { lang: locale },
        },
      );

      const currentCaption = form.getValues("caption") || "";
      form.setValue(
        "caption",
        currentCaption + (currentCaption ? "\n\n" : "") + res.data.data,
        {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        },
      );
      toast.success(t("actions.captionGenerated"));
    } catch (error) {
      console.error(error);
      toast.error(t("actions.failedToGenerateCaption"));
    } finally {
      setIsGeneratingCaption(false);
    }
  };

  const handleGenerateHashtags = async () => {
    setIsGeneratingHashtags(true);
    try {
      const mediaBlobs = await Promise.all(
        post.postMedia.map((m) => fetch(m.mediaUrl).then((r) => r.blob())),
      );
      const mediaFiles = mediaBlobs.map(
        (blob, i) => new File([blob], `media-${i}`, { type: blob.type }),
      );

      const formData = new FormData();
      mediaFiles.forEach((file) => formData.append("media", file));

      const res = await axiosGateway.post<
        OkResponse<{ id?: string; name: string; isNew: boolean }[]>
      >("/api/posts/generate-hashtags", formData);

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
    setShareButtonPortalTarget(document.getElementById("edit-post-share-btn"));
    setTagPeoplePortalTarget(document.getElementById("edit-post-tag-people"));
  }, []);

  return (
    <form
      id={formId}
      className="flex-1 shrink-0 no-scrollbar w-full"
      onSubmit={form.handleSubmit(handleSubmit)}
    >
      <FieldGroup className="gap-2">
        <Controller
          name="caption"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <TextareaMention
                ref={textareaMentionRef}
                readOnly={isUpdating || isSubmitting}
                value={field.value || ""}
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
            disabled={isGeneratingHashtags}
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
            disabled={isGeneratingCaption}
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
                    const selectedLocation = locations.find(
                      (loc) => loc.name === value,
                    );
                    if (selectedLocation) field.onChange(selectedLocation.id);
                  }
                }}
              >
                <ComboboxInput
                  disabled={isUpdating || isSubmitting}
                  placeholder={t("form.locationPlaceholder")}
                  showClear
                >
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
                  {locations.length === 0 && !isLoading && (
                    <ComboboxEmpty>{t("form.emptyLocations")}</ComboboxEmpty>
                  )}
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
                disabled={isUpdating || isSubmitting}
                multiple
                autoHighlight
                filter={null}
                inputValue={collabValue}
                items={collaborators}
                value={field.value?.map((c) => c.username) || []}
                onInputValueChange={(value) => {
                  setCollabValue(value);
                  handleCollaboratorChange(value);
                }}
                onValueChange={(value) => {
                  const collab = collaborators.find((candidate) =>
                    value.includes(candidate.username),
                  );
                  if (collab) {
                    const prev = form.getValues("collaboratorIds") || [];
                    field.onChange([
                      ...prev,
                      { userId: collab.id, username: collab.username },
                    ]);
                  } else {
                    const prev = form.getValues("collaboratorIds") || [];
                    field.onChange(
                      prev.filter((candidate) =>
                        value.includes(candidate.username),
                      ),
                    );
                  }
                  setCollabValue("");
                }}
              >
                <ComboboxChips ref={anchor} className="w-full max-w-none">
                  <ComboboxValue>
                    {(values) => (
                      <React.Fragment>
                        <InputGroupAddon
                          className={values.length > 0 ? "pl-1.5" : "pl-0.5"}
                        >
                          <UserRoundPlus />
                        </InputGroupAddon>
                        {values.map((value: string) => (
                          <ComboboxChip key={value}>{value}</ComboboxChip>
                        ))}
                        <ComboboxChipsInput
                          disabled={isUpdating || isSubmitting}
                          placeholder={
                            values.length > 0
                              ? ""
                              : t("form.collaboratorsPlaceholder")
                          }
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
                    <ComboboxEmpty>
                      {t("form.emptyCollaborators")}
                    </ComboboxEmpty>
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
        <Accordion
          type="single"
          defaultValue="settings"
          collapsible
          className="space-y-3"
        >
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
                      <Field
                        data-invalid={fieldState.invalid}
                        className="flex-row"
                      >
                        <FieldContent>
                          <FieldTitle>{t("form.likesHiddenTitle")}</FieldTitle>
                          <FieldDescription>
                            {t("form.likesHiddenDescription")}
                          </FieldDescription>
                        </FieldContent>
                        <Switch
                          disabled={isUpdating || isSubmitting}
                          id="switch-like-hidden"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    </FieldLabel>
                  )}
                />
                <Controller
                  name="commentsDisabled"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <FieldLabel htmlFor="switch-comments-disabled">
                      <Field
                        data-invalid={fieldState.invalid}
                        className="flex-row"
                      >
                        <FieldContent>
                          <FieldTitle>
                            {t("form.commentsDisabledTitle")}
                          </FieldTitle>
                          <FieldDescription>
                            {t("form.commentsDisabledDescription")}
                          </FieldDescription>
                        </FieldContent>
                        <Switch
                          disabled={isUpdating || isSubmitting}
                          id="switch-comments-disabled"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    </FieldLabel>
                  )}
                />
              </AccordionContent>
            </AccordionItem>
          ))}
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
              <PopoverContent
                align="start"
                side="top"
                sideOffset={8}
                className="w-80 p-1.5 rounded-lg"
              >
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
                          const currentTaggedUsers =
                            form.getValues("taggedUsers") || [];
                          const currentTaggedUsersMap = new Map(
                            currentTaggedUsers.map((taggedUser) => [
                              taggedUser.userId,
                              taggedUser,
                            ]),
                          );

                          const nextTaggedUsers = values.flatMap((username) => {
                            const userId =
                              taggedUsersByUsername[username] ||
                              collaborators.find(
                                (candidate) => candidate.username === username,
                              )?.id;

                            if (!userId) return [];

                            const existingTag =
                              currentTaggedUsersMap.get(userId);

                            return [
                              {
                                userId,
                                xPosition: existingTag?.xPosition ?? 0,
                                yPosition: existingTag?.yPosition ?? 0,
                                mediaDisplayOrder:
                                  existingTag?.mediaDisplayOrder ?? 0,
                              },
                            ];
                          });

                          field.onChange(nextTaggedUsers);
                          setTaggedUsernames(values);
                          setTagPeopleInputValue("");
                        }}
                      >
                        <ComboboxChips
                          ref={tagPeopleAnchor}
                          className="w-full max-w-none"
                        >
                          <ComboboxValue>
                            {(values) => (
                              <React.Fragment>
                                {values.map((value: string) => (
                                  <ComboboxChip key={value}>
                                    {value}
                                  </ComboboxChip>
                                ))}
                                <ComboboxChipsInput
                                  disabled={isSubmitting}
                                  placeholder={
                                    values.length > 0
                                      ? ""
                                      : t("form.tagPeoplePlaceholder")
                                  }
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
                            <ComboboxEmpty>
                              {t("form.emptyUsers")}
                            </ComboboxEmpty>
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
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </PopoverContent>
            </Popover>,
            tagPeoplePortalTarget,
          )}
        {shareButtonPortalTarget &&
          createPortal(
            <Button
              type="submit"
              form={formId}
              disabled={isUpdating || isSubmitting}
            >
              <LoadingSwap isLoading={isUpdating || isSubmitting}>
                {tFeed("post.saveChanges")}
              </LoadingSwap>
            </Button>,
            shareButtonPortalTarget,
          )}
      </FieldGroup>
    </form>
  );
};

export default EditPostForm;
