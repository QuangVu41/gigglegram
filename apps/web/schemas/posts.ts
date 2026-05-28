import * as z from "zod";

const videoMetadataSchema = z.object({
  name: z.string().nonempty(),
  millisecondsToExtractThumbnail: z.number().optional(),
  audioOmitted: z.boolean().optional(),
});

const createPostUserTagSchema = z.object({
  id: z.string().optional(),
  userId: z.string().min(1),
  xPosition: z.number(),
  yPosition: z.number(),
  mediaDisplayOrder: z.number(),
});

const collaboratorSchema = z.object({
  userId: z.string().min(1),
  username: z.string().min(1),
});

export const createPostSchema = (t: (key: string) => string) => {
  return z.object({
    caption: z
      .string()
      .max(2200, { message: t("maxCaption") })
      .optional(),
    locationId: z.string().optional(),
    audioId: z.string().optional(),
    commentsDisabled: z.boolean().optional(),
    likesHidden: z.boolean().optional(),
    hashtagIds: z.array(z.string()).optional(),
    newHashtags: z.array(z.string()).optional(),
    collaboratorIds: z.array(collaboratorSchema).optional(),
    videoMetadata: z.array(videoMetadataSchema).optional(),
    taggedUsers: z.array(createPostUserTagSchema).optional(),
    media: z.array(z.file()).min(1, { message: t("atLeastOneMedia") }),
  });
};

export const updatePostSchema = (t: (key: string) => string) => {
  return z.object({
    caption: z
      .string()
      .max(2200, { message: t("maxCaption") })
      .optional(),
    locationId: z.string().optional(),
    audioId: z.string().optional(),
    commentsDisabled: z.boolean().optional(),
    likesHidden: z.boolean().optional(),
    hashtagIds: z.array(z.string()).optional(),
    newHashtags: z.array(z.string()).optional(),
    collaboratorIds: z.array(collaboratorSchema).optional(),
    taggedUsers: z.array(createPostUserTagSchema).optional(),
  });
};

export type VideoMetadataSchemaType = z.infer<typeof videoMetadataSchema>;
export type CreatePostUserTagSchemaType = z.infer<
  typeof createPostUserTagSchema
>;
export type CreatePostSchemaType = z.infer<ReturnType<typeof createPostSchema>>;
export type UpdatePostSchemaType = z.infer<ReturnType<typeof updatePostSchema>>;
