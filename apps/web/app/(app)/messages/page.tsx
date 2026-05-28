import { Metadata } from "next";
import MessagesClientPage from "@/components/pages/messages/MessagesClientPage";

export const metadata: Metadata = {
  title: "Messages",
  description: "Send photos and private messages to a friend or group.",
};

export default function MessagesPage() {
  return <MessagesClientPage />;
}
