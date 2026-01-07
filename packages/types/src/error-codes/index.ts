import { POST_VIDEO_DURATION_LIMIT_IF_MORE_THAN_1_VIDEOS, VIDEO_DURATION_LIMITS } from "@ts/src/constants";

export enum SystemWideErrorCodes {
  // GENERAL CLIENT ERROR CODES
  GENERAL_CLIENT_ERROR = "GENERAL_CLIENT_ERROR",

  // GENERAL ERROR CODES
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",

  // AUTH ERROR CODES
  AUTH_UNAUTHORIZED = "AUTH_UNAUTHORIZED",

  // POST ERROR CODES
  POST_CREATION_FAILED = "POST_CREATION_FAILED",
  POST_NOT_FOUND = "POST_NOT_FOUND",
  POST_DELETION_FAILED = "POST_DELETION_FAILED",
  POST_UPDATE_FAILED = "POST_UPDATE_FAILED",
  POST_UPLOAD_FILE_FAILED = "POST_UPLOAD_FILE_FAILED",

  // UPLOAD ERROR CODES
  UPLOAD_FILE_FAILED = "UPLOAD_FILE_FAILED",
  UPLOAD_UNSUPPORTED_FILE_TYPE = "UPLOAD_UNSUPPORTED_FILE_TYPE",
  UPLOAD_PROCESSING_FILE_FAILED = "UPLOAD_PROCESSING_FILE_FAILED",
  UPLOAD_MAX_FILE_SIZE_EXCEEDED = "UPLOAD_MAX_FILE_SIZE_EXCEEDED",
  UPLOAD_POST_VIDEO_DURATION_EXCEEDED = "UPLOAD_POST_VIDEO_DURATION_EXCEEDED",
  UPLOAD_REEL_VIDEO_DURATION_EXCEEDED = "UPLOAD_REEL_VIDEO_DURATION_EXCEEDED",
  UPLOAD_STORY_VIDEO_DURATION_EXCEEDED = "UPLOAD_STORY_VIDEO_DURATION_EXCEEDED",
  UPLOAD_POST_VIDEOS_TOO_LONG_IN_DURATION = "UPLOAD_POST_VIDEOS_TOO_LONG_IN_DURATION",
  UPLOAD_POST_VIDEO_DURATION_IF_MORE_THAN_2_VIDEOS_EXCEEDED = "UPLOAD_POST_VIDEO_DURATION_IF_MORE_THAN_2_VIDEOS_EXCEEDED",
}

export const SystemWideErrorMessages: Record<SystemWideErrorCodes, string | (<T>(...args: T[]) => string)> = {
  // GENERAL CLIENT ERROR MESSAGES
  [SystemWideErrorCodes.GENERAL_CLIENT_ERROR]: "Some client errors occurred. Check the description for details.",

  // GENERAL ERROR MESSAGES
  [SystemWideErrorCodes.INTERNAL_SERVER_ERROR]: "Internal server error.",

  // AUTH ERROR MESSAGES
  [SystemWideErrorCodes.AUTH_UNAUTHORIZED]: "Unauthorized.",

  // POST ERROR MESSAGES
  [SystemWideErrorCodes.POST_CREATION_FAILED]: "Failed to create post.",
  [SystemWideErrorCodes.POST_NOT_FOUND]: "Post not found.",
  [SystemWideErrorCodes.POST_DELETION_FAILED]: "Failed to delete post.",
  [SystemWideErrorCodes.POST_UPDATE_FAILED]: "Failed to update post.",
  [SystemWideErrorCodes.POST_UPLOAD_FILE_FAILED]: "Failed to upload file for post.",

  // UPLOAD ERROR MESSAGES
  [SystemWideErrorCodes.UPLOAD_FILE_FAILED]: "Failed to upload file.",
  [SystemWideErrorCodes.UPLOAD_UNSUPPORTED_FILE_TYPE]: `The current file type is not supported. Supported types are: ${process.env.DEFAULT_FILE_TYPE_REGEX}.`,
  [SystemWideErrorCodes.UPLOAD_PROCESSING_FILE_FAILED]: "Failed to process file.",
  [SystemWideErrorCodes.UPLOAD_MAX_FILE_SIZE_EXCEEDED]: (...args) =>
    `Current file size is ${args[0]} bytes, which exceeds the maximum allowed size of ${args[1]} bytes.`,
  [SystemWideErrorCodes.UPLOAD_POST_VIDEO_DURATION_EXCEEDED]: `One or more videos exceed the maximum allowed duration of ${VIDEO_DURATION_LIMITS.POST} seconds for posts.`,
  [SystemWideErrorCodes.UPLOAD_REEL_VIDEO_DURATION_EXCEEDED]: `One or more videos exceed the maximum allowed duration of ${VIDEO_DURATION_LIMITS.REEL} seconds for reels.`,
  [SystemWideErrorCodes.UPLOAD_STORY_VIDEO_DURATION_EXCEEDED]: `One or more videos exceed the maximum allowed duration of ${VIDEO_DURATION_LIMITS.STORY} seconds for stories.`,
  [SystemWideErrorCodes.UPLOAD_POST_VIDEOS_TOO_LONG_IN_DURATION]: `One or more videos were too long to be uploaded.`,
  [SystemWideErrorCodes.UPLOAD_POST_VIDEO_DURATION_IF_MORE_THAN_2_VIDEOS_EXCEEDED]: `If any videos are longer than ${POST_VIDEO_DURATION_LIMIT_IF_MORE_THAN_1_VIDEOS} seconds, you can only post one video at a time.`,
};
