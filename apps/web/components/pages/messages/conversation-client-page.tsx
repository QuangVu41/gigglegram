"use client";

import ChatWindow from "@/components/pages/messages/chat-window";
import ConversationInfo from "@/components/pages/messages/conversation-info";
import { useConversations } from "@/hooks/use-conversations";
import { Skeleton } from "@/components/ui/skeleton";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

const ConversationClientPage = () => {
  const params = useParams();
  const conversationId = params.conversationId as string;
  const { data: conversations, refetch } = useConversations();
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const conversation = conversations?.find((c) => c.id === conversationId);

  if (!conversation) {
    return (
      <div className="flex h-full min-w-0 bg-background">
        <div className="flex-1 flex flex-col h-full border-r">
          {/* Header Skeleton */}
          <div className="h-16 px-4 border-b flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="size-6 rounded-md" />
              <Skeleton className="size-6 rounded-md" />
              <Skeleton className="size-6 rounded-md" />
            </div>
          </div>
          {/* Messages Skeleton */}
          <div className="flex-1 p-4 space-y-6 overflow-hidden">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`flex gap-3 ${i % 2 === 0 ? "flex-row-reverse" : ""}`}
              >
                <Skeleton className="size-8 rounded-full shrink-0" />
                <div
                  className={`space-y-2 flex flex-col ${i % 2 === 0 ? "items-end" : ""}`}
                >
                  <Skeleton
                    className={`h-10 ${i % 3 === 0 ? "w-64" : "w-40"} rounded-2xl`}
                  />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            ))}
          </div>
          {/* Input Skeleton */}
          <div className="p-4 border-t shrink-0">
            <Skeleton className="h-12 w-full rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-w-0">
      <div className="flex-1 h-full min-w-0">
        <ChatWindow
          conversationId={conversationId}
          onShowDetails={() => setShowDetails(!showDetails)}
        />
      </div>
      {showDetails && <ConversationInfo conversation={conversation} />}
    </div>
  );
};

export default ConversationClientPage;
