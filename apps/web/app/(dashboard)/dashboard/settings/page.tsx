"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { useDebounce } from "use-debounce";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  EyeOff,
  Layers,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Trash2,
  X,
  Lock,
  Unlock,
} from "lucide-react";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  systemSettingSchema,
  SystemSettingSchemaType,
} from "@/schemas/settings";

import { axiosGateway } from "@/lib/axios-config";
import { usePermissionGuard } from "@/hooks/use-permission-guard";
import { getPermissionByPath } from "@/constants/nav-dashboard";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldContent,
  FieldTitle,
} from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupButton,
} from "@/components/ui/input-group";

import { StatsCards } from "@/components/pages/dashboard/settings/stats-cards";
import { PAGE_SIZE_OPTIONS } from "@/constants/pagination";

type SystemSetting = {
  id: string;
  key: string;
  value: string;
  type: "string" | "int" | "float" | "bool" | "json";
  description: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
};

const TYPE_COLORS: Record<
  "string" | "int" | "float" | "bool" | "json",
  { bg: string; text: string; border: string }
> = {
  string: {
    bg: "bg-blue-500/10 dark:bg-blue-500/15",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/20 dark:border-blue-500/30",
  },
  int: {
    bg: "bg-amber-500/10 dark:bg-amber-500/15",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/20 dark:border-amber-500/30",
  },
  float: {
    bg: "bg-orange-500/10 dark:bg-orange-500/15",
    text: "text-orange-600 dark:text-orange-400",
    border: "border-orange-500/20 dark:border-orange-500/30",
  },
  bool: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/20 dark:border-emerald-500/30",
  },
  json: {
    bg: "bg-purple-500/10 dark:bg-purple-500/15",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-500/20 dark:border-purple-500/30",
  },
};

type FindManyResponse<T> = {
  data: T[];
  metadata: {
    total: number;
    page: number;
    limit: number;
  };
};

