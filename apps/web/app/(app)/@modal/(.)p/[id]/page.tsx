"use client";

import { usePost } from "@/hooks/use-post";
import { PostDetail } from "@/components/common/post-detail";
import { PostDetailSkeleton } from "@/components/common/post-detail-skeleton";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { use, useState, useEffect } from "react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { XIcon } from "lucide-react";

import { useIsMobile } from "@/hooks/use-mobile";

export default function PostModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const isMobile = useIsMobile();
  const { data: post, isLoading } = usePost(id);
  const [open, setOpen] = useState(true);

  // Redirect to full page on mobile
  useEffect(() => {
    if (isMobile) {
      // router.push(`/p/${id}`);
      window.location.href = `/p/${id}`;
    }
  }, [isMobile, id, router]);

  // Reset open state when id changes
  useEffect(() => {
    setOpen(true);
  }, [id]);

  // Close modal when open state changes to false
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setOpen(false);
      router.back();
    }
  };

  if (isMobile) return null;

  if (isLoading) {
    return (
      <Dialog key={id} open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="max-w-[90vw] md:max-w-5xl p-0 h-fit md:h-[90vh] overflow-visible bg-background border-none shadow-2xl"
        >
          <VisuallyHidden>
            <DialogTitle>Loading post...</DialogTitle>
          </VisuallyHidden>
          <div className="w-full h-full overflow-hidden rounded-lg">
            <PostDetailSkeleton isModal />
          </div>
        </DialogContent>

        {/* Custom Close Button (Instagram Style) */}
        {open && (
          <button
            onClick={() => handleOpenChange(false)}
            className="fixed top-4 right-4 md:top-6 md:right-6 text-white hover:opacity-70 transition-opacity z-60"
            aria-label="Close"
          >
            <XIcon className="h-8 w-8 md:h-10 md:w-10" />
          </button>
        )}
      </Dialog>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <Dialog key={id} open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[90vw] md:max-w-5xl p-0 h-fit md:h-[90vh] overflow-visible bg-background border shadow-2xl"
      >
        <VisuallyHidden>
          <DialogTitle>Post by {post.user.username}</DialogTitle>
        </VisuallyHidden>
        <div className="w-full h-full overflow-hidden rounded-lg">
          <PostDetail post={post} isModal />
        </div>
      </DialogContent>

      {/* Custom Close Button (Instagram Style) */}
      {open && (
        <button
          onClick={() => handleOpenChange(false)}
          className="fixed top-4 right-4 md:top-6 md:right-6 text-white hover:opacity-70 transition-opacity z-60"
          aria-label="Close"
        >
          <XIcon className="h-8 w-8 md:h-10 md:w-10" />
        </button>
      )}
    </Dialog>
  );
}
