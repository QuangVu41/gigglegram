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
import { axiosGateway, FindManyResponse, OkResponse } from "@/lib/axios-config";
import { toast } from "sonner";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import Image from "next/image";
import { getMediaUrl } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import {
  ChevronDown,
  MoreHorizontal,
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Video,
  AlertTriangle,
  CheckCircle,
  Clock,
  ShieldAlert,
  Scale,
  Eye,
  Layers,
} from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useDebounce } from "use-debounce";
import { format } from "date-fns";
import { usePathname } from "next/navigation";
import { usePermissionGuard } from "@/hooks/use-permission-guard";
import { getPermissionByPath } from "@/constants/nav-dashboard";
import { Textarea } from "@/components/ui/textarea";
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
import { CaptionRenderer } from "@/components/common/caption-renderer";
import { Controller, useForm } from "react-hook-form";
import { Field, FieldLabel, FieldContent, FieldError, FieldGroup } from "@/components/ui/field";
import { Video as VideoIcon, videoFeatures } from "@videojs/react/video";
import { createPlayer } from "@videojs/react";

const Player = createPlayer({ features: videoFeatures });

export type PostMediaItem = {
  id: string;
  mediaUrl: string;
  thumbnailUrl: string | null;
  mediaType: string;
  width: number | null;
  height: number | null;
  duration: number | null;
  moderationStatus: "pending" | "approved" | "flagged";
  moderationReason: string | null;
  createdAt: string;
  post: {
    id: string;
    caption: string | null;
    user: {
      id: string;
      name: string;
      username: string;
      image: string | null;
    };
  } | null;
};

export type MediaStats = {
  totalMedia: number;
  pendingCount: number;
  approvedCount: number;
  flaggedCount: number;
};

