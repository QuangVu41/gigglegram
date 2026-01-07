"use client";

import SocialLogin from "@/components/common/social-login";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { createSignupSchema, SignupSchemaType } from "@/schemas/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { authClient } from "@/lib/auth/auth-client";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { useHandleBAAction } from "@/hooks/use-handle-ba-action";
import { DEFAULT_LOGIN_REDIRECT } from "@/constants/routes";
import { useSearchParams } from "next/navigation";
import AuthHeader from "@/components/common/auth-header";

export default function SignupForm({
  handleOpenEmailVerificationTab,
}: {
  handleOpenEmailVerificationTab: (email: string) => void;
}) {
  const t = useTranslations("SignupPage");
  const tValidation = useTranslations("ValidationErrors");
  const { handleBAAction } = useHandleBAAction();
  const searchParams = useSearchParams();
  const callbackURL = searchParams.get("callbackURL") || DEFAULT_LOGIN_REDIRECT;
  const form = useForm<SignupSchemaType>({
    resolver: zodResolver(createSignupSchema(tValidation)),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      username: "",
    },
  });
  const { isSubmitting } = form.formState;

  useEffect(() => {
    if (Object.keys(form.formState.errors).length > 0) {
      form.trigger();
    }
  }, [tValidation, form]);

  const handleSubmit = async (data: SignupSchemaType) => {
    const res = await handleBAAction(() => authClient.signUp.email({ ...data, callbackURL }));
    if (res.error == null && !res.data.user.emailVerified) handleOpenEmailVerificationTab(data.email);
  };

  return (
    <form className="p-6 md:p-8" onSubmit={form.handleSubmit(handleSubmit)}>
      <FieldGroup>
        <AuthHeader transField="SignupPage" />
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
              <FieldLabel htmlFor="password">{t("passwordLabel")}</FieldLabel>
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
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="name">{t("nameLabel")}</FieldLabel>
              <Input
                {...field}
                aria-invalid={fieldState.invalid}
                id="name"
                type="text"
                placeholder={t("namePlaceholder")}
                disabled={isSubmitting}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="username"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="username">{t("usernameLabel")}</FieldLabel>
              <Input
                {...field}
                aria-invalid={fieldState.invalid}
                id="username"
                type="text"
                placeholder={t("usernamePlaceholder")}
                disabled={isSubmitting}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Field>
          <Button type="submit" disabled={isSubmitting}>
            <LoadingSwap isLoading={isSubmitting}>{t("createAccountButton")}</LoadingSwap>
          </Button>
        </Field>
        <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">{t("orContinueWith")}</FieldSeparator>
        <SocialLogin isPending={isSubmitting} />
        <FieldDescription className="px-6 text-center">
          {t("alreadyHaveAccount")} <Link href="/accounts/login">{t("login")}</Link>
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}
