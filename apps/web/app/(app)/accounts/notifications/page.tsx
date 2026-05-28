import { NotificationsForm } from "@/components/pages/accounts/notifications-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notifications Settings | Gigglegram",
  description: "Manage your notification settings on Gigglegram.",
};

export default function NotificationsSettingsPage() {
  return <NotificationsForm />;
}
