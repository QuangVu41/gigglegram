import AuthHeader from "@/components/common/auth-header";
import SocialLogin from "@/components/common/social-login";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { DEFAULT_LOGIN_REDIRECT } from "@/constants/routes";
import { useHandleBAAction } from "@/hooks/use-handle-ba-action";
import { authClient } from "@/lib/auth/auth-client";
import { createLoginSchema, LoginSchemaType } from "@/schemas/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

const LoginForm = ({ handleOpenEmailVerificationTab }: { handleOpenEmailVerificationTab: (email: string) => void }) => {
  const t = useTranslations("LoginPage");
  const tValidation = useTranslations("ValidationErrors");
  const { handleBAAction } = useHandleBAAction();
  const searchParams = useSearchParams();
  const callbackURL = searchParams.get("callbackURL") || DEFAULT_LOGIN_REDIRECT;
  const form = useForm<LoginSchemaType>({
    resolver: zodResolver(createLoginSchema(tValidation)),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  const { isSubmitting } = form.formState;

  useEffect(() => {
    if (Object.keys(form.formState.errors).length > 0) {
      form.trigger();
    }
  }, [tValidation, form]);

  const handleSubmit = async (data: LoginSchemaType) => {
    const res = await handleBAAction(() => authClient.signIn.email({ ...data, callbackURL }));
    if (res.error) {
      const errorCode = res.error.code || "GENERAL_ERROR";
      if (errorCode === "EMAIL_NOT_VERIFIED") {
        await handleBAAction(() => authClient.sendVerificationEmail({ email: data.email, callbackURL }));
        handleOpenEmailVerificationTab(data.email);
      }
    }
  };

  return (
    <form className="p-6 md:p-8" onSubmit={form.handleSubmit(handleSubmit)}>
      <FieldGroup>
        <AuthHeader transField="LoginPage" />
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="email">{t("emailLabel")}</FieldLabel>
              <Input
                {...field}
                aria-invalid={fieldState.invalid}
                id="email"
                type="email"
                placeholder={t("emailPlaceholder")}
                disabled={isSubmitting}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <div className="flex items-center">
                <FieldLabel htmlFor="password">{t("passwordLabel")}</FieldLabel>
                <Link href="/accounts/forgot/password" className="ml-auto text-sm underline-offset-2 hover:underline">
                  {t("forgotPassword")}
                </Link>
              </div>
              <Input
                {...field}
                aria-invalid={fieldState.invalid}
                id="password"
                type="password"
                placeholder={t("passwordPlaceholder")}
                disabled={isSubmitting}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Field>
          <Button type="submit" disabled={isSubmitting}>
            <LoadingSwap isLoading={isSubmitting}>{t("loginButton")}</LoadingSwap>
          </Button>
        </Field>
        <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">{t("orContinueWith")}</FieldSeparator>
        <SocialLogin isPending={isSubmitting} />
        <FieldDescription className="text-center">
          {t("noAccount")} <Link href="/accounts/signup">{t("signUp")}</Link>
        </FieldDescription>
      </FieldGroup>
    </form>
  );
};

export default LoginForm;
