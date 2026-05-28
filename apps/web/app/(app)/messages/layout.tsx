import ConversationList from "@/components/pages/messages/conversation-list";
import { ChevronDown } from "lucide-react";
import { NewMessageTrigger } from "@/components/pages/messages/new-message-trigger";
import { getTranslations } from "next-intl/server";
import { authClient } from "@/lib/auth/auth-client";
import { headers } from "next/headers";
import Link from "next/link";

export default async function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("MessagesPage");
  const session = await authClient.getSession({
    fetchOptions: { headers: await headers() },
  });
  const username = session?.data?.user?.username || "username";

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden border-l">
      {/* Conversation Sidebar */}
      <div className="w-full md:w-[350px] lg:w-[400px] flex flex-col border-r h-full shrink-0">
        <div className="p-6 flex items-center justify-between h-[100px] shrink-0">
          <button className="flex items-center gap-2 hover:opacity-70 transition-opacity">
            <h1 className="text-xl font-bold">
              <Link href={`/${username}`}>{username}</Link>
            </h1>
          </button>
          <NewMessageTrigger />
        </div>

        {/* User said ignore "ghi chú của bạn" and search bar */}

        <ConversationList />
      </div>

      {/* Main Content (Chat or Default) */}
      <div className="flex-1 h-full min-w-0">{children}</div>
    </div>
  );
}
