"use client";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { useHandleBAAction } from "@/hooks/use-handle-ba-action";
import { authClient } from "@/lib/auth/auth-client";
import { cn } from "@/lib/utils";
import { createPasswordResetSchema, PasswordResetSchemaType } from "@/schemas/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import PasswordResetError from "@/components/pages/password-reset/password-reset-error";

const PasswordResetForm = ({ className }: { className?: string }) => {
  const router = useRouter();
  const seachParams = useSearchParams();
  const token = seachParams.get("token");
  const error = seachParams.get("error");
  const t = useTranslations("PasswordResetForm");
  const tValidation = useTranslations("ValidationErrors");
  const { handleBAAction } = useHandleBAAction();
  const form = useForm<PasswordResetSchemaType>({
    resolver: zodResolver(createPasswordResetSchema(tValidation)),
    defaultValues: {
      password: "",
    },
  });
  const { isSubmitting } = form.formState;

  useEffect(() => {
    if (Object.keys(form.formState.errors).length > 0) {
      form.trigger();
    }
  }, [tValidation, form]);

  const handleSubmit = async (data: PasswordResetSchemaType) => {
    if (token)
      await handleBAAction(() =>
        authClient.resetPassword(
          { newPassword: data.password, token },
          {
            onSuccess: () => {
              toast.success(t("successMessage"));
              router.push("/accounts/login");
            },
          }
        )
      );
  };

  if (!token && error) return <PasswordResetError />;

  return (
    <form
      className={cn(`flex flex-col items-center justify-center p-6 md:p-8`, className)}
      onSubmit={form.handleSubmit(handleSubmit)}
    >
      <FieldGroup>
        <Field className="items-center text-center">
          <h1 className="text-2xl font-bold">{t("heading")}</h1>
          <p className="text-muted-foreground text-sm text-balance">{t("description")}</p>
        </Field>
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="password" className="sr-only">
                {t("label")}
              </FieldLabel>
              <Input
                {...field}
                aria-invalid={fieldState.invalid}
                id="password"
                type="password"
                placeholder={t("passwordPlaceholder")}
                disabled={isSubmitting}
              />
              {fieldState.invalid && <FieldError className="text-center" errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Field>
          <Button type="submit" disabled={isSubmitting}>
            <LoadingSwap isLoading={isSubmitting}>{t("resetButton")}</LoadingSwap>
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};

export default PasswordResetForm;
