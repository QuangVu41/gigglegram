import Footer from "@/components/common/footer";
import { redirectIfAlreadyLoggedin } from "@/lib/auth/redirect-if-already-loggedin";

export default async function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await redirectIfAlreadyLoggedin();

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-6 md:p-10 gap-6">
      {children}
      <Footer />
    </div>
  );
}
