import { EditProfileForm } from "@/components/pages/accounts/edit-profile-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit profile • Gigglegram",
};

export default function EditProfilePage() {
  return <EditProfileForm />;
}
