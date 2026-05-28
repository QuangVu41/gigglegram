import { TagsForm } from "@/components/pages/accounts/tags-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tags and mentions",
};

export default function TagsPage() {
  return <TagsForm />;
}
