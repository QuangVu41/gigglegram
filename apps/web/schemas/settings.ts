import * as z from "zod";

export const systemSettingSchema = (t: (key: string) => string) => {
  return z
    .object({
      key: z.string().min(1, { message: t("dialog.errors.required") }),
      type: z.enum(["string", "int", "float", "bool", "json"]),
      value: z.string().min(1, { message: t("dialog.errors.required") }),
      description: z.string().optional(),
      isPublic: z.boolean(),
    })
    .superRefine((data, ctx) => {
      if (data.type === "json") {
        try {
          JSON.parse(data.value);
        } catch (e) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t("dialog.errors.invalidJson"),
            path: ["value"],
          });
        }
      } else if (data.type === "int") {
        const intVal = parseInt(data.value, 10);
        if (isNaN(intVal) || intVal.toString() !== data.value.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t("dialog.errors.invalidInt"),
            path: ["value"],
          });
        }
      } else if (data.type === "float") {
        const floatVal = parseFloat(data.value);
        if (isNaN(floatVal) || isNaN(Number(data.value))) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t("dialog.errors.invalidFloat"),
            path: ["value"],
          });
        }
      }
    });
};

export type SystemSettingSchemaType = z.infer<
  ReturnType<typeof systemSettingSchema>
>;
