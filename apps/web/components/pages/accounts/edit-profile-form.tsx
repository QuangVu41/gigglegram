"use client";

import { useTranslations } from "next-intl";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { authClient } from "@/lib/auth/auth-client";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { AvatarEditorDialog } from "@/components/common/avatar-editor-dialog";

const createEditProfileSchema = (t: any) =>
  z.object({
    name: z.string().min(2, t("ValidationErrors.nameInvalid")).max(100),
    username: z.string().min(3, t("ValidationErrors.usernameInvalid")).max(30),
    bio: z.string().max(150).optional(),
    gender: z.enum(["male", "female", "none"]),
  });

type EditProfileFormValues = z.infer<
  ReturnType<typeof createEditProfileSchema>
>;

export function EditProfileForm() {
  const t = useTranslations();
  const tEdit = useTranslations("AccountsPage.editProfile");
  const session = authClient.useSession();
  const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);

  const form = useForm<EditProfileFormValues>({
    resolver: zodResolver(createEditProfileSchema(t)),
    defaultValues: {
      name: session.data?.user?.name || "",
      username: session.data?.user?.username || "",
      bio: session.data?.user?.bio || "",
      gender:
        (session.data?.user?.gender as "male" | "female" | "none") || "none",
    },
  });
  const { isSubmitting } = form.formState;

  useEffect(() => {
    if (session.data?.user) {
      form.reset({
        name: session.data.user.name,
        username: session.data.user.username,
        bio: (session.data.user as any).bio || "",
        gender:
          ((session.data.user as any).gender as "male" | "female" | "none") ||
          "none",
      });
    }
  }, [session.data?.user]);

  const onSubmit = async (values: EditProfileFormValues) => {
    try {
      const res = await authClient.updateUser({
        name: values.name,
        username: values.username,
        bio: values.bio,
        gender: values.gender !== "none" ? values.gender : undefined,
      });

      if (res.error) {
        throw new Error(res.error.message || tEdit("error"));
      }

      toast.success(tEdit("success"));
      await session.refetch();
    } catch (error: any) {
      toast.error(error.message || tEdit("error"));
    }
  };

  if (!session.data?.user) {
    return (
      <div className="flex flex-col gap-8">
        <Skeleton className="h-8 w-48" />

        <div className="bg-muted/30 rounded-2xl p-4 md:p-6 flex items-center justify-between border border-border/50">
          <div className="flex items-center gap-4">
            <Skeleton className="w-14 h-14 md:w-16 md:h-16 rounded-full" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>

        <div className="flex flex-col gap-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col gap-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-11 w-full" />
              {i === 2 && <Skeleton className="h-3 w-full max-w-[400px]" />}
            </div>
          ))}
          <div className="flex justify-end mt-4">
            <Skeleton className="h-11 w-36 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  const user = session.data.user;

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold">{tEdit("title")}</h1>

      {/* Profile Header / Photo Change */}
      <div className="bg-muted/30 rounded-2xl p-4 md:p-6 flex items-center justify-between border border-border/50">
        <div className="flex items-center gap-4">
          <Avatar className="w-14 h-14 md:w-16 md:h-16 border border-border">
            <AvatarImage src={`/${user.image}`} alt={user.username} />
            <AvatarFallback>
              {user.username.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-bold text-sm">{user.username}</span>
            <span className="text-muted-foreground text-sm">{user.name}</span>
          </div>
        </div>
        <Button
          className="text-foreground font-bold h-9 px-6 rounded-lg text-xs md:text-sm"
          disabled={isSubmitting}
          onClick={() => setIsAvatarDialogOpen(true)}
          type="button"
        >
          {tEdit("changePhoto")}
        </Button>
      </div>

      <AvatarEditorDialog
        isOpen={isAvatarDialogOpen}
        onClose={() => setIsAvatarDialogOpen(false)}
        onSuccess={() => session.refetch()}
      />

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-8"
      >
        <FieldGroup>
          {/* Name Field */}
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className="font-bold">
                  {t("SignupPage.nameLabel")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    {...field}
                    placeholder={t("SignupPage.namePlaceholder")}
                    disabled={isSubmitting}
                    className="bg-muted/10 h-11"
                  />
                  <FieldError errors={[fieldState.error]} />
                </FieldContent>
              </Field>
            )}
          />

          {/* Username Field */}
          <Controller
            name="username"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className="font-bold">
                  {t("SignupPage.usernameLabel")}
                </FieldLabel>
                <FieldContent>
                  <Input
                    {...field}
                    placeholder={t("SignupPage.usernamePlaceholder")}
                    disabled={isSubmitting}
                    className="bg-muted/10 h-11"
                  />
                  <FieldError errors={[fieldState.error]} />
                  <FieldDescription className="text-xs text-muted-foreground mt-1">
                    {tEdit("usernameDescription", { username: user.username })}
                  </FieldDescription>
                </FieldContent>
              </Field>
            )}
          />

          {/* Bio Field */}
          <Controller
            name="bio"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel className="font-bold">{tEdit("bio")}</FieldLabel>
                <FieldContent>
                  <div className="relative">
                    <Textarea
                      {...field}
                      disabled={isSubmitting}
                      placeholder={tEdit("bioPlaceholder")}
                      className="bg-muted/10 min-h-[100px] resize-none pb-8"
                      maxLength={150}
                    />
                    <div className="absolute bottom-2 right-3 text-[10px] text-muted-foreground">
                      {field.value?.length || 0} / 150
                    </div>
                  </div>
                  <FieldError errors={[fieldState.error]} />
                </FieldContent>
              </Field>
            )}
          />

          {/* Gender Field */}
          <Controller
            name="gender"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel className="font-bold">{tEdit("gender")}</FieldLabel>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      disabled={isSubmitting}
                      variant="outline"
                      className="w-full justify-between bg-muted/10 h-11 border-border font-normal"
                    >
                      {tEdit(`genders.${field.value}`)}
                      <ChevronDown className="w-4 h-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] bg-popover">
                    {["male", "female", "none"].map((g) => (
                      <DropdownMenuItem
                        key={g}
                        onClick={() => field.onChange(g)}
                        className="py-2.5"
                      >
                        {tEdit(`genders.${g}`)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <FieldDescription className="text-xs text-muted-foreground mt-1">
                  {tEdit("genderDescription")}
                </FieldDescription>
              </Field>
            )}
          />
        </FieldGroup>

        <div className="flex justify-end mt-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="text-foreground font-bold h-11 px-10 rounded-lg"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              tEdit("submit")
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
