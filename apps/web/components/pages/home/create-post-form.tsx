"use client";

import { createPostSchema, CreatePostSchemaType } from "@/schemas/posts";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
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
import TextareaMention from "@/components/common/textarea-mention";
import { MapPin, SettingsIcon, UserRoundPlus } from "lucide-react";
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
import { InputGroupAddon } from "@/components/ui/input-group";
import { useDebouncedCallback } from "use-debounce";
import { Combobox as ComboboxBaseUi } from "@base-ui/react";
import { Spinner } from "@/components/ui/spinner";
import React, { useState } from "react";
import UserSearchItem from "@/components/common/user-search-item";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/reui/badge";
import { Switch } from "@/components/ui/switch";

const items = [
  {
    value: "settings",
    icon: <SettingsIcon className="text-muted-foreground size-4" />,
    trigger: "Advanced settings",
  },
];

const CreatePostForm = () => {
  const anchor = useComboboxAnchor();
  const isLoading = useCreatePostStore((state) => state.isLoading);
  const selectedFiles = useCreatePostStore((state) => state.selectedFiles);
  const locations = useCreatePostStore((state) => state.locations);
  const fetchLocations = useCreatePostStore((state) => state.fetchLocations);
  const collaborators = useCreatePostStore((state) => state.collaborators);
  const fetchCollaborators = useCreatePostStore((state) => state.fetchCollaborators);
  const clearCollaborators = useCreatePostStore((state) => state.clearCollaborators);
  const clearLocations = useCreatePostStore((state) => state.clearLocations);
  const media = selectedFiles.map((file) => file.editedFile ?? file.file);
  const [collabValue, setCollabValue] = useState("");
  const videoMetadata = selectedFiles
    .filter((file) => file.file.type.startsWith("video/"))
    .map((file) => ({
      name: file.file.name,
      millisecondsToExtractThumbnail: file.millisecondsToExtractThumbnail,
      audioOmitted: file.audioOmitted,
    }));
  const tValidation = useTranslations("HomePage");
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

  const handleLocationChange = useDebouncedCallback((value: string) => {
    if (value) fetchLocations({ keyword: value });
    else clearLocations();
  }, 300);

  const handleCollaboratorChange = useDebouncedCallback((value: string) => {
    if (value) fetchCollaborators({ keyword: value });
    else clearCollaborators();
  }, 300);

  const handleSubmit = (data: CreatePostSchemaType) => {
    console.log(data);
  };

  return (
    <form className="flex-1 shrink-0" onSubmit={form.handleSubmit(handleSubmit)}>
      <FieldGroup className="gap-2">
        <Controller
          name="caption"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <TextareaMention
                value={field.value}
                onChange={field.onChange}
                placeholder="Enter caption"
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
        <Controller
          name="locationId"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <Combobox
                items={locations}
                inputValue={field.value}
                onInputValueChange={(value) => {
                  field.onChange(value);
                  handleLocationChange(value);
                }}
                onValueChange={(value) => {
                  if (locations) {
                    const selectedLocation = locations.find((loc) => loc.name === value);
                    if (selectedLocation) form.setValue("locationId", selectedLocation.id);
                  }
                }}
              >
                <ComboboxInput placeholder="Select a location">
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
                  {locations.length === 0 && !isLoading && <ComboboxEmpty>No locations found.</ComboboxEmpty>}
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
                multiple
                autoHighlight
                filter={null}
                inputValue={collabValue}
                items={collaborators}
                onInputValueChange={(value) => {
                  setCollabValue(value);
                  handleCollaboratorChange(value);
                }}
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
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
                          placeholder={values.length > 0 ? "" : "Add collaborators"}
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
                  {collaborators.length === 0 && !isLoading && <ComboboxEmpty>No collaborators found.</ComboboxEmpty>}
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
                  <span>{item.trigger}</span>
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
                          <FieldTitle>Hide like counts on this post</FieldTitle>
                          <FieldDescription>Only you will see the total number of likes on this post.</FieldDescription>
                        </FieldContent>
                        <Switch id="switch-like-hidden" checked={field.value} onCheckedChange={field.onChange} />
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
                          <FieldTitle>Disable comments on this post</FieldTitle>
                          <FieldDescription>
                            Only you will be able to view and manage comments on this post.
                          </FieldDescription>
                        </FieldContent>
                        <Switch id="switch-comments-disabled" checked={field.value} onCheckedChange={field.onChange} />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    </FieldLabel>
                  )}
                />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </FieldGroup>
    </form>
  );
};

export default CreatePostForm;
