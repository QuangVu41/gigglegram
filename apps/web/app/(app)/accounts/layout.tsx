import Footer from "@/components/common/footer";
import { AccountsSidebar } from "@/components/pages/accounts/accounts-sidebar";

export default function AccountsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-full min-h-screen bg-background/70">
      <AccountsSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-4 md:p-8 lg:p-12 overflow-y-auto">
          <div className="max-w-3xl mx-auto w-full flex flex-col min-h-full">
            <div className="flex-1 pb-12">{children}</div>
            <Footer />
          </div>
        </main>
      </div>
    </div>
  );
}
