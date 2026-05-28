import { axiosGateway, OkResponse, FindManyResponse } from "@/lib/axios-config";
import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  InfiniteData,
} from "@tanstack/react-query";

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string | null;
  type: "text" | "image" | "video" | "file" | "system";
  replyToMessageId: string | null;
  createdAt: string;
  isDeleted: boolean;
  sender: {
    id: string;
    username: string;
    name: string;
    image: string;
  };
  replyToMessage: {
    id: string;
    content: string | null;
    type: string;
  } | null;
  media: {
    id: string;
    messageId: string;
    mediaUrl: string;
    mediaType: string;
    displayOrder: number;
    width: number | null;
    height: number | null;
    duration: number | null;
    altText: string | null;
    createdAt: string;
  }[];
  status?: "sending" | "error";
}

export const useMessages = (conversationId: string) => {
  return useInfiniteQuery({
    queryKey: ["messages", conversationId],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await axiosGateway.get<FindManyResponse<Message>>(
        `/api/real-time/conversations/${conversationId}`,
        {
          params: { limit: 50, page: pageParam },
        },
      );
      return response.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: FindManyResponse<Message>) => {
      return lastPage.metadata?.nextPage ?? undefined;
    },
    enabled: !!conversationId,
  });
};

export interface SendMessagePayload {
  receiverId: string;
  content?: string;
  type: "text" | "image" | "video" | "file" | "system";
  replyToMessageId?: string;
  media?: File[];
}

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SendMessagePayload) => {
      const formData = new FormData();
      formData.append("receiverId", payload.receiverId);
      if (payload.content) formData.append("content", payload.content);
      formData.append("type", payload.type);
      if (payload.replyToMessageId)
        formData.append("replyToMessageId", payload.replyToMessageId);

      if (payload.media) {
        payload.media.forEach((file) => {
          formData.append("media", file);
        });
      }

      const response = await axiosGateway.post<OkResponse<Message>>(
        "/api/real-time/conversations/send-message",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
      return response.data.data;
    },
    onSuccess: (newMessage) => {
      queryClient.setQueryData(
        ["messages", newMessage.conversationId],
        (old: InfiniteData<FindManyResponse<Message>> | undefined) => {
          if (!old) return old;
          const exists = old.pages.some((page) =>
            page.data.some((m) => m.id === newMessage.id),
          );
          if (exists) return old;
          return {
            ...old,
            pages: old.pages.map((page, index: number) => {
              if (index === 0) {
                return {
                  ...page,
                  data: [newMessage, ...page.data],
                };
              }
              return page;
            }),
          };
        },
      );
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

export const useDeleteMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (messageId: string) => {
      const response = await axiosGateway.delete<OkResponse<unknown>>(
        `/api/real-time/conversations/delete-message/${messageId}`,
      );
      return response.data;
    },
    onSuccess: (_, messageId) => {
      // Invalidate queries or manually update state
      // Note: the socket will also emit an update
    },
  });
};
