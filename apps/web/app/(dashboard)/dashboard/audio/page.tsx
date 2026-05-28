"use client";

import * as React from "react";
import Image from "next/image";
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
  Music,
  Layers,
  Play,
  Pause,
  Pencil,
} from "lucide-react";
import { StatsCards } from "@/components/pages/dashboard/audio/stats-cards";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";

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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupButton } from "@/components/ui/input-group";
import { useTranslations } from "next-intl";
import { getMediaUrl } from "@/lib/utils";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import * as z from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

export type AudioTrack = {
  id: string;
  title: string;
  audioUrl: string;
  duration: number;
  thumbnailUrl: string | null;
  usageCount: number;
  isOriginal: boolean;
  isTrending: boolean;
  createdAt: string;
  postsCount: number;
  uploader?: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
};

export default function AudioDashboardPage() {
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearch] = useDebounce(searchQuery, 300);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
  const [audioToDelete, setAudioToDelete] = React.useState<string | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = React.useState(false);
  const [audioToEdit, setAudioToEdit] = React.useState<AudioTrack | null>(null);

  const [playingAudioId, setPlayingAudioId] = React.useState<string | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const togglePlayAudio = (track: AudioTrack) => {
    if (!audioRef.current) return;

    if (playingAudioId === track.id) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.error("Audio playback error:", err);
            toast.error("Failed to play audio track.");
          });
      }
    } else {
      audioRef.current.src = getMediaUrl(track.audioUrl, "post", "video/mp4");
      audioRef.current.load();
      audioRef.current
        .play()
        .then(() => {
          setPlayingAudioId(track.id);
          setIsPlaying(true);
        })
        .catch((err) => {
          console.error("Audio playback error:", err);
          toast.error("Failed to play audio track.");
        });
    }
  };

  // Reset page index when search or dateRange changes
  React.useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [debouncedSearch, dateRange]);

  const t = useTranslations("Dashboard.audio");
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const permissions = getPermissionByPath(pathname);

  usePermissionGuard(permissions || { post: ["read"] });

  const { mutate: deleteAudioMutation, isPending: isDeletingAudio } = useMutation({
    mutationFn: async (audioId: string) => {
      return await axiosGateway.delete(`/api/posts/audio/by/${audioId}`);
    },
    onSuccess: () => {
      toast.success(t("deleteSuccess"));
      queryClient.invalidateQueries({ queryKey: ["audio"] });
      queryClient.invalidateQueries({ queryKey: ["audio-stats"] });
    },
    onError: () => {
      toast.error(t("deleteError"));
    },
  });

  const { mutate: deleteManyAudioMutation, isPending: isDeletingMany } = useMutation({
    mutationFn: async (ids: string[]) => {
      return await axiosGateway.delete("/api/posts/audio/bulk", {
        data: { ids },
      });
    },
    onSuccess: () => {
      toast.success(t("deleteManySuccess"));
      setRowSelection({});
      queryClient.invalidateQueries({ queryKey: ["audio"] });
      queryClient.invalidateQueries({ queryKey: ["audio-stats"] });
    },
    onError: () => {
      toast.error(t("deleteError"));
    },
  });

  const { mutate: updateAudioMutation, isPending: isUpdatingAudio } = useMutation({
    mutationFn: async (values: { title: string; isOriginal: boolean; isTrending: boolean }) => {
      if (!audioToEdit) return;
      return await axiosGateway.patch(`/api/posts/audio/by/${audioToEdit.id}`, values);
    },
    onSuccess: () => {
      toast.success(t("updateSuccess"));
      setAudioToEdit(null);
      queryClient.invalidateQueries({ queryKey: ["audio"] });
      queryClient.invalidateQueries({ queryKey: ["audio-stats"] });
    },
    onError: () => {
      toast.error(t("updateError"));
    },
  });

  // Query for paginated audio tracks list
  const { data: response, isLoading } = useQuery<FindManyResponse<AudioTrack>>({
    queryKey: ["audio", pagination.pageIndex, pagination.pageSize, debouncedSearch, sorting, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: (pagination.pageIndex + 1).toString(),
        limit: pagination.pageSize.toString(),
      });

      if (debouncedSearch) {
        params.append("keyword", debouncedSearch);
      }

      if (dateRange?.from) {
        params.append("startDate", dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        params.append("endDate", dateRange.to.toISOString());
      }

      if (sorting.length > 0 && sorting[0]) {
        const field = sorting[0].id;
        const order = sorting[0].desc ? "desc" : "asc";
        params.append("sort", `${field},${order}`);
      } else {
        params.append("sort", "createdAt,desc");
      }

      const res = await axiosGateway.get(`/api/posts/audio?${params.toString()}`);
      return res.data;
    },
  });

  const audioData = React.useMemo(() => response?.data || [], [response]);
  const totalRecords = response?.metadata?.total || 0;
  const totalPages = Math.ceil(totalRecords / pagination.pageSize);

  const columns = React.useMemo<ColumnDef<AudioTrack>[]>(
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
        accessorKey: "title",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="-ml-4 h-8 gap-1 p-0 font-semibold text-xs uppercase tracking-wider text-muted-foreground"
            >
              {t("table.title")}
              <ArrowUpDown className="size-3" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const title = row.getValue("title") as string;
          const thumbnailUrl = row.original.thumbnailUrl;
          const track = row.original;
          const isCurrentPlaying = playingAudioId === track.id && isPlaying;
          return (
            <div className="flex items-center gap-3">
              <div
                className="relative w-10 h-10 rounded overflow-hidden bg-muted flex items-center justify-center border border-border shrink-0 cursor-pointer group"
                onClick={() => togglePlayAudio(track)}
              >
                {thumbnailUrl ? (
                  <Image src={thumbnailUrl} alt={title || "Audio thumbnail"} fill className="object-cover" />
                ) : (
                  <Music className="w-5 h-5 text-muted-foreground" />
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {isCurrentPlaying ? (
                    <Pause className="w-4 h-4 text-white fill-white" />
                  ) : (
                    <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-0.5 max-w-[200px] truncate">
                <span className="font-semibold text-sm truncate">{title || "Untitled Track"}</span>
                {row.original.uploader?.name && (
                  <span className="text-xs text-muted-foreground truncate">{row.original.uploader.name}</span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "duration",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="-ml-4 h-8 gap-1 p-0 font-semibold text-xs uppercase tracking-wider text-muted-foreground"
            >
              {t("table.duration")}
              <ArrowUpDown className="size-3" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const duration = row.getValue("duration") as number;
          const mins = Math.floor(duration / 60);
          const secs = duration % 60;
          return (
            <span className="font-mono text-sm">
              {mins}:{secs.toString().padStart(2, "0")}
            </span>
          );
        },
      },
      {
        accessorKey: "isOriginal",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="-ml-4 h-8 gap-1 p-0 font-semibold text-xs uppercase tracking-wider text-muted-foreground"
            >
              {t("table.isOriginal")}
              <ArrowUpDown className="size-3" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const isOriginal = row.getValue("isOriginal") as boolean;
          return (
            <Badge
              variant={isOriginal ? "default" : "secondary"}
              className="font-medium px-2 py-0.5 bg-primary/30 text-primary text-xs whitespace-nowrap border border-primary"
            >
              {isOriginal ? "Original" : "Cover"}
            </Badge>
          );
        },
      },
      {
        accessorKey: "isTrending",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="-ml-4 h-8 gap-1 p-0 font-semibold text-xs uppercase tracking-wider text-muted-foreground"
            >
              {t("table.isTrending")}
              <ArrowUpDown className="size-3" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const isTrending = row.getValue("isTrending") as boolean;
          return isTrending ? (
            <Badge
              variant="outline"
              className="font-semibold px-2 py-0.5 text-xs text-green-600 bg-green-50 border-green-200"
            >
              Trending
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          );
        },
      },
      {
        accessorKey: "postsCount",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="-ml-4 h-8 gap-1 p-0 font-semibold text-xs uppercase tracking-wider text-muted-foreground"
            >
              {t("table.usageCount")}
              <ArrowUpDown className="size-3" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const postsCount = row.original.postsCount ?? 0;
          return (
            <Badge variant="secondary" className="font-mono text-sm px-2.5 py-0.5 border border-border">
              {postsCount}
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
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="-ml-4 h-8 gap-1 p-0 font-semibold text-xs uppercase tracking-wider text-muted-foreground"
            >
              {t("table.date")}
              <ArrowUpDown className="size-3" />
            </Button>
          );
        },
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5 whitespace-nowrap">
            <span className="text-xs font-medium">{format(new Date(row.original.createdAt), "MMM d, yyyy")}</span>
            <span className="text-xs text-muted-foreground">{format(new Date(row.original.createdAt), "HH:mm")}</span>
          </div>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">{t("table.actions")}</span>,
        cell: ({ row }) => {
          const audio = row.original;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[160px]">
                <DropdownMenuLabel className="text-xs">{t("table.actions")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-xs cursor-pointer gap-2"
                  onClick={() => setAudioToEdit(audio)}
                >
                  <Pencil className="w-4 h-4" />
                  {t("actions.edit")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive text-xs cursor-pointer gap-2"
                  onClick={() => setAudioToDelete(audio.id)}
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
    [t, playingAudioId, isPlaying],
  );

  const table = useReactTable({
    data: audioData,
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
    deleteManyAudioMutation(ids);
    setIsBulkDeleteOpen(false);
  };

  const handleSingleDelete = () => {
    if (audioToDelete) {
      deleteAudioMutation(audioToDelete);
      setAudioToDelete(null);
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
        {/* Stats Section */}
        <StatsCards searchQuery={debouncedSearch} dateRange={dateRange} />

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

              <DatePickerWithRange date={dateRange} setDate={setDateRange} placeholder={t("filterDate")} />
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
                  <DropdownMenuLabel className="text-xs">{t("visibleColumns")}</DropdownMenuLabel>
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
                        {column.id === "title"
                          ? t("table.title")
                          : column.id === "duration"
                            ? t("table.duration")
                            : column.id === "isOriginal"
                              ? t("table.isOriginal")
                              : column.id === "isTrending"
                                ? t("table.isTrending")
                                : column.id === "postsCount"
                                  ? t("table.usageCount")
                                  : column.id === "createdAt"
                                    ? t("table.date")
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
              ) : audioData.length > 0 ? (
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

        {/* Pagination Container */}
        <div className="flex items-center justify-between px-2 pt-2">
          <div className="text-sm text-muted-foreground font-medium">
            {t("selection", { count: selectedCount, total: totalRecords })}
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
              <span className="text-muted-foreground">{t("pagination.page")}</span>
              <span>{pagination.pageIndex + 1}</span>
              <span className="text-muted-foreground">{t("pagination.of")}</span>
              <span>{totalPages || 0}</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="size-9 rounded-lg"
                onClick={() => setPagination((prev) => ({ ...prev, pageIndex: 0 }))}
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
      <AlertDialog open={audioToDelete !== null} onOpenChange={(open) => !open && setAudioToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("confirmDeleteDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleSingleDelete} disabled={isDeletingAudio}>
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
            <AlertDialogAction variant="destructive" onClick={handleBulkDelete} disabled={isDeletingMany}>
              {t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UpdateAudioDialog
        audio={audioToEdit}
        onOpenChange={(open) => !open && setAudioToEdit(null)}
        onSubmit={(values) => updateAudioMutation(values)}
        isPending={isUpdatingAudio}
        t={t}
      />

      <audio
        ref={audioRef}
        onEnded={() => setIsPlaying(false)}
        onError={() => {
          setIsPlaying(false);
          toast.error(t("audioPlayError"));
        }}
      />
    </div>
  );
}

interface UpdateAudioDialogProps {
  audio: AudioTrack | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: { title: string; isOriginal: boolean; isTrending: boolean }) => void;
  isPending: boolean;
  t: (key: string) => string;
}

function UpdateAudioDialog({ audio, onOpenChange, onSubmit, isPending, t }: UpdateAudioDialogProps) {
  const schema = React.useMemo(() => {
    return z.object({
      title: z.string().min(1, t("validation.titleRequired")),
      isOriginal: z.boolean(),
      isTrending: z.boolean(),
    });
  }, [t]);

  const form = useForm<{ title: string; isOriginal: boolean; isTrending: boolean }>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      isOriginal: false,
      isTrending: false,
    },
  });

  React.useEffect(() => {
    if (audio) {
      form.reset({
        title: audio.title,
        isOriginal: audio.isOriginal,
        isTrending: audio.isTrending,
      });
    }
  }, [audio, form]);

  const handleFormSubmit = (values: { title: string; isOriginal: boolean; isTrending: boolean }) => {
    onSubmit(values);
  };

  return (
    <Dialog open={audio !== null} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("editDialog.title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
          <Controller
            name="title"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="edit-title">{t("editDialog.titleLabel")}</FieldLabel>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  id="edit-title"
                  placeholder={t("editDialog.titlePlaceholder")}
                  disabled={isPending}
                  autoComplete="off"
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="isOriginal"
            control={form.control}
            render={({ field }) => (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-isOriginal"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isPending}
                />
                <FieldLabel htmlFor="edit-isOriginal" className="cursor-pointer">
                  {t("editDialog.isOriginalLabel")}
                </FieldLabel>
              </div>
            )}
          />

          <Controller
            name="isTrending"
            control={form.control}
            render={({ field }) => (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-isTrending"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isPending}
                />
                <FieldLabel htmlFor="edit-isTrending" className="cursor-pointer">
                  {t("editDialog.isTrendingLabel")}
                </FieldLabel>
              </div>
            )}
          />

          <div className="flex justify-end gap-3 pt-4 mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t("editDialog.submit") + "..." : t("editDialog.submit")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
