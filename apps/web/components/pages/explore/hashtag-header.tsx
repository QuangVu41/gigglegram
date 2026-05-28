"use client";

import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HashtagHeaderProps {
  hashtag: string;
}

export function HashtagHeader({ hashtag }: HashtagHeaderProps) {
  return (
    <div className="flex items-center justify-between py-6 px-4 w-full border-b border-border">
      <div className="flex items-center gap-2">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight">
          #{hashtag}
        </h1>
      </div>

      <Button variant="ghost" size="icon" className="rounded-full">
        <MoreHorizontal className="w-6 h-6" />
      </Button>
    </div>
  );
}
