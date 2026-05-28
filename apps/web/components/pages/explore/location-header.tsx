"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Location } from "@/hooks/use-location";

const StaticMap = dynamic(() => import("@/components/reui/static-map"), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-full rounded-none" />,
});

interface LocationHeaderProps {
  location: Location;
}

export function LocationHeader({ location }: LocationHeaderProps) {
  const t = useTranslations("LocationPage");

  return (
    <div className="flex flex-col w-full border-b border-border mb-8">
      {/* Map Section */}
      <div className="w-full h-[250px] md:h-[350px] relative bg-muted overflow-hidden">
        <StaticMap
          lat={Number(location.latitude)}
          lng={Number(location.longitude)}
          className="w-full h-full"
        />
      </div>

      {/* Info Section */}
      <div className="flex flex-col px-4 py-6 md:px-0">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 md:h-24 md:w-24 rounded-full border border-border flex items-center justify-center bg-background shrink-0">
            <MapPin className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground" />
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-xl md:text-2xl font-bold">{location.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {location.city}, {location.country}
            </p>
            <p className="text-sm font-semibold mt-2">
              {location.postsCount}{" "}
              <span className="font-normal text-muted-foreground">
                {t("posts")}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
