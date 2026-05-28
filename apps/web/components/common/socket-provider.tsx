"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { authClient } from "@/lib/auth/auth-client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Message } from "@/hooks/use-messages";
import { Conversation } from "@/hooks/use-conversations";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { axiosGateway, OkResponse } from "@/lib/axios-config";
import { UserNotificationSetting } from "@/hooks/use-update-notification-settings";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const session = authClient.useSession();
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: userSettings } = useQuery({
    queryKey: ["user-notification-settings"],
    queryFn: async () => {
      const response = await axiosGateway.get<
        OkResponse<UserNotificationSetting>
      >("/api/users/notification-settings");
      return response.data.data;
    },
    enabled: !!session.data?.user,
  });

  useEffect(() => {
    if (session.data?.user) {
      // Connect to the same origin, the API gateway will handle the /api/real-time proxy
      const socketInstance = io(process.env.NEXT_PUBLIC_REAL_TIME_SERVICE_URL, {
        auth: {
          session: session.data,
        },
        transports: ["websocket", "polling"],
      });

      socketInstance.on("connect", () => {
        console.log("Socket connected:", socketInstance.id);
        setIsConnected(true);
      });

      socketInstance.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
        setIsConnected(false);
      });

      socketInstance.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason);
        setIsConnected(false);
      });

      socketInstance.on("new_message", (message: Message) => {
        // 1. Invalidate conversations to update unread badge in sidebar
        queryClient.invalidateQueries({ queryKey: ["conversations"] });

        // 2. Show toast if it's not from the current user
        if (message.senderId !== session.data?.user?.id) {
          // Check if conversation is muted
          const conversations = queryClient.getQueryData<Conversation[]>([
            "conversations",
          ]);
          const conversation = conversations?.find(
            (c) => c.id === message.conversationId,
          );

          if (conversation && !conversation.notificationsEnabled) {
            return;
          }

          if (userSettings && !userSettings.messagesNotifications) {
            return;
          }

          toast.info(`New message from @${message.sender.username}`, {
            description:
              message.content ||
              (message.type === "image"
                ? "Sent an image"
                : message.type === "video"
                  ? "Sent a video"
                  : "Sent a file"),
            action: {
              label: "View",
              onClick: () => {
                router.push(`/messages/${message.conversationId}`);
              },
            },
          });
        }
      });

      setSocket(socketInstance);

      return () => {
        if (socketInstance) {
          socketInstance.disconnect();
        }
      };
    } else if (!session.isPending) {
      // Clear socket if no session and not currently loading session
      setSocket(null);
      setIsConnected(false);
    }
  }, [session.data, session.isPending]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
