import { LikesAndSharesForm } from "@/components/pages/accounts/likes-and-shares-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Like and share counts",
};

export default function LikesAndSharesPage() {
  return <LikesAndSharesForm />;
}
