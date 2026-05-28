import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import AppDashboardSidebar from "@/components/pages/dashboard/app-sidebar";
import { Separator } from "@/components/ui/separator";
import DashboardBreadcrumb from "@/components/pages/dashboard/dashboard-breadcrumb";
import { DashboardSearch } from "@/components/pages/dashboard/dashboard-search";
import { DashboardHeaderActions } from "@/components/pages/dashboard/dashboard-header-actions";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppDashboardSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between gap-2 px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b border-border">
          <div className="flex items-center gap-4 flex-1">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4!" />
              <DashboardBreadcrumb />
            </div>

            {/* Search Bar */}
            <div className="flex-1 flex justify-center max-w-2xl mx-auto">
              <DashboardSearch />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Actions */}
            <DashboardHeaderActions />
          </div>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
