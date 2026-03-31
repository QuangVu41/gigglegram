import type { FindManyQueryDto } from "@repo/types/common";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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
