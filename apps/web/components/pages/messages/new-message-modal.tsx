"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { Loader2, Search, SearchIcon, X } from "lucide-react";
import { useSearchStore, isUserSearchItem } from "@/hooks/use-search-store";
import { users } from "@repo/database";
import { useRouter } from "next/navigation";
import { cn, getUsernameFallback } from "@/lib/utils";
import { SkeletonSearch } from "@/components/common/skeleton-search";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { axiosGateway, OkResponse } from "@/lib/axios-config";
import { Conversation, useConversations } from "@/hooks/use-conversations";
import { toast } from "sonner";

interface NewMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewMessageModal = ({ isOpen, onClose }: NewMessageModalProps) => {
  const t = useTranslations("MessagesPage");
  const {
    data: searchData,
    fetchData,
    isLoading,
    clearData,
  } = useSearchStore();
  const { data: conversations, isLoading: isConversationsLoading } =
    useConversations();
  const [keyword, setKeyword] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<
    (typeof users.$inferSelect)[]
  >([]);
  const anchor = useComboboxAnchor();
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (keyword.trim()) {
      const timeoutId = setTimeout(() => {
        fetchData({ keyword });
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      clearData();
    }
  }, [keyword, fetchData, clearData]);

  const handleToggleUser = (user: typeof users.$inferSelect) => {
    setSelectedUsers((prev) => {
      const exists = prev.find((u) => u.id === user.id);
      if (exists) {
        return prev.filter((u) => u.id !== user.id);
      }
      return [...prev, user];
    });
    setKeyword("");
  };

  const handleValueChange = (values: string[]) => {
    setSelectedUsers((prev) => {
      // Create a pool of users we know about (currently selected + search results)
      const pool = [...prev, ...searchData.filter(isUserSearchItem)];
      // Filter the pool based on the new values (usernames)
      const next = pool.filter((u) => values.includes(u.username));
      // Ensure uniqueness by id
      return Array.from(new Map(next.map((u) => [u.id, u])).values());
    });
    setKeyword("");
  };

  const handleChat = async () => {
    if (selectedUsers.length === 0) return;

    setIsCreating(true);
    try {
      if (selectedUsers.length === 1) {
        const res = await axiosGateway.post<OkResponse<Conversation>>(
          "/api/real-time/conversations/private",
          {
            targetUserId: selectedUsers[0]!.id,
          },
        );
        if (res.data.success) {
          router.push(`/messages/${res.data.data.id}`);
          onClose();
        }
      } else {
        const res = await axiosGateway.post<OkResponse<Conversation>>(
          "/api/real-time/conversations/create-group-chat",
          {
            memberIds: selectedUsers.map((u) => u.id),
            groupName: selectedUsers
              .map((u) => u.name || u.username)
              .join(", "),
          },
        );
        if (res.data.success) {
          router.push(`/messages/${res.data.data.id}`);
          onClose();
        }
      }
    } catch (error) {
      console.error(error);
      toast.error(t("startConversationError"));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] p-0 gap-0 overflow-hidden flex flex-col h-[500px]">
        <DialogHeader className="p-4 border-b shrink-0 flex-row items-center justify-between">
          <DialogTitle className="text-center font-bold text-base">
            {t("newMessage")}
          </DialogTitle>
        </DialogHeader>

        <Combobox
          items={searchData.filter(isUserSearchItem).map((u) => u.username)}
          value={selectedUsers.map((u) => u.username)}
          multiple
          inputValue={keyword}
          onInputValueChange={setKeyword}
          onValueChange={handleValueChange}
        >
          <div className="px-4 py-2 border-b shrink-0 flex items-center gap-3">
            <span className="font-bold text-sm shrink-0">{t("to")}:</span>
            <ComboboxChips
              ref={anchor}
              className="border-none shadow-none focus-within:ring-0 p-0 min-h-8 bg-transparent dark:bg-transparent flex-1 gap-2"
            >
              <ComboboxValue>
                {(values) => (
                  <>
                    {selectedUsers.map((user) => (
                      <ComboboxChip
                        key={user.id}
                        className="bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors h-7 px-3"
                      >
                        {user.name || user.username}
                      </ComboboxChip>
                    ))}
                    <div className="flex items-center flex-1 gap-2 min-w-[100px]">
                      {selectedUsers.length === 0 && (
                        <SearchIcon className="size-4 opacity-50 shrink-0" />
                      )}
                      <ComboboxChipsInput
                        placeholder={
                          selectedUsers.length === 0
                            ? t("searchPlaceholder")
                            : ""
                        }
                        className="text-sm h-8 w-full"
                      />
                    </div>
                  </>
                )}
              </ComboboxValue>
            </ComboboxChips>
          </div>

          <ScrollArea className="flex-1 h-40">
            {isLoading ||
            (isConversationsLoading &&
              !keyword.trim() &&
              selectedUsers.length === 0) ? (
              <div className="p-2">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="px-4 py-3">
                    <SkeletonSearch />
                  </div>
                ))}
              </div>
            ) : searchData.length > 0 ? (
              <ComboboxList className="p-0">
                {searchData.filter(isUserSearchItem).map((user) => {
                  const isSelected = selectedUsers.some(
                    (u) => u.id === user.id,
                  );
                  return (
                    <ComboboxItem
                      key={user.id}
                      value={user.username}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left border-none shadow-none cursor-pointer data-highlighted:bg-accent"
                    >
                      <Avatar className="size-11">
                        <AvatarImage src={user.image || ""} />
                        <AvatarFallback className="text-xs">
                          {getUsernameFallback(
                            user.name || user.username || "",
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col flex-1">
                        <span className="text-sm font-bold leading-none mb-1">
                          {user.name || user.username}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          @{user.username}
                        </span>
                      </div>
                      <div
                        className={cn(
                          "size-6 rounded-full border flex items-center justify-center transition-colors",
                          isSelected
                            ? "bg-primary border-primary"
                            : "border-muted-foreground/30",
                        )}
                      >
                        {isSelected && (
                          <div className="size-2 rounded-full bg-white animate-in zoom-in-50 duration-200" />
                        )}
                      </div>
                    </ComboboxItem>
                  );
                })}
              </ComboboxList>
            ) : keyword.trim() ? (
              <div className="flex flex-col items-center justify-center h-full py-10 px-4 text-center">
                <p className="text-sm text-muted-foreground">
                  {t("noUsersFound")}
                </p>
              </div>
            ) : (
              <div className="py-2">
                {conversations && conversations.length > 0 ? (
                  <>
                    <p className="text-xs font-bold text-muted-foreground px-4 mb-2 uppercase tracking-wider">
                      {t("suggestedUsers")}
                    </p>
                    {conversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => {
                          router.push(`/messages/${conv.id}`);
                          onClose();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left"
                      >
                        <Avatar className="size-11">
                          <AvatarImage src={conv.displayImage} />
                          <AvatarFallback className="text-xs">
                            {getUsernameFallback(conv.displayName || "")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col flex-1">
                          <span className="text-sm font-bold leading-none mb-1">
                            {conv.displayName}
                          </span>
                          {conv.type === "direct" && conv.otherParticipant && (
                            <span className="text-xs text-muted-foreground">
                              @{conv.otherParticipant.username}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground px-4 italic">
                    {t("searchPrompt")}
                  </p>
                )}
              </div>
            )}
          </ScrollArea>
        </Combobox>

        <div className="p-4 border-t mt-auto shrink-0">
          <Button
            className="w-full"
            disabled={selectedUsers.length === 0 || isCreating}
            onClick={handleChat}
          >
            {isCreating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              t("chat")
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
