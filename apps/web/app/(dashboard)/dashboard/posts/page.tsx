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
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import Image from "next/image";
import { getMediaUrl } from "@/lib/utils";
import { CaptionRenderer } from "@/components/common/caption-renderer";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreatePostStepper } from "@/components/pages/home/create-post-stepper";
import CreatePostProvider from "@/components/pages/home/create-post-provider";
import {
  ChevronDown,
  MoreHorizontal,
  Search,
  Plus,
  Eye,
  Trash2,
  FileText,
  Video,
  Layers,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Heart,
  MessageCircle,
  X,
  ArrowUpDown,
} from "lucide-react";
import { StatsCards } from "@/components/pages/dashboard/posts/stats-cards";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

export type Post = {
  id: string;
  userId: string;
  caption: string | null;
  isReel: boolean;
  isArchived: boolean;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  user: {
    name: string;
    image: string | null;
    username: string;
  };
  postMedia: {
    id: string;
    mediaUrl: string;
    thumbnailUrl: string;
    mediaType: string;
  }[];
};

export default function AllPostsPage() {
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearch] = useDebounce(searchQuery, 300);
  const [activeTab, setActiveTab] = React.useState("all");
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
  const [postToDelete, setPostToDelete] = React.useState<string | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = React.useState(false);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);

  // Reset page index when search or filters change to avoid out-of-bounds page states
  React.useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [debouncedSearch, activeTab, dateRange]);

  const t = useTranslations("Dashboard.posts");
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const permissions = getPermissionByPath(pathname);

  usePermissionGuard(permissions || { user: ["read"] });

  const { mutate: deletePostMutation, isPending: isDeletingPost } = useMutation(
    {
      mutationFn: async (postId: string) => {
        return await axiosGateway.delete(`/api/posts/by/${postId}`);
      },
      onSuccess: () => {
        toast.success(t("deleteSuccess"));
        queryClient.invalidateQueries({ queryKey: ["posts"] });
      },
      onError: () => {
        toast.error(t("deleteError"));
      },
    },
  );

  const { mutate: deleteManyPostsMutation, isPending: isDeletingMany } =
    useMutation({
      mutationFn: async (ids: string[]) => {
        return await axiosGateway.delete("/api/posts/bulk", { data: { ids } });
      },
      onSuccess: () => {
        toast.success(t("deleteManySuccess"));
        setRowSelection({});
        queryClient.invalidateQueries({ queryKey: ["posts"] });
      },
      onError: () => {
        toast.error(t("deleteError"));
      },
    });

  const { data: postsData, isLoading } = useQuery({
    queryKey: [
      "posts",
      pagination,
      debouncedSearch,
      activeTab,
      sorting,
      dateRange,
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

      if (activeTab === "published") params.isArchived = false;
      else if (activeTab === "archived") params.isArchived = true;
      else if (activeTab === "reel") params.isReel = true;
      else if (activeTab === "post") params.isReel = false;

      if (dateRange?.from) params.startDate = dateRange.from.toISOString();
      if (dateRange?.to) params.endDate = dateRange.to.toISOString();

      const response = await axiosGateway.get<FindManyResponse<Post>>(
        "/api/posts",
        { params },
      );
      return response.data;
    },
  });

  const columns: ColumnDef<Post>[] = [
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
      accessorKey: "caption",
      header: t("table.post"),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="aspect-3/4 w-12 h-16 rounded-md bg-muted overflow-hidden shrink-0 border border-border relative">
            <Image
              src={getMediaUrl(
                row.original.postMedia?.[0]?.thumbnailUrl,
                "post",
                row.original.postMedia?.[0]?.mediaType,
              )}
              alt=""
              fill
              className="object-cover"
            />
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="truncate font-medium text-sm block max-w-[300px]">
              {row.original.caption ? (
                <CaptionRenderer html={row.original.caption} />
              ) : (
                <span className="text-muted-foreground">{t("noCaption")}</span>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: t("table.type"),
      cell: ({ row }) => {
        const isReel = row.original.isReel;
        const Icon = isReel ? Video : FileText;
        return (
          <Badge
            variant="secondary"
            className={cn(
              "flex items-center gap-1.5 px-2 py-0.5 h-6 w-fit border transition-colors",
              isReel
                ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/20 hover:bg-indigo-500/15 dark:bg-indigo-400/10 dark:text-indigo-400 dark:border-indigo-400/20"
                : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/15 dark:bg-emerald-400/10 dark:text-emerald-400 dark:border-emerald-400/20",
            )}
          >
            <Icon className="size-3" />
            <span className="capitalize text-xs font-semibold">
              {isReel ? "reel" : "post"}
            </span>
          </Badge>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4 h-8 gap-1 p-0 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground"
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
      accessorKey: "author",
      header: t("table.author"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Avatar className="size-8">
            <AvatarImage
              src={
                (row.original.user.image && `/${row.original.user.image}`) ||
                "/default-avatar.png"
              }
            />
            <AvatarFallback className="text-xs">
              {row.original.user.name?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium truncate max-w-[100px]">
              {row.original.user.name}
            </span>
            <span className="text-xs text-muted-foreground font-medium truncate max-w-[100px]">
              {row.original.user.username}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "engagement",
      header: t("table.engagement"),
      cell: ({ row }) => (
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <Heart className="size-4! text-muted-foreground" />
            <span className="font-medium">
              {(row.original.likesCount || 0).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <MessageCircle className="size-4! text-muted-foreground" />
            <span className="font-medium">
              {(row.original.commentsCount || 0).toLocaleString()}
            </span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: t("table.status"),
      cell: ({ row }) => {
        const isArchived = row.original.isArchived;
        return (
          <Badge
            variant={!isArchived ? "success" : "secondary"}
            className="capitalize text-xs font-medium px-2 py-0 h-5"
          >
            {!isArchived ? t("status.published") : t("status.archived")}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-primary"
            onClick={() => router.push(`/p/${row.original.id}`)}
          >
            <Eye className="size-4" />
          </Button>
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
                onClick={() => toast.info("Insights feature coming soon!")}
              >
                {t("actions.insights")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive text-xs cursor-pointer"
                disabled={isDeletingPost}
                onClick={() => setPostToDelete(row.original.id)}
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
    data: postsData?.data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    manualPagination: true,
    manualSorting: true,
    pageCount: postsData?.metadata
      ? Math.ceil(postsData.metadata.total / postsData.metadata.limit)
      : -1,
    state: {
      columnVisibility,
      rowSelection,
      sorting,
      pagination,
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
        <StatsCards dateRange={dateRange} activeTab={activeTab} />

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

              <DatePickerWithRange
                date={dateRange}
                setDate={setDateRange}
                placeholder={t("filterDate")}
              />

              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder={t("filterStatus")} />
                </SelectTrigger>
                <SelectContent>
                  {["all", "reel", "post", "published", "archived"].map(
                    (tab) => (
                      <SelectItem key={tab} value={tab} className="text-xs">
                        {t(`tabs.${tab}`)}
                      </SelectItem>
                    ),
                  )}
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
                onClick={() => setIsCreateOpen(true)}
              >
                <Plus className="size-4" />
                <span>{t("newPost")}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Table */}
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
                      className="text-muted-foreground font-semibold text-[11px] uppercase tracking-wider h-11 px-4"
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
              ) : table.getRowModel().rows?.length ? (
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

        {/* Pagination */}
        <div className="flex items-center justify-between px-2 pt-2">
          <div className="text-sm text-muted-foreground font-medium">
            {t("selection", {
              count: Object.keys(rowSelection).length,
              total: postsData?.metadata?.total || 0,
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
                {postsData?.metadata
                  ? Math.ceil(
                      postsData.metadata.total / postsData.metadata.limit,
                    )
                  : 0}
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
      </div>

      {/* Create Post Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="w-full max-w-none h-dvh max-h-dvh sm:w-[calc(100vw-2rem)] sm:max-w-3xl md:max-w-4xl lg:max-w-5xl sm:h-auto sm:max-h-[85dvh] overflow-y-auto no-scrollbar scroll-smooth flex flex-col border-0 sm:border rounded-none! sm:rounded-xl! p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{t("newPost")}</DialogTitle>
          </DialogHeader>
          <CreatePostProvider>
            <CreatePostStepper />
          </CreatePostProvider>
        </DialogContent>
      </Dialog>

      {/* Single Delete Confirmation */}
      <AlertDialog
        open={!!postToDelete}
        onOpenChange={(open) => !open && setPostToDelete(null)}
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
              onClick={() => postToDelete && deletePostMutation(postToDelete)}
            >
              {t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation */}
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
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                const selectedIds = table
                  .getSelectedRowModel()
                  .rows.map((row) => row.original.id);
                deleteManyPostsMutation(selectedIds);
              }}
            >
              {t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
