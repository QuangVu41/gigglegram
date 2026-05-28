"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosGateway } from "@/lib/axios-config";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export function useDeleteStory() {
  const queryClient = useQueryClient();
  const t = useTranslations("HomePage.feed.post");

  return useMutation({
    mutationFn: async (storyId: string) => {
      // The user specified the endpoint in the controller is @Delete('{:storyId}')
      // which corresponds to /api/posts/stories/:storyId
      return axiosGateway.delete(`/api/posts/stories/${storyId}`);
    },
    onSuccess: () => {
      toast.success(
        t("postDeleted", { defaultValue: "Story deleted successfully" }),
      );
      queryClient.invalidateQueries({ queryKey: ["stories-feed"] });
      queryClient.invalidateQueries({ queryKey: ["user-archived-stories"] });
    },
    onError: () => {
      toast.error(t("deleteError", { defaultValue: "Failed to delete story" }));
    },
  });
}
