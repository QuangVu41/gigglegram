"use client";

import React, { useState } from "react";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { LocaleSwitcher } from "@/components/common/locale-switcher";
import { Button } from "@/components/ui/button";
import { Bell, Settings } from "lucide-react";
import { NotificationSheet } from "@/components/common/notification-sheet";
import { useNotifications } from "@/hooks/use-notifications";
import Link from "next/link";

export function DashboardHeaderActions() {
  const [notifOpen, setNotifOpen] = useState(false);
  const { unreadCount } = useNotifications();

  return (
    <div className="flex items-center gap-2">
      <ThemeToggle variant="outline" />
      <LocaleSwitcher variant="outline" />
      <Button
        variant="outline"
        className="rounded-md relative"
        onClick={() => setNotifOpen(true)}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex size-2.5 rounded-full bg-destructive border-2 border-background" />
        )}
      </Button>
      <Button variant="outline" className="rounded-md" asChild>
        <Link href="/dashboard/settings">
          <Settings className="w-4 h-4" />
        </Link>
      </Button>

      <NotificationSheet open={notifOpen} onOpenChange={setNotifOpen} />
    </div>
  );
}
