"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMessages, useSendMessage, Message } from "@/hooks/use-messages";
import { FindManyResponse } from "@/lib/axios-config";
import { useSocket } from "@/components/common/socket-provider";
import { useTranslations, useLocale } from "next-intl";
import { useEffect, useRef, useState } from "react";
import {
  Info,
  Image as ImageIcon,
  Smile,
  Play,
  Maximize2,
  Loader2,
  X,
} from "lucide-react";
import { cn, getUsernameFallback } from "@/lib/utils";
import { authClient } from "@/lib/auth/auth-client";
import Image from "next/image";
import { format } from "date-fns";
import { vi, enUS } from "date-fns/locale";
import { useQueryClient, InfiniteData } from "@tanstack/react-query";
import { useConversations } from "@/hooks/use-conversations";
import { useInView } from "react-intersection-observer";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Video } from "@videojs/react/video";
import EmojiPicker, { Theme, EmojiClickData } from "emoji-picker-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTheme } from "next-themes";
import Link from "next/link";

interface ChatWindowProps {
  conversationId: string;
  onShowDetails: () => void;
}

const ChatWindow = ({ conversationId, onShowDetails }: ChatWindowProps) => {
  const t = useTranslations("MessagesPage");
  const locale = useLocale();
  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMessages(conversationId);
  const { data: conversations } = useConversations();
  const { mutate: sendMessage, isPending: isSending } = useSendMessage();
  const { socket } = useSocket();
  const session = authClient.useSession();
  const [content, setContent] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { ref: loadMoreRef, inView } = useInView();
  const { resolvedTheme } = useTheme();
  const queryClient = useQueryClient();

  const [selectedMedia, setSelectedMedia] = useState<{
    url: string;
    type: string;
  } | null>(null);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    const input = inputRef.current;
    if (!input) {
      setContent((prev) => prev + emojiData.emoji);
      return;
    }

    const start = input.selectionStart ?? content.length;
    const end = input.selectionEnd ?? content.length;
    const newContent =
      content.substring(0, start) + emojiData.emoji + content.substring(end);

    setContent(newContent);

    // Focus and set cursor after emoji
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(
        start + emojiData.emoji.length,
        start + emojiData.emoji.length,
      );
    }, 0);
  };

  const messages =
    infiniteData?.pages.flatMap((page) => page.data).reverse() || [];

  const conversation = conversations?.find((c) => c.id === conversationId);
  const displayName = conversation?.displayName ?? "";
  const displayImage = conversation?.displayImage ?? "";

  const currentUserId = session.data?.user?.id;
  const isGroupAdmin = conversation?.participants?.find(
    (p) => p.id === currentUserId,
  )?.isAdmin;
  const dateLocale = locale === "vi" ? vi : enUS;

  useEffect(() => {
    if (scrollRef.current && !isFetchingNextPage) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [infiniteData?.pages[0]?.data.length, isFetchingNextPage]);

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    if (socket && conversationId) {
      socket.emit("join_room", `conversation-${conversationId}`);

      socket.on("new_message", (message: Message) => {
        if (message.conversationId === conversationId) {
          queryClient.setQueryData(
            ["messages", conversationId],
            (old: InfiniteData<FindManyResponse<Message>> | undefined) => {
              if (!old) return old;
              if (
                old.pages.some((page) =>
                  page.data.some((m) => m.id === message.id),
                )
              )
                return old;
              return {
                ...old,
                pages: old.pages.map((page, index: number) => {
                  if (index === 0) {
                    return {
                      ...page,
                      data: [message, ...page.data],
                    };
                  }
                  return page;
                }),
              };
            },
          );
        }
      });

      return () => {
        socket.emit("leave_conversation", `conversation-${conversationId}`);
        socket.off("new_message");
      };
    }
  }, [socket, conversationId, queryClient]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setSelectedFiles((prev) => [...prev, ...files]);
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    const preview = previews[index];
    if (preview) URL.revokeObjectURL(preview);
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = () => {
    if (!content.trim() && selectedFiles.length === 0) return;
    if (!conversation) return;

    const receiverId = conversation.otherParticipant?.id || "";
    const tempId = `temp-${Date.now()}`;

    let type: "text" | "image" | "video" | "file" = "text";
    if (selectedFiles.length > 0) {
      const firstFile = selectedFiles[0];
      if (firstFile?.type.startsWith("image/")) type = "image";
      else if (firstFile?.type.startsWith("video/")) type = "video";
      else type = "file";
    }

    // Optimistic Update
    const optimisticMessage: Message = {
      id: tempId,
      conversationId,
      senderId: currentUserId || "",
      content,
      type,
      createdAt: new Date().toISOString(),
      isDeleted: false,
      sender: {
        id: currentUserId || "",
        username: session.data?.user?.name || "",
        name: session.data?.user?.name || "",
        image: session.data?.user?.image || "",
      },
      replyToMessageId: null,
      replyToMessage: null,
      media: selectedFiles.map((file, index) => ({
        id: `temp-media-${index}`,
        messageId: tempId,
        mediaUrl: URL.createObjectURL(file),
        mediaType: file.type,
        displayOrder: index,
        width: null,
        height: null,
        duration: null,
        altText: null,
        createdAt: new Date().toISOString(),
      })),
      status: "sending",
    };

    queryClient.setQueryData(
      ["messages", conversationId],
      (old: InfiniteData<FindManyResponse<Message>> | undefined) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page, index: number) => {
            if (index === 0) {
              return {
                ...page,
                data: [optimisticMessage, ...page.data],
              };
            }
            return page;
          }),
        };
      },
    );

    const currentContent = content;
    const currentFiles = [...selectedFiles];

    setContent("");
    setSelectedFiles([]);
    setPreviews([]);

    sendMessage(
      {
        receiverId,
        content: currentContent,
        type,
        media: currentFiles,
      },
      {
        onSuccess: () => {
          queryClient.setQueryData(
            ["messages", conversationId],
            (old: InfiniteData<FindManyResponse<Message>> | undefined) => {
              if (!old) return old;
              return {
                ...old,
                pages: old.pages.map((page) => ({
                  ...page,
                  data: page.data.filter((m) => m.id !== tempId),
                })),
              };
            },
          );
        },
        onError: () => {
          queryClient.setQueryData(
            ["messages", conversationId],
            (old: InfiniteData<FindManyResponse<Message>> | undefined) => {
              if (!old) return old;
              return {
                ...old,
                pages: old.pages.map((page) => ({
                  ...page,
                  data: page.data.map((m) =>
                    m.id === tempId ? { ...m, status: "error" as const } : m,
                  ),
                })),
              };
            },
          );
        },
      },
    );
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Avatar className="size-10 border">
            <AvatarImage src={displayImage} />
            <AvatarFallback className="text-xs">
              {getUsernameFallback(conversation?.displayName ?? "")}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-semibold">{displayName}</span>
            <span className="text-xs text-muted-foreground">
              {conversation?.otherParticipant?.hideActivityStatus === true
                ? `@${conversation.otherParticipant.username}`
                : t("online")}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-muted-foreground">
          <button
            onClick={onShowDetails}
            className="hover:text-foreground transition-colors"
          >
            <Info className="size-6" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {hasNextPage && (
          <div ref={loadMoreRef} className="flex justify-center p-2">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {!hasNextPage && conversation && (
          <div className="flex flex-col items-center py-10 px-4 text-center mb-4">
            {conversation.type === "direct" ? (
              <>
                <Avatar className="size-24 mb-4 border">
                  <AvatarImage src={displayImage} />
                  <AvatarFallback className="text-2xl">
                    {getUsernameFallback(displayName)}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold">{displayName}</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  {conversation.otherParticipant?.username} · Gigglegram
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  asChild
                  className="font-semibold"
                >
                  <Link href={`/${conversation.otherParticipant?.username}`}>
                    {t("viewProfile")}
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <div className="relative size-24 mb-4">
                  {conversation.participants?.[0] && (
                    <Avatar className="size-16 absolute top-0 left-0 border-2 border-background shadow-sm">
                      <AvatarImage src={conversation.participants[0].image} />
                      <AvatarFallback>
                        {getUsernameFallback(conversation.participants[0].name)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  {conversation.participants?.[1] && (
                    <Avatar className="size-16 absolute bottom-0 right-0 border-4 border-background z-10 shadow-md">
                      <AvatarImage src={conversation.participants[1].image} />
                      <AvatarFallback>
                        {getUsernameFallback(conversation.participants[1].name)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
                <h2 className="text-xl font-bold mb-1">{displayName}</h2>
                <p className="text-sm text-muted-foreground">
                  {isGroupAdmin ? t("createdGroup") : t("groupChat")}
                </p>
              </>
            )}
          </div>
        )}
        {messages.map((message: Message, index: number) => {
          const isMe = message.senderId === currentUserId;
          const showAvatar =
            !isMe &&
            (index === 0 || messages[index - 1]?.senderId !== message.senderId);
          return (
            <div
              key={message.id}
              className={cn(
                "flex items-end gap-2 max-w-[70%]",
                isMe ? "self-end flex-row-reverse" : "self-start",
              )}
            >
              {!isMe && (
                <div className="size-8 shrink-0">
                  {showAvatar && (
                    <Avatar className="size-8">
                      <AvatarImage src={message.sender.image} />
                      <AvatarFallback className="text-xs">
                        {getUsernameFallback(message.sender.name ?? "")}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              )}
              <div
                className={cn(
                  "flex flex-col gap-1",
                  isMe ? "items-end" : "items-start",
                )}
              >
                {message.content && (
                  <div
                    className={cn(
                      "px-4 py-2 rounded-2xl text-sm wrap-break-word",
                      isMe
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : "bg-accent rounded-bl-none",
                    )}
                  >
                    {message.content}
                  </div>
                )}
                {message.media && message.media.length > 0 && (
                  <div
                    className={cn(
                      "grid gap-1",
                      message.media.length > 1 ? "grid-cols-2" : "grid-cols-1",
                    )}
                  >
                    {message.media.map((item) => (
                      <div
                        key={item.id}
                        className="relative aspect-3/4 w-full min-w-[140px] max-w-[240px] overflow-hidden rounded-xl border bg-muted group cursor-pointer"
                        onClick={() =>
                          setSelectedMedia({
                            url: item.mediaUrl,
                            type: item.mediaType,
                          })
                        }
                      >
                        {item.mediaType.startsWith("video/") ? (
                          <div className="relative size-full">
                            <Video
                              src={
                                item.id.startsWith("temp-")
                                  ? item.mediaUrl
                                  : `/video/${item.mediaUrl}`
                              }
                              className="size-full object-cover"
                              playsInline
                              muted
                              autoPlay
                              loop
                            />
                            <div className="absolute top-2 right-2 z-10 bg-black/40 rounded-full p-1 backdrop-blur-sm">
                              <Play className="size-3 text-white fill-current" />
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                              <Maximize2 className="size-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        ) : (
                          <>
                            <Image
                              src={
                                item.id.startsWith("temp-")
                                  ? item.mediaUrl
                                  : `/images/${item.mediaUrl}`
                              }
                              alt={item.altText || "Media"}
                              fill
                              className="object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                              <Maximize2 className="size-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {message.status === "sending" ? (
                  <span className="text-[10px] text-muted-foreground px-2">
                    {t("sending")}
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground px-2">
                    {format(new Date(message.createdAt), "HH:mm", {
                      locale: dateLocale,
                    })}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="p-4 flex flex-col gap-2">
        {previews.length > 0 && (
          <div className="flex gap-2 p-2 overflow-x-auto bg-accent/30 rounded-xl">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="size-20 shrink-0 rounded-lg border-2 border-dashed flex items-center justify-center hover:bg-accent/50 transition-colors"
            >
              <ImageIcon className="size-8 text-muted-foreground" />
            </button>
            {previews.map((preview, index) => (
              <div
                key={index}
                className="relative size-20 shrink-0 rounded-lg overflow-hidden border"
              >
                {selectedFiles[index]?.type.startsWith("video/") ? (
                  <div className="relative size-full">
                    <video src={preview} className="size-full object-cover" />
                    <div className="absolute top-1 left-1 z-10 bg-black/40 rounded-full p-1 backdrop-blur-sm">
                      <Play className="size-2 text-white fill-current" />
                    </div>
                  </div>
                ) : (
                  <Image
                    src={preview}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                )}
                <button
                  onClick={() => removeFile(index)}
                  className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5 hover:bg-background transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 p-2 px-4 rounded-full border bg-accent/30 focus-within:ring-1 focus-within:ring-primary transition-all">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 rounded-full"
              >
                <Smile className="size-6" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="start"
              className="p-0 border-none bg-transparent shadow-none mb-4"
            >
              <EmojiPicker
                theme={resolvedTheme === "dark" ? Theme.DARK : Theme.LIGHT}
                onEmojiClick={handleEmojiClick}
                lazyLoadEmojis={true}
              />
            </PopoverContent>
          </Popover>
          <Input
            ref={inputRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={t("typeMessage")}
            className="border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <div className="flex items-center gap-1 shrink-0">
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            {content.trim() || selectedFiles.length > 0 || isSending ? (
              <Button
                onClick={handleSend}
                variant="ghost"
                size="sm"
                className="text-primary font-semibold hover:bg-transparent"
              >
                {t("send")}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="size-6" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Media Viewer Modal */}
      <Dialog
        open={!!selectedMedia}
        onOpenChange={(open) => !open && setSelectedMedia(null)}
      >
        <DialogContent className="max-w-[95vw] w-full md:max-w-[800px] h-fit max-h-[95vh] p-0 overflow-hidden bg-black/90 border-none shadow-2xl">
          <DialogTitle className="hidden"></DialogTitle>
          {selectedMedia && (
            <div className="relative flex items-center justify-center w-full bg-black">
              {selectedMedia.type.startsWith("video/") ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Video
                    src={`/video/${selectedMedia.url}`}
                    className="w-full h-auto max-h-[90vh] object-contain"
                    controls
                    autoPlay
                    playsInline
                  />
                </div>
              ) : (
                <div className="relative w-full aspect-3/4 max-h-[90vh]">
                  <Image
                    src={`/images/${selectedMedia.url}`}
                    alt="Full size media"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatWindow;
