"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { SkeletonSearch } from "@/components/common/skeleton-search";
import { useTranslations } from "next-intl";
import { useDebouncedCallback } from "use-debounce";
import { isUserSearchItem, SearchItemData, useSearchStore } from "@/hooks/use-search-store";
import SearchItem from "@/components/common/search-item";
import { useRouter } from "next/navigation";

interface SearchCommandProps {
  children?: React.ReactElement<{
    onClick?: React.MouseEventHandler<HTMLElement>;
  }>;
  className?: string;
}

export function SearchCommand({ children, className }: SearchCommandProps) {
  const [open, setOpen] = React.useState(false);
  const t = useTranslations("NavMain");
  const fetchData = useSearchStore((state) => state.fetchData);
  const isLoading = useSearchStore((state) => state.isLoading);
  const data = useSearchStore((state) => state.data);
  const clearData = useSearchStore((state) => state.clearData);
  const saveRecentSearch = useSearchStore((state) => state.saveRecentSearch);
  const getRecentSearches = useSearchStore((state) => state.getRecentSearches);
  const recentSearches = useSearchStore((state) => state.recentSearches);
  const router = useRouter();

  React.useEffect(() => {
    if (data.length < 1) {
      getRecentSearches();
    }
  }, [data, getRecentSearches]);

  const onValueChange = useDebouncedCallback((value: string) => {
    if (value) fetchData({ keyword: value });
    else clearData();
  }, 300);

  const onSelect = (item: SearchItemData) => {
    saveRecentSearch(item);
    setOpen(false);

    if (isUserSearchItem(item)) {
      router.push(`/${item.username}`);
      clearData();
      return;
    }

    router.push(`/explore?keyword=%23${encodeURIComponent(item.name)}`);
    clearData();
  };

  const onRecentSelect = (item: SearchItemData) => {
    if (isUserSearchItem(item)) {
      router.push(`/${item.username}`);
    } else {
      router.push(`/explore?keyword=%23${encodeURIComponent(item.name)}`);
    }

    clearData();
    setOpen(false);
  };

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {children ? (
        React.cloneElement(children, {
          onClick: (event: React.MouseEvent<HTMLElement>) => {
            children.props.onClick?.(event);
            setOpen(true);
          },
        })
      ) : (
        <Button variant="outline" className="w-full justify-start" onClick={() => setOpen(true)}>
          {t("search")}
        </Button>
      )}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <Command loop shouldFilter={false}>
          <CommandInput placeholder={t("search")} onValueChange={onValueChange} />
          <CommandList>
            {isLoading ? (
              <CommandGroup>
                {Array.from({ length: 3 }).map((_, idx) => (
                  <CommandItem key={idx} disabled>
                    <SkeletonSearch />
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : (
              <>
                <CommandEmpty>{t("noResults")}</CommandEmpty>
                {data.length > 0 && (
                  <CommandGroup>
                    {data.map((item) => (
                      <CommandItem
                        key={`${isUserSearchItem(item) ? "user" : "hashtag"}:${item.id}`}
                        value={isUserSearchItem(item) ? item.username : `#${item.name}`}
                        onSelect={() => onSelect(item)}
                      >
                        <SearchItem item={item} />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {data.length < 1 && recentSearches.length > 0 && (
                  <CommandGroup heading={t("recent")}>
                    {recentSearches.map((item) => (
                      <CommandItem
                        key={`${isUserSearchItem(item) ? "user" : "hashtag"}:${item.id}`}
                        value={isUserSearchItem(item) ? item.username : `#${item.name}`}
                        onSelect={() => onRecentSelect(item)}
                      >
                        <SearchItem item={item} />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </CommandDialog>
    </div>
  );
}
