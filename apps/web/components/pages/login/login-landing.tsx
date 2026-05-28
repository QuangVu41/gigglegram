import Image from "next/image";
import landingImage from "@/public/landing-3x.png";

const LoginLanding = () => {
  return (
    <div className="bg-muted relative hidden md:block">
      <Image
        src={landingImage}
        alt="landing image"
        className="object-contain"
        fill
      />
    </div>
  );
};

export default LoginLanding;
