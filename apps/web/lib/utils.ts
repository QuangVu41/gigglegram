import type { FindManyQueryDto } from "@repo/types/common";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  differenceInSeconds,
  differenceInWeeks,
} from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getUsernameFallback = (name: string): string => {
  if (!name) return "";
  const words = name.trim().split(" ");
  const initials = words
    .slice(0, 2) // Take the first two words
    .map((word) => word.charAt(0).toUpperCase()) // Get the first letter of each word and capitalize it
    .join("");
  return initials;
};

export function convertToQueryParams(
  query: Partial<FindManyQueryDto> & Record<string, string | number | string[]>,
): string {
  const normalizedQuery = {
    keyword: typeof query.keyword === "string" ? query.keyword : undefined,
    ids: Array.isArray(query.ids) ? query.ids : [],
    page: typeof query.page === "number" ? query.page : 1,
    limit: typeof query.limit === "number" ? query.limit : 10,
    sort: typeof query.sort === "string" ? query.sort : "createdAt,desc",
  };
  const params = new URLSearchParams();

  if (normalizedQuery.keyword?.trim()) {
    params.set("keyword", normalizedQuery.keyword.trim());
  }

  if (normalizedQuery.ids.length > 0) {
    for (const id of normalizedQuery.ids) {
      params.append("ids", id);
    }
  }

  params.set("page", normalizedQuery.page.toString());
  params.set("limit", normalizedQuery.limit.toString());

  if (normalizedQuery.sort.trim()) {
    params.set("sort", normalizedQuery.sort.trim());
  }

  const knownKeys = new Set(["keyword", "ids", "page", "limit", "sort"]);

  for (const [key, value] of Object.entries(query)) {
    if (knownKeys.has(key) || value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === undefined || item === null) {
          continue;
        }
        params.append(key, String(item));
      }
      continue;
    }

    params.append(key, String(value));
  }

  return params.toString();
}

export function formatInstagramDate(
  date: Date | string | number,
  t: (key: string, values?: any) => string,
): string {
  const d = new Date(date);
  const now = new Date();
  if (isNaN(d.getTime())) return "";

  const diffInSeconds = Math.max(0, differenceInSeconds(now, d));
  if (diffInSeconds < 60) {
    return t("now");
  }

  const diffInMinutes = Math.max(0, differenceInMinutes(now, d));
  if (diffInMinutes < 60) {
    return t("minutes", { count: diffInMinutes });
  }

  const diffInHours = Math.max(0, differenceInHours(now, d));
  if (diffInHours < 24) {
    return t("hours", { count: diffInHours });
  }

  const diffInDays = Math.max(0, differenceInDays(now, d));
  if (diffInDays < 7) {
    return t("days", { count: diffInDays });
  }

  const diffInWeeks = Math.max(0, differenceInWeeks(now, d));
  return t("weeks", { count: diffInWeeks });
}

export function getMediaUrl(
  filename: string | null | undefined,
  context: "post" | "story",
  mediaType?: string | null,
): string {
  if (!filename) return "/placeholder-image.png";

  // If filename is already a full URL, return it as is
  if (filename.startsWith("http://") || filename.startsWith("https://")) {
    return filename;
  }

  // Check if mediaType indicates video (e.g., "video/mp4")
  const isVideo = mediaType?.startsWith("video/");

  const basePrefix = isVideo ? "/video" : "/images";
  const contextPrefix = context === "story" ? "/stories" : "";

  // Make sure we don't double slash if filename already has a leading slash
  const cleanFilename = filename.startsWith("/") ? filename.slice(1) : filename;

  return `${basePrefix}${contextPrefix}/${cleanFilename}`;
}
export function formatCompactNumber(number: number): string {
  if (number < 1000) return number.toString();

  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(number);
}
