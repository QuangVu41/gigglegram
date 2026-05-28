import { Metadata } from "next";
import ConversationClientPage from "@/components/pages/messages/conversation-client-page";

export const metadata: Metadata = {
  title: "Chat",
  description: "Chat with your friends on Gigglegram.",
};

export default function ConversationPage() {
  return <ConversationClientPage />;
}
