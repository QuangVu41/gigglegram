import { cn } from "@/lib/utils";
import Image from "next/image";
import logoTextImage from "@/public/logo-text.webp";

interface LogoTextProps {
  className?: string;
}

const LogoText = ({ className }: LogoTextProps) => {
  return (
    <Image
      src={logoTextImage}
      alt="gigglegram"
      className={cn("w-44 object-contain", className)}
    />
  );
};

export default LogoText;
