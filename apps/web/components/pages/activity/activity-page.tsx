"use client";

import { useTranslations } from "next-intl";
import { Suspense } from "react";
import {
  ArrowRightLeft,
  ChevronLeft,
  Heart,
  MessageCircle,
  Images,
  History,
  Grid3X3,
  Film,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { ActivityLikes } from "./activity-likes";
import { ActivityComments } from "./activity-comments";
import { ActivityMedia } from "./activity-media";
import Footer from "@/components/common/footer";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

function ActivityContent() {
  const t = useTranslations("ActivityPage");
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSection = searchParams.get("section") || "interactions";
  const activeTab =
    searchParams.get("tab") ||
    (activeSection === "interactions" ? "likes" : "posts");

  const handleSectionChange = (section: string) => {
    const params = new URLSearchParams();
    params.set("section", section);
    // Set default tab for each section
    if (section === "interactions") params.set("tab", "likes");
    else if (section === "photos-and-videos") params.set("tab", "posts");
    router.replace(`/activity?${params.toString()}`, { scroll: false });
  };

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.replace(`/activity?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex h-full md:h-dvh bg-transparent overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        collapsible="none"
        className="w-80 border-r border-border hidden md:flex shrink-0 h-full bg-background/70"
      >
        <SidebarHeader className="p-6">
          <h1 className="text-xl font-bold">{t("title")}</h1>
        </SidebarHeader>
        <SidebarContent className="px-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={activeSection === "interactions"}
                onClick={() => handleSectionChange("interactions")}
                className="h-14 px-3"
              >
                <ArrowRightLeft className="size-5! shrink-0" />
                <div className="flex flex-col gap-0.5 overflow-hidden">
                  <span className="font-medium truncate">
                    {t("sidebar.interactions")}
                  </span>
                  <span className="text-[11px] text-muted-foreground truncate leading-tight">
                    {t("likes.description").split(".")[0]}
                  </span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={activeSection === "photos-and-videos"}
                onClick={() => handleSectionChange("photos-and-videos")}
                className="h-14 px-3"
              >
                <Images className="size-5! shrink-0" />
                <div className="flex flex-col gap-0.5 overflow-hidden">
                  <span className="font-medium truncate">
                    {t("sidebar.photosAndVideos")}
                  </span>
                  <span className="text-[11px] text-muted-foreground truncate leading-tight">
                    {t("photosAndVideos.description").split(".")[0]}
                  </span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={false}
                className="h-14 px-3 opacity-50 cursor-not-allowed"
              >
                <History className="size-5! shrink-0" />
                <div className="flex flex-col gap-0.5 overflow-hidden">
                  <span className="font-medium truncate">
                    {t("sidebar.accountHistory")}
                  </span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>

      {/* Main Content */}
      <SidebarInset className="flex-1 flex flex-col min-h-0 overflow-hidden bg-transparent">
        <div className="flex-1 overflow-y-auto no-scrollbar mt-10">
          <div className="max-w-4xl mx-auto w-full px-4 pb-8 md:px-8">
            <h2 className="text-lg font-bold mb-2 md:text-2xl">
              {activeSection === "interactions"
                ? t("sidebar.interactions")
                : t("sidebar.photosAndVideos")}
            </h2>
            <p className="text-sm text-muted-foreground mb-8">
              {activeSection === "interactions"
                ? activeTab === "likes"
                  ? t("likes.description")
                  : t("comments.description")
                : t("photosAndVideos.description")}
            </p>

            <Tabs
              value={activeTab}
              onValueChange={handleTabChange}
              className="w-full"
            >
              {activeSection === "interactions" ? (
                <>
                  <TabsList className="w-full justify-start h-auto bg-transparent border-b border-border p-0 rounded-none gap-8 mb-8">
                    <TabsTrigger
                      value="likes"
                      className="flex items-center justify-center py-4 px-2 border-0 data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:border-b-4 text-muted-foreground data-[state=active]:bg-transparent! rounded-none transition-none -mt-px shadow-none!"
                    >
                      <Heart className="w-5! h-5! mr-2" />
                      {t("sidebar.likes")}
                    </TabsTrigger>
                    <TabsTrigger
                      value="comments"
                      className="flex items-center justify-center py-4 px-2 border-0 data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:border-b-4 text-muted-foreground data-[state=active]:bg-transparent! rounded-none transition-none -mt-px shadow-none!"
                    >
                      <MessageCircle className="w-5! h-5! mr-2" />
                      {t("sidebar.comments")}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent
                    value="likes"
                    className="mt-0 focus-visible:outline-none"
                  >
                    <ActivityLikes />
                  </TabsContent>
                  <TabsContent
                    value="comments"
                    className="mt-0 focus-visible:outline-none"
                  >
                    <ActivityComments />
                  </TabsContent>
                </>
              ) : (
                <>
                  <TabsList className="w-full justify-start h-auto bg-transparent border-b border-border p-0 rounded-none gap-8 mb-8">
                    <TabsTrigger
                      value="posts"
                      className="flex items-center justify-center py-4 px-2 border-0 data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:border-b-4 text-muted-foreground data-[state=active]:bg-transparent! rounded-none transition-none -mt-px shadow-none!"
                    >
                      <Grid3X3 className="w-5! h-5! mr-2" />
                      {t("sidebar.posts")}
                    </TabsTrigger>
                    <TabsTrigger
                      value="reels"
                      className="flex items-center justify-center py-4 px-2 border-0 data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:border-b-4 text-muted-foreground data-[state=active]:bg-transparent! rounded-none transition-none -mt-px shadow-none!"
                    >
                      <Film className="w-5! h-5! mr-2" />
                      {t("sidebar.reels")}
                    </TabsTrigger>
                    <TabsTrigger
                      value="highlights"
                      className="flex items-center justify-center py-4 px-2 border-0 data-[state=active]:border-foreground data-[state=active]:text-foreground data-[state=active]:border-b-4 text-muted-foreground data-[state=active]:bg-transparent! rounded-none transition-none -mt-px shadow-none!"
                    >
                      <History className="w-5! h-5! mr-2" />
                      {t("sidebar.highlights")}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent
                    value="posts"
                    className="mt-0 focus-visible:outline-none"
                  >
                    <ActivityMedia type="post" />
                  </TabsContent>
                  <TabsContent
                    value="reels"
                    className="mt-0 focus-visible:outline-none"
                  >
                    <ActivityMedia type="reel" />
                  </TabsContent>
                  <TabsContent
                    value="highlights"
                    className="mt-0 focus-visible:outline-none"
                  >
                    <ActivityMedia type="highlight" />
                  </TabsContent>
                </>
              )}
            </Tabs>
          </div>

          {/* Footer */}
          <div className="hidden md:block py-12 px-4">
            <Footer />
          </div>
        </div>
      </SidebarInset>
    </div>
  );
}

function ActivityIcon({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-primary/10 p-1.5",
        className,
      )}
    >
      <Heart className="w-full h-full text-primary" />
    </div>
  );
}

export default function ActivityPage() {
  return (
    <Suspense>
      <ActivityContent />
    </Suspense>
  );
}
