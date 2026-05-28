"use client";

import { useParams, notFound } from "next/navigation";
import { useUserProfile } from "@/hooks/use-user-profile";
import { ProfileHeader } from "@/components/pages/profile/profile-header";
import { ProfilePostGrid } from "@/components/pages/profile/profile-post-grid";
import { ProfileSkeleton } from "@/components/pages/profile/profile-skeleton";
import Footer from "@/components/common/footer";
import { authClient } from "@/lib/auth/auth-client";
import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";

export const ProfileClientPage = () => {
  const { username } = useParams<{ username: string }>();
  const { data: user, isLoading, error } = useUserProfile(username);

  const session = authClient.useSession();
  const t = useTranslations("ProfilePage");

  const isPrivate = user?.userPrivacySetting?.accountPrivate || false;
  const isFollowing =
    user?.followers?.some(
      (f) => f.followerId === session.data?.user.id && f.status === "accepted",
    ) || false;
  const isOwnProfile = session.data?.user.id === user?.id;

  const shouldShowPosts = !isPrivate || isFollowing || isOwnProfile;

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  if (!user) {
    notFound();
  }

  if (error) {
    throw error;
  }

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto min-h-screen">
      <main className="flex-1 md:pb-0">
        <ProfileHeader user={user} />

        {!shouldShowPosts ? (
          <div className="border-t border-border/50 py-16 flex flex-col items-center justify-center gap-4 text-center px-4">
            <div className="p-4 border-2 border-foreground rounded-full">
              <Lock className="w-8 h-8" />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-semibold">
                {t("privateAccountTitle")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("privateAccountDescription")}
              </p>
            </div>
          </div>
        ) : (
          <ProfilePostGrid userId={user.id} isOwnProfile={isOwnProfile} />
        )}
      </main>

      {/* Profile Footer */}
      <div className="hidden md:block py-8 px-4 border-t border-border/50">
        <Footer />
      </div>
    </div>
  );
};
