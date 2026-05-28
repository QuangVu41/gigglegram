"use client";

import { usePost } from "@/hooks/use-post";
import { PostDetail } from "@/components/common/post-detail";
import { PostDetailSkeleton } from "@/components/common/post-detail-skeleton";
import { notFound } from "next/navigation";

import { use } from "react";

export default function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: post, isLoading, isError } = usePost(id);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-5xl">
          <PostDetailSkeleton />
        </div>
      </div>
    );
  }

  if (isError || !post) {
    notFound();
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-5xl">
        <PostDetail post={post} />
      </div>
    </div>
  );
}
