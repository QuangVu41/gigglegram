import { Metadata } from "next";
import ReelsClientPage from "@/components/pages/reels/reels-client-page";

export const metadata: Metadata = {
  title: "Reels",
  description: "Watch the best short videos on Gigglegram.",
};

export default function ReelsPage() {
  return <ReelsClientPage />;
}
