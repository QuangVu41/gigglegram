import { ThemeToggle } from "@/components/common/theme-toggle";
import { LocaleSwitcher } from "@/components/common/locale-switcher";
import { FieldDescription } from "@/components/ui/field";
import { useTranslations } from "next-intl";

const Footer = () => {
  const t = useTranslations("Footer");

  return (
    <footer className="flex flex-col gap-4 justify-center items-center">
      <FieldDescription className="px-6 text-center flex gap-4 justify-center items-center">
        <a href="#">{t("about")}</a>
        <a href="#">{t("help")}</a>
        <a href="#">{t("termsOfService")}</a>
        <a href="#">{t("privacyPolicy")}</a>
        <ThemeToggle variant="ghost" />
        <LocaleSwitcher variant="ghost" />
      </FieldDescription>
      <FieldDescription>{t("copyright", { year: new Date().getFullYear() })}</FieldDescription>
    </footer>
  );
};

export default Footer;
