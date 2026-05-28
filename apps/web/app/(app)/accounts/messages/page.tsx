import { MessagesForm } from "@/components/pages/accounts/messages-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Messages and story replies settings | Gigglegram",
  description: "Manage who can message you and see your activity status.",
};

export default function MessagesSettingsPage() {
  return <MessagesForm />;
}