export default function ViolationReviewPage() {
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearch] = useDebounce(searchQuery, 300);
  const [activeTab, setActiveTab] = React.useState<string>("flagged");
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
  const [bulkAction, setBulkAction] = React.useState<string>("approve");
  const [isBulkConfirmOpen, setIsBulkConfirmOpen] = React.useState(false);
  const [reviewingMedia, setReviewingMedia] = React.useState<PostMediaItem | null>(null);

  // Review Form
  const reviewForm = useForm<{
    status: "pending" | "approved" | "flagged";
    reason: string;
  }>({
    defaultValues: { status: "flagged", reason: "" },
  });

  const { reset: resetReviewForm } = reviewForm;

  React.useEffect(() => {
    if (reviewingMedia) {
      resetReviewForm({
        status: reviewingMedia.moderationStatus,
        reason: reviewingMedia.moderationReason || "",
      });
    }
  }, [reviewingMedia, resetReviewForm]);

  // Reset page index on search/filter/tab changes
  React.useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [debouncedSearch, activeTab, dateRange]);

  const t = useTranslations("Dashboard.moderation");
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const permissions = getPermissionByPath(pathname);

  // Apply permission check
  const fallbackPermissions = React.useMemo(() => ({ report: ["update"] }), []);
  usePermissionGuard(permissions ?? fallbackPermissions);

  // Query post media
  const { data: mediaData, isLoading } = useQuery<FindManyResponse<PostMediaItem>>({
    queryKey: ["post-media", pagination, debouncedSearch, activeTab, sorting, dateRange],
    queryFn: async () => {
      const sortStr = sorting.length > 0 ? `${sorting[0]!.id},${sorting[0]!.desc ? "desc" : "asc"}` : "createdAt,desc";
      const params: Record<string, unknown> = {
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        sort: sortStr,
      };

      if (debouncedSearch) {
        params.keyword = debouncedSearch;
      }

      if (activeTab !== "all") {
        params.moderationStatus = activeTab;
      }

      if (dateRange?.from) params.startDate = dateRange.from.toISOString();
      if (dateRange?.to) params.endDate = dateRange.to.toISOString();

      const response = await axiosGateway.get<FindManyResponse<PostMediaItem>>("/api/posts/media", { params });
      return response.data;
    },
  });

  // Query stats
  const { data: statsData } = useQuery<MediaStats>({
    queryKey: ["post-media-stats", dateRange],
    queryFn: async () => {
      const params: Record<string, unknown> = {};
      if (dateRange?.from) params.startDate = dateRange.from.toISOString();
      if (dateRange?.to) params.endDate = dateRange.to.toISOString();

      const response = await axiosGateway.get<OkResponse<MediaStats>>("/api/posts/media/stats", { params });
      return response.data.data;
    },
  });

  // Update Media Moderation Mutation
  const { mutate: updateMediaMutation, isPending: isUpdating } = useMutation({
    mutationFn: async ({
      mediaId,
      status,
      reason,
    }: {
      mediaId: string;
      status: "pending" | "approved" | "flagged";
      reason: string;
    }) => {
      return await axiosGateway.patch(`/api/posts/media/by/${mediaId}/moderation`, {
        moderationStatus: status,
        moderationReason: reason,
      });
    },
    onSuccess: () => {
      toast.success(t("dialog.success"));
      setReviewingMedia(null);
      queryClient.invalidateQueries({ queryKey: ["post-media"] });
      queryClient.invalidateQueries({ queryKey: ["post-media-stats"] });
    },
    onError: () => {
      toast.error(t("dialog.error"));
    },
  });

  // Bulk Media Moderation Mutation
  const { mutate: updateManyMediaMutation, isPending: isBulkUpdating } = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: "pending" | "approved" | "flagged" }) => {
      return await axiosGateway.patch(`/api/posts/media/bulk/moderation`, {
        ids,
        moderationStatus: status,
      });
    },
    onSuccess: () => {
      toast.success(t("dialog.success"));
      setRowSelection({});
      setIsBulkConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ["post-media"] });
      queryClient.invalidateQueries({ queryKey: ["post-media-stats"] });
    },
    onError: () => {
      toast.error(t("dialog.error"));
    },
  });

  const columns: ColumnDef<PostMediaItem>[] = React.useMemo(
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
        accessorKey: "media",
        header: t("table.media"),
        cell: ({ row }) => {
          const isVideo = row.original.mediaType?.startsWith("video/");
          const mediaUrl = isVideo
            ? getMediaUrl(row.original.thumbnailUrl, "post", row.original.mediaType)
            : getMediaUrl(row.original.mediaUrl, "post", row.original.mediaType);

          return (
            <div className="aspect-3/4 w-12 h-16 rounded-md bg-muted overflow-hidden shrink-0 border border-border relative">
              <Image src={mediaUrl} alt="" fill className="object-cover" />
              {isVideo && (
                <div className="absolute right-1 bottom-1 bg-black/60 rounded p-0.5 border border-white/20">
                  <Video className="size-2.5 text-white" />
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "metadata",
        header: t("table.metadata"),
        cell: ({ row }) => {
          const { width, height, duration } = row.original;
          return (
            <div className="flex flex-col gap-0.5 text-xs whitespace-nowrap">
              {width && height && (
                <span className="font-semibold text-foreground">
                  {width} × {height}
                </span>
              )}
              {duration ? (
                <span className="text-muted-foreground font-medium">{duration}s</span>
              ) : (
                <span className="text-muted-foreground/60 italic">{t("table.static")}</span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "post",
        header: t("table.post"),
        cell: ({ row }) => {
          const caption = row.original.post?.caption;
          if (!caption) {
            return <span className="text-xs text-muted-foreground">—</span>;
          }
          return (
            <div
              className="line-clamp-2 max-w-[200px] text-xs [&>div]:text-xs [&>div]:text-muted-foreground"
              title={caption}
            >
              <CaptionRenderer html={caption} />
            </div>
          );
        },
      },
      {
        accessorKey: "author",
        header: t("table.author"),
        cell: ({ row }) => {
          const author = row.original.post?.user;
          if (!author) return <span className="text-xs text-muted-foreground">—</span>;
          return (
            <div className="flex items-center gap-2">
              <Avatar className="size-8">
                <AvatarImage src={(author.image && `/${author.image}`) || "/default-avatar.png"} />
                <AvatarFallback className="text-xs">{author.name?.[0] || "U"}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium truncate max-w-[100px]">{author.name || "Unknown"}</span>
                <span className="text-xs text-muted-foreground font-medium truncate max-w-[100px]">
                  @{author.username || "unknown"}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: t("table.status"),
        cell: ({ row }) => {
          const status = row.original.moderationStatus;
          return (
            <Badge
              className={cn(
                "px-2 py-0.5 h-6 text-xs font-semibold capitalize border transition-colors",
                status === "pending" &&
                  "bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:bg-yellow-400/10 dark:text-yellow-400",
                status === "approved" &&
                  "bg-green-500/10 text-green-600 border-green-500/20 dark:bg-green-400/10 dark:text-green-400",
                status === "flagged" &&
                  "bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-400/10 dark:text-red-400",
              )}
              variant="secondary"
            >
              {t(`status.${status}`)}
            </Badge>
          );
        },
      },
      {
        accessorKey: "reason",
        header: t("table.reason"),
        cell: ({ row }) => (
          <span
            className="text-xs text-muted-foreground line-clamp-1 max-w-[150px]"
            title={row.original.moderationReason || ""}
          >
            {row.original.moderationReason || <span className="text-xs text-muted-foreground">—</span>}
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-4 h-8 gap-1 p-0 font-semibold text-xs uppercase tracking-wider text-muted-foreground"
          >
            {t("table.date")}
            <ArrowUpDown className="size-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5 whitespace-nowrap">
            <span className="text-xs font-medium">{format(new Date(row.original.createdAt), "MMM d, yyyy")}</span>
            <span className="text-xs text-muted-foreground">{format(new Date(row.original.createdAt), "HH:mm")}</span>
          </div>
        ),
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuLabel className="text-xs">{t("table.actions")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-xs" onClick={() => setReviewingMedia(item)}>
                  <Eye className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  {t("actions.review")}
                </DropdownMenuItem>
                {item.moderationStatus !== "approved" && (
                  <DropdownMenuItem
                    className="text-xs text-green-600 focus:text-green-600"
                    onClick={() =>
                      updateMediaMutation({
                        mediaId: item.id,
                        status: "approved",
                        reason: "Approved via quick action.",
                      })
                    }
                    disabled={isUpdating}
                  >
                    <CheckCircle className="mr-2 h-3.5 w-3.5" />
                    {t("actions.approve")}
                  </DropdownMenuItem>
                )}
                {item.moderationStatus !== "flagged" && (
                  <DropdownMenuItem
                    className="text-xs text-red-600 focus:text-red-600"
                    onClick={() =>
                      updateMediaMutation({
                        mediaId: item.id,
                        status: "flagged",
                        reason: "Flagged via quick action.",
                      })
                    }
                    disabled={isUpdating}
                  >
                    <AlertTriangle className="mr-2 h-3.5 w-3.5" />
                    {t("actions.flag")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [t, setReviewingMedia, updateMediaMutation],
  );

  const tableData = React.useMemo(() => mediaData?.data ?? [], [mediaData?.data]);
  const coreRowModel = React.useMemo(() => getCoreRowModel(), []);

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: coreRowModel,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    manualPagination: true,
    manualSorting: true,
    pageCount: mediaData?.metadata ? Math.ceil(mediaData.metadata.total / mediaData.metadata.limit) : -1,
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
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="p-6 flex flex-row justify-between items-start gap-4 bg-card border border-border overflow-hidden relative">
            <div className="relative z-10">
              <p className="text-sm font-medium text-muted-foreground">{t("stats.totalMedia")}</p>
              {statsData ? (
                <h3 className="text-2xl font-bold text-foreground">{statsData.totalMedia}</h3>
              ) : (
                <Skeleton className="h-8 w-16 mt-1" />
              )}
            </div>
            <div className="p-3 rounded-md relative z-10 border bg-blue-500/10 border-blue-500/20">
              <ShieldAlert className="w-6 h-6 text-blue-500" />
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 blur-3xl opacity-20 rounded-full bg-blue-500/10" />
          </Card>

          <Card className="p-6 flex flex-row justify-between items-start gap-4 bg-card border border-border overflow-hidden relative">
            <div className="relative z-10">
              <p className="text-sm font-medium text-muted-foreground">{t("stats.flaggedCount")}</p>
              {statsData ? (
                <h3 className="text-2xl font-bold text-foreground">{statsData.flaggedCount}</h3>
              ) : (
                <Skeleton className="h-8 w-16 mt-1" />
              )}
            </div>
            <div className="p-3 rounded-md relative z-10 border bg-red-500/10 border-red-500/20">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 blur-3xl opacity-20 rounded-full bg-red-500/10" />
          </Card>

          <Card className="p-6 flex flex-row justify-between items-start gap-4 bg-card border border-border overflow-hidden relative">
            <div className="relative z-10">
              <p className="text-sm font-medium text-muted-foreground">{t("stats.pendingCount")}</p>
              {statsData ? (
                <h3 className="text-2xl font-bold text-foreground">{statsData.pendingCount}</h3>
              ) : (
                <Skeleton className="h-8 w-16 mt-1" />
              )}
            </div>
            <div className="p-3 rounded-md relative z-10 border bg-yellow-500/10 border-yellow-500/20">
              <Clock className="w-6 h-6 text-yellow-500" />
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 blur-3xl opacity-20 rounded-full bg-yellow-500/10" />
          </Card>

          <Card className="p-6 flex flex-row justify-between items-start gap-4 bg-card border border-border overflow-hidden relative">
            <div className="relative z-10">
              <p className="text-sm font-medium text-muted-foreground">{t("stats.approvedCount")}</p>
              {statsData ? (
                <h3 className="text-2xl font-bold text-foreground">{statsData.approvedCount}</h3>
              ) : (
                <Skeleton className="h-8 w-16 mt-1" />
              )}
            </div>
            <div className="p-3 rounded-md relative z-10 border bg-green-500/10 border-green-500/20">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 blur-3xl opacity-20 rounded-full bg-green-500/10" />
          </Card>
        </div>

        {/* Filters */}
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <DatePickerWithRange date={dateRange} setDate={setDateRange} placeholder={t("table.date")} />

              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="w-[150px] bg-background border-border">
                  <SelectValue placeholder={t("filterStatus")} />
                </SelectTrigger>
                <SelectContent>
                  {["all", "flagged", "pending", "approved"].map((tab) => (
                    <SelectItem key={tab} value={tab} className="text-xs">
                      {t(`tabs.${tab}`)}
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
                  <DropdownMenuLabel className="text-xs">{t("columns")}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
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

              <Select value={bulkAction} onValueChange={setBulkAction}>
                <SelectTrigger className="w-[140px] bg-background border-border h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approve" className="text-xs text-green-600">
                    {t("actions.approve")}
                  </SelectItem>
                  <SelectItem value="flag" className="text-xs text-red-600">
                    {t("actions.flag")}
                  </SelectItem>
                  <SelectItem value="pending" className="text-xs text-yellow-600">
                    {t("actions.pending")}
                  </SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="default"
                className="h-9 gap-2 font-medium bg-primary hover:bg-primary/90"
                disabled={Object.keys(rowSelection).length === 0 || isBulkUpdating}
                onClick={() => setIsBulkConfirmOpen(true)}
              >
                <Scale className="size-4" />
                <span>{t("confirm")}</span>
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
              total: mediaData?.metadata?.total || 0,
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
              <span>{mediaData?.metadata ? Math.ceil(mediaData.metadata.total / mediaData.metadata.limit) : 0}</span>
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

      {/* Review Dialog */}
      <Dialog open={!!reviewingMedia} onOpenChange={(open) => !open && setReviewingMedia(null)}>
        <DialogContent className="max-w-md bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{t("dialog.title")}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">{t("dialog.description")}</DialogDescription>
          </DialogHeader>

          {reviewingMedia && (
            <form
              onSubmit={reviewForm.handleSubmit((values) =>
                updateMediaMutation({
                  mediaId: reviewingMedia.id,
                  status: values.status,
                  reason: values.reason,
                }),
              )}
            >
              <FieldGroup className="py-2">
                {/* Media Preview inside Dialog */}
                <div className="flex justify-center bg-muted/40 p-4 rounded-lg border border-border">
                  <div className="aspect-3/4 w-[240px] h-[320px] rounded-lg overflow-hidden relative border border-border shadow-lg">
                    {reviewingMedia.mediaType?.startsWith("video/") ? (
                      <Player.Provider>
                        <Player.Container className="absolute inset-0 w-full h-full bg-black">
                          <VideoIcon
                            src={getMediaUrl(reviewingMedia.mediaUrl, "post", reviewingMedia.mediaType)}
                            controls
                            playsInline
                            className="w-full h-full object-cover"
                          />
                        </Player.Container>
                      </Player.Provider>
                    ) : (
                      <Image
                        src={getMediaUrl(reviewingMedia.mediaUrl, "post", reviewingMedia.mediaType)}
                        alt=""
                        fill
                        className="object-cover"
                      />
                    )}
                  </div>
                </div>

                {/* Status + Reason side by side */}
                <div className="flex items-start gap-2">
                  <Controller
                    name="status"
                    control={reviewForm.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="mod-status">{t("dialog.statusLabel")}</FieldLabel>
                        <FieldContent>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger id="mod-status" className="bg-background border-border w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {["pending", "approved", "flagged"].map((stat) => (
                                <SelectItem key={stat} value={stat} className="text-xs">
                                  {t(`status.${stat}`)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </FieldContent>
                      </Field>
                    )}
                  />
                </div>

                {/* Reason input */}
                <Controller
                  name="reason"
                  control={reviewForm.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="mod-reason">{t("dialog.reasonLabel")}</FieldLabel>
                      <FieldContent>
                        <Textarea
                          id="mod-reason"
                          placeholder={t("dialog.notesPlaceholder")}
                          className="min-h-[80px] text-xs bg-background border-border"
                          {...field}
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </FieldContent>
                    </Field>
                  )}
                />

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setReviewingMedia(null)}>
                    {t("cancel")}
                  </Button>
                  <Button type="submit" disabled={isUpdating}>
                    {t("dialog.submit")}
                  </Button>
                </div>
              </FieldGroup>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Update Confirm Dialog */}
      <AlertDialog open={isBulkConfirmOpen} onOpenChange={setIsBulkConfirmOpen}>
        <AlertDialogContent className="bg-card border border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">{t("confirmBulkTitle")}</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              {t("confirmBulkDescription", {
                count: Object.keys(rowSelection).length,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="text-xs bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={isBulkUpdating}
              onClick={() =>
                updateManyMediaMutation({
                  ids: Object.keys(rowSelection),
                  status: bulkAction as "pending" | "approved" | "flagged",
                })
              }
            >
              {t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
