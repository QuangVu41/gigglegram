import { axiosGateway, FindManyResponse, OkResponse } from "@/lib/axios-config";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Participant {
  id: string;
  username: string;
  name: string;
  image: string;
  isAdmin?: boolean;
}

export interface Conversation {
  id: string;
  type: "direct" | "group";
  name: string | null;
  imageUrl: string | null;
  lastMessageAt: string | null;
  lastReadAt: string | null;
  notificationsEnabled: boolean;
  lastMessage: {
    id: string;
    content: string | null;
    type: "text" | "image" | "video" | "file" | "system";
    senderId: string;
    createdAt: string;
  } | null;
  otherParticipant?: {
    id: string;
    username: string;
    name: string;
    image: string;
    lastActiveAt: string;
    hideActivityStatus: boolean;
  };
  displayName: string;
  displayImage: string;
  participants?: Participant[];
}

export const useConversations = () => {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const response = await axiosGateway.get<FindManyResponse<Conversation>>(
        "/api/real-time/conversations",
      );
      return response.data.data;
    },
  });
};

export const useToggleMuteConversation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: string) => {
      const response = await axiosGateway.patch<OkResponse<any>>(
        `/api/real-time/conversations/toggle-mute/${conversationId}`,
      );
      return response.data;
    },
    onMutate: async (conversationId) => {
      await queryClient.cancelQueries({ queryKey: ["conversations"] });
      const previousConversations = queryClient.getQueryData<Conversation[]>([
        "conversations",
      ]);

      queryClient.setQueryData<Conversation[]>(["conversations"], (old) => {
        if (!old) return old;
        return old.map((c) =>
          c.id === conversationId
            ? { ...c, notificationsEnabled: !c.notificationsEnabled }
            : c,
        );
      });

      return { previousConversations };
    },
    onError: (err, conversationId, context) => {
      queryClient.setQueryData(
        ["conversations"],
        context?.previousConversations,
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

export const useDeleteChat = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: string) => {
      const response = await axiosGateway.delete<OkResponse<any>>(
        `/api/real-time/conversations/${conversationId}`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};
