import ActivityPage from "@/components/pages/activity/activity-page";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your activity • Gigglegram",
};

export default function Page() {
  return <ActivityPage />;
}
