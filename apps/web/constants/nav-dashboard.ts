import {
  LayoutDashboard,
  Image,
  Shield,
  Settings,
  Layers,
  Building2,
  CircleDashed,
  Heart,
  FolderHeart,
  Hash,
  Music,
  MapPin,
  AlertCircle,
  SearchCode,
  UserCheck,
  Building,
  Users,
  Globe,
  ToggleLeft,
  UserCog,
  type LucideIcon,
} from "lucide-react";
import type { AcStatementsTypes } from "@repo/types/auth";

export type DashboardNavItem = {
  title: string;
  url: string;
  icon?: LucideIcon;
  isActive?: boolean;
  permission?: Partial<{
    [K in keyof AcStatementsTypes]: AcStatementsTypes[K][number][];
  }>;
  items?: DashboardNavItem[];
};

export const NAV_DASHBOARD: DashboardNavItem[] = [
  {
    title: "dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    isActive: true,
    permission: { statistic: ["read"] },
  },
  {
    title: "postsAndStories",
    url: "#",
    icon: Image,
    isActive: true,
    permission: { post: ["read"] },
    items: [
      {
        title: "allPosts",
        url: "/dashboard/posts",
        icon: Image,
        permission: { post: ["read"] },
      },
      {
        title: "stories",
        url: "/dashboard/stories",
        icon: CircleDashed,
        permission: { story: ["read"] },
      },
      {
        title: "highlights",
        url: "/dashboard/highlights",
        icon: Heart,
        permission: { highlight: ["read"] },
      },
    ],
  },
  {
    title: "contentDiscovery",
    url: "#",
    icon: Layers,
    isActive: true,
    permission: { post: ["read"] },
    items: [
      {
        title: "collections",
        url: "/dashboard/collections",
        icon: FolderHeart,
        permission: { collection: ["read"] },
      },
      {
        title: "hashtags",
        url: "/dashboard/hashtags",
        icon: Hash,
        permission: { post: ["read"] },
      },
      {
        title: "audioLibrary",
        url: "/dashboard/audio",
        icon: Music,
        permission: { post: ["read"] },
      },
      {
        title: "locationRegistry",
        url: "/dashboard/locations",
        icon: MapPin,
        permission: { post: ["read"] },
      },
    ],
  },
  {
    title: "moderation",
    url: "#",
    icon: Shield,
    isActive: true,
    permission: { report: ["read"] },
    items: [
      {
        title: "reports",
        url: "/dashboard/reports",
        icon: AlertCircle,
        permission: { report: ["read"] },
      },
      {
        title: "violationReview",
        url: "/dashboard/moderation",
        icon: SearchCode,
        permission: { report: ["update"] },
      },
      {
        title: "reviewers",
        // url: "/dashboard/reports/reviewers",
        url: "#",
        icon: UserCheck,
        permission: { report: ["assign-reviewer"] },
      },
    ],
  },
  {
    title: "organizations",
    url: "#",
    icon: Building2,
    isActive: true,
    permission: { organization: ["update", "delete"] },
    items: [
      {
        title: "manageOrgs",
        url: "/dashboard/organizations",
        icon: Building,
        permission: { organization: ["update", "delete"] },
      },
      {
        title: "members",
        // url: "/dashboard/members",
        url: "#",
        icon: Users,
        permission: { member: ["create", "update", "delete"] },
      },
    ],
  },
  {
    title: "systemControl",
    url: "#",
    icon: Settings,
    isActive: true,
    permission: { setting: ["read"] },
    items: [
      {
        title: "globalSettings",
        url: "/dashboard/settings",
        icon: Globe,
        permission: { setting: ["read"] },
      },
      {
        title: "featureToggles",
        // url: "/dashboard/settings/features",
        url: "#",
        icon: ToggleLeft,
        permission: { setting: ["update"] },
      },
      {
        title: "userManagement",
        url: "/dashboard/users",
        icon: UserCog,
        permission: { user: ["list"] },
      },
    ],
  },
];

export function getPermissionByPath(
  path: string,
  items: DashboardNavItem[] = NAV_DASHBOARD,
): DashboardNavItem["permission"] {
  for (const item of items) {
    if (item.url === path) return item.permission;
    if (item.items) {
      const subPermission = getPermissionByPath(path, item.items);
      if (subPermission) return subPermission;
    }
  }
  return undefined;
}

export function getFirstPermittedPage(userPermissions: Record<string, string[]>): string | null {
  const hasPermission = (permission: DashboardNavItem["permission"]): boolean => {
    if (!permission) return true;
    return Object.entries(permission).every(([resource, requiredActions]) => {
      const userActions = userPermissions[resource];
      if (!userActions) return false;
      return requiredActions.every((action) => userActions.includes(action));
    });
  };

  const findFirst = (items: DashboardNavItem[]): string | null => {
    for (const item of items) {
      if (!hasPermission(item.permission)) continue;

      if (item.items && item.items.length > 0) {
        const firstSub = findFirst(item.items);
        if (firstSub) return firstSub;
      } else if (item.url && item.url !== "#") {
        return item.url;
      }
    }
    return null;
  };

  return findFirst(NAV_DASHBOARD);
}
