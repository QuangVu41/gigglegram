"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  VisibilityState,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth/auth-client";
import { toast } from "sonner";
import {
  ChevronDown,
  MoreHorizontal,
  Search,
  X,
  Users,
  UserCheck,
  UserX,
  ShieldAlert,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  Key,
  ShieldCheck,
  UserPlus,
  UserCog,
  Layers,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError, FieldGroup, FieldContent } from "@/components/ui/field";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { axiosGateway, FindManyResponse, OkResponse } from "@/lib/axios-config";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupButton } from "@/components/ui/input-group";
import { useTranslations } from "next-intl";
import { cn, getUsernameFallback } from "@/lib/utils";
import { useDebounce } from "use-debounce";
import { format } from "date-fns";
import { useRouter, usePathname } from "next/navigation";
import { usePermissionGuard } from "@/hooks/use-permission-guard";
import { getPermissionByPath } from "@/constants/nav-dashboard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AvatarEditorDialog } from "@/components/common/avatar-editor-dialog";
import { PAGE_SIZE_OPTIONS } from "@/constants/pagination";

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  createdAt: string | Date;
  metadata?: string | null;
}

interface UserOrganization {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
  createdAt: string | Date;
  organizations?: Organization;
}

interface UserSession {
  id: string;
  expiresAt: string | Date;
  token: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  ipAddress?: string | null;
  userAgent?: string | null;
  userId: string;
  impersonatedBy?: string | null;
  activeOrganizationId?: string | null;
}

type UserWithRole = NonNullable<Awaited<ReturnType<typeof authClient.admin.listUsers>>["data"]>["users"][number];
type AdminUser = UserWithRole;

interface OrgMember {
  id: string;
  userId: string;
  organizationId: string;
  role: string;
  users: AdminUser;
}

interface OrganizationWithMembers {
  id: string;
  name: string;
  slug: string;
  members: OrgMember[];
}

interface StatsCardsProps {
  totalCount?: number;
  activeCount?: number;
  bannedCount?: number;
  verifiedCount?: number;
  isLoading: boolean;
}

function StatsCards({
  totalCount = 0,
  activeCount = 0,
  bannedCount = 0,
  verifiedCount = 0,
  isLoading,
}: StatsCardsProps) {
  const t = useTranslations("Dashboard.users.stats");
  const verificationRate = totalCount > 0 ? (verifiedCount / totalCount) * 100 : 0;

  const cards = [
    {
      title: t("totalUsers"),
      value: totalCount,
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      title: t("activeUsers"),
      value: activeCount,
      icon: UserCheck,
      color: "text-green-500",
      bg: "bg-green-500/10",
      border: "border-green-500/20",
    },
    {
      title: t("bannedUsers"),
      value: bannedCount,
      icon: UserX,
      color: "text-red-500",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
    },
    {
      title: t("verificationRate"),
      value: `${verificationRate.toFixed(1)}%`,
      icon: ShieldAlert,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
      border: "border-orange-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, i) => (
        <Card
          key={i}
          className="p-6 flex flex-row justify-between items-start gap-4 bg-card border border-border overflow-hidden relative"
        >
          <div className="relative z-10">
            <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <h3 className="text-2xl font-bold text-foreground">{card.value}</h3>
            )}
          </div>
          <div className={cn("p-3 rounded-md relative z-10 border", card.bg, card.border)}>
            <card.icon className={cn("w-6 h-6", card.color)} />
          </div>
          <div className={cn("absolute -right-4 -bottom-4 w-24 h-24 blur-3xl opacity-20 rounded-full", card.bg)} />
        </Card>
      ))}
    </div>
  );
}

const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain alphanumeric characters and underscores"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["user", "admin"]),
  organizationId: z.array(z.string()).min(1, "At least one organization is required"),
  image: z.string().optional(),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

const editUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain alphanumeric characters and underscores"),
  role: z.enum(["user", "admin"]),
  bio: z.string().optional(),
  gender: z.string().optional(),
  organizationId: z.array(z.string()).min(1, "At least one organization is required"),
  image: z.string().optional(),
});

type EditUserFormValues = z.infer<typeof editUserSchema>;

const setPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type SetPasswordFormValues = z.infer<typeof setPasswordSchema>;

