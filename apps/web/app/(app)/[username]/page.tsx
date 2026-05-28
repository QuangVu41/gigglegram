import { ProfileClientPage } from "@/components/pages/profile/profile-client-page";
import { Metadata } from "next";

import { Suspense } from "react";
import { connection } from "next/server";

type Props = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;

  try {
    // Attempt to fetch user data for better metadata (name, bio, etc.)
    // We use the internal gateway URL if available, otherwise fallback to basic metadata
    const gatewayUrl = process.env.API_GATEWAY_URL;
    if (gatewayUrl) {
      const response = await fetch(`${gatewayUrl}/api/users/by/${username}`, {
        next: { revalidate: 3600 }, // Cache for 1 hour
      });
      const data = await response.json();

      if (data.success && data.data) {
        const user = data.data;
        return {
          title: `${user.name} (@${user.username})`,
          description:
            user.bio ||
            `See photos and videos from ${user.name} (@${user.username}) on Gigglegram.`,
          openGraph: {
            title: `${user.name} (@${user.username}) • Gigglegram photos and videos`,
            description:
              user.bio ||
              `See photos and videos from ${user.name} (@${user.username}) on Gigglegram.`,
            images: user.image ? [`/${user.image}`] : [],
          },
        };
      }
    }
  } catch (error) {
    console.error("Error generating metadata for profile:", error);
  }

  // Fallback metadata if fetch fails or user not found
  return {
    title: `@${username}`,
    description: `View @${username}'s profile on Gigglegram.`,
  };
}

const Connection = async () => {
  await connection();
  return null;
};

async function DynamicMarker() {
  return (
    <Suspense>
      <Connection />
    </Suspense>
  );
}

export default function Page() {
  return (
    <>
      <ProfileClientPage />
      <DynamicMarker />
    </>
  );
}
