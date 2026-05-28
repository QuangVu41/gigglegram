"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useConversations,
  useDeleteChat,
  useToggleMuteConversation,
} from "@/hooks/use-conversations";
import { formatDistanceToNow } from "date-fns";
import { vi, enUS } from "date-fns/locale";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { cn, getUsernameFallback } from "@/lib/utils";
import {
  Search,
  MessageSquare,
  MoreHorizontal,
  Pin,
  BellOff,
  Trash2,
  MailOpen,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth/auth-client";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";

const ConversationList = () => {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<
    string | null
  >(null);

  const { data: conversations, isLoading } = useConversations();
  const { mutate: deleteChat } = useDeleteChat();
  const { mutate: muteChat } = useToggleMuteConversation();
  const t = useTranslations("MessagesPage");
  const locale = useLocale();
  const params = useParams();
  const router = useRouter();
  const session = authClient.useSession();
  const currentUserId = session.data?.user.id;
  const currentConversationId = params.conversationId as string;
  const [searchQuery, setSearchQuery] = useState("");

  const dateLocale = locale === "vi" ? vi : enUS;

  const filteredConversations = useMemo(() => {
    if (!conversations) return [];

    // Filter out conversations with no messages (only for direct chats)
    const withMessages = conversations.filter((conv) => {
      if (conv.type === "direct") {
        return conv.lastMessage !== null;
      }
      return true;
    });

    if (!searchQuery.trim()) return withMessages;

    const query = searchQuery.toLowerCase();
    return withMessages.filter((conv) => {
      const nameMatch = conv.displayName?.toLowerCase().includes(query);
      const usernameMatch = conv.otherParticipant?.username
        ?.toLowerCase()
        .includes(query);
      return nameMatch || usernameMatch;
    });
  }, [conversations, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 p-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-14 rounded-full" />
            <div className="flex flex-col gap-2 flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="size-16 rounded-full bg-accent flex items-center justify-center mb-4">
          <MessageSquare className="size-8 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground font-medium">
          {t("noConversations")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pb-4 shrink-0">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="pl-9 pr-9 bg-accent/50 border-none h-10 focus-visible:ring-1 focus-visible:ring-ring"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 hover:bg-accent rounded-full p-0.5"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-2 flex items-center justify-between shrink-0">
        <span className="font-bold">{t("title")}</span>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <p className="text-sm text-muted-foreground">
                {t("noUsersFound")}
              </p>
            </div>
          ) : (
            filteredConversations.map((conversation) => {
              const isActive = currentConversationId === conversation.id;
              const lastMessage = conversation.lastMessage;
              const isUnread =
                conversation.lastReadAt &&
                lastMessage &&
                new Date(lastMessage.createdAt) >
                  new Date(conversation.lastReadAt);

              return (
                <div
                  key={conversation.id}
                  className={cn(
                    "group relative flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors cursor-pointer",
                    isActive && "bg-accent",
                  )}
                >
                  <Link
                    href={`/messages/${conversation.id}`}
                    className="flex-1 flex items-center gap-3 overflow-hidden"
                  >
                    <Avatar className="size-14 border">
                      <AvatarImage
                        src={conversation.displayImage}
                        alt={conversation.displayName}
                      />
                      <AvatarFallback className="text-xs">
                        {getUsernameFallback(conversation.displayName ?? "")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col flex-1 overflow-hidden">
                      <span
                        className={cn(
                          "font-medium truncate",
                          isUnread && "font-bold",
                        )}
                      >
                        {conversation.displayName}
                      </span>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground overflow-hidden">
                        <span
                          className={cn(
                            "truncate",
                            isUnread && "text-foreground font-semibold",
                          )}
                        >
                          {lastMessage &&
                            lastMessage.senderId === currentUserId &&
                            `${t("youPrefix")}: `}
                          {lastMessage?.content ||
                            (lastMessage?.type === "image"
                              ? "Sent an image"
                              : lastMessage?.type === "video"
                                ? "Sent a video"
                                : "")}
                        </span>
                        {lastMessage && <span>•</span>}
                        <span className="shrink-0 whitespace-nowrap">
                          {lastMessage &&
                            formatDistanceToNow(
                              new Date(lastMessage.createdAt),
                              {
                                addSuffix: false,
                                locale: dateLocale,
                              },
                            )}
                        </span>
                      </div>
                    </div>
                    {!conversation.notificationsEnabled && (
                      <BellOff className="size-4 text-muted-foreground shrink-0" />
                    )}
                    {isUnread && (
                      <div className="size-2.5 rounded-full bg-primary shrink-0" />
                    )}
                  </Link>

                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1 hover:bg-accent rounded-full">
                          <MoreHorizontal className="size-5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem
                          className="gap-2"
                          onClick={() => {
                            muteChat(conversation.id, {
                              onSuccess: () =>
                                toast.success(
                                  conversation.notificationsEnabled
                                    ? t("mutedSuccess")
                                    : t("unmutedSuccess"),
                                ),
                              onError: () =>
                                toast.error(
                                  conversation.notificationsEnabled
                                    ? t("mutedError")
                                    : t("unmutedError"),
                                ),
                            });
                          }}
                        >
                          {conversation.notificationsEnabled ? (
                            <>
                              <BellOff className="size-4" />
                              {t("mute")}
                            </>
                          ) : (
                            <>
                              <BellOff className="size-4" />
                              {t("unmute")}
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 text-destructive focus:text-destructive"
                          onSelect={(e) => {
                            e.preventDefault();
                            setConversationToDelete(conversation.id);
                            setDeleteConfirmOpen(true);
                          }}
                        >
                          <Trash2 className="size-4" />
                          {t("delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmDelete")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (conversationToDelete) {
                  deleteChat(conversationToDelete, {
                    onSuccess: () => {
                      toast.success(t("deletedSuccess"));
                      if (params.conversationId === conversationToDelete) {
                        router.push("/messages");
                      }
                      setDeleteConfirmOpen(false);
                      setConversationToDelete(null);
                    },
                    onError: () => toast.error(t("deletedError")),
                  });
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ConversationList;
