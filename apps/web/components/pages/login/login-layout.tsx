"use client";

import { Card, CardContent } from "@/components/ui/card";
import LoginLanding from "@/components/pages/login/login-landing";
import LoginForm from "@/components/pages/login/login-form";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useState } from "react";
import { useTranslations } from "next-intl";
import EmailVerification from "@/components/common/email-verification";

const LoginLayout = () => {
  const [selectedTab, setSelectedTab] = useState<
    "login" | "email-verification"
  >("login");
  const [email, setEmail] = useState("");
  const t = useTranslations("OTPForm");
  const isLoginTab = selectedTab === "login";

  const handleGoBack = () => {
    setSelectedTab("login");
  };

  const handleOpenEmailVerificationTab = (email: string) => {
    setSelectedTab("email-verification");
    setEmail(email);
  };

  return (
    <div className={`w-full max-w-sm ${isLoginTab ? "md:max-w-4xl" : ""}`}>
      <div className="flex flex-col gap-6">
        <Card className="overflow-hidden p-0 bg-card/80">
          <CardContent
            className={`grid p-0 ${isLoginTab ? "md:grid-cols-2" : "md:grid-cols-1"}`}
          >
            {isLoginTab && <LoginLanding />}
            <Tabs
              value={selectedTab}
              onValueChange={(tab) =>
                setSelectedTab(tab as "login" | "email-verification")
              }
            >
              <TabsContent value="login">
                <LoginForm
                  handleOpenEmailVerificationTab={
                    handleOpenEmailVerificationTab
                  }
                />
              </TabsContent>
              <TabsContent value="email-verification">
                <EmailVerification
                  email={email}
                  handleGoBack={handleGoBack}
                  backLabel={t("backToLogin")}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginLayout;
