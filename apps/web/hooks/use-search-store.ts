import type { FindManyQueryDto } from "@repo/types/common";
import { axiosGateway, FindManyResponse } from "@/lib/axios-config";
import { hashtags, users } from "@repo/database";
import { create } from "zustand";

export type SearchItemData =
  | typeof users.$inferSelect
  | typeof hashtags.$inferSelect;
export type SearchData = SearchItemData[];

export const isUserSearchItem = (
  item: SearchItemData,
): item is typeof users.$inferSelect => {
  return "username" in item;
};

export const getSearchItemKey = (item: SearchItemData) => {
  return isUserSearchItem(item) ? `user:${item.id}` : `hashtag:${item.id}`;
};

interface SearchStore {
  data: SearchData;
  recentSearches: SearchData;
  isLoading: boolean;
  fetchData: (
    query: Partial<FindManyQueryDto> &
      Record<string, string | number | string[]>,
  ) => Promise<void>;
  saveRecentSearch: (data: SearchItemData) => void;
  getRecentSearches: () => SearchData;
  removeRecentSearch: (key: string) => void;
  clearData: () => void;
}

export const useSearchStore = create<SearchStore>((set) => ({
  data: [],
  recentSearches: [],
  isLoading: false,
  fetchData: async (
    query: Partial<FindManyQueryDto> &
      Record<string, string | number | string[]>,
  ) => {
    set({ isLoading: true });

    try {
      const keyword =
        typeof query.keyword === "string" ? query.keyword.trim() : "";
      let data: SearchData = [];

      if (keyword.startsWith("#")) {
        query.keyword = keyword.slice(1);
        const res = await axiosGateway.get<
          FindManyResponse<typeof hashtags.$inferSelect>
        >(`/api/posts/hashtags`, {
          params: query,
        });

        data = (res.data.data as SearchData) || [];
      } else {
        const res = await axiosGateway.get<
          FindManyResponse<typeof users.$inferSelect>
        >(`/api/users`, {
          params: query,
        });

        data = (res.data.data as SearchData) || [];
      }

      set({ data, isLoading: false });
    } catch {
      set({
        isLoading: false,
        data: [],
      });
    } finally {
      set({ isLoading: false });
    }
  },
  saveRecentSearch: (data: SearchItemData) => {
    const recentSearches = JSON.parse(
      localStorage.getItem("recentSearches") || "[]",
    ) as SearchData;
    const incomingKey = getSearchItemKey(data);

    if (
      !recentSearches.some((item) => getSearchItemKey(item) === incomingKey)
    ) {
      recentSearches.unshift(data);
      localStorage.setItem("recentSearches", JSON.stringify(recentSearches));
      set({ recentSearches });
    }
  },
  removeRecentSearch: (key: string) => {
    const recentSearches = JSON.parse(
      localStorage.getItem("recentSearches") || "[]",
    ) as SearchData;
    const updatedSearches = recentSearches.filter(
      (item) => getSearchItemKey(item) !== key,
    );
    localStorage.setItem("recentSearches", JSON.stringify(updatedSearches));
    set({ recentSearches: updatedSearches });
  },
  getRecentSearches: () => {
    const recentSearches = JSON.parse(
      localStorage.getItem("recentSearches") || "[]",
    ) as SearchData;
    set({ recentSearches });
    return recentSearches;
  },
  clearData: () => set({ data: [] }),
}));
