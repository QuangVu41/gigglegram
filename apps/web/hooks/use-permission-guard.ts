"use client";

import { authClient } from "@/lib/auth/auth-client";
import { notFound } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

/**
 * Hook to guard pages based on organization permissions.
 * Redirects to 404 if the user doesn't have the required permissions.
 */
export function usePermissionGuard(permissions: Record<string, string[]>) {
  const { data: activeOrg, isPending: isOrgPending } =
    authClient.useActiveOrganization();
  const [isChecking, setIsChecking] = useState(true);
  const [isDenied, setIsDenied] = useState(false);

  // Stabilize permissions into a string so the effect only re-runs when the
  // actual permission values change — not on every render due to new object refs.
  const permissionsKey = useMemo(
    () => JSON.stringify(permissions),
    [permissions],
  );

  useEffect(() => {
    async function checkPermission() {
      // If organization data is still loading, wait
      if (isOrgPending) return;

      // If no active organization is selected, we might want to wait or handle it
      // For dashboard, we usually assume an organization is active
      if (!activeOrg) {
        setIsChecking(false);
        return;
      }

      try {
        const parsedPermissions = JSON.parse(permissionsKey) as Record<
          string,
          string[]
        >;
        const hasPermission = await authClient.organization.hasPermission({
          organizationId: activeOrg.id,
          permissions: parsedPermissions,
        });

        if (!hasPermission.data?.success) {
          setIsDenied(true);
        }
      } catch (error) {
        console.error("Permission check failed:", error);
        // On error, we might want to default to notFound for security
        setIsDenied(true);
      } finally {
        setIsChecking(false);
      }
    }

    checkPermission();
  }, [activeOrg?.id, isOrgPending, permissionsKey]);

  if (isDenied) {
    notFound();
  }

  return { isChecking };
}
