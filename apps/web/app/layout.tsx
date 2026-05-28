import type { Metadata } from "next";
import LayoutTemplate from "@/components/common/layout-template";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Gigglegram",
    template: "%s • Gigglegram",
  },
  description:
    "Create an account or log in to Gigglegram - Share what you're into with the people who get you.",
};

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return <LayoutTemplate>{children}</LayoutTemplate>;
};

export default RootLayout;
