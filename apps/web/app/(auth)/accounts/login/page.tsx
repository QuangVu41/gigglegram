import LoginLayout from "@/components/pages/login/login-layout";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
};

export default async function LoginPage() {
  return <LoginLayout />;
}