export default function SettingsPage() {
  const t = useTranslations("Dashboard.settings");
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();

  const permissions = getPermissionByPath(pathname);
  usePermissionGuard(permissions || { setting: ["read"] });

  // Filter States
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearch] = useDebounce(searchQuery, 300);
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [accessFilter, setAccessFilter] = React.useState("all");

  // Table States
  const [sorting, setSorting] = React.useState<any[]>([]);
  const [rowSelection, setRowSelection] = React.useState({});
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});

  // Modal Dialog States
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [settingToEdit, setSettingToEdit] =
    React.useState<SystemSetting | null>(null);
  const [settingToDelete, setSettingToDelete] = React.useState<string | null>(
    null,
  );
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = React.useState(false);

  // Form State
  const form = useForm<SystemSettingSchemaType>({
    resolver: zodResolver(systemSettingSchema(t)),
    defaultValues: {
      key: "",
      type: "string",
      value: "",
      description: "",
      isPublic: false,
    },
  });

  // Sync Form on edit select or create trigger
  React.useEffect(() => {
    if (settingToEdit) {
      form.reset({
        key: settingToEdit.key,
        type: settingToEdit.type,
        value: settingToEdit.value,
        description: settingToEdit.description || "",
        isPublic: settingToEdit.isPublic,
      });
    } else {
      form.reset({
        key: "",
        type: "string",
        value: "",
        description: "",
        isPublic: false,
      });
    }
  }, [settingToEdit, isCreateOpen, form]);

  const formType = form.watch("type");

  // Queries
  const { data: settingsData, isLoading } = useQuery({
    queryKey: [
      "settings",
      pagination,
      debouncedSearch,
      typeFilter,
      accessFilter,
      sorting,
    ],
    queryFn: async () => {
      const sortStr =
        sorting.length > 0
          ? `${sorting[0]!.id},${sorting[0]!.desc ? "desc" : "asc"}`
          : "createdAt,desc";
      const params: any = {
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        keyword: debouncedSearch || undefined,
        sort: sortStr,
      };

      if (typeFilter && typeFilter !== "all") params.type = typeFilter;
      if (accessFilter && accessFilter !== "all")
        params.isPublic = accessFilter;

      const response = await axiosGateway.get<FindManyResponse<SystemSetting>>(
        "/api/settings",
        { params },
      );
      return response.data;
    },
  });

  // Mutations
  const { mutate: createMutation, isPending: isCreating } = useMutation({
    mutationFn: async (payload: any) => {
      return await axiosGateway.post("/api/settings", payload);
    },
    onSuccess: () => {
      toast.success(t("deleteSuccess")); // using appropriate msg or fallback
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      queryClient.invalidateQueries({ queryKey: ["settings-stats"] });
    },
    onError: () => {
      toast.error(t("dialog.errors.createFailed"));
    },
  });

  const { mutate: updateMutation, isPending: isUpdating } = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      return await axiosGateway.patch(`/api/settings/${id}`, payload);
    },
    onSuccess: () => {
      toast.success(t("deleteSuccess")); // using appropriate msg
      setIsEditOpen(false);
      setSettingToEdit(null);
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      queryClient.invalidateQueries({ queryKey: ["settings-stats"] });
    },
    onError: () => {
      toast.error(t("dialog.errors.updateFailed"));
    },
  });

  const { mutate: deleteMutation, isPending: isDeleting } = useMutation({
    mutationFn: async (id: string) => {
      return await axiosGateway.delete(`/api/settings/${id}`);
    },
    onSuccess: () => {
      toast.success(t("deleteSuccess"));
      setSettingToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      queryClient.invalidateQueries({ queryKey: ["settings-stats"] });
    },
    onError: () => {
      toast.error(t("deleteError"));
    },
  });

  const { mutate: deleteManyMutation, isPending: isDeletingMany } = useMutation(
    {
      mutationFn: async (ids: string[]) => {
        return await axiosGateway.delete("/api/settings/bulk", {
          data: { ids },
        });
      },
      onSuccess: () => {
        toast.success(t("deleteManySuccess"));
        setRowSelection({});
        setIsBulkDeleteOpen(false);
        queryClient.invalidateQueries({ queryKey: ["settings"] });
        queryClient.invalidateQueries({ queryKey: ["settings-stats"] });
      },
      onError: () => {
        toast.error(t("deleteError"));
      },
    },
  );

  const onSubmit = (data: SystemSettingSchemaType) => {
    if (isEditOpen && settingToEdit) {
      updateMutation({
        id: settingToEdit.id,
        payload: {
          value: data.value,
          description: data.description,
          isPublic: data.isPublic,
        },
      });
    } else {
      createMutation(data);
    }
  };

  const selectedRowKeys = Object.keys(rowSelection)
    .map((index) => {
      const item = settingsData?.data[parseInt(index, 10)];
      return item?.id;
    })
    .filter(Boolean) as string[];

  // Define Columns
  const columns: ColumnDef<SystemSetting>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
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
      accessorKey: "key",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4 h-8 gap-1 p-0 font-semibold text-xs uppercase tracking-wider text-muted-foreground"
        >
          {t("table.key")}
          <ArrowUpDown className="size-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm font-semibold tracking-tight text-foreground truncate max-w-[200px] block">
          {row.original.key}
        </span>
      ),
    },
    {
      accessorKey: "type",
      header: t("table.type"),
      cell: ({ row }) => {
        const type = row.original.type;
        const colors = TYPE_COLORS[type] || TYPE_COLORS.string;
        return (
          <Badge
            variant="outline"
            className={cn(
              "capitalize text-xs font-semibold px-2 py-0.5 font-mono border",
              colors.bg,
              colors.text,
              colors.border,
            )}
          >
            {type}
          </Badge>
        );
      },
    },
    {
      accessorKey: "value",
      header: t("table.value"),
      cell: ({ row }) => {
        const val = row.original.value;
        const type = row.original.type;
        const displayVal = val.length > 30 ? `${val.substring(0, 30)}...` : val;
        const colors = TYPE_COLORS[type] || TYPE_COLORS.string;

        if (type === "bool") {
          const isTrue = val === "true";
          return (
            <Badge
              variant={isTrue ? "success" : "warning"}
              className="font-mono text-xs font-semibold px-2 py-0.5"
            >
              {isTrue ? "true" : "false"}
            </Badge>
          );
        }

        return (
          <Badge
            variant="outline"
            className={cn(
              "capitalize text-xs px-2 py-0.5 font-mono border",
              colors.bg,
              colors.text,
              colors.border,
            )}
          >
            {displayVal}
          </Badge>
        );
      },
    },
    {
      accessorKey: "isPublic",
      header: t("table.access"),
      cell: ({ row }) => {
        const isPub = row.original.isPublic;
        return (
          <div className="flex items-center gap-1.5">
            {isPub ? (
              <Badge
                variant="outline"
                className="gap-1 text-xs font-medium px-2 py-0.5 border bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 dark:border-emerald-500/30"
              >
                <Unlock className="size-3" />
                {t("table.public")}
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="gap-1 text-xs font-medium px-2 py-0.5 border bg-rose-500/10 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20 dark:border-rose-500/30"
              >
                <Lock className="size-3" />
                {t("table.private")}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "description",
      header: t("table.description"),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground max-w-[220px] truncate block">
          {row.original.description || "—"}
        </span>
      ),
    },
    {
      accessorKey: "updatedAt",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4 h-8 gap-1 p-0 font-semibold text-xs uppercase tracking-wider text-muted-foreground"
        >
          {t("table.updatedAt")}
          <ArrowUpDown className="size-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5 whitespace-nowrap">
          <span className="text-xs font-medium">
            {format(new Date(row.original.updatedAt), "MMM d, yyyy")}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(row.original.updatedAt), "HH:mm")}
          </span>
        </div>
      ),
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex items-center justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="size-8 p-0 text-muted-foreground"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-xs">
                {t("actions.title")}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-xs cursor-pointer"
                onClick={() => {
                  setSettingToEdit(row.original);
                  setIsEditOpen(true);
                }}
              >
                {t("actions.edit")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive text-xs cursor-pointer"
                onClick={() => setSettingToDelete(row.original.id)}
              >
                <Trash2 className="size-3" />
                {t("actions.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: settingsData?.data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    manualPagination: true,
    manualSorting: true,
    pageCount: settingsData?.metadata
      ? Math.ceil(settingsData.metadata.total / settingsData.metadata.limit)
      : -1,
    state: {
      rowSelection,
      sorting,
      pagination,
      columnVisibility,
    },
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
        {/* Statistics Cards */}
        <StatsCards typeFilter={typeFilter} accessFilter={accessFilter} />

        {/* Filters & Actions */}
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

              {/* Filter by Type */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="bg-background border-border text-xs font-medium">
                  <SelectValue placeholder={t("filterType")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    {t("filterType")}: {t("filterAll")}
                  </SelectItem>
                  <SelectItem value="string" className="text-xs">
                    String
                  </SelectItem>
                  <SelectItem value="int" className="text-xs">
                    Integer
                  </SelectItem>
                  <SelectItem value="float" className="text-xs">
                    Float
                  </SelectItem>
                  <SelectItem value="bool" className="text-xs">
                    Boolean
                  </SelectItem>
                  <SelectItem value="json" className="text-xs">
                    JSON
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Filter by Access */}
              <Select value={accessFilter} onValueChange={setAccessFilter}>
                <SelectTrigger className="bg-background border-border text-xs font-medium">
                  <SelectValue placeholder={t("filterAccess")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    {t("filterAccess")}: {t("filterAll")}
                  </SelectItem>
                  <SelectItem value="true" className="text-xs">
                    {t("table.public")}
                  </SelectItem>
                  <SelectItem value="false" className="text-xs">
                    {t("table.private")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="font-medium">
                    <Layers className="mr-2 size-4" />
                    {t("columns")}
                    <ChevronDown className="ml-2 size-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel className="text-xs">
                    {t("visibleColumns")}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize text-xs"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) =>
                          column.toggleVisibility(!!value)
                        }
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="destructive"
                className="h-9 gap-2 font-medium"
                disabled={
                  Object.keys(rowSelection).length === 0 || isDeletingMany
                }
                onClick={() => setIsBulkDeleteOpen(true)}
              >
                <Trash2 className="size-4" />
                <span>{t("deleteSelected")}</span>
              </Button>
              <Button
                className="h-9 gap-2 font-medium bg-primary hover:bg-primary/90"
                onClick={() => {
                  setSettingToEdit(null);
                  setIsCreateOpen(true);
                }}
              >
                <Plus className="size-4" />
                <span>{t("newSetting")}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Settings Data Table */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="hover:bg-transparent border-b border-border"
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="text-muted-foreground font-semibold text-xs uppercase tracking-wider h-11 px-4"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: pagination.pageSize }).map((_, i) => (
                  <TableRow key={i} className="border-b border-border/50">
                    {columns.map((_, j) => (
                      <TableCell key={j} className="px-4 py-4">
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : settingsData?.data?.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-32 text-center text-muted-foreground"
                  >
                    {t("noResults")}
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="group border-b border-border/50 hover:bg-muted/20 transition-colors data-[state=selected]:bg-primary/3"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-4 py-4">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {!isLoading && settingsData?.metadata && (
          <div className="flex items-center justify-between px-2 pt-2">
            <div className="text-sm text-muted-foreground font-medium">
              {t("selection", {
                count: Object.keys(rowSelection).length,
                total: settingsData.metadata.total,
              })}
            </div>
            <div className="flex items-center gap-6 lg:gap-10">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground">
                  {t("rowsPerPage")}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-9 w-[70px] justify-between px-3"
                    >
                      <span className="text-xs">{pagination.pageSize}</span>
                      <ChevronDown className="size-3 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[70px]">
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <DropdownMenuItem
                        key={size}
                        className="text-xs"
                        onClick={() => table.setPageSize(size)}
                      >
                        {size}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center gap-1.5 font-medium text-sm">
                <span className="text-muted-foreground">
                  {t("pagination.page")}
                </span>
                <span>{pagination.pageIndex + 1}</span>
                <span className="text-muted-foreground">
                  {t("pagination.of")}
                </span>
                <span>
                  {Math.ceil(
                    settingsData.metadata.total / settingsData.metadata.limit,
                  )}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-9 rounded-lg"
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage() || isLoading}
                >
                  <ChevronsLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-9 rounded-lg"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage() || isLoading}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-9 rounded-lg"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage() || isLoading}
                >
                  <ChevronRight className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-9 rounded-lg"
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage() || isLoading}
                >
                  <ChevronsRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Dialog Modal */}
      <Dialog
        open={isCreateOpen || isEditOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setIsEditOpen(false);
            setSettingToEdit(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                {isCreateOpen ? t("dialog.createTitle") : t("dialog.editTitle")}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                {isCreateOpen ? t("description") : t("dialog.keyDescription")}
              </DialogDescription>
            </DialogHeader>

            <FieldGroup className="py-6">
              {/* Setting Key */}
              <Controller
                name="key"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="setting-key">
                      {t("dialog.keyLabel")}
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        id="setting-key"
                        placeholder="e.g. upload.max_size"
                        {...field}
                        disabled={isEditOpen}
                        required
                        className="font-mono text-sm"
                      />
                      <FieldDescription>
                        {t("dialog.keyDescription")}
                      </FieldDescription>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </FieldContent>
                  </Field>
                )}
              />

              {/* Setting Type */}
              <Controller
                name="type"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="setting-type">
                      {t("dialog.typeLabel")}
                    </FieldLabel>
                    <FieldContent>
                      <Select
                        value={field.value}
                        onValueChange={(val: any) => {
                          field.onChange(val);
                          if (val === "bool") {
                            form.setValue("value", "true", {
                              shouldValidate: true,
                            });
                          } else {
                            form.setValue("value", "", {
                              shouldValidate: true,
                            });
                          }
                        }}
                        disabled={isEditOpen}
                      >
                        <SelectTrigger id="setting-type" type="button">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="string">
                            {t("dialog.types.string")}
                          </SelectItem>
                          <SelectItem value="int">
                            {t("dialog.types.int")}
                          </SelectItem>
                          <SelectItem value="float">
                            {t("dialog.types.float")}
                          </SelectItem>
                          <SelectItem value="bool">
                            {t("dialog.types.bool")}
                          </SelectItem>
                          <SelectItem value="json">
                            {t("dialog.types.json")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </FieldContent>
                  </Field>
                )}
              />

              {/* Setting Value */}
              <Controller
                name="value"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="setting-value">
                      {t("dialog.valueLabel")}
                    </FieldLabel>
                    <FieldContent>
                      {formType === "bool" ? (
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant={
                              field.value === "true" ? "default" : "outline"
                            }
                            className="flex-1 font-semibold uppercase text-xs"
                            onClick={() => field.onChange("true")}
                          >
                            {t("dialog.true")}
                          </Button>
                          <Button
                            type="button"
                            variant={
                              field.value === "false" ? "default" : "outline"
                            }
                            className="flex-1 font-semibold uppercase text-xs"
                            onClick={() => field.onChange("false")}
                          >
                            {t("dialog.false")}
                          </Button>
                        </div>
                      ) : formType === "json" ? (
                        <Textarea
                          id="setting-value"
                          rows={4}
                          placeholder='{ "key": "value" }'
                          {...field}
                          required
                          className="font-mono text-sm"
                        />
                      ) : (
                        <Input
                          id="setting-value"
                          type={
                            formType === "int" || formType === "float"
                              ? "number"
                              : "text"
                          }
                          step={formType === "float" ? "any" : "1"}
                          placeholder={
                            formType === "int" || formType === "float"
                              ? "0"
                              : t("dialog.valuePlaceholder")
                          }
                          {...field}
                          required
                          className={
                            formType === "int" || formType === "float"
                              ? ""
                              : "font-mono text-sm"
                          }
                        />
                      )}
                      <FieldDescription>
                        {t("dialog.valueDescription")}
                      </FieldDescription>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </FieldContent>
                  </Field>
                )}
              />

              {/* Access Visibility */}
              <Controller
                name="isPublic"
                control={form.control}
                render={({ field, fieldState }) => (
                  <FieldLabel htmlFor="setting-visibility">
                    <Field
                      orientation="horizontal"
                      data-invalid={fieldState.invalid}
                      className="justify-between bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer w-full"
                    >
                      <FieldContent>
                        <FieldTitle>{t("dialog.accessLabel")}</FieldTitle>
                        <FieldDescription>
                          {t("dialog.accessDescription")}
                        </FieldDescription>
                      </FieldContent>
                      <Checkbox
                        id="setting-visibility"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  </FieldLabel>
                )}
              />

              {/* Description */}
              <Controller
                name="description"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="setting-description">
                      {t("dialog.descriptionLabel")}
                    </FieldLabel>
                    <FieldContent>
                      <Textarea
                        id="setting-description"
                        rows={2}
                        placeholder={t("dialog.descriptionPlaceholder")}
                        {...field}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </FieldContent>
                  </Field>
                )}
              />
            </FieldGroup>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateOpen(false);
                  setIsEditOpen(false);
                  setSettingToEdit(null);
                }}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating}>
                {isCreating || isUpdating
                  ? t("dialog.saving")
                  : isCreateOpen
                    ? t("dialog.submitCreate")
                    : t("dialog.submitUpdate")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Single Alert Dialog */}
      <AlertDialog
        open={!!settingToDelete}
        onOpenChange={(open) => !open && setSettingToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmDeleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={() => settingToDelete && deleteMutation(settingToDelete)}
            >
              {t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Alert Dialog */}
      <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmBulkDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmBulkDeleteDescription", {
                count: selectedRowKeys.length,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingMany}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeletingMany}
              onClick={() => deleteManyMutation(selectedRowKeys)}
            >
              {t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
