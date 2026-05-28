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
import { axiosGateway, FindManyResponse } from "@/lib/axios-config";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronDown,
  MoreHorizontal,
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  ArrowUpDown,
  FolderHeart,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupButton,
} from "@/components/ui/input-group";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
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
import { PAGE_SIZE_OPTIONS } from "@/constants/pagination";

export type SavedCollection = {
  id: string;
  name: string;
  postsCount: number;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    username: string;
    image: string | null;
  } | null;
};

export default function CollectionsDashboardPage() {
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState<
    Record<string, boolean>
  >({});
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearch] = useDebounce(searchQuery, 300);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [collectionToDelete, setCollectionToDelete] = React.useState<
    string | null
  >(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = React.useState(false);

  // Reset page index when search changes
  React.useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [debouncedSearch]);

  const t = useTranslations("Dashboard.collections");
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const permissions = getPermissionByPath(pathname);

  usePermissionGuard(permissions || { collection: ["read"] });

  const { mutate: deleteCollectionMutation, isPending: isDeletingCollection } =
    useMutation({
      mutationFn: async (collectionId: string) => {
        return await axiosGateway.delete(
          `/api/posts/collections/${collectionId}`,
        );
      },
      onSuccess: () => {
        toast.success(t("deleteSuccess"));
        queryClient.invalidateQueries({ queryKey: ["collections"] });
      },
      onError: () => {
        toast.error(t("deleteError"));
      },
    });

  const { mutate: deleteManyCollectionsMutation, isPending: isDeletingMany } =
    useMutation({
      mutationFn: async (ids: string[]) => {
        return await axiosGateway.delete("/api/posts/collections/bulk", {
          data: { ids },
        });
      },
      onSuccess: () => {
        toast.success(t("deleteManySuccess"));
        setRowSelection({});
        queryClient.invalidateQueries({ queryKey: ["collections"] });
      },
      onError: () => {
        toast.error(t("deleteError"));
      },
    });

  // Query for paginated collections list
  const { data: response, isLoading } = useQuery<
    FindManyResponse<SavedCollection>
  >({
    queryKey: [
      "collections",
      pagination.pageIndex,
      pagination.pageSize,
      debouncedSearch,
      sorting,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: (pagination.pageIndex + 1).toString(),
        limit: pagination.pageSize.toString(),
        all: "true",
      });

      if (debouncedSearch) {
        params.append("keyword", debouncedSearch);
      }

      if (sorting.length > 0 && sorting[0]) {
        const field = sorting[0].id;
        const order = sorting[0].desc ? "desc" : "asc";
        params.append("sort", `${field},${order}`);
      } else {
        params.append("sort", "createdAt,desc");
      }

      const res = await axiosGateway.get(
        `/api/posts/collections?${params.toString()}`,
      );
      return res.data;
    },
  });

  const collectionsData = React.useMemo(() => response?.data || [], [response]);
  const totalRecords = response?.metadata?.total || 0;
  const totalPages = Math.ceil(totalRecords / pagination.pageSize);

  const columns = React.useMemo<ColumnDef<SavedCollection>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
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
        accessorKey: "name",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="-ml-4 h-8 gap-1 p-0 font-semibold text-xs uppercase tracking-wider text-muted-foreground"
            >
              {t("table.name")}
              <ArrowUpDown className="size-3" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const name = row.getValue("name") as string;
          return (
            <div className="flex items-center gap-2">
              <FolderHeart className="w-4 h-4 text-primary shrink-0" />
              <span className="font-semibold text-sm">{name}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "user",
        header: () => (
          <span className="font-semibold text-xs uppercase tracking-wider text-muted-foreground px-0">
            {t("table.owner")}
          </span>
        ),
        cell: ({ row }) => {
          const user = row.original.user;
          if (!user)
            return <span className="text-muted-foreground text-xs">-</span>;
          return (
            <div className="flex items-center gap-2">
              <Avatar className="size-8">
                <AvatarImage
                  src={
                    (user.image && `/${user.image}`) || "/default-avatar.png"
                  }
                />
                <AvatarFallback className="text-xs">
                  {user.name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground leading-none">
                  {user.name}
                </span>
                <span className="text-xs text-muted-foreground mt-0.5">
                  @{user.username}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "postsCount",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="-ml-4 h-8 gap-1 p-0 font-semibold text-xs uppercase tracking-wider text-muted-foreground"
            >
              {t("table.postsCount")}
              <ArrowUpDown className="size-3" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const count = row.getValue("postsCount") as number;
          return (
            <Badge
              variant="secondary"
              className="font-mono text-sm px-2.5 py-0.5 border border-border"
            >
              {count}
            </Badge>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="-ml-4 h-8 gap-1 p-0 font-semibold text-xs uppercase tracking-wider text-muted-foreground"
            >
              {t("table.date")}
              <ArrowUpDown className="size-3" />
            </Button>
          );
        },
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5 whitespace-nowrap">
            <span className="text-xs font-medium">
              {format(new Date(row.original.createdAt), "MMM d, yyyy")}
            </span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(row.original.createdAt), "HH:mm")}
            </span>
          </div>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">{t("table.actions")}</span>,
        cell: ({ row }) => {
          const collection = row.original;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[160px]">
                <DropdownMenuLabel className="text-xs">
                  {t("table.actions")}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive text-xs cursor-pointer gap-2"
                  onClick={() => setCollectionToDelete(collection.id)}
                >
                  <Trash2 className="w-4 h-4" />
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
    data: collectionsData,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedCount = selectedRows.length;

  const handleBulkDelete = () => {
    const ids = selectedRows.map((r) => r.original.id);
    deleteManyCollectionsMutation(ids);
    setIsBulkDeleteOpen(false);
  };

  const handleSingleDelete = () => {
    if (collectionToDelete) {
      deleteCollectionMutation(collectionToDelete);
      setCollectionToDelete(null);
    }
  };

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
                        {column.id === "postsCount"
                          ? t("table.postsCount")
                          : column.id === "createdAt"
                            ? t("table.date")
                            : column.id === "user"
                              ? t("table.owner")
                              : column.id}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="destructive"
                className="h-9 gap-2 font-medium"
                disabled={selectedCount === 0 || isDeletingMany}
                onClick={() => setIsBulkDeleteOpen(true)}
              >
                <Trash2 className="size-4" />
                <span>{t("deleteSelected")}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Table Container */}
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
              ) : collectionsData.length > 0 ? (
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
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-32 text-center text-muted-foreground"
                  >
                    {t("noResults")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Container */}
        <div className="flex items-center justify-between px-2 pt-2">
          <div className="text-sm text-muted-foreground font-medium">
            {t("selection", { count: selectedCount, total: totalRecords })}
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
                      onClick={() => {
                        setPagination((prev) => ({
                          ...prev,
                          pageSize: size,
                          pageIndex: 0,
                        }));
                      }}
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
              <span>{totalPages || 0}</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="size-9 rounded-lg"
                onClick={() =>
                  setPagination((prev) => ({ ...prev, pageIndex: 0 }))
                }
                disabled={pagination.pageIndex === 0 || isLoading}
              >
                <ChevronsLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-9 rounded-lg"
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    pageIndex: prev.pageIndex - 1,
                  }))
                }
                disabled={pagination.pageIndex === 0 || isLoading}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-9 rounded-lg"
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    pageIndex: prev.pageIndex + 1,
                  }))
                }
                disabled={pagination.pageIndex >= totalPages - 1 || isLoading}
              >
                <ChevronRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-9 rounded-lg"
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    pageIndex: totalPages - 1,
                  }))
                }
                disabled={pagination.pageIndex >= totalPages - 1 || isLoading}
              >
                <ChevronsRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Alert Dialogs */}
      <AlertDialog
        open={collectionToDelete !== null}
        onOpenChange={(open) => !open && setCollectionToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmDeleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleSingleDelete}
              disabled={isDeletingCollection}
            >
              {t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmBulkDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmBulkDeleteDescription", { count: selectedCount })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={isDeletingMany}
            >
              {t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
