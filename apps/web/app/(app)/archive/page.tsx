import { ArchivePage } from "@/components/pages/archive/archive-page";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Archive • Gigglegram",
};

export default function Page() {
  return <ArchivePage />;
}
