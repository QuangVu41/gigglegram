import {
  CircleFadingPlus,
  Compass,
  Heart,
  House,
  ImagePlay,
  Search,
  Send,
  Settings,
  SquarePlay,
  SquarePlus,
} from "lucide-react";

export type NavMainType = "link" | "dropdown" | "button";

export interface NavMainItem {
  key: string;
  url: string;
  icon: React.ComponentType<any>;
  mobileDisplay: boolean;
  type: NavMainType;
  dropdownItems?: NavMainItem[];
}

export const NAV_MAIN: NavMainItem[] = [
  {
    key: "home",
    url: "/",
    icon: House,
    mobileDisplay: true,
    type: "link",
  },
  {
    key: "reels",
    url: "/reels",
    icon: SquarePlay,
    mobileDisplay: true,
    type: "link",
  },
  {
    key: "messages",
    url: "/messages",
    icon: Send,
    mobileDisplay: true,
    type: "link",
  },
  {
    key: "search",
    url: "/#",
    icon: Search,
    mobileDisplay: false,
    type: "button",
  },
  {
    key: "explore",
    url: "/explore",
    icon: Compass,
    mobileDisplay: true,
    type: "link",
  },
  {
    key: "notifications",
    url: "/notifications",
    icon: Heart,
    mobileDisplay: false,
    type: "link",
  },
  {
    key: "create",
    url: "/#",
    icon: SquarePlus,
    mobileDisplay: true,
    type: "dropdown",
    dropdownItems: [
      {
        key: "createPost",
        url: "/#",
        icon: ImagePlay,
        mobileDisplay: true,
        type: "button",
      },
      {
        key: "createStory",
        url: "/#",
        icon: CircleFadingPlus,
        mobileDisplay: true,
        type: "button",
      },
    ],
  },
  {
    key: "settings",
    url: "/settings",
    icon: Settings,
    mobileDisplay: false,
    type: "link",
  },
];
