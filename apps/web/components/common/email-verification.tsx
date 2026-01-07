"use client";

import { Field, FieldGroup } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import BAActionButton from "./ba-action-button";
import { authClient } from "@/lib/auth/auth-client";
import { DEFAULT_LOGIN_REDIRECT } from "@/constants/routes";
import { useSearchParams } from "next/navigation";
import { useCountdownDisable } from "@/hooks/use-countdown-disable";

const EmailVerification = ({
  handleGoBack,
  backLabel,
  className,
  email,
}: {
  handleGoBack: () => void;
  backLabel: string;
  className?: string;
  email: string;
}) => {
  const { countdown, startCountdown } = useCountdownDisable();
  const t = useTranslations("EmailVerification");
  const searchParams = useSearchParams();
  const callbackURL = searchParams.get("callbackURL") || DEFAULT_LOGIN_REDIRECT;

  return (
    <div className={cn(`flex flex-col items-center justify-center p-6 md:p-8`, className)}>
      <FieldGroup>
        <Field className="items-center text-center">
          <h1 className="text-2xl font-bold">{t("heading")}</h1>
          <p className="text-muted-foreground text-sm">{t("description")}</p>
        </Field>
        <Field>
          <BAActionButton
            action={() => {
              return authClient.sendVerificationEmail(
                { email, callbackURL },
                {
                  onSuccess: () => {
                    startCountdown(15);
                  },
                }
              );
            }}
            successMessage="Verification email sent!"
            disabled={countdown > 0}
          >
            {countdown > 0 ? `${t("resendButton")} (${countdown})` : t("resendButton")}
          </BAActionButton>
          <Button variant="outline" type="button" onClick={handleGoBack}>
            {backLabel}
          </Button>
        </Field>
      </FieldGroup>
    </div>
  );
};

export default EmailVerification;
