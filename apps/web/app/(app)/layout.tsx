import { HeaderMobile } from "@/components/common/header-mobile";
import AppSidebar from "@/components/pages/home/app-sidebar";
import { NavBottom } from "@/components/pages/home/nav-bottom";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

const AppLayout = ({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal: React.ReactNode;
}>) => {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width-icon": "4rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar />
      <SidebarInset className="bg-transparent">
        <HeaderMobile />
        {children}
        {modal}
        <NavBottom />
      </SidebarInset>
    </SidebarProvider>
  );
};

export default AppLayout;
