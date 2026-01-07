import * as z from "zod";

export const createLoginSchema = (t: (key: string) => string) => {
  return z.object({
    email: z
      .string()
      .email({ message: t("emailInvalid") })
      .trim(),
    password: z
      .string()
      .nonempty({ message: t("passwordRequired") })
      .trim(),
  });
};

export const createSignupSchema = (t: (key: string) => string) =>
  z.object({
    email: z
      .string()
      .trim()
      .refine((val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
        message: t("emailInvalid"),
      }),
    password: z
      .string()
      .trim()
      .refine((val) => val.length >= 8 && val.length <= 50, {
        message: t("passwordInvalid"),
      }),
    name: z
      .string()
      .trim()
      .refine((val) => val.length >= 2 && val.length <= 100, {
        message: t("nameInvalid"),
      }),
    username: z
      .string()
      .trim()
      .refine((val) => val.length >= 3 && val.length <= 30 && /^\S+$/.test(val), {
        message: t("usernameInvalid"),
      }),
  });

export const createOTPSchema = (t: (key: string) => string) =>
  z.object({
    otp: z.string().refine((val) => /^\d{6}$/.test(val), {
      message: t("otpInvalid"),
    }),
  });

export const createForgotPasswordSchema = (t: (key: string) => string) =>
  z.object({
    email: z
      .string()
      .email({ message: t("emailInvalid") })
      .trim(),
  });

export const createPasswordResetSchema = (t: (key: string) => string) =>
  z.object({
    password: z
      .string()
      .trim()
      .refine((val) => val.length >= 8 && val.length <= 50, {
        message: t("passwordInvalid"),
      }),
  });

export type LoginSchemaType = z.infer<ReturnType<typeof createLoginSchema>>;
export type SignupSchemaType = z.infer<ReturnType<typeof createSignupSchema>>;
export type OTPSchemaType = z.infer<ReturnType<typeof createOTPSchema>>;
export type ForgotPasswordSchemaType = z.infer<ReturnType<typeof createForgotPasswordSchema>>;
export type PasswordResetSchemaType = z.infer<ReturnType<typeof createPasswordResetSchema>>;
