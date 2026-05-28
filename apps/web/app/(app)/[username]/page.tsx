import { ProfileClientPage } from "@/components/pages/profile/profile-client-page";
import { Metadata } from "next";

type Props = {
  params: Promise<{ username: string }>;
};

async function getProfile(username: string) {
  "use cache";
  if (!username || username.includes("[") || username.includes("%")) {
    return null;
  }
  const gatewayUrl = process.env.API_GATEWAY_URL;
  if (!gatewayUrl) return null;
  try {
    const response = await fetch(`${gatewayUrl}/api/users/by/${username}`);
    return await response.json();
  } catch (error) {
    console.error("Error fetching profile data:", error);
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;

  try {
    const data = await getProfile(username);

    if (data && data.success && data.data) {
      const user = data.data;
      return {
        title: `${user.name} (@${user.username})`,
        description: user.bio || `See photos and videos from ${user.name} (@${user.username}) on Gigglegram.`,
        openGraph: {
          title: `${user.name} (@${user.username}) • Gigglegram photos and videos`,
          description: user.bio || `See photos and videos from ${user.name} (@${user.username}) on Gigglegram.`,
          images: user.image ? [`/${user.image}`] : [],
        },
      };
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

export default async function Page({ params }: Props) {
  const { username } = await params;

  // Call the same fetch in the Page component to ensure the page segment matches
  await getProfile(username);

  return <ProfileClientPage />;
}
