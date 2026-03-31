import axios, { AxiosError } from "axios";
import { SystemWideHttpExceptionResponse } from "@repo/types";
import { toast } from "sonner";
import { _Translator } from "next-intl";

export interface FindOneResponse<T> {
  data: T;
  success: boolean;
}

export interface FindManyResponse<T> {
  data: T | T[];
  metadata?: ResponseMetadata;
  success: boolean;
}

export interface ResponseMetadata {
  total: number;
  prevPage: number | null;
  page: number;
  nextPage: number | null;
  limit: number;
}

export const axiosGateway = axios.create();

let responseInterceptorId: number | null = null;

export const setupAxiosInterceptors = (t: _Translator<Record<string, any>, "SystemWideErrorCodes">) => {
  if (responseInterceptorId !== null) {
    axiosGateway.interceptors.response.eject(responseInterceptorId);
  }

  responseInterceptorId = axiosGateway.interceptors.response.use(
    (res) => {
      return res;
    },
    (error: AxiosError<SystemWideHttpExceptionResponse>) => {
      if (error.config?.validateStatus?.(error.response?.status || 500)) return;

      if (error.response) {
        const data = error.response.data;
        const code = data.code;
        let message = t(code);

        if (code === "UPLOAD_UNSUPPORTED_FILE_TYPE") {
          message = t(code, { supportedTypes: process.env.DEFAULT_FILE_TYPE_REGEX! });
        } else if (code === "UPLOAD_MAX_FILE_SIZE_EXCEEDED") {
          message = t(code, {
            currentSize: data.message?.split(" ")[4] || "unknown",
            imageSize: process.env.DEFAULT_IMAGE_SIZE_IN_BYTES!,
            videoSize: process.env.DEFAULT_VIDEO_SIZE_IN_BYTES!,
          });
        } else if (code === "UPLOAD_VIDEO_DURATION_TOO_SHORT") {
          message = t(code, { minVideoDuration: process.env.DEFAULT_LEAST_VIDEO_DURATION! });
        } else if (code === "UPLOAD_POST_VIDEO_DURATION_EXCEEDED") {
          message = t(code, { maxPostDuration: process.env.DEFAULT_POST_MAX_VIDEO_DURATION! });
        } else if (code === "UPLOAD_REEL_VIDEO_DURATION_EXCEEDED") {
          message = t(code, { maxReelDuration: process.env.DEFAULT_REEL_MAX_VIDEO_DURATION! });
        } else if (code === "UPLOAD_STORY_VIDEO_DURATION_EXCEEDED") {
          message = t(code, { maxStoryDuration: process.env.DEFAULT_STORY_MAX_VIDEO_DURATION! });
        } else if (code === "UPLOAD_POST_MAX_MULTI_VIDEOS_DURATION") {
          message = t(code, { maxMultiVideoDuration: process.env.DEFAULT_POST_MAX_MULTI_VIDEOS_DURATION! });
        }
        toast.error(message);
      }

      return Promise.reject(error);
    },
  );
};
