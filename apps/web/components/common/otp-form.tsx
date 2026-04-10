import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { createOTPSchema, OTPSchemaType } from "@/schemas/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";

const OTPForm = ({
  handleGoBack,
  backLabel,
  className,
}: {
  handleGoBack: () => void;
  backLabel: string;
  className?: string;
}) => {
  const t = useTranslations("OTPForm");
  const tValidation = useTranslations("ValidationErrors");
  const form = useForm<OTPSchemaType>({
    resolver: zodResolver(createOTPSchema(tValidation)),
    defaultValues: {
      otp: "",
    },
  });

  useEffect(() => {
    if (Object.keys(form.formState.errors).length > 0) {
      form.trigger();
    }
  }, [tValidation, form]);

  const handleSubmit = (data: OTPSchemaType) => {};

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
          name="otp"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="otp" className="sr-only">
                {t("label")}
              </FieldLabel>
              <InputOTP
                {...field}
                aria-invalid={fieldState.invalid}
                maxLength={6}
                id="otp"
                containerClassName="gap-4 justify-center"
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                </InputOTPGroup>
                <InputOTPSeparator />
                <InputOTPGroup>
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
              {fieldState.invalid && <FieldError className="text-center" errors={[fieldState.error]} />}
              <FieldDescription className="text-center">{t("fieldDescription")}</FieldDescription>
            </Field>
          )}
        />

        <Field>
          <Button type="submit">{t("verifyButton")}</Button>
          <Button variant="outline" type="button" onClick={handleGoBack}>
            {backLabel}
          </Button>
        </Field>
        <FieldDescription className="text-center">
          {t("resendText")} <a href="#">{t("resendLink")}</a>
        </FieldDescription>
      </FieldGroup>
    </form>
  );
};

export default OTPForm;
