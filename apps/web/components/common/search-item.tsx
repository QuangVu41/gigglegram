"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUsernameFallback } from "@/lib/utils";
import { X, Hash } from "lucide-react";
import {
  getSearchItemKey,
  isUserSearchItem,
  SearchItemData,
  useSearchStore,
} from "@/hooks/use-search-store";
import { Button } from "@/components/ui/button";

interface SearchItemProps {
  item: SearchItemData;
}

const SearchItem = ({ item }: SearchItemProps) => {
  const data = useSearchStore((state) => state.data);
  const removeRecentSearch = useSearchStore(
    (state) => state.removeRecentSearch,
  );
  const isUser = isUserSearchItem(item);
  const searchKey = getSearchItemKey(item);

  return (
    <div className="flex items-center gap-4 w-full">
      {isUser ? (
        <Avatar className="h-10 w-10 rounded-full">
          <AvatarImage
            src={item.image || "/default-avatar.png"}
            alt={item.name}
          />
          <AvatarFallback className="rounded-lg">
            {getUsernameFallback(item.name)}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
          <Hash className="size-4" />
        </div>
      )}
      <div className="space-y-2">
        <h3 className="h-4 w-62.5">{isUser ? item.name : `#${item.name}`}</h3>
        <h4 className="h-4 w-50 text-foreground/70">
          {isUser ? item.username : `${item.postsCount} posts`}
        </h4>
      </div>
      {data.length < 1 && (
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto"
          onClick={() => removeRecentSearch(searchKey)}
        >
          <X />
        </Button>
      )}
    </div>
  );
};

export default SearchItem;
