import { CommentsForm } from "@/components/pages/accounts/comments-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Comments",
};

export default function CommentsPage() {
  return <CommentsForm />;
}