export default function UserManagementPage() {
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearch] = useDebounce(searchQuery, 300);
  const [searchField, setSearchField] = React.useState<"email" | "name">("email");
  const [activeTab, setActiveTab] = React.useState("all");
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "updatedAt", desc: true },
  ]);
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const [banUser, setBanUser] = React.useState<AdminUser | null>(null);
  const [banReason, setBanReason] = React.useState("");
  const [unbanUser, setUnbanUser] = React.useState<AdminUser | null>(null);
  const [deleteUser, setDeleteUser] = React.useState<AdminUser | null>(null);

  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({});
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<AdminUser | null>(null);
  const [passwordUser, setPasswordUser] = React.useState<AdminUser | null>(null);
  const [sessionsUser, setSessionsUser] = React.useState<AdminUser | null>(null);
  const [isBulkRevokeOpen, setIsBulkRevokeOpen] = React.useState(false);

  const [selectedOrgId, setSelectedOrgId] = React.useState<string>("all");

  // Reset page index when search, tab, or organization changes
  React.useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [debouncedSearch, searchField, activeTab, selectedOrgId]);

  const t = useTranslations("Dashboard.users");
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const permissions = getPermissionByPath(pathname);

  usePermissionGuard(permissions || { user: ["list"] });

  // Query all organizations
  const { data: organizationsData } = useQuery<Organization[]>({
    queryKey: ["organizations"],
    queryFn: async () => {
      const res = await axiosGateway.get<FindManyResponse<Organization>>(
        "/api/authentication/organizations",
        { params: { limit: 1000 } }
      );
      return res.data?.data || [];
    },
  });

  // Query user-organization mappings
  const { data: userOrgsData } = useQuery<UserOrganization[]>({
    queryKey: ["user-organizations"],
    queryFn: async () => {
      const res = await axiosGateway.get<FindManyResponse<UserOrganization>>(
        "/api/authentication/user-organizations",
        { params: { limit: 1000 } }
      );
      return res.data?.data || [];
    },
  });

  // Query counts for stats
  const { data: totalCount = 0, isLoading: isTotalLoading } = useQuery({
    queryKey: ["users-total-count"],
    queryFn: async () => {
      const res = await authClient.admin.listUsers({
        query: { limit: 1 },
      });
      if (res.error) throw res.error;
      return res.data.total;
    },
  });

  const { data: bannedCount = 0, isLoading: isBannedLoading } = useQuery({
    queryKey: ["users-banned-count"],
    queryFn: async () => {
      const res = await authClient.admin.listUsers({
        query: {
          limit: 1,
          filterField: "banned",
          filterValue: "true",
          filterOperator: "eq",
        },
      });
      if (res.error) throw res.error;
      return res.data.total;
    },
  });

  const { data: activeCount = 0, isLoading: isActiveLoading } = useQuery({
    queryKey: ["users-active-count"],
    queryFn: async () => {
      const res = await authClient.admin.listUsers({
        query: {
          limit: 1,
          filterField: "banned",
          filterValue: "false",
          filterOperator: "eq",
        },
      });
      if (res.error) throw res.error;
      return res.data.total;
    },
  });

  const { data: verifiedCount = 0, isLoading: isVerifiedLoading } = useQuery({
    queryKey: ["users-verified-count"],
    queryFn: async () => {
      const res = await authClient.admin.listUsers({
        query: {
          limit: 1,
          filterField: "emailVerified",
          filterValue: "true",
          filterOperator: "eq",
        },
      });
      if (res.error) throw res.error;
      return res.data.total;
    },
  });

  // Query user list
  const { data: usersData, isLoading: isListLoading } = useQuery({
    queryKey: [
      "users",
      pagination,
      debouncedSearch,
      searchField,
      activeTab,
      sorting,
      selectedOrgId,
      organizationsData,
    ],
    queryFn: async () => {
      const query: {
        limit: number;
        offset: number;
        searchField?: "email" | "name";
        searchValue?: string;
        filterField?: string;
        filterValue?: string;
        filterOperator?:
          | "in"
          | "contains"
          | "starts_with"
          | "ends_with"
          | "eq"
          | "ne"
          | "gt"
          | "gte"
          | "lt"
          | "lte"
          | "not_in";
        sortBy?: string;
        sortDirection?: "desc" | "asc";
      } = {
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
      };

      if (debouncedSearch) {
        query.searchField = searchField;
        query.searchValue = debouncedSearch;
      }

      if (activeTab === "banned") {
        query.filterField = "banned";
        query.filterValue = "true";
        query.filterOperator = "eq";
      } else if (activeTab === "active") {
        query.filterField = "banned";
        query.filterValue = "false";
        query.filterOperator = "eq";
      }

      if (sorting.length > 0) {
        query.sortBy = sorting[0]!.id;
        query.sortDirection = sorting[0]!.desc ? "desc" : "asc";
      }

      let users: AdminUser[] = [];

      if (selectedOrgId === "all") {
        const res = await authClient.admin.listUsers({ query });
        if (res.error) throw res.error;
        return res.data;
      } else {
        const selectedOrg = organizationsData?.find((o) => o.id === selectedOrgId);
        if (!selectedOrg) {
          return { users: [], total: 0 };
        }
        const res = await axiosGateway.get<FindManyResponse<OrganizationWithMembers>>(
          `/api/authentication/list-members/${selectedOrg.slug}`
        );
        const orgData = res.data?.data?.[0];
        const members = orgData?.members || [];
        users = members.map((m) => m.users).filter(Boolean);

        // Apply filters locally for selected organization
        // 1. Filter by status (banned/active)
        if (activeTab === "banned") {
          users = users.filter((u) => u.banned === true);
        } else if (activeTab === "active") {
          users = users.filter((u) => !u.banned);
        }

        // 2. Filter by search query
        if (debouncedSearch) {
          const searchLower = debouncedSearch.toLowerCase();
          if (searchField === "email") {
            users = users.filter((u) => u.email?.toLowerCase().includes(searchLower));
          } else if (searchField === "name") {
            users = users.filter((u) =>
              u.name?.toLowerCase().includes(searchLower) ||
              u.username?.toLowerCase().includes(searchLower)
            );
          }
        }

        // 3. Sort
        if (sorting.length > 0) {
          const sortId = sorting[0]!.id as keyof AdminUser;
          const sortDesc = sorting[0]!.desc;
          users = [...users].sort((a, b) => {
            let valA = a[sortId];
            let valB = b[sortId];

            if (valA === undefined || valA === null) return sortDesc ? 1 : -1;
            if (valB === undefined || valB === null) return sortDesc ? -1 : 1;

            if (
              valA instanceof Date ||
              (typeof valA === "string" && !isNaN(Date.parse(valA as string)))
            ) {
              const timeA = new Date(valA).getTime();
              const timeB = new Date(valB).getTime();
              return sortDesc ? timeB - timeA : timeA - timeB;
            }

            if (typeof valA === "string" && typeof valB === "string") {
              return sortDesc
                ? valB.localeCompare(valA)
                : valA.localeCompare(valB);
            }

            if (typeof valA === "number" && typeof valB === "number") {
              return sortDesc ? valB - valA : valA - valB;
            }

            return 0;
          });
        }

        // 4. Paginate
        const total = users.length;
        const start = pagination.pageIndex * pagination.pageSize;
        const end = start + pagination.pageSize;
        const slicedUsers = users.slice(start, end);

        return {
          users: slicedUsers,
          total,
        };
      }
    },
  });

  // Mutations
  const { mutate: banUserMutation, isPending: isBanning } = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason?: string }) => {
      const res = await authClient.admin.banUser({
        userId,
        banReason: reason,
      });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: () => {
      toast.success(t("banSuccess"));
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users-banned-count"] });
      queryClient.invalidateQueries({ queryKey: ["users-active-count"] });
      setBanUser(null);
      setBanReason("");
    },
    onError: (err: unknown) => {
      toast.error((err as { message?: string })?.message || t("banError"));
    },
  });

  const { mutate: unbanUserMutation, isPending: isUnbanning } = useMutation({
    mutationFn: async (userId: string) => {
      const res = await authClient.admin.unbanUser({
        userId,
      });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: () => {
      toast.success(t("unbanSuccess"));
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users-banned-count"] });
      queryClient.invalidateQueries({ queryKey: ["users-active-count"] });
      setUnbanUser(null);
    },
    onError: (err: unknown) => {
      toast.error((err as { message?: string })?.message || t("unbanError"));
    },
  });

  const { mutate: deleteUserMutation, isPending: isDeleting } = useMutation({
    mutationFn: async (userId: string) => {
      const res = await authClient.admin.removeUser({
        userId,
      });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: () => {
      toast.success(t("deleteSuccess"));
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users-total-count"] });
      queryClient.invalidateQueries({ queryKey: ["users-banned-count"] });
      queryClient.invalidateQueries({ queryKey: ["users-active-count"] });
      queryClient.invalidateQueries({ queryKey: ["users-verified-count"] });
      setDeleteUser(null);
    },
    onError: (err: unknown) => {
      toast.error((err as { message?: string })?.message || t("deleteError"));
    },
  });

  const { mutate: createUserMutation, isPending: isCreatingUser } = useMutation({
    mutationFn: async (values: CreateUserFormValues) => {
      const res = await authClient.admin.createUser({
        email: values.email,
        password: values.password || undefined,
        name: values.name,
        role: values.role,
        data: {
          username: values.username,
          image: values.image || undefined,
        },
      });
      if (res.error) throw res.error;
      const createdUser = res.data;
      if (values.organizationId && values.organizationId.length > 0 && createdUser?.user?.id) {
        for (const slug of values.organizationId) {
          const selectedOrg = organizationsData?.find((org) => org.slug === slug);
          if (selectedOrg) {
            await axiosGateway.post("/api/authentication/add-members", {
              organizationId: selectedOrg.id,
              userIds: [createdUser.user.id],
            });
          }
        }
      }
      return createdUser;
    },
    onSuccess: () => {
      toast.success(t("createSuccess"));
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users-total-count"] });
      queryClient.invalidateQueries({ queryKey: ["users-active-count"] });
      queryClient.invalidateQueries({ queryKey: ["user-organizations"] });
      setIsCreateOpen(false);
    },
    onError: (err: unknown) => {
      toast.error((err as { message?: string })?.message || t("createError"));
    },
  });

  const { mutate: updateUserMutation, isPending: isUpdatingUser } = useMutation({
    mutationFn: async ({ userId, values }: { userId: string; values: EditUserFormValues }) => {
      const res = await authClient.admin.updateUser({
        userId,
        data: {
          name: values.name,
          email: values.email,
          role: values.role,
          username: values.username,
          bio: values.bio || undefined,
          gender: values.gender || undefined,
          image: values.image || undefined,
        },
      });
      if (res.error) throw res.error;

      const currentOrgIds =
        userOrgsData
          ?.filter((m: UserOrganization) => m.userId === userId)
          .map((m: UserOrganization) => m.organizationId) ?? [];

      const selectedOrgIds = (values.organizationId || [])
        .map((slug) => organizationsData?.find((org) => org.slug === slug)?.id)
        .filter(Boolean) as string[];

      const addedOrgIds = selectedOrgIds.filter((id) => !currentOrgIds.includes(id));
      const removedOrgIds = currentOrgIds.filter((id) => !selectedOrgIds.includes(id));

      for (const addedId of addedOrgIds) {
        await axiosGateway.post("/api/authentication/add-members", {
          organizationId: addedId,
          userIds: [userId],
        });
      }

      for (const removedId of removedOrgIds) {
        await axiosGateway.post("/api/authentication/remove-members", {
          organizationId: removedId,
          userIds: [userId],
        });
      }

      return res.data;
    },
    onSuccess: () => {
      toast.success(t("updateSuccess"));
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["user-organizations"] });
      setEditingUser(null);
    },
    onError: (err: unknown) => {
      toast.error((err as { message?: string })?.message || t("updateError"));
    },
  });

  const { mutate: setUserPasswordMutation, isPending: isSettingPassword } = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      const res = await authClient.admin.setUserPassword({
        userId,
        newPassword: password,
      });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: () => {
      toast.success(t("setPasswordSuccess"));
      setPasswordUser(null);
    },
    onError: (err: unknown) => {
      toast.error((err as { message?: string })?.message || t("setPasswordError"));
    },
  });

  const { data: sessions = [], isLoading: isSessionsLoading } = useQuery<UserSession[]>({
    queryKey: ["user-sessions", sessionsUser?.id],
    queryFn: async () => {
      if (!sessionsUser?.id) return [];
      const res = await authClient.admin.listUserSessions({
        userId: sessionsUser.id,
      });
      if (res.error) throw res.error;
      return (res.data.sessions as UserSession[]) || [];
    },
    enabled: !!sessionsUser?.id,
  });

  const { mutate: revokeUserSessionMutation, isPending: isRevokingSession } = useMutation({
    mutationFn: async ({ sessionToken }: { sessionToken: string }) => {
      const res = await authClient.admin.revokeUserSession({
        sessionToken,
      });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: () => {
      toast.success(t("revokeSessionSuccess"));
      queryClient.invalidateQueries({ queryKey: ["user-sessions"] });
    },
    onError: (err: unknown) => {
      toast.error((err as { message?: string })?.message || t("revokeSessionError"));
    },
  });

  const { mutate: revokeUserSessionsMutation, isPending: isRevokingSessions } = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const res = await authClient.admin.revokeUserSessions({
        userId,
      });
      if (res.error) throw res.error;
      return res.data;
    },
    onSuccess: () => {
      toast.success(t("revokeSessionsSuccess"));
      queryClient.invalidateQueries({ queryKey: ["user-sessions"] });
    },
    onError: (err: unknown) => {
      toast.error((err as { message?: string })?.message || t("revokeSessionsError"));
    },
  });

  const { mutate: bulkRevokeSessionsMutation, isPending: isBulkRevoking } = useMutation({
    mutationFn: async (userIds: string[]) => {
      const results = await Promise.all(userIds.map((userId) => authClient.admin.revokeUserSessions({ userId })));
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        throw new Error(errors[0]?.error?.message || "Failed to revoke some sessions");
      }
      return results;
    },
    onSuccess: () => {
      toast.success(t("bulkRevokeSuccess"));
      setRowSelection({});
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsBulkRevokeOpen(false);
    },
    onError: (err: unknown) => {
      toast.error((err as { message?: string })?.message || t("bulkRevokeError"));
    },
  });

  const columns: ColumnDef<AdminUser>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "user",
      header: t("table.user"),
      cell: ({ row }) => {
        const user = row.original;
        const fallbackChar = user.name
          ? getUsernameFallback(user.name)
          : user.email
            ? user.email.charAt(0).toUpperCase()
            : "?";
        return (
          <div className="flex items-center gap-3">
            <Avatar className="size-9 border border-border">
              {user.image && (
                <AvatarImage src={user.image.startsWith("/") ? user.image : `/${user.image}`} alt={user.name} />
              )}
              <AvatarFallback className="bg-muted text-muted-foreground text-xs font-semibold">
                {fallbackChar}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm truncate text-foreground leading-none mb-1">
                {user.name || "N/A"}
              </span>
              {user.username && <span className="text-xs text-muted-foreground truncate">{user.username}</span>}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "email",
      header: t("table.email"),
      cell: ({ row }) => <span className="text-sm text-foreground font-mono">{row.original.email}</span>,
    },
    {
      accessorKey: "role",
      header: t("table.role"),
      cell: ({ row }) => {
        const role = row.original.role || "user";
        const isAdmin = role === "admin";
        return (
          <Badge
            variant="outline"
            className={cn(
              "capitalize text-xs font-medium px-2 py-0 h-5 border",
              isAdmin
                ? "bg-violet-500/15 text-violet-500 border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-400"
                : "bg-secondary/80 text-secondary-foreground border-border",
            )}
          >
            {t(`roles.${role}`)}
          </Badge>
        );
      },
    },
    {
      id: "organization",
      header: t("table.organization"),
      cell: ({ row }) => {
        const userId = row.original.id;
        const memberships = userOrgsData?.filter((m: UserOrganization) => m.userId === userId) ?? [];

        if (memberships.length === 0) {
          return <span className="text-sm font-medium text-muted-foreground">-</span>;
        }

        if (memberships.length === 1) {
          const slug = memberships[0]?.organizations?.slug || "-";
          return (
            <Badge variant="secondary" className="text-xs font-semibold px-2 py-0.5 border border-border shadow-xs">
              {slug}
            </Badge>
          );
        }

        return (
          <div className="flex flex-wrap gap-1 max-w-[180px]">
            {memberships.map((m) => {
              const slug = m.organizations?.slug || m.organizationId;
              return (
                <Badge
                  key={m.id}
                  variant="secondary"
                  className="text-xs font-semibold px-2 py-0.5 border border-border shadow-xs"
                >
                  {slug}
                </Badge>
              );
            })}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: t("table.status"),
      cell: ({ row }) => {
        const user = row.original;
        const isBanned = !!user.banned;
        const isVerified = !!user.emailVerified;
        return (
          <div className="flex items-center gap-1.5">
            <Badge
              variant={!isBanned ? "success" : "destructive"}
              className={cn(
                "text-xs font-medium px-2 py-0 h-5 border",
                !isBanned ? "border-green-500/30" : "border-destructive/30 bg-destructive/20! text-destructive",
              )}
            >
              {!isBanned ? t("status.active") : t("status.banned")}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "text-xs font-medium px-2 py-0 h-5 border",
                isVerified
                  ? "bg-blue-500/15 text-blue-500 border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400"
                  : "bg-secondary text-secondary-foreground",
              )}
            >
              {isVerified ? t("status.verified") : t("status.unverified")}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: t("table.joinedDate"),
      cell: ({ row }) => {
        const date = new Date(row.original.createdAt);
        return (
          <div className="flex flex-col">
            <span className="text-xs font-medium text-foreground">{format(date, "MMM d, yyyy")}</span>
            <span className="text-xs text-muted-foreground">{format(date, "HH:mm")}</span>
          </div>
        );
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="size-8 p-0 text-muted-foreground">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel className="text-xs">{t("actions.title")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => setEditingUser(user)}>
                  <UserCog className="size-3 mr-2" />
                  {t("actions.edit")}
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => setPasswordUser(user)}>
                  <Key className="size-3 mr-2" />
                  {t("actions.setPassword")}
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs cursor-pointer" onClick={() => setSessionsUser(user)}>
                  <ShieldCheck className="size-3 mr-2" />
                  {t("actions.sessions")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {!user.banned ? (
                  <DropdownMenuItem
                    className="text-xs cursor-pointer text-destructive"
                    onClick={() => setBanUser(user)}
                  >
                    <UserX className="size-3 mr-2" />
                    {t("actions.ban")}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    className="text-xs cursor-pointer text-green-600 hover:text-green-700"
                    onClick={() => setUnbanUser(user)}
                  >
                    <UserCheck className="size-3 mr-2" />
                    {t("actions.unban")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive text-xs cursor-pointer"
                  onClick={() => setDeleteUser(user)}
                >
                  <Trash2 className="size-3 mr-2" />
                  {t("actions.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: usersData?.users || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    manualPagination: true,
    manualSorting: true,
    pageCount: usersData?.total ? Math.ceil(usersData.total / pagination.pageSize) : -1,
    state: {
      columnVisibility,
      sorting,
      pagination,
      rowSelection,
    },
  });

  const totalStatsLoading = isTotalLoading || isBannedLoading || isActiveLoading || isVerifiedLoading;

  return (
    <div className="flex flex-col min-h-full bg-background/50 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 border-border bg-background">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
      </div>

      <div className="flex-1 px-8 py-4 space-y-6">
        <StatsCards
          totalCount={totalCount}
          activeCount={activeCount}
          bannedCount={bannedCount}
          verifiedCount={verifiedCount}
          isLoading={totalStatsLoading}
        />

        {/* Filters & Tabs */}
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <InputGroup className="max-w-sm">
                <InputGroupAddon>
                  <Search className="size-4" />
                </InputGroupAddon>
                <InputGroupInput
                  placeholder={t("searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      size="icon-xs"
                      onClick={() => setSearchQuery("")}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3" />
                    </InputGroupButton>
                  </InputGroupAddon>
                )}
              </InputGroup>

              <Select value={searchField} onValueChange={(val: "email" | "name") => setSearchField(val)}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder={t("searchField")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email" className="text-xs">
                    {t("searchFields.email")}
                  </SelectItem>
                  <SelectItem value="name" className="text-xs">
                    {t("searchFields.name")}
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder={t("filterStatus")} />
                </SelectTrigger>
                <SelectContent>
                  {["all", "active", "banned"].map((tab) => (
                    <SelectItem key={tab} value={tab} className="text-xs">
                      {t(`tabs.${tab}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger className="bg-background border-border min-w-[150px]">
                  <SelectValue placeholder={t("filterOrg")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    {t("allOrgs")}
                  </SelectItem>
                  {organizationsData?.map((org) => (
                    <SelectItem key={org.id} value={org.id} className="text-xs">
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="font-medium h-9">
                    <Layers className="mr-2 size-4" />
                    {t("columns")}
                    <ChevronDown className="ml-2 size-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize text-xs"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="destructive"
                className="font-medium h-9 gap-2"
                onClick={() => setIsBulkRevokeOpen(true)}
                disabled={isBulkRevoking || Object.keys(rowSelection).length === 0}
              >
                <ShieldAlert className="size-4" />
                <span>{t("actions.revokeSelected")}</span>
              </Button>

              <Button
                className="font-medium h-9 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => setIsCreateOpen(true)}
              >
                <UserPlus className="size-4" />
                <span>{t("actions.newUser")}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent border-b border-border">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="text-muted-foreground font-semibold text-xs uppercase tracking-wider h-11 px-4"
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isListLoading ? (
                Array.from({ length: pagination.pageSize }).map((_, i) => (
                  <TableRow key={i} className="border-b border-border/50">
                    {columns.map((_, j) => (
                      <TableCell key={j} className="px-4 py-4">
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="group border-b border-border/50 hover:bg-muted/20 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-4 py-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                    {t("noResults")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-2 pt-2">
          <div className="text-sm text-muted-foreground font-medium">
            {t("selection", {
              count: Object.keys(rowSelection).length,
              total: usersData?.total || 0,
            })}
          </div>
          <div className="flex items-center gap-6 lg:gap-10">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">{t("rowsPerPage")}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-9 w-[70px] justify-between px-3">
                    <span className="text-xs">{pagination.pageSize}</span>
                    <ChevronDown className="size-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[70px]">
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <DropdownMenuItem key={size} className="text-xs" onClick={() => table.setPageSize(size)}>
                      {size}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-1.5 font-medium text-sm">
              <span className="text-muted-foreground">{t("pagination.page")}</span>
              <span>{pagination.pageIndex + 1}</span>
              <span className="text-muted-foreground">{t("pagination.of")}</span>
              <span>{usersData?.total ? Math.ceil(usersData.total / pagination.pageSize) : 0}</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="size-9 rounded-lg"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage() || isListLoading}
              >
                <ChevronsLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-9 rounded-lg"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage() || isListLoading}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-9 rounded-lg"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage() || isListLoading}
              >
                <ChevronRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-9 rounded-lg"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage() || isListLoading}
              >
                <ChevronsRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Ban Dialog */}
      <Dialog open={!!banUser} onOpenChange={(open) => !open && setBanUser(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("banDialog.title")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <p className="text-sm text-muted-foreground">{t("banDialog.description")}</p>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reason" className="text-xs font-semibold text-muted-foreground">
                {t("banDialog.reasonLabel")}
              </label>
              <Textarea
                id="reason"
                placeholder={t("banDialog.reasonPlaceholder")}
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanUser(null)} disabled={isBanning}>
              {t("banDialog.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => banUser && banUserMutation({ userId: banUser.id, reason: banReason })}
              disabled={isBanning}
            >
              {t("banDialog.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unban Confirm Alert Dialog */}
      <AlertDialog open={!!unbanUser} onOpenChange={(open) => !open && setUnbanUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("unbanDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("unbanDialog.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUnbanning}>{t("unbanDialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={(e) => {
                e.preventDefault();
                if (unbanUser) unbanUserMutation(unbanUser.id);
              }}
              disabled={isUnbanning}
            >
              {t("unbanDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirm Alert Dialog */}
      <AlertDialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteDialog.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("deleteDialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={(e) => {
                e.preventDefault();
                if (deleteUser) deleteUserMutation(deleteUser.id);
              }}
              disabled={isDeleting}
            >
              {t("deleteDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create User Dialog */}
      <CreateUserDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={(values) => createUserMutation(values)}
        isPending={isCreatingUser}
        t={t}
        organizations={organizationsData || []}
      />

      {/* Edit User Dialog */}
      <EditUserDialog
        user={editingUser}
        organizationId={
          userOrgsData
            ?.filter((m: UserOrganization) => m.userId === editingUser?.id)
            .map((m: UserOrganization) => {
              return organizationsData?.find((org) => org.id === m.organizationId)?.slug;
            })
            .filter(Boolean) as string[]
        }
        onOpenChange={(open) => !open && setEditingUser(null)}
        onSubmit={(values) => {
          if (editingUser) {
            updateUserMutation({ userId: editingUser.id, values });
          }
        }}
        isPending={isUpdatingUser}
        t={t}
        organizations={organizationsData || []}
      />

      {/* Set Password Dialog */}
      <SetPasswordDialog
        user={passwordUser}
        onOpenChange={(open) => !open && setPasswordUser(null)}
        onSubmit={(password) => {
          if (passwordUser) {
            setUserPasswordMutation({ userId: passwordUser.id, password });
          }
        }}
        isPending={isSettingPassword}
        t={t}
      />

      {/* Manage Sessions Dialog */}
      <ManageSessionsDialog
        user={sessionsUser}
        onOpenChange={(open) => !open && setSessionsUser(null)}
        sessions={sessions}
        isLoading={isSessionsLoading}
        onRevokeSession={(sessionToken) => revokeUserSessionMutation({ sessionToken })}
        onRevokeAllSessions={() => {
          if (sessionsUser) {
            revokeUserSessionsMutation({ userId: sessionsUser.id });
          }
        }}
        isRevokingSession={isRevokingSession}
        isRevokingSessions={isRevokingSessions}
        t={t}
      />

      {/* Bulk Revoke Sessions Alert Dialog */}
      <AlertDialog open={isBulkRevokeOpen} onOpenChange={setIsBulkRevokeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("bulkRevokeDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("bulkRevokeDialog.description", {
                count: Object.keys(rowSelection).length,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkRevoking}>{t("bulkRevokeDialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={(e) => {
                e.preventDefault();
                const userIds = Object.keys(rowSelection);
                bulkRevokeSessionsMutation(userIds);
              }}
              disabled={isBulkRevoking}
            >
              {t("bulkRevokeDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateUserFormValues) => void;
  isPending: boolean;
  t: (key: string, values?: Record<string, any>) => string;
  organizations: Organization[];
}

function CreateUserDialog({ open, onOpenChange, onSubmit, isPending, t, organizations }: CreateUserDialogProps) {
  const anchor = useComboboxAnchor();
  const schema = React.useMemo(() => {
    return z.object({
      name: z.string().min(2, t("validation.nameInvalid")),
      email: z
        .string()
        .email(t("validation.emailInvalid"))
        .refine(
          async (val) => {
            try {
              const res = await axiosGateway.get<OkResponse<{ id: string }>>(`/api/users/email/${val}`, {
                validateStatus: (status) => status === 404 || status < 399,
              });
              if (res.data.data) return false;
              return true;
            } catch {
              return true;
            }
          },
          { message: t("validation.emailTaken") },
        ),
      username: z
        .string()
        .min(3, t("validation.usernameInvalid"))
        .regex(/^[a-zA-Z0-9_]+$/, t("validation.usernameInvalid"))
        .refine(
          async (val) => {
            try {
              const res = await axiosGateway.get<OkResponse<{ id: string }>>(`/api/users/username/${val}`, {
                validateStatus: (status) => status === 404 || status < 399,
              });
              if (res.data.data) return false;
              return true;
            } catch {
              return true;
            }
          },
          { message: t("validation.usernameTaken") },
        ),
      password: z.string().min(8, t("validation.passwordInvalid")),
      role: z.enum(["user", "admin"]),
      organizationId: z.array(z.string()).min(1, t("validation.organizationRequired")),
      image: z.string().optional(),
    });
  }, [t]);

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      password: "",
      role: "user",
      organizationId: [],
      image: "",
    },
  });

  const [isAvatarOpen, setIsAvatarOpen] = React.useState(false);
  const imageVal = form.watch("image");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle>{t("createDialog.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <div className="md:col-span-2 space-y-4">
              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="create-name">{t("createDialog.nameLabel")}</FieldLabel>
                    <Input
                      {...field}
                      id="create-name"
                      placeholder={t("createDialog.namePlaceholder")}
                      disabled={isPending}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="create-email">{t("createDialog.emailLabel")}</FieldLabel>
                    <Input
                      {...field}
                      id="create-email"
                      type="email"
                      placeholder={t("createDialog.emailPlaceholder")}
                      disabled={isPending}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="username"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="create-username">{t("createDialog.usernameLabel")}</FieldLabel>
                    <Input
                      {...field}
                      id="create-username"
                      placeholder={t("createDialog.usernamePlaceholder")}
                      disabled={isPending}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="create-password">{t("createDialog.passwordLabel")}</FieldLabel>
                    <Input
                      {...field}
                      id="create-password"
                      type="password"
                      placeholder={t("createDialog.passwordPlaceholder")}
                      disabled={isPending}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>

            <div className="flex flex-col items-center justify-center p-4 border border-border/50 bg-muted/10 rounded-2xl md:h-full min-h-[220px]">
              <Avatar className="w-24 h-24 md:w-28 md:h-28 border-2 border-border shadow-sm">
                {imageVal && (
                  <AvatarImage
                    src={imageVal.startsWith("http") || imageVal.startsWith("/") ? imageVal : `/${imageVal}`}
                    alt="Avatar preview"
                    className="object-cover"
                  />
                )}
                <AvatarFallback className="bg-muted text-muted-foreground text-xl font-bold">
                  {form.watch("name") ? form.watch("name").slice(0, 2).toUpperCase() : "NA"}
                </AvatarFallback>
              </Avatar>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4 font-bold text-xs"
                onClick={() => setIsAvatarOpen(true)}
                disabled={isPending}
              >
                {t("editDialog.changePhoto")}
              </Button>
            </div>
          </div>

          <div className="pt-4 space-y-4">
            <Controller
              name="role"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="create-role">{t("createDialog.roleLabel")}</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                    <SelectTrigger id="create-role" className="w-full bg-background border-border">
                      <SelectValue placeholder={t("createDialog.rolePlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user" className="text-xs">
                        {t("roles.user")}
                      </SelectItem>
                      <SelectItem value="admin" className="text-xs">
                        {t("roles.admin")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="organizationId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="create-organization">{t("createDialog.organizationLabel")}</FieldLabel>
                  <Combobox
                    multiple
                    items={organizations}
                    value={field.value || []}
                    onValueChange={(value) => {
                      field.onChange(value);
                    }}
                    disabled={isPending}
                  >
                    <ComboboxChips ref={anchor} className="w-full max-w-none">
                      <ComboboxValue>
                        {(values: string[]) => (
                          <React.Fragment>
                            {values.map((value: string) => (
                              <ComboboxChip key={value}>{value}</ComboboxChip>
                            ))}
                            <ComboboxChipsInput
                              id="create-organization"
                              disabled={isPending}
                              placeholder={values.length > 0 ? "" : t("createDialog.organizationPlaceholder")}
                              className="placeholder:text-muted-foreground"
                            />
                          </React.Fragment>
                        )}
                      </ComboboxValue>
                    </ComboboxChips>
                    <ComboboxContent anchor={anchor}>
                      <ComboboxList>
                        {(org) => (
                          <ComboboxItem key={org.id} value={org.slug} className="text-xs">
                            {org.name}
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </div>
          <DialogFooter className="pt-4 mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              {t("createDialog.cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {t("createDialog.confirm")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      <AvatarEditorDialog
        isOpen={isAvatarOpen}
        onClose={() => setIsAvatarOpen(false)}
        onSuccess={(url) => {
          if (url) {
            form.setValue("image", url);
          }
        }}
        uploadUrl="/api/users/admin/upload-photo"
      />
    </Dialog>
  );
}

interface EditUserDialogProps {
  user: AdminUser | null;
  organizationId?: string[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: EditUserFormValues) => void;
  isPending: boolean;
  t: (key: string, values?: Record<string, any>) => string;
  organizations: Organization[];
}

function EditUserDialog({
  user,
  organizationId,
  onOpenChange,
  onSubmit,
  isPending,
  t,
  organizations,
}: EditUserDialogProps) {
  const anchor = useComboboxAnchor();
  const schema = React.useMemo(() => {
    return z.object({
      name: z.string().min(2, t("validation.nameInvalid")),
      email: z
        .string()
        .email(t("validation.emailInvalid"))
        .refine(
          async (val) => {
            if (user && val === user.email) return true;
            try {
              const res = await axiosGateway.get<OkResponse<{ id: string }>>(`/api/users/email/${val}`, {
                validateStatus: (status) => status === 404 || status < 399,
              });
              if (res.data.data) return false;
              return true;
            } catch {
              return true;
            }
          },
          { message: t("validation.emailTaken") },
        ),
      username: z
        .string()
        .min(3, t("validation.usernameInvalid"))
        .regex(/^[a-zA-Z0-9_]+$/, t("validation.usernameInvalid"))
        .refine(
          async (val) => {
            if (user && val === user.username) return true;
            try {
              const res = await axiosGateway.get<OkResponse<{ id: string }>>(`/api/users/username/${val}`, {
                validateStatus: (status) => status === 404 || status < 399,
              });
              if (res.data.data) return false;
              return true;
            } catch {
              return true;
            }
          },
          { message: t("validation.usernameTaken") },
        ),
      role: z.enum(["user", "admin"]),
      bio: z.string().optional(),
      gender: z.string().optional(),
      organizationId: z.array(z.string()).min(1, t("validation.organizationRequired")),
      image: z.string().optional(),
    });
  }, [t, user]);

  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      role: "user",
      bio: "",
      gender: "",
      organizationId: [],
      image: "",
    },
  });

  const [isAvatarOpen, setIsAvatarOpen] = React.useState(false);
  const imageVal = form.watch("image");

  const lastResetUserId = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (user) {
      if (lastResetUserId.current !== user.id) {
        lastResetUserId.current = user.id;
        form.reset({
          name: user.name || "",
          email: user.email || "",
          username: user.username || "",
          role: (user.role as "user" | "admin") || "user",
          bio: user.bio || "",
          gender: user.gender || "",
          organizationId: organizationId || [],
          image: user.image || "",
        });
      }
    } else {
      lastResetUserId.current = null;
    }
  }, [user, organizationId, form]);

  return (
    <Dialog open={!!user} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle>{t("editDialog.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <div className="md:col-span-2 space-y-4">
              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="edit-name">{t("editDialog.nameLabel")}</FieldLabel>
                    <Input
                      {...field}
                      id="edit-name"
                      placeholder={t("editDialog.namePlaceholder")}
                      disabled={isPending}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="edit-email">{t("editDialog.emailLabel")}</FieldLabel>
                    <Input
                      {...field}
                      id="edit-email"
                      type="email"
                      placeholder={t("editDialog.emailPlaceholder")}
                      disabled={isPending}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="username"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="edit-username">{t("editDialog.usernameLabel")}</FieldLabel>
                    <Input
                      {...field}
                      id="edit-username"
                      placeholder={t("editDialog.usernamePlaceholder")}
                      disabled={isPending}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="bio"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="edit-bio">{t("editDialog.bioLabel")}</FieldLabel>
                    <Input {...field} id="edit-bio" placeholder={t("editDialog.bioPlaceholder")} disabled={isPending} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="gender"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="edit-gender">{t("editDialog.genderLabel")}</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                      <SelectTrigger id="edit-gender" className="w-full bg-background border-border">
                        <SelectValue placeholder={t("editDialog.genderPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male" className="text-xs">
                          {t("genders.male")}
                        </SelectItem>
                        <SelectItem value="female" className="text-xs">
                          {t("genders.female")}
                        </SelectItem>
                        <SelectItem value="other" className="text-xs">
                          {t("genders.other")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>

            <div className="flex flex-col items-center justify-center p-4 border border-border/50 bg-muted/10 rounded-2xl md:h-full min-h-[220px]">
              <Avatar className="w-24 h-24 md:w-28 md:h-28 border-2 border-border shadow-sm">
                {imageVal && (
                  <AvatarImage
                    src={imageVal.startsWith("http") || imageVal.startsWith("/") ? imageVal : `/${imageVal}`}
                    alt="Avatar preview"
                    className="object-cover"
                  />
                )}
                <AvatarFallback className="bg-muted text-muted-foreground text-xl font-bold">
                  {form.watch("name") ? form.watch("name").slice(0, 2).toUpperCase() : "NA"}
                </AvatarFallback>
              </Avatar>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4 font-bold text-xs"
                onClick={() => setIsAvatarOpen(true)}
                disabled={isPending}
              >
                {t("editDialog.changePhoto")}
              </Button>
            </div>
          </div>

          <div className="pt-4 space-y-4">
            <Controller
              name="role"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="edit-role">{t("editDialog.roleLabel")}</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                    <SelectTrigger id="edit-role" className="w-full bg-background border-border">
                      <SelectValue placeholder={t("editDialog.rolePlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user" className="text-xs">
                        {t("roles.user")}
                      </SelectItem>
                      <SelectItem value="admin" className="text-xs">
                        {t("roles.admin")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="organizationId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="edit-organization">{t("editDialog.organizationLabel")}</FieldLabel>
                  <Combobox
                    multiple
                    items={organizations}
                    value={field.value || []}
                    onValueChange={(value) => {
                      field.onChange(value);
                    }}
                    disabled={isPending}
                  >
                    <ComboboxChips ref={anchor} className="w-full max-w-none">
                      <ComboboxValue>
                        {(values: string[]) => (
                          <React.Fragment>
                            {values.map((value: string) => (
                              <ComboboxChip key={value}>{value}</ComboboxChip>
                            ))}
                            <ComboboxChipsInput
                              id="edit-organization"
                              disabled={isPending}
                              placeholder={values.length > 0 ? "" : t("editDialog.organizationPlaceholder")}
                              className="placeholder:text-muted-foreground"
                            />
                          </React.Fragment>
                        )}
                      </ComboboxValue>
                    </ComboboxChips>
                    <ComboboxContent anchor={anchor}>
                      <ComboboxList>
                        {(org) => (
                          <ComboboxItem key={org.id} value={org.slug} className="text-xs">
                            {org.name}
                          </ComboboxItem>
                        )}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </div>

          <DialogFooter className="pt-4 mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              {t("editDialog.cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {t("editDialog.confirm")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      <AvatarEditorDialog
        isOpen={isAvatarOpen}
        onClose={() => setIsAvatarOpen(false)}
        onSuccess={(url) => {
          if (url) {
            form.setValue("image", url);
          }
        }}
        uploadUrl="/api/users/admin/upload-photo"
      />
    </Dialog>
  );
}

interface SetPasswordDialogProps {
  user: AdminUser | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (password: string) => void;
  isPending: boolean;
  t: (key: string, values?: Record<string, any>) => string;
}

function SetPasswordDialog({ user, onOpenChange, onSubmit, isPending, t }: SetPasswordDialogProps) {
  const form = useForm<SetPasswordFormValues>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: {
      password: "",
    },
  });

  React.useEffect(() => {
    if (!user) {
      form.reset({ password: "" });
    }
  }, [user, form]);

  return (
    <Dialog open={!!user} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("setPasswordDialog.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((values) => onSubmit(values.password))} className="space-y-4 py-4">
          <FieldGroup>
            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="set-password">{t("setPasswordDialog.passwordLabel")}</FieldLabel>
                  <Input
                    {...field}
                    id="set-password"
                    type="password"
                    placeholder={t("setPasswordDialog.passwordPlaceholder")}
                    disabled={isPending}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
          <DialogFooter className="pt-4 mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              {t("setPasswordDialog.cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {t("setPasswordDialog.confirm")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface ManageSessionsDialogProps {
  user: AdminUser | null;
  onOpenChange: (open: boolean) => void;
  sessions: UserSession[];
  isLoading: boolean;
  onRevokeSession: (sessionToken: string) => void;
  onRevokeAllSessions: () => void;
  isRevokingSession: boolean;
  isRevokingSessions: boolean;
  t: (key: string, values?: Record<string, any>) => string;
}

function ManageSessionsDialog({
  user,
  onOpenChange,
  sessions,
  isLoading,
  onRevokeSession,
  onRevokeAllSessions,
  isRevokingSession,
  isRevokingSessions,
  t,
}: ManageSessionsDialogProps) {
  return (
    <Dialog open={!!user} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="pb-4">
          <DialogTitle>
            {t("sessionsDialog.title", {
              name: user?.name || user?.username || "",
            })}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 max-h-[350px] overflow-y-auto space-y-3">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-center text-muted-foreground py-6">{t("sessionsDialog.noSessions")}</p>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-3 border border-border rounded-lg bg-background/50 hover:bg-background/80 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold max-w-[200px] truncate">
                      {session.userAgent || "Unknown Device"}
                    </span>
                    {session.ipAddress && (
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                        {session.ipAddress}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t("sessionsDialog.expires")}: {format(new Date(session.expiresAt), "MMM d, yyyy HH:mm")}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRevokeSession(session.token)}
                  disabled={isRevokingSession}
                  className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 h-8"
                >
                  {t("sessionsDialog.revoke")}
                </Button>
              </div>
            ))
          )}
        </div>

        <DialogFooter className="pt-4 flex items-center gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("sessionsDialog.close")}
          </Button>
          {sessions.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onRevokeAllSessions}
              disabled={isRevokingSessions || isLoading}
              className="h-8"
            >
              {t("sessionsDialog.revokeAll")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
