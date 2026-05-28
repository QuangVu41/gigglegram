import Image from "next/image";
import logoImage from "@/public/logo.png";
import { cn } from "@/lib/utils";

interface LogoLoadingProps {
  className?: string;
}

const LogoLoading = ({ className }: LogoLoadingProps) => {
  return (
    <div className="h-screen flex items-center justify-center">
      <figure
        className={cn(
          "w-36 h-36 relative overflow-hidden rounded-3xl",
          className,
        )}
      >
        <Image
          src={logoImage}
          alt="logo loading"
          className="object-cover"
          fill
        />
      </figure>
    </div>
  );
};

export default LogoLoading;
