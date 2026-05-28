import { StoriesHeader } from "@/components/pages/home/stories-header";
import { Feed } from "@/components/pages/home/feed";
import { FeedSidebar } from "@/components/pages/home/feed-sidebar";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gigglegram",
  description: "Share your moments with friends.",
};

const HomePage = () => {
  return (
    <div className="flex flex-col items-center w-full max-w-5xl mx-auto h-full min-h-dvh">
      <StoriesHeader />
      <div className="flex w-full gap-8 justify-center">
        <Feed />
        <FeedSidebar />
      </div>
    </div>
  );
};

export default HomePage;
