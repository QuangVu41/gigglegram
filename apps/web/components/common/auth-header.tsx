import Image from "next/image";
import logoTextImage from "@/public/logo-text.webp";
import { useTranslations } from "next-intl";

const AuthHeader = ({
  transField,
}: {
  transField: "LoginPage" | "SignupPage";
}) => {
  const t = useTranslations(transField);

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <Image
        src={logoTextImage}
        alt="gigglegram"
        className="w-44 object-contain"
      />
      <h1 className="text-muted-foreground text-balance">{t("heading")}</h1>
    </div>
  );
};

export default AuthHeader;
