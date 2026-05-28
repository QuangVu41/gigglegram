"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosGateway, OkResponse } from "@/lib/axios-config";
import { storyHighlights } from "@repo/database";

interface CreateHighlightData {
  title: string;
  coverStoryId: string;
  storyIds: string[];
}

export function useCreateHighlight() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateHighlightData) => {
      const response = await axiosGateway.post<
        OkResponse<typeof storyHighlights.$inferSelect>
      >("/api/posts/highlights", data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate relevant queries, e.g., the user's highlights list
      queryClient.invalidateQueries({ queryKey: ["user-highlights"] });
    },
  });
}
