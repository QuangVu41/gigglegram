import { Button } from "@/components/ui/button";
import { Field, FieldGroup } from "@/components/ui/field";
import { useTranslations } from "next-intl";
import Link from "next/link";

const PasswordResetError = () => {
  const t = useTranslations("PasswordResetForm");

  return (
    <div className="flex flex-col items-center justify-center p-6 md:p-8">
      <FieldGroup>
        <Field className="items-center text-center">
          <h1 className="text-2xl font-bold">{t("errorHeading")}</h1>
          <p className="text-muted-foreground text-sm text-balance">{t("errorDescription")}</p>
        </Field>
        <Field>
          <Button asChild>
            <Link href="/accounts/forgot/password">{t("goToForgotPassword")}</Link>
          </Button>
        </Field>
      </FieldGroup>
    </div>
  );
};

export default PasswordResetError;
