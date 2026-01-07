import Image from "next/image";
import logoImage from "@/public/logo.png";

const LogoLoading = () => {
  return (
    <div className="h-screen flex items-center justify-center">
      <figure className="w-36 h-36 relative overflow-hidden rounded-3xl">
        <Image src={logoImage} alt="logo loading" className="object-cover" fill />
      </figure>
    </div>
  );
};

export default LogoLoading;
