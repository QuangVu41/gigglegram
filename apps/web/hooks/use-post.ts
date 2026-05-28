import { useQuery } from "@tanstack/react-query";
import { axiosGateway, OkResponse } from "@/lib/axios-config";
import { PostWithRelations } from "./use-feed";

export function usePost(postId: string) {
  return useQuery({
    queryKey: ["post", postId],
    queryFn: async () => {
      const res = await axiosGateway.get<OkResponse<PostWithRelations>>(
        `/api/posts/by/${postId}`,
      );
      return res.data.data;
    },
    enabled: !!postId,
  });
}
