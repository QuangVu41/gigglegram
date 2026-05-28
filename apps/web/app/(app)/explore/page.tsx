import { Metadata } from "next";
import ExploreClientPage from "@/components/pages/explore/explore-client-page";

export const metadata: Metadata = {
  title: "Explore",
  description: "Explore the community on Gigglegram.",
};

export default function ExplorePage() {
  return <ExploreClientPage />;
}
