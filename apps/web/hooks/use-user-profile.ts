"use client";

import { useQuery } from "@tanstack/react-query";
import { axiosGateway, OkResponse } from "@/lib/axios-config";

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  image: string | null;
  bio: string | null;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  userPrivacySetting?: {
    accountPrivate: boolean;
  };
  posts: Array<{
    id: string;
    postMedia: Array<{
      mediaUrl: string;
      mediaType: string;
    }>;
  }>;
  followers: Array<{
    followerId: string;
    status: string;
  }>;
  following: Array<{
    followingId: string;
    status: string;
  }>;
}

export function useUserProfile(username: string) {
  return useQuery({
    queryKey: ["user-profile", username],
    queryFn: async () => {
      const response = await axiosGateway.get<OkResponse<UserProfile>>(
        `/api/users/by/${username}`,
      );
      return response.data.data;
    },
    enabled: !!username,
  });
}
