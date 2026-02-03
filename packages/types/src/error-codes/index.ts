export enum SystemWideErrorCodes {
  // GENERAL CLIENT ERROR CODES
  GENERAL_CLIENT_ERROR = "GENERAL_CLIENT_ERROR",

  // GENERAL ERROR CODES
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",

  // AUTH ERROR CODES
  AUTH_UNAUTHORIZED = "AUTH_UNAUTHORIZED",

  // RECORD ERROR CODES
  CREATION_FAILED = "CREATION_FAILED",
  NOT_FOUND = "NOT_FOUND",
  DELETION_FAILED = "DELETION_FAILED",
  UPDATE_FAILED = "UPDATE_FAILED",

  // UPLOAD ERROR CODES
  UPLOAD_FILE_FAILED = "UPLOAD_FILE_FAILED",
  UPLOAD_UNSUPPORTED_FILE_TYPE = "UPLOAD_UNSUPPORTED_FILE_TYPE",
  UPLOAD_PROCESSING_FILE_FAILED = "UPLOAD_PROCESSING_FILE_FAILED",
  UPLOAD_MAX_FILE_SIZE_EXCEEDED = "UPLOAD_MAX_FILE_SIZE_EXCEEDED",
  UPLOAD_VIDEO_DURATION_TOO_SHORT = "UPLOAD_VIDEO_DURATION_TOO_SHORT",
  UPLOAD_POST_VIDEO_DURATION_EXCEEDED = "UPLOAD_POST_VIDEO_DURATION_EXCEEDED",
  UPLOAD_REEL_VIDEO_DURATION_EXCEEDED = "UPLOAD_REEL_VIDEO_DURATION_EXCEEDED",
  UPLOAD_STORY_VIDEO_DURATION_EXCEEDED = "UPLOAD_STORY_VIDEO_DURATION_EXCEEDED",
  UPLOAD_POST_VIDEOS_TOO_LONG_IN_DURATION = "UPLOAD_POST_VIDEOS_TOO_LONG_IN_DURATION",
  UPLOAD_POST_MAX_MULTI_VIDEOS_DURATION = "UPLOAD_POST_MAX_MULTI_VIDEOS_DURATION",
}

export const SystemWideErrorMessages = {
  // GENERAL CLIENT ERROR MESSAGES
  [SystemWideErrorCodes.GENERAL_CLIENT_ERROR]: "Some client errors occurred. Check the description for details.",

  // GENERAL ERROR MESSAGES
  [SystemWideErrorCodes.INTERNAL_SERVER_ERROR]: "Internal server error.",

  // AUTH ERROR MESSAGES
  [SystemWideErrorCodes.AUTH_UNAUTHORIZED]: "Unauthorized.",

  // POST ERROR MESSAGES
  [SystemWideErrorCodes.CREATION_FAILED]: "Failed to create record.",
  [SystemWideErrorCodes.NOT_FOUND]: "Record not found.",
  [SystemWideErrorCodes.DELETION_FAILED]: "Failed to delete record.",
  [SystemWideErrorCodes.UPDATE_FAILED]: "Failed to update record.",

  // UPLOAD ERROR MESSAGES
  [SystemWideErrorCodes.UPLOAD_FILE_FAILED]: "Failed to upload file.",
  [SystemWideErrorCodes.UPLOAD_UNSUPPORTED_FILE_TYPE]: `The current file type is not supported. Supported types are: ${process.env.DEFAULT_FILE_TYPE_REGEX}.`,
  [SystemWideErrorCodes.UPLOAD_PROCESSING_FILE_FAILED]: "Failed to process file.",
  [SystemWideErrorCodes.UPLOAD_POST_VIDEOS_TOO_LONG_IN_DURATION]: `One or more videos were too long to be uploaded.`,
  [SystemWideErrorCodes.UPLOAD_MAX_FILE_SIZE_EXCEEDED]: (...args) =>
    `Current file size is ${args[0]} bytes, which exceeds the maximum allowed size of ${args[1]} bytes.`,
  [SystemWideErrorCodes.UPLOAD_POST_VIDEO_DURATION_EXCEEDED]: `One or more videos exceed the maximum allowed duration of ${process.env.DEFAULT_POST_MAX_VIDEO_DURATION} seconds for posts.`,
  [SystemWideErrorCodes.UPLOAD_REEL_VIDEO_DURATION_EXCEEDED]: `One or more videos exceed the maximum allowed duration of ${process.env.DEFAULT_REEL_MAX_VIDEO_DURATION} seconds for reels.`,
  [SystemWideErrorCodes.UPLOAD_STORY_VIDEO_DURATION_EXCEEDED]: `One or more videos exceed the maximum allowed duration of ${process.env.DEFAULT_STORY_MAX_VIDEO_DURATION} seconds for stories.`,
  [SystemWideErrorCodes.UPLOAD_POST_MAX_MULTI_VIDEOS_DURATION]: `If any videos are longer than ${process.env.DEFAULT_POST_MAX_MULTI_VIDEOS_DURATION} seconds, you can only post one video at a time.`,
  [SystemWideErrorCodes.UPLOAD_VIDEO_DURATION_TOO_SHORT]: `The video is too short to be uploaded. The minimum duration is ${process.env.DEFAULT_LEAST_VIDEO_DURATION} seconds.`,
} satisfies Record<SystemWideErrorCodes, string | (<T>(...args: T[]) => string)>;
