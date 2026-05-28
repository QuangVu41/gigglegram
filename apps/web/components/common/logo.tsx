import Image from "next/image";
import logoImage from "@/public/logo.png";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
}

const Logo = ({ className }: LogoProps) => {
  return (
    <figure className={cn("w-36 h-36 relative overflow-hidden", className)}>
      <Image src={logoImage} alt="logo" className="object-cover" fill />
    </figure>
  );
};

export default Logo;
