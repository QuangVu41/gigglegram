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
  Building,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Edit,
  Building2,
  Plus,
  Layers,
  Sparkles,
  Users,
  UserCheck,
  ShieldCheck,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupButton } from "@/components/ui/input-group";
import { useTranslations } from "next-intl";
import { cn, getUsernameFallback } from "@/lib/utils";
import { format } from "date-fns";
import { usePathname } from "next/navigation";
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
import { AvatarEditorDialog } from "@/components/common/avatar-editor-dialog";
import { PAGE_SIZE_OPTIONS } from "@/constants/pagination";
import { statements as authStatements } from "@repo/types/auth";

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  createdAt: string | Date;
  metadata?: string | null;
}

interface DynamicRole {
  id: string;
  role: string;
  permission: Record<string, string[]> | string;
  organizationId: string;
}

interface StatsCardsProps {
  totalCount?: number;
  totalMembersCount?: number;
  avgMembersPerOrg?: number;
  recentCount?: number;
  isLoading: boolean;
}

function StatsCards({
  totalCount = 0,
  totalMembersCount = 0,
  avgMembersPerOrg = 0,
  recentCount = 0,
  isLoading,
}: StatsCardsProps) {
  const t = useTranslations("Dashboard.organizations.stats");

  const cards = [
    {
      title: t("totalOrgs"),
      value: totalCount,
      icon: Building,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    {
      title: t("totalMembers"),
      value: totalMembersCount,
      icon: Users,
      color: "text-green-500",
      bg: "bg-green-500/10",
      border: "border-green-500/20",
    },
    {
      title: t("avgMembersPerOrg"),
      value: avgMembersPerOrg,
      icon: UserCheck,
      color: "text-red-500",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
    },
    {
      title: t("recentOrgs"),
      value: recentCount,
      icon: Sparkles,
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

export default function OrganizationManagementPage() {
  const t = useTranslations("Dashboard.organizations");
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const permissions = getPermissionByPath(pathname);

  usePermissionGuard(permissions || { organization: ["update", "delete"] });

  // State
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  // Dialog State
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = React.useState(false);
  const [editingOrg, setEditingOrg] = React.useState<Organization | null>(null);
  const [deletingOrg, setDeletingOrg] = React.useState<Organization | null>(null);
  const [permissionsOrg, setPermissionsOrg] = React.useState<Organization | null>(null);

  // Query all organizations (paginated & filtered)
  const { data: orgsResponse, isLoading: isListLoading } = useQuery<FindManyResponse<Organization>>({
    queryKey: ["admin-organizations", pagination.pageIndex, pagination.pageSize, sorting, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", (pagination.pageIndex + 1).toString());
      params.append("limit", pagination.pageSize.toString());
      if (searchQuery) params.append("keyword", searchQuery);
      if (sorting.length > 0 && sorting[0]) {
        const firstSort = sorting[0];
        params.append("sort", `${firstSort.id},${firstSort.desc ? "desc" : "asc"}`);
      } else {
        params.append("sort", "createdAt,desc");
      }
      const res = await axiosGateway.get<FindManyResponse<Organization>>(
        `/api/authentication/organizations?${params.toString()}`,
      );
      return res.data;
    },
  });

  const organizations = orgsResponse?.data || [];
  const totalCount = orgsResponse?.metadata?.total || 0;

  // Query stats
  const { data: statsData, isLoading: isStatsLoading } = useQuery({
    queryKey: ["admin-organizations-stats"],
    queryFn: async () => {
      const res = await axiosGateway.get<
        OkResponse<{
          totalOrgs: number;
          totalMembers: number;
          avgMembersPerOrg: number;
          recentOrgs: number;
        }>
      >("/api/authentication/organizations/stats");
      return res.data.data;
    },
  });

  // Create organization mutation
  const { mutate: createOrgMutation, isPending: isCreating } = useMutation({
    mutationFn: async (values: { name: string; slug: string; logo?: string }) => {
      const res = await axiosGateway.post<OkResponse<Organization>>("/api/authentication/organizations", {
        name: values.name,
        slug: values.slug,
        logo: values.logo || "",
      });
      return res.data.data;
    },
    onSuccess: () => {
      toast.success(t("createSuccess"));
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
    },
    onError: (err: unknown) => {
      console.error(err);
      toast.error(t("createError"));
    },
  });

  // Edit organization mutation
  const { mutate: editOrgMutation, isPending: isUpdating } = useMutation({
    mutationFn: async (values: { id: string; name: string; slug: string; logo?: string }) => {
      const res = await axiosGateway.patch<OkResponse<Organization>>(`/api/authentication/organizations/${values.id}`, {
        name: values.name,
        slug: values.slug,
        logo: values.logo || "",
      });
      return res.data.data;
    },
    onSuccess: () => {
      toast.success(t("updateSuccess"));
      setEditingOrg(null);
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
    },
    onError: (err: unknown) => {
      console.error(err);
      toast.error(t("updateError"));
    },
  });

  // Delete organization mutation
  const { mutate: deleteOrgMutation, isPending: isDeleting } = useMutation({
    mutationFn: async (id: string) => {
      const res = await axiosGateway.delete<OkResponse<{ success: boolean }>>(
        `/api/authentication/organizations/${id}`,
      );
      return res.data.data;
    },
    onSuccess: () => {
      toast.success(t("deleteSuccess"));
      setDeletingOrg(null);
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
    },
    onError: (err: unknown) => {
      console.error(err);
      toast.error(t("deleteError"));
    },
  });

  // Delete multiple organizations mutation
  const { mutate: deleteManyOrgsMutation, isPending: isDeletingMany } = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await axiosGateway.post<OkResponse<{ success: boolean }>>(
        "/api/authentication/organizations/delete-many",
        {
          ids,
        },
      );
      return res.data.data;
    },
    onSuccess: () => {
      toast.success(t("deleteManySuccess"));
      setRowSelection({});
      setIsBulkDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
    },
    onError: (err: unknown) => {
      console.error(err);
      toast.error(t("deleteError"));
    },
  });

  // Table columns definition
  const columns = React.useMemo<ColumnDef<Organization>[]>(
    () => [
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
        accessorKey: "logo",
        header: t("table.logo"),
        cell: ({ row }) => {
          const name = row.getValue("name") as string;
          const logo = row.getValue("logo") as string | undefined;
          return (
            <Avatar className="size-10 border border-border">
              {logo && (
                <AvatarImage
                  src={logo.startsWith("http") || logo.startsWith("/") ? logo : `/${logo}`}
                  alt={name}
                  className="object-cover"
                />
              )}
              <AvatarFallback className="bg-muted text-muted-foreground font-bold text-xs">
                {getUsernameFallback(name)}
              </AvatarFallback>
            </Avatar>
          );
        },
      },
      {
        accessorKey: "name",
        header: t("table.name"),
        cell: ({ row }) => <div className="font-semibold text-foreground text-sm">{row.getValue("name")}</div>,
      },
      {
        accessorKey: "slug",
        header: t("table.slug"),
        cell: ({ row }) => (
          <Badge variant="secondary" className="font-mono text-xs font-normal border border-border">
            {row.getValue("slug")}
          </Badge>
        ),
      },
      {
        accessorKey: "createdAt",
        header: t("table.createdAt"),
        cell: ({ row }) => {
          const date = row.getValue("createdAt");
          if (!date) return "-";
          return (
            <div className="flex flex-col">
              <span className="text-xs font-medium text-foreground">
                {format(new Date(date as string), "MMM d, yyyy")}
              </span>
              <span className="text-xs text-muted-foreground">{format(new Date(date as string), "HH:mm")}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "metadata",
        header: t("table.metadata"),
        cell: ({ row }) => {
          const val = row.getValue("metadata") as string | undefined;
          return (
            <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px] block">{val || "-"}</span>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const org = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs text-muted-foreground">{t("actions.title")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-xs gap-2 font-medium cursor-pointer"
                  onClick={() => setEditingOrg(org)}
                >
                  <Edit className="size-3.5" />
                  {t("actions.edit")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-xs gap-2 font-medium cursor-pointer text-blue-600 focus:text-blue-700"
                  onClick={() => setPermissionsOrg(org)}
                >
                  <ShieldCheck className="size-3.5" />
                  {t("actions.permissions")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-xs gap-2 font-medium cursor-pointer text-destructive focus:text-destructive"
                  onClick={() => setDeletingOrg(org)}
                >
                  <Trash2 className="size-3.5" />
                  {t("actions.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [t],
  );

  const table = useReactTable({
    data: organizations,
    columns,
    state: {
      sorting,
      columnVisibility,
      pagination,
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(totalCount / pagination.pageSize),
  });

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
          totalCount={statsData?.totalOrgs}
          totalMembersCount={statsData?.totalMembers}
          avgMembersPerOrg={statsData?.avgMembersPerOrg}
          recentCount={statsData?.recentOrgs}
          isLoading={isStatsLoading}
        />

        {/* Filters */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <InputGroup className="max-w-sm">
              <InputGroupAddon>
                <Search className="size-4" />
              </InputGroupAddon>
              <InputGroupInput
                placeholder={t("searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                }}
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
              disabled={Object.keys(rowSelection).length === 0 || isDeletingMany}
              onClick={() => setIsBulkDeleteOpen(true)}
            >
              <Trash2 className="size-4" />
              <span>{t("deleteSelected")}</span>
            </Button>

            <Button
              className="font-medium h-9 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="size-4" />
              <span>{t("actions.newOrg")}</span>
            </Button>
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
                    data-state={row.getIsSelected() && "selected"}
                    className="group border-b border-border/50 hover:bg-muted/20 transition-colors data-[state=selected]:bg-primary/3"
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
              count: table.getFilteredSelectedRowModel().rows.length,
              total: totalCount,
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
              <span>{table.getPageCount()}</span>
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

      {/* Create Dialog */}
      <CreateOrganizationDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={(values) => createOrgMutation(values)}
        isPending={isCreating}
      />

      {/* Edit Dialog */}
      <EditOrganizationDialog
        org={editingOrg}
        onOpenChange={(open) => !open && setEditingOrg(null)}
        onSubmit={(values) => editingOrg && editOrgMutation({ id: editingOrg.id, ...values })}
        isPending={isUpdating}
      />

      {/* Delete Dialog */}
      <AlertDialog open={!!deletingOrg} onOpenChange={(open) => !open && setDeletingOrg(null)}>
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
                if (deletingOrg) deleteOrgMutation(deletingOrg.id);
              }}
              disabled={isDeleting}
            >
              {t("deleteDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Dialog */}
      <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmBulkDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmBulkDeleteDescription", {
                count: table.getSelectedRowModel().rows.length,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingMany}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              disabled={isDeletingMany}
              onClick={(e) => {
                e.preventDefault();
                const selectedIds = table.getSelectedRowModel().rows.map((row) => row.original.id);
                deleteManyOrgsMutation(selectedIds);
              }}
            >
              {t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permissions Assignment Dialog */}
      {permissionsOrg && (
        <ManagePermissionsDialog org={permissionsOrg} onOpenChange={(open) => !open && setPermissionsOrg(null)} />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                          CREATE ORG DIALOG                                 */
/* -------------------------------------------------------------------------- */

interface CreateOrgDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: { name: string; slug: string; logo?: string }) => void;
  isPending: boolean;
}

const orgSchema = z.object({
  name: z.string().min(2, "validation.nameInvalid"),
  slug: z
    .string()
    .min(2, "validation.slugRequired")
    .regex(/^[a-z0-9-]+$/, "validation.slugInvalid"),
  logo: z.string().optional(),
});

type OrgFormValues = z.infer<typeof orgSchema>;

function CreateOrganizationDialog({ open, onOpenChange, onSubmit, isPending }: CreateOrgDialogProps) {
  const t = useTranslations("Dashboard.organizations");
  const [isAvatarOpen, setIsAvatarOpen] = React.useState(false);

  const { control, handleSubmit, watch, setValue, reset } = useForm<OrgFormValues>({
    resolver: zodResolver(orgSchema),
    defaultValues: {
      name: "",
      slug: "",
      logo: "",
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        name: "",
        slug: "",
        logo: "",
      });
    }
  }, [open, reset]);

  const logoVal = watch("logo");
  const nameVal = watch("name");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t("createDialog.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <div className="md:col-span-2 space-y-4">
              <Controller
                name="name"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="create-org-name">{t("createDialog.nameLabel")}</FieldLabel>
                    <Input
                      {...field}
                      id="create-org-name"
                      placeholder={t("createDialog.namePlaceholder")}
                      disabled={isPending}
                    />
                    {fieldState.invalid && (
                      <FieldError
                        errors={
                          fieldState.error ? [{ ...fieldState.error, message: t(fieldState.error.message as any) }] : []
                        }
                      />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="slug"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="create-org-slug">{t("createDialog.slugLabel")}</FieldLabel>
                    <Input
                      {...field}
                      id="create-org-slug"
                      placeholder={t("createDialog.slugPlaceholder")}
                      disabled={isPending}
                    />
                    {fieldState.invalid && (
                      <FieldError
                        errors={
                          fieldState.error ? [{ ...fieldState.error, message: t(fieldState.error.message as any) }] : []
                        }
                      />
                    )}
                  </Field>
                )}
              />
            </div>

            <div className="flex flex-col items-center justify-center p-4 border border-border/50 bg-muted/10 rounded-2xl md:h-full min-h-[200px]">
              <Avatar className="size-24 border-2 border-border shadow-sm">
                {logoVal && (
                  <AvatarImage
                    src={logoVal.startsWith("http") || logoVal.startsWith("/") ? logoVal : `/${logoVal}`}
                    alt="Logo preview"
                    className="object-cover"
                  />
                )}
                <AvatarFallback className="bg-muted text-muted-foreground text-xl font-bold">
                  {getUsernameFallback(nameVal || "") || "NA"}
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
                {t("createDialog.changePhoto")}
              </Button>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              {t("createDialog.cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {t("createDialog.confirm")}
            </Button>
          </DialogFooter>
        </form>

        <AvatarEditorDialog
          isOpen={isAvatarOpen}
          onClose={() => setIsAvatarOpen(false)}
          onSuccess={(url) => setValue("logo", url)}
          uploadUrl="/api/users/admin/upload-photo"
        />
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*                          EDIT ORG DIALOG                                   */
/* -------------------------------------------------------------------------- */

interface EditOrgDialogProps {
  org: Organization | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: { name: string; slug: string; logo?: string }) => void;
  isPending: boolean;
}

function EditOrganizationDialog({ org, onOpenChange, onSubmit, isPending }: EditOrgDialogProps) {
  const t = useTranslations("Dashboard.organizations");
  const [isAvatarOpen, setIsAvatarOpen] = React.useState(false);

  const { control, handleSubmit, watch, setValue, reset } = useForm<OrgFormValues>({
    resolver: zodResolver(orgSchema),
    defaultValues: {
      name: "",
      slug: "",
      logo: "",
    },
  });

  React.useEffect(() => {
    if (org) {
      reset({
        name: org.name || "",
        slug: org.slug || "",
        logo: org.logo || "",
      });
    }
  }, [org, reset]);

  const logoVal = watch("logo");
  const nameVal = watch("name");

  return (
    <Dialog open={!!org} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t("editDialog.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <div className="md:col-span-2 space-y-4">
              <Controller
                name="name"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="edit-org-name">{t("editDialog.nameLabel")}</FieldLabel>
                    <Input
                      {...field}
                      id="edit-org-name"
                      placeholder={t("editDialog.namePlaceholder")}
                      disabled={isPending}
                    />
                    {fieldState.invalid && (
                      <FieldError
                        errors={
                          fieldState.error ? [{ ...fieldState.error, message: t(fieldState.error.message as any) }] : []
                        }
                      />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="slug"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="edit-org-slug">{t("editDialog.slugLabel")}</FieldLabel>
                    <Input
                      {...field}
                      id="edit-org-slug"
                      placeholder={t("editDialog.slugPlaceholder")}
                      disabled={isPending}
                    />
                    {fieldState.invalid && (
                      <FieldError
                        errors={
                          fieldState.error ? [{ ...fieldState.error, message: t(fieldState.error.message as any) }] : []
                        }
                      />
                    )}
                  </Field>
                )}
              />
            </div>

            <div className="flex flex-col items-center justify-center p-4 border border-border/50 bg-muted/10 rounded-2xl md:h-full min-h-[200px]">
              <Avatar className="size-24 border-2 border-border shadow-sm">
                {logoVal && (
                  <AvatarImage
                    src={logoVal.startsWith("http") || logoVal.startsWith("/") ? logoVal : `/${logoVal}`}
                    alt="Logo preview"
                    className="object-cover"
                  />
                )}
                <AvatarFallback className="bg-muted text-muted-foreground text-xl font-bold">
                  {getUsernameFallback(nameVal || "") || "NA"}
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

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              {t("editDialog.cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {t("editDialog.confirm")}
            </Button>
          </DialogFooter>
        </form>

        <AvatarEditorDialog
          isOpen={isAvatarOpen}
          onClose={() => setIsAvatarOpen(false)}
          onSuccess={(url) => setValue("logo", url)}
          uploadUrl="/api/users/admin/upload-photo"
        />
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*                          MANAGE PERMISSIONS DIALOG                        */
/* -------------------------------------------------------------------------- */

const EMPTY_ROLES: DynamicRole[] = [];

interface ManagePermissionsDialogProps {
  org: Organization;
  onOpenChange: (open: boolean) => void;
}

function ManagePermissionsDialog({ org, onOpenChange }: ManagePermissionsDialogProps) {
  const t = useTranslations("Dashboard.organizations.permissionsDialog");
  const tOrg = useTranslations("Dashboard.organizations");

  const [currentPermissions, setCurrentPermissions] = React.useState<Record<string, string[]>>({});

  // Query dynamic roles
  const {
    data: roles = EMPTY_ROLES,
    isLoading: isRolesLoading,
    refetch: refetchRoles,
  } = useQuery<DynamicRole[]>({
    queryKey: ["org-roles", org.id],
    queryFn: async () => {
      const res = await axiosGateway.get<OkResponse<DynamicRole[]>>(
        `/api/authentication/organizations/${org.id}/roles`,
      );
      return res.data.data;
    },
  });

  // Create/Update member role mutation
  const { mutate: savePermissionsMutation, isPending: isSaving } = useMutation({
    mutationFn: async () => {
      const res = await axiosGateway.post<OkResponse<{ success: boolean }>>(
        `/api/authentication/organizations/${org.id}/roles`,
        {
          permission: currentPermissions,
        },
      );
      return res.data.data;
    },
    onSuccess: () => {
      toast.success(tOrg("updatePermissionsSuccess"));
      refetchRoles();
    },
    onError: (err: unknown) => {
      console.error(err);
      toast.error(tOrg("updatePermissionsError"));
    },
  });

  // Load member role permissions when roles data arrives
  React.useEffect(() => {
    const matched = roles.find((r) => r.role === "member");
    if (matched) {
      const parsed = typeof matched.permission === "string" ? JSON.parse(matched.permission) : matched.permission;
      setCurrentPermissions(parsed || {});
    } else {
      setCurrentPermissions({});
    }
  }, [roles]);

  const handleTogglePermission = (resource: string, action: string, checked: boolean) => {
    setCurrentPermissions((prev) => {
      const next = { ...prev };
      const actions = next[resource] ? [...next[resource]] : [];

      if (checked) {
        if (!actions.includes(action)) {
          actions.push(action);
        }
      } else {
        const index = actions.indexOf(action);
        if (index > -1) {
          actions.splice(index, 1);
        }
      }

      if (actions.length > 0) {
        next[resource] = actions;
      } else {
        delete next[resource];
      }

      return next;
    });
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="px-1">
          <DialogTitle>
            {t("title")} - {org.name}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">{t("description")}</p>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-6 py-4 overflow-y-auto px-1">
          {/* Permissions grid */}
          <div className="flex-1 border border-border/60 rounded-xl overflow-hidden bg-card">
            <div className="max-h-[350px] overflow-y-auto">
              <Table>
                <TableHeader className="bg-muted/40 sticky top-0 z-10">
                  <TableRow className="border-b border-border/80">
                    <TableHead className="text-muted-foreground font-semibold text-xs uppercase px-4 h-10 w-[200px]">
                      {t("resourceHeader")}
                    </TableHead>
                    <TableHead className="text-muted-foreground font-semibold text-xs uppercase px-4 h-10">
                      {t("actionsHeader")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(authStatements).map(([resource, actions]) => {
                    const typedActions = actions as readonly string[];
                    const currentActions = currentPermissions[resource] || [];

                    return (
                      <TableRow key={resource} className="border-b border-border/40 hover:bg-muted/5">
                        <TableCell className="font-semibold text-sm capitalize py-3 px-4 text-foreground">
                          {resource}
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <div className="flex flex-wrap gap-x-6 gap-y-2">
                            {typedActions.map((action) => {
                              const checkboxId = `${resource}-${action}`;
                              const isChecked = currentActions.includes(action);
                              return (
                                <div key={action} className="flex items-center gap-2">
                                  <Checkbox
                                    id={checkboxId}
                                    checked={isChecked}
                                    onCheckedChange={(checked) => handleTogglePermission(resource, action, !!checked)}
                                    disabled={isSaving}
                                  />
                                  <Label
                                    htmlFor={checkboxId}
                                    className="text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer capitalize"
                                  >
                                    {action}
                                  </Label>
                                </div>
                              );
                            })}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-4 flex items-center justify-end gap-2 w-full px-1">
          <Button variant="outline" className="h-9" onClick={() => onOpenChange(false)} disabled={isSaving}>
            {t("cancel")}
          </Button>
          <Button className="h-9" onClick={() => savePermissionsMutation()} disabled={isSaving || isRolesLoading}>
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
