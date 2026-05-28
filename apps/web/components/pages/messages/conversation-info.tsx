"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslations } from "next-intl";
import { Bell, Flag, Slash, Trash2, ChevronRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Conversation,
  useToggleMuteConversation,
  useDeleteChat,
} from "@/hooks/use-conversations";
import { getUsernameFallback } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ConversationInfoProps {
  conversation: Conversation;
}

const ConversationInfo = ({ conversation }: ConversationInfoProps) => {
  const t = useTranslations("MessagesPage");
  const toggleMuteMutation = useToggleMuteConversation();
  const deleteMutation = useDeleteChat();
  const router = useRouter();

  const handleToggleMute = async () => {
    try {
      await toggleMuteMutation.mutateAsync(conversation.id);
      toast.success(
        conversation.notificationsEnabled
          ? t("mutedSuccess")
          : t("unmutedSuccess"),
      );
    } catch (error) {
      toast.error(
        conversation.notificationsEnabled ? t("mutedError") : t("unmutedError"),
      );
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(conversation.id);
      toast.success(t("deletedSuccess"));
      router.push("/messages");
    } catch (error) {
      toast.error(t("deletedError"));
    }
  };

  const members = conversation.participants || [];

  return (
    <div className="hidden xl:flex flex-col h-full border-l bg-background w-[320px]">
      <div className="p-6 flex flex-col items-center gap-4 border-b">
        <h2 className="font-bold text-xl self-start w-full">{t("details")}</h2>
        <Avatar className="size-20 border">
          <AvatarImage src={conversation.displayImage} />
          <AvatarFallback className="text-xs">
            {getUsernameFallback(conversation.displayName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col items-center text-center px-4">
          <span className="font-bold text-lg line-clamp-1">
            {conversation.displayName}
          </span>
          {conversation.otherParticipant && (
            <span className="text-sm text-muted-foreground">
              @{conversation.otherParticipant.username}
            </span>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 flex flex-col gap-6">
          {/* Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-accent p-2 rounded-full">
                <Bell className="size-5" />
              </div>
              <span className="text-sm font-medium">{t("mute")}</span>
            </div>
            <Switch
              checked={!conversation.notificationsEnabled}
              onCheckedChange={handleToggleMute}
              disabled={toggleMuteMutation.isPending}
            />
          </div>

          {/* Members */}
          <div className="flex flex-col gap-3">
            <h3 className="font-bold text-sm text-muted-foreground uppercase px-2">
              {t("members")}
            </h3>
            <div className="flex flex-col gap-1">
              {members.map((member) => (
                <Link
                  key={member.id}
                  href={`/${member.username}`}
                  className="flex items-center justify-between group cursor-pointer p-2 rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="size-10 border">
                      <AvatarImage src={member.image} />
                      <AvatarFallback className="text-xs">
                        {getUsernameFallback(member.name || member.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium line-clamp-1">
                        {member.name || member.username}
                      </span>
                      <span className="text-xs text-muted-foreground line-clamp-1">
                        @{member.username}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1 pt-4 border-t">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  className="justify-start gap-3 font-normal text-destructive hover:text-destructive hover:bg-destructive/10 h-12 px-2"
                >
                  <Trash2 className="size-5" />
                  <span className="text-sm">{t("deleteChat")}</span>
                </Button>
              </AlertDialogTrigger>
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
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {t("delete")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default ConversationInfo;
