import { PrivacyForm } from "@/components/pages/accounts/privacy-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy and security",
  description: "Manage your privacy and security settings.",
};

export default function PrivacySettingsPage() {
  return <PrivacyForm />;
}
