import SignupLayout from "@/components/pages/signup/signup-layout";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up",
};

const SignupPage = () => {
  return <SignupLayout />;
};

export default SignupPage;
