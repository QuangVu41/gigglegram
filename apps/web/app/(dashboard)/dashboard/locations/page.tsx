"use client";

import * as React from "react";
import dynamic from "next/dynamic";
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
  MapPin,
  Globe,
  Calendar,
  Layers,
  Plus,
  Pencil,
} from "lucide-react";
import { StatsCards } from "@/components/pages/dashboard/locations/stats-cards";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PAGE_SIZE_OPTIONS } from "@/constants/pagination";

export type Location = {
  id: string;
  name: string;
  latitude: string;
  longitude: string;
  city: string;
  country: string;
  postsCount: number;
  createdAt: string;
};

// Dynamically import the map container to prevent SSR errors
const LocationMap = dynamic(
  () => import("@/components/pages/dashboard/locations/location-map"),
  {
    ssr: false,
    loading: () => <Skeleton className="w-full h-[400px] rounded-lg" />,
  },
);

export default function LocationsDashboardPage() {
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
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
  const [locationToDelete, setLocationToDelete] = React.useState<string | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = React.useState(false);
  const [selectedLocationForMap, setSelectedLocationForMap] = React.useState<Location | null>(null);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [locationToEdit, setLocationToEdit] = React.useState<Location | null>(null);

  // Reset page index when search or dateRange changes
  React.useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [debouncedSearch, dateRange]);

  const t = useTranslations("Dashboard.locations");
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const permissions = getPermissionByPath(pathname);

  // Permission Guard
  usePermissionGuard(permissions || { post: ["read"] });

  const { data, isLoading } = useQuery<FindManyResponse<Location>>({
    queryKey: ["locations", debouncedSearch, sorting, pagination, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", (pagination.pageIndex + 1).toString());
      params.append("limit", pagination.pageSize.toString());
      if (debouncedSearch) {
        params.append("keyword", debouncedSearch);
      }
      if (sorting.length > 0 && sorting[0]) {
        const sort = sorting[0];
        params.append("sort", `${sort.id},${sort.desc ? "desc" : "asc"}`);
      }
      if (dateRange?.from) {
        params.append("startDate", dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        params.append("endDate", dateRange.to.toISOString());
      }

      const res = await axiosGateway.get(
        `/api/posts/locations?${params.toString()}`,
      );
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await axiosGateway.delete(`/api/posts/locations/by/${id}`);
    },
    onSuccess: () => {
      toast.success(t("deleteSuccess"));
      setLocationToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      queryClient.invalidateQueries({ queryKey: ["locations-stats"] });
    },
    onError: (err) => {
      console.error(err);
      toast.error(t("deleteError"));
    },
  });

  const deleteManyMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await axiosGateway.delete("/api/posts/locations/bulk", { data: { ids } });
    },
    onSuccess: () => {
      toast.success(t("deleteManySuccess"));
      setRowSelection({});
      setIsBulkDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      queryClient.invalidateQueries({ queryKey: ["locations-stats"] });
    },
    onError: (err) => {
      console.error(err);
      toast.error(t("deleteError"));
    },
  });

  const { mutate: createLocationMutation, isPending: isCreatingLocation } = useMutation({
    mutationFn: async (values: {
      name: string;
      city: string;
      country: string;
      latitude: number;
      longitude: number;
    }) => {
      return await axiosGateway.post("/api/posts/locations", values);
    },
    onSuccess: () => {
      toast.success(t("createSuccess"));
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      queryClient.invalidateQueries({ queryKey: ["locations-stats"] });
    },
    onError: (err) => {
      console.error(err);
      toast.error(t("createError"));
    },
  });

  const { mutate: updateLocationMutation, isPending: isUpdatingLocation } = useMutation({
    mutationFn: async (values: {
      name: string;
      city: string;
      country: string;
      latitude: number;
      longitude: number;
    }) => {
      if (!locationToEdit) return;
      return await axiosGateway.patch(`/api/posts/locations/${locationToEdit.id}`, values);
    },
    onSuccess: () => {
      toast.success(t("updateSuccess"));
      setLocationToEdit(null);
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      queryClient.invalidateQueries({ queryKey: ["locations-stats"] });
    },
    onError: (err) => {
      console.error(err);
      toast.error(t("updateError"));
    },
  });

  const columns = React.useMemo<ColumnDef<Location>[]>(
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
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-4 h-8 gap-1 p-0 font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:bg-transparent"
          >
            {t("table.name")}
            <ArrowUpDown className="size-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2 font-medium text-foreground">
            <MapPin className="size-4 text-primary shrink-0" />
            <span
              className="truncate max-w-[200px]"
              title={row.getValue("name")}
            >
              {row.getValue("name")}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "city",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-4 h-8 gap-1 p-0 font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:bg-transparent"
          >
            {t("table.city")}
            <ArrowUpDown className="size-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground font-medium text-xs">
            {row.getValue("city")}
          </span>
        ),
      },
      {
        accessorKey: "country",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-4 h-8 gap-1 p-0 font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:bg-transparent"
          >
            {t("table.country")}
            <ArrowUpDown className="size-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
            <Globe className="size-3.5 opacity-60 shrink-0" />
            <span>{row.getValue("country")}</span>
          </div>
        ),
      },
      {
        accessorKey: "postsCount",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-4 h-8 gap-1 p-0 font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:bg-transparent"
          >
            {t("table.postsCount")}
            <ArrowUpDown className="size-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <Badge
            variant="secondary"
            className="font-semibold text-xs px-2 py-0.5 border border-border"
          >
            {row.getValue("postsCount")}
          </Badge>
        ),
      },
      {
        accessorKey: "createdAt",
        id: "date",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-4 h-8 gap-1 p-0 font-semibold text-xs uppercase tracking-wider text-muted-foreground hover:bg-transparent"
          >
            {t("table.date")}
            <ArrowUpDown className="size-3" />
          </Button>
        ),
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
        id: "mapPreview",
        header: "",
        enableHiding: false,
        cell: ({ row }) => {
          const location = row.original;
          return (
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1 h-7 px-2.5 text-xs hover:bg-primary/10 hover:text-primary transition-all duration-300 rounded-md font-medium"
              onClick={() => setSelectedLocationForMap(location)}
            >
              <MapPin className="size-3" />
              <span>{t("actions.viewMap")}</span>
            </Button>
          );
        },
      },
      {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => {
          const location = row.original;

          return (
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
                    onClick={() => setSelectedLocationForMap(location)}
                  >
                    <MapPin className="mr-2 size-3" />
                    {t("actions.viewMap")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-xs cursor-pointer gap-2"
                    onClick={() => setLocationToEdit(location)}
                  >
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                    {t("actions.edit")}
                  </DropdownMenuItem>
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive text-xs cursor-pointer"
                      onClick={() => setLocationToDelete(location.id)}
                    >
                      <Trash2 className="mr-2 size-3" />
                      {t("actions.delete")}
                    </DropdownMenuItem>
                  </>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [t, permissions],
  );

  const tableData = React.useMemo(() => data?.data || [], [data]);
  const totalRecords = data?.metadata?.total || 0;
  const totalPages = data?.metadata
    ? Math.ceil(data.metadata.total / data.metadata.limit)
    : 0;

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    manualPagination: true,
    manualSorting: true,
    pageCount: totalPages,
    state: {
      columnVisibility,
      rowSelection,
      sorting,
      pagination,
    },
  });

  const handleBulkDelete = () => {
    const selectedIds = table
      .getSelectedRowModel()
      .rows.map((row) => row.original.id);
    deleteManyMutation.mutate(selectedIds);
  };

  const handleSingleDelete = () => {
    if (locationToDelete) {
      deleteMutation.mutate(locationToDelete);
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
        {/* Aggregate Statistics */}
        <StatsCards />

        {/* Control Filters Bar */}
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <InputGroup className="max-w-sm">
                <InputGroupAddon>
                  <Search className="size-4 text-muted-foreground" />
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

              <DatePickerWithRange
                date={dateRange}
                setDate={setDateRange}
                placeholder={t("filterDate")}
              />
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
                        {t(`table.${column.id}` as any) || column.id}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="destructive"
                className="h-9 gap-2 font-medium"
                disabled={
                  Object.keys(rowSelection).length === 0 ||
                  deleteManyMutation.isPending
                }
                onClick={() => setIsBulkDeleteOpen(true)}
              >
                <Trash2 className="size-4" />
                <span>{t("deleteSelected")}</span>
              </Button>
              <Button
                className="h-9 gap-2 font-medium"
                onClick={() => setIsCreateOpen(true)}
              >
                <Plus className="size-4" />
                <span>{t("newLocation")}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Data Table */}
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
              ) : tableData.length > 0 ? (
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

        {/* Pagination Controls */}
        <div className="flex items-center justify-between px-2 pt-2">
          <div className="text-sm text-muted-foreground font-medium">
            {t("selection", {
              count: Object.keys(rowSelection).length,
              total: totalRecords,
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
              <span>{totalPages || 1}</span>
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
      </div>

      {/* Map Dialog Preview */}
      <Dialog
        open={selectedLocationForMap !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedLocationForMap(null);
        }}
      >
        <DialogContent className="max-w-2xl bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <MapPin className="h-5 w-5 text-primary" />
              {selectedLocationForMap &&
                t("mapModalTitle", { name: selectedLocationForMap.name })}
            </DialogTitle>
          </DialogHeader>
          <div className="pt-2">
            {selectedLocationForMap && (
              <LocationMap
                latitude={parseFloat(selectedLocationForMap.latitude)}
                longitude={parseFloat(selectedLocationForMap.longitude)}
                name={selectedLocationForMap.name}
                city={selectedLocationForMap.city}
                country={selectedLocationForMap.country}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialogue: Single Deletion */}
      <AlertDialog
        open={locationToDelete !== null}
        onOpenChange={(open) => !open && setLocationToDelete(null)}
      >
        <AlertDialogContent className="bg-card border border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmDeleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setLocationToDelete(null)}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSingleDelete}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              {t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialogue: Bulk Deletion */}
      <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <AlertDialogContent className="bg-card border border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmBulkDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmBulkDeleteDescription", {
                count: table.getSelectedRowModel().rows.length,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsBulkDeleteOpen(false)}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              {t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Location Dialog */}
      <CreateLocationDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={createLocationMutation}
        isPending={isCreatingLocation}
        t={t}
      />

      {/* Edit Location Dialog */}
      <UpdateLocationDialog
        location={locationToEdit}
        onOpenChange={(open) => !open && setLocationToEdit(null)}
        onSubmit={updateLocationMutation}
        isPending={isUpdatingLocation}
        t={t}
      />
    </div>
  );
}

interface CreateLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: {
    name: string;
    city: string;
    country: string;
    latitude: number;
    longitude: number;
  }) => void;
  isPending: boolean;
  t: (key: string) => string;
}

function CreateLocationDialog({ open, onOpenChange, onSubmit, isPending, t }: CreateLocationDialogProps) {
  const schema = React.useMemo(() => {
    return z.object({
      name: z.string().min(1, t("validation.nameRequired")),
      city: z.string().min(1, t("validation.cityRequired")),
      country: z.string().min(1, t("validation.countryRequired")),
      latitude: z.preprocess(
        (val) => (val === "" || val === undefined ? undefined : Number(val)),
        z.number({ message: t("validation.latitudeInvalid") })
          .min(-90, t("validation.latitudeInvalid"))
          .max(90, t("validation.latitudeInvalid"))
      ),
      longitude: z.preprocess(
        (val) => (val === "" || val === undefined ? undefined : Number(val)),
        z.number({ message: t("validation.longitudeInvalid") })
          .min(-180, t("validation.longitudeInvalid"))
          .max(180, t("validation.longitudeInvalid"))
      ),
    });
  }, [t]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      city: "",
      country: "",
      latitude: "" as any,
      longitude: "" as any,
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        name: "",
        city: "",
        country: "",
        latitude: "" as any,
        longitude: "" as any,
      });
    }
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border border-border">
        <DialogHeader>
          <DialogTitle>{t("createDialog.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel>{t("createDialog.nameLabel")}</FieldLabel>
                <Input {...field} placeholder={t("createDialog.namePlaceholder")} disabled={isPending} />
                {errors.name?.message && <FieldError>{String(errors.name.message)}</FieldError>}
              </Field>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <Controller
              name="city"
              control={control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>{t("createDialog.cityLabel")}</FieldLabel>
                  <Input {...field} placeholder={t("createDialog.cityPlaceholder")} disabled={isPending} />
                  {errors.city?.message && <FieldError>{String(errors.city.message)}</FieldError>}
                </Field>
              )}
            />
            <Controller
              name="country"
              control={control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>{t("createDialog.countryLabel")}</FieldLabel>
                  <Input {...field} placeholder={t("createDialog.countryPlaceholder")} disabled={isPending} />
                  {errors.country?.message && <FieldError>{String(errors.country.message)}</FieldError>}
                </Field>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Controller
              name="latitude"
              control={control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>{t("createDialog.latitudeLabel")}</FieldLabel>
                  <Input {...field} type="number" step="any" placeholder={t("createDialog.latitudePlaceholder")} disabled={isPending} />
                  {errors.latitude?.message && <FieldError>{String(errors.latitude.message)}</FieldError>}
                </Field>
              )}
            />
            <Controller
              name="longitude"
              control={control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>{t("createDialog.longitudeLabel")}</FieldLabel>
                  <Input {...field} type="number" step="any" placeholder={t("createDialog.longitudePlaceholder")} disabled={isPending} />
                  {errors.longitude?.message && <FieldError>{String(errors.longitude.message)}</FieldError>}
                </Field>
              )}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {t("createDialog.submit")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface UpdateLocationDialogProps {
  location: Location | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: {
    name: string;
    city: string;
    country: string;
    latitude: number;
    longitude: number;
  }) => void;
  isPending: boolean;
  t: (key: string) => string;
}

