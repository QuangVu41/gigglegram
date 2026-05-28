"use client";

import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { axiosGateway, FindManyResponse, OkResponse } from "@/lib/axios-config";
import { PostWithRelations } from "@/hooks/use-feed";

export interface SavedPostWithRelations {
  id: string;
  userId: string;
  postId: string;
  collectionId: string | null;
  createdAt: string;
  post: PostWithRelations;
}

export interface SavedCollection {
  id: string;
  userId: string;
  name: string;
  postsCount: number;
  createdAt: string;
  updatedAt: string;
  savedPosts?: SavedPostWithRelations[];
}

export function useUserSavedCollections(options?: { enabled?: boolean }) {
  return useInfiniteQuery({
    queryKey: ["user-saved-collections"],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await axiosGateway.get<
        FindManyResponse<SavedCollection>
      >(`/api/posts/collections`, {
        params: {
          page: pageParam,
          limit: 12,
        },
      });
      return response.data;
    },
    getNextPageParam: (lastPage) => {
      return lastPage.metadata?.nextPage ?? undefined;
    },
    initialPageParam: 1,
    enabled: options?.enabled ?? true,
  });
}

export function useUserSavedCollection(
  collectionId: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ["user-saved-collection", collectionId],
    queryFn: async () => {
      const response = await axiosGateway.get<OkResponse<SavedCollection>>(
        `/api/posts/collections/${collectionId}`,
      );
      return response.data.data;
    },
    enabled: !!collectionId && (options?.enabled ?? true),
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; savedPostIds?: string[] }) => {
      const response = await axiosGateway.post<OkResponse<SavedCollection>>(
        `/api/posts/collections`,
        data,
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-saved-collections"] });
    },
  });
}

export function useUpdateCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      collectionId,
      name,
    }: {
      collectionId: string;
      name: string;
    }) => {
      const response = await axiosGateway.patch<OkResponse<SavedCollection>>(
        `/api/posts/collections/${collectionId}`,
        {
          name,
        },
      );
      return response.data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user-saved-collections"] });
      queryClient.invalidateQueries({
        queryKey: ["user-saved-collection", variables.collectionId],
      });
    },
  });
}

export function useDeleteCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (collectionId: string) => {
      const response = await axiosGateway.delete<OkResponse<SavedCollection>>(
        `/api/posts/collections/${collectionId}`,
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-saved-collections"] });
    },
  });
}

export function useAddPostsToCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      collectionId,
      postIds,
    }: {
      collectionId: string;
      postIds: string[];
    }) => {
      const response = await axiosGateway.patch<unknown>(
        `/api/posts/collections/${collectionId}/add-posts`,
        {
          postIds,
        },
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user-saved-collections"] });
      queryClient.invalidateQueries({
        queryKey: ["user-saved-collection", variables.collectionId],
      });
    },
  });
}

export function useDeletePostsFromCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      collectionId,
      postIds,
    }: {
      collectionId: string;
      postIds: string[];
    }) => {
      // In Axios, DELETE with body is passed in config.data
      const response = await axiosGateway.delete<unknown>(
        `/api/posts/collections/${collectionId}/delete-posts`,
        {
          data: { postIds },
        },
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user-saved-collections"] });
      queryClient.invalidateQueries({
        queryKey: ["user-saved-collection", variables.collectionId],
      });
    },
  });
}
