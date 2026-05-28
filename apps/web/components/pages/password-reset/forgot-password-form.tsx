"use client";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { useCountdownDisable } from "@/hooks/use-countdown-disable";
import { useHandleBAAction } from "@/hooks/use-handle-ba-action";
import { authClient } from "@/lib/auth/auth-client";
import { cn } from "@/lib/utils";
import {
  createForgotPasswordSchema,
  ForgotPasswordSchemaType,
} from "@/schemas/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

const ForgotPasswordForm = ({ className }: { className?: string }) => {
  const { countdown, startCountdown } = useCountdownDisable(0, false);
  const t = useTranslations("ForgotPasswordForm");
  const tValidation = useTranslations("ValidationErrors");
  const { handleBAAction } = useHandleBAAction();
  const form = useForm<ForgotPasswordSchemaType>({
    resolver: zodResolver(createForgotPasswordSchema(tValidation)),
    defaultValues: {
      email: "",
    },
  });
  const { isSubmitting } = form.formState;

  useEffect(() => {
    if (Object.keys(form.formState.errors).length > 0) {
      form.trigger();
    }
  }, [tValidation, form]);

  const handleSubmit = async (data: ForgotPasswordSchemaType) => {
    await handleBAAction(() =>
      authClient.requestPasswordReset(
        { email: data.email, redirectTo: "/accounts/password/reset" },
        {
          onSuccess: () => {
            toast.success(t("successMessage"));
            startCountdown(15);
          },
        },
      ),
    );
  };

  return (
    <form
      className={cn(
        `flex flex-col items-center justify-center p-6 md:p-8`,
        className,
      )}
      onSubmit={form.handleSubmit(handleSubmit)}
    >
      <FieldGroup>
        <Field className="items-center text-center">
          <h1 className="text-2xl font-bold">{t("heading")}</h1>
          <p className="text-muted-foreground text-sm text-balance">
            {t("description")}
          </p>
        </Field>
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="email" className="sr-only">
                {t("label")}
              </FieldLabel>
              <Input
                {...field}
                aria-invalid={fieldState.invalid}
                id="email"
                type="email"
                placeholder={t("emailPlaceholder")}
                disabled={isSubmitting}
              />
              {fieldState.invalid && (
                <FieldError
                  className="text-center"
                  errors={[fieldState.error]}
                />
              )}
              <FieldDescription className="text-center">
                {t("fieldDescription")}
              </FieldDescription>
            </Field>
          )}
        />

        <Field>
          <Button type="submit" disabled={isSubmitting || countdown > 0}>
            <LoadingSwap isLoading={isSubmitting}>
              {countdown > 0
                ? `${t("resetButton")} (${countdown})`
                : t("resetButton")}
            </LoadingSwap>
          </Button>
          <Button variant="outline" type="button" disabled={isSubmitting}>
            <Link className="w-full" href="/accounts/login">
              {t("backToLoginButton")}
            </Link>
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};

export default ForgotPasswordForm;