function UpdateLocationDialog({ location, onOpenChange, onSubmit, isPending, t }: UpdateLocationDialogProps) {
  const schema = React.useMemo(() => {
    return z.object({
      name: z.string().min(1, t("validation.nameRequired")),
      city: z.string().min(1, t("validation.cityRequired")),
      country: z.string().min(1, t("validation.countryRequired")),
      latitude: z.preprocess(
        (val) => (val === "" || val === undefined ? undefined : Number(val)),
        z.number({ message: t("validation.latitudeInvalid") })
          .min(-90, t("validation.latitudeInvalid"))
          .max(90, t("validation.latitudeInvalid"))
      ),
      longitude: z.preprocess(
        (val) => (val === "" || val === undefined ? undefined : Number(val)),
        z.number({ message: t("validation.longitudeInvalid") })
          .min(-180, t("validation.longitudeInvalid"))
          .max(180, t("validation.longitudeInvalid"))
      ),
    });
  }, [t]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      city: "",
      country: "",
      latitude: "" as any,
      longitude: "" as any,
    },
  });

  React.useEffect(() => {
    if (location) {
      reset({
        name: location.name,
        city: location.city,
        country: location.country,
        latitude: parseFloat(location.latitude),
        longitude: parseFloat(location.longitude),
      });
    }
  }, [location, reset]);

  return (
    <Dialog open={location !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border border-border">
        <DialogHeader>
          <DialogTitle>{t("editDialog.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel>{t("editDialog.nameLabel")}</FieldLabel>
                <Input {...field} placeholder={t("editDialog.namePlaceholder")} disabled={isPending} />
                {errors.name?.message && <FieldError>{String(errors.name.message)}</FieldError>}
              </Field>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <Controller
              name="city"
              control={control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>{t("editDialog.cityLabel")}</FieldLabel>
                  <Input {...field} placeholder={t("editDialog.cityPlaceholder")} disabled={isPending} />
                  {errors.city?.message && <FieldError>{String(errors.city.message)}</FieldError>}
                </Field>
              )}
            />
            <Controller
              name="country"
              control={control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>{t("editDialog.countryLabel")}</FieldLabel>
                  <Input {...field} placeholder={t("editDialog.countryPlaceholder")} disabled={isPending} />
                  {errors.country?.message && <FieldError>{String(errors.country.message)}</FieldError>}
                </Field>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Controller
              name="latitude"
              control={control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>{t("editDialog.latitudeLabel")}</FieldLabel>
                  <Input {...field} type="number" step="any" placeholder={t("editDialog.latitudePlaceholder")} disabled={isPending} />
                  {errors.latitude?.message && <FieldError>{String(errors.latitude.message)}</FieldError>}
                </Field>
              )}
            />
            <Controller
              name="longitude"
              control={control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>{t("editDialog.longitudeLabel")}</FieldLabel>
                  <Input {...field} type="number" step="any" placeholder={t("editDialog.longitudePlaceholder")} disabled={isPending} />
                  {errors.longitude?.message && <FieldError>{String(errors.longitude.message)}</FieldError>}
                </Field>
              )}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {t("editDialog.submit")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
