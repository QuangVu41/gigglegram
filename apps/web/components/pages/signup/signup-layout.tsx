"use client";

import SignupForm from "@/components/pages/signup/signup-form";
import { Card, CardContent } from "@/components/ui/card";
import { TabsContent } from "@/components/ui/tabs";
import { Tabs } from "@radix-ui/react-tabs";
import { useState } from "react";
import { useTranslations } from "next-intl";
import EmailVerification from "@/components/common/email-verification";

const SignupLayout = () => {
  const [selectedTab, setSelectedTab] = useState<
    "signup" | "email-verification"
  >("signup");
  const [email, setEmail] = useState("");
  const t = useTranslations("OTPForm");

  const handleGoBack = () => {
    setSelectedTab("signup");
  };

  const handleOpenEmailVerificationTab = (email: string) => {
    setSelectedTab("email-verification");
    setEmail(email);
  };

  return (
    <div className="w-full max-w-sm">
      <div className="flex flex-col gap-6">
        <Card className="p-0">
          <CardContent className="p-0">
            <Tabs
              value={selectedTab}
              onValueChange={(tab) =>
                setSelectedTab(tab as "signup" | "email-verification")
              }
            >
              <TabsContent value="signup">
                <SignupForm
                  handleOpenEmailVerificationTab={
                    handleOpenEmailVerificationTab
                  }
                />
              </TabsContent>
              <TabsContent value="email-verification">
                <EmailVerification
                  email={email}
                  handleGoBack={handleGoBack}
                  backLabel={t("backToSignup")}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignupLayout;
