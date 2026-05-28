"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  NAV_DASHBOARD,
  type DashboardNavItem,
} from "@/constants/nav-dashboard";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import React from "react";

export default function DashboardBreadcrumb() {
  const pathname = usePathname();
  const t = useTranslations("Dashboard.sidebar");

  const breadcrumbs = React.useMemo(() => {
    const findPath = (
      items: DashboardNavItem[],
      targetPath: string,
      currentPath: { title: string; url: string }[] = [],
    ): { title: string; url: string }[] | null => {
      for (const item of items) {
        const newPath = [...currentPath, { title: item.title, url: item.url }];

        if (item.url !== "#" && item.url === targetPath) {
          return newPath;
        }

        if (item.items) {
          const found = findPath(item.items, targetPath, newPath);
          if (found) return found;
        }
      }
      return null;
    };

    const path = findPath(NAV_DASHBOARD, pathname);
    if (!path) return [];

    return path.map((crumb, index) => ({
      ...crumb,
      isLast: index === path.length - 1,
    }));
  }, [pathname]);

  if (breadcrumbs.length === 0) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={crumb.url}>
            <BreadcrumbItem className={crumb.isLast ? "" : "hidden md:block"}>
              {crumb.isLast ? (
                <BreadcrumbPage>{t(`nav.${crumb.title}`)}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink href={crumb.url}>
                  {t(`nav.${crumb.title}`)}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {!crumb.isLast && (
              <BreadcrumbSeparator className="hidden md:block" />
            )}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
