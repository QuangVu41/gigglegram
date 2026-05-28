"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosGateway, OkResponse, FindManyResponse } from "@/lib/axios-config";
import { audioTracks, users } from "@repo/database";
import { authClient } from "@/lib/auth/auth-client";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export type AudioTrack = typeof audioTracks.$inferSelect & {
  uploader: typeof users.$inferSelect;
  postsCount: number;
  savedAudioTracks?: { userId: string; audioTrackId: string }[];
};

export function useAudio(audioId: string) {
  return useQuery({
    queryKey: ["audio", audioId],
    queryFn: async () => {
      const response = await axiosGateway.get<OkResponse<AudioTrack>>(
        `/api/posts/audio/${audioId}`,
      );
      return response.data.data;
    },
    enabled: !!audioId,
  });
}

export function useAudioActions(audioId: string) {
  const t = useTranslations("AudioPage");
  const queryClient = useQueryClient();
  const session = authClient.useSession();
  const userId = session.data?.user.id;

  const saveMutation = useMutation({
    mutationFn: async ({ isSaved }: { isSaved: boolean }) => {
      if (!userId) throw new Error("User not authenticated");
      if (isSaved) {
        return axiosGateway.delete(`/api/posts/audio/unsave/${audioId}`);
      } else {
        return axiosGateway.post("/api/posts/audio/save", { audioTrackId: audioId });
      }
    },
    onMutate: async ({ isSaved }) => {
      if (!userId) return;
      await queryClient.cancelQueries({ queryKey: ["audio", audioId] });
      const previousAudio = queryClient.getQueryData<AudioTrack>(["audio", audioId]);

      if (previousAudio) {
        queryClient.setQueryData<AudioTrack>(["audio", audioId], {
          ...previousAudio,
          savedAudioTracks: isSaved
            ? (previousAudio.savedAudioTracks || []).filter((s) => s.userId !== userId)
            : [...(previousAudio.savedAudioTracks || []), { userId, audioTrackId: audioId }],
        });
      }

      return { previousAudio };
    },
    onError: (err, variables, context) => {
      if (context?.previousAudio) {
        queryClient.setQueryData(["audio", audioId], context.previousAudio);
      }
      toast.error(t("saveError"));
    },
    onSuccess: (data, variables) => {
      toast.success(variables.isSaved ? t("unsaveSuccess") : t("saveSuccess"));
      queryClient.invalidateQueries({ queryKey: ["audio", audioId] });
      queryClient.invalidateQueries({ queryKey: ["user-saved-audio"] });
    },
  });

  return {
    saveAudio: (isSaved: boolean) => saveMutation.mutate({ isSaved }),
    isSaving: saveMutation.isPending,
    currentUserId: userId,
  };
}

export interface AudioListParams {
  page?: number;
  limit?: number;
  keyword?: string;
  isOriginal?: boolean;
  isTrending?: boolean;
}

export function useAudioList(params: AudioListParams, enabled = true) {
  return useQuery({
    queryKey: ["audio-list", params],
    queryFn: async () => {
      const response = await axiosGateway.get<FindManyResponse<AudioTrack>>(
        "/api/posts/audio",
        {
          params,
        },
      );
      return response.data;
    },
    enabled,
  });
}
