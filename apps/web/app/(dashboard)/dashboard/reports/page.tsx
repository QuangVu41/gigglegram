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
  Trash2,
  X,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  Video,
  AlertTriangle,
  CheckCircle,
  Clock,
  Ban,
  ShieldAlert,
  User,
  Scale,
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
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { usePermissionGuard } from "@/hooks/use-permission-guard";
import { getPermissionByPath } from "@/constants/nav-dashboard";
import { authClient } from "@/lib/auth/auth-client";
import { Controller, useForm } from "react-hook-form";
import { Field, FieldLabel, FieldDescription, FieldError, FieldGroup, FieldContent } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxTrigger,
  ComboboxValue,
  ComboboxEmpty,
} from "@/components/ui/combobox";

export type ContentReport = {
  id: string;
  status: "pending" | "under_review" | "resolved" | "dismissed";
  type: "post" | "story";
  reportedAt: string;
  reviewedAt: string | null;
  resolvedAt: string | null;
  additionalInfo: string | null;
  reviewerNotes: string | null;
  actionTaken: "post_removed" | "account_warned" | "account_suspended" | "no_action" | null;
  reason: {
    id: string;
    reasonCode: string;
    description: string;
    category: string;
  };
  reporter: {
    id: string;
    name: string;
    username: string;
    image: string | null;
  };
  reportedUser: {
    id: string;
    name: string;
    username: string;
    image: string | null;
  };
  reviewer: {
    id: string;
    name: string;
    username: string;
    image: string | null;
  } | null;
  post: {
    id: string;
    caption: string | null;
    postMedia: {
      id: string;
      mediaUrl: string;
      thumbnailUrl: string | null;
      mediaType: string;
    }[];
  } | null;
  story: {
    id: string;
    mediaUrl: string | null;
    thumbnailUrl: string | null;
    mediaType: string | null;
  } | null;
};

type ReviewerUser = {
  id: string;
  name: string;
  username: string;
  image: string | null;
};

interface OrgMember {
  id: string;
  userId: string;
  organizationId: string;
  role: string;
  users: ReviewerUser;
}

interface OrganizationWithMembers {
  id: string;
  name: string;
  slug: string;
  members: OrgMember[];
}

const ReviewerCell = ({
  report,
  canAssignReviewer,
  reviewers,
  isAssigning,
  onAssign,
  t,
}: {
  report: ContentReport;
  canAssignReviewer: boolean;
  reviewers: ReviewerUser[];
  isAssigning: boolean;
  onAssign: (args: { reportId: string; reviewerId: string }) => void;
  t: (key: string) => string;
}) => {
  const reviewer = report.reviewer;
  const isReviewed = report.status === "resolved" || report.status === "dismissed";
  const [search, setSearch] = React.useState(reviewer?.username ?? "");

  React.useEffect(() => {
    setSearch(reviewer?.username ?? "");
  }, [reviewer]);

  const items = React.useMemo(() => {
    const list = reviewers.map((r) => r.username ?? "");
    const currentVal = reviewer?.username ?? "";
    if (currentVal && !list.includes(currentVal)) {
      list.push(currentVal);
    }
    return list.filter(Boolean);
  }, [reviewers, reviewer]);

  const filteredReviewers = React.useMemo(() => {
    const currentVal = reviewer?.username ?? "";
    if (!search.trim() || search === currentVal) return reviewers;
    const lower = search.toLowerCase();
    return reviewers.filter((r) => r.name?.toLowerCase().includes(lower) || r.username?.toLowerCase().includes(lower));
  }, [reviewers, search, reviewer]);

  return (
    <Combobox
      value={reviewer?.username ?? ""}
      onValueChange={(val) => {
        const selected = reviewers.find((r) => (r.username ?? "") === val);
        if (selected && selected.id !== reviewer?.id) {
          onAssign({ reportId: report.id, reviewerId: selected.id });
        }
      }}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setSearch(reviewer?.username ?? "");
        }
      }}
      disabled={isAssigning || !canAssignReviewer || isReviewed}
      inputValue={search}
      onInputValueChange={setSearch}
      items={items}
    >
      <ComboboxInput
        placeholder={t("unassigned")}
        className="w-full text-xs"
        disabled={isAssigning || !canAssignReviewer || isReviewed}
      />
      <ComboboxContent className="z-50">
        <ComboboxList>
          {filteredReviewers.map((rev) => (
            <ComboboxItem key={rev.id} value={rev.username ?? ""}>
              {rev.username ?? ""}
            </ComboboxItem>
          ))}
          {filteredReviewers.length === 0 && (
            <ComboboxEmpty className="py-2 text-center text-xs text-muted-foreground">{t("noResults")}</ComboboxEmpty>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
};

export default function ContentReportsPage() {
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearch] = useDebounce(searchQuery, 300);
  const [activeTab, setActiveTab] = React.useState<string>("all");
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>();
  const [actionFilter, setActionFilter] = React.useState<string>("all");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const [reviewerFilter, setReviewerFilter] = React.useState<string>("all");
  const [reviewerSearch, setReviewerSearch] = React.useState("");

  const [reportToDelete, setReportToDelete] = React.useState<string | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = React.useState(false);
  const [reviewingReport, setReviewingReport] = React.useState<ContentReport | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const reportIdParam = searchParams.get("reportId");

  const { data: singleReport } = useQuery({
    queryKey: ["report", reportIdParam],
    queryFn: async () => {
      const res = await axiosGateway.get<OkResponse<ContentReport>>(`/api/posts/reports/${reportIdParam}`);
      return res.data.data;
    },
    enabled: !!reportIdParam,
  });

  const handleCloseReviewDialog = React.useCallback(() => {
    setReviewingReport(null);
    if (reportIdParam) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("reportId");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    }
  }, [reportIdParam, searchParams, pathname, router]);

  React.useEffect(() => {
    if (singleReport) {
      setReviewingReport(singleReport);
    }
  }, [singleReport]);

  // Review Form
  const reviewForm = useForm<{
    status: "pending" | "under_review" | "resolved" | "dismissed";
    actionTaken: "post_removed" | "account_warned" | "account_suspended" | "no_action";
    reviewerNotes: string;
  }>({
    defaultValues: {
      status: "under_review",
      actionTaken: "no_action",
      reviewerNotes: "",
    },
  });

  const { reset: resetReviewForm } = reviewForm;

  React.useEffect(() => {
    if (reviewingReport) {
      resetReviewForm({
        status: reviewingReport.status,
        actionTaken: reviewingReport.actionTaken || "no_action",
        reviewerNotes: reviewingReport.reviewerNotes || "",
      });
    }
  }, [reviewingReport, resetReviewForm]);

  // Reset page index on search/filter changes
  React.useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [debouncedSearch, activeTab, dateRange, actionFilter, categoryFilter, reviewerFilter]);

  const t = useTranslations("Dashboard.reports");
  const queryClient = useQueryClient();
  const permissions = getPermissionByPath(pathname);

  // Apply permission check
  const fallbackPermissions = React.useMemo(() => ({ report: ["read"] }), []);
  usePermissionGuard(permissions ?? fallbackPermissions);

  const { data: session } = authClient.useSession();
  const currentUserId = session?.user?.id;

  const { data: activeOrganization } = authClient.useActiveOrganization();

  const { data: roles } = useQuery({
    queryKey: ["org-roles", activeOrganization?.id],
    queryFn: async () => {
      const response = await authClient.organization.listRoles();
      return response.data || [];
    },
    enabled: !!activeOrganization?.id,
  });

  const userPermissions = React.useMemo(() => {
    return (roles?.[0]?.permission as Record<string, string[]>) || {};
  }, [roles]);

  const canAssignReviewer = React.useMemo(() => {
    return userPermissions["report"]?.includes("assign-reviewer") ?? false;
  }, [userPermissions]);

  const { data: reviewersResponse } = useQuery<OrganizationWithMembers[]>({
    queryKey: ["reviewers-list", "moderation-review-org"],
    queryFn: async () => {
      const response = await axiosGateway.get<FindManyResponse<OrganizationWithMembers>>(
        "/api/authentication/list-members/moderation-review-org",
      );
      return response.data.data || [];
    },
  });

  const reviewers = React.useMemo<ReviewerUser[]>(() => {
    return reviewersResponse?.[0]?.members?.map((m) => m.users).filter(Boolean) || [];
  }, [reviewersResponse]);
  const selectedReviewer = React.useMemo(() => {
    return reviewers.find((r) => r.id === reviewerFilter);
  }, [reviewerFilter, reviewers]);

  // Sync reviewerSearch when reviewerFilter changes
  React.useEffect(() => {
    if (reviewerFilter === "all") {
      setReviewerSearch(t("allReviewers"));
    } else if (selectedReviewer) {
      setReviewerSearch(selectedReviewer.username ?? "");
    }
  }, [reviewerFilter, selectedReviewer, t]);

  const comboboxItems = React.useMemo(() => {
    const list = [t("allReviewers"), ...reviewers.map((r) => r.username ?? "")];
    return list.filter(Boolean);
  }, [reviewers, t]);

  const filteredReviewers = React.useMemo(() => {
    const selectedName = reviewerFilter === "all" ? t("allReviewers") : (selectedReviewer?.username ?? "");
    if (!reviewerSearch.trim() || reviewerSearch === selectedName) {
      return reviewers;
    }
    const lower = reviewerSearch.toLowerCase();
    return reviewers.filter((r) => r.name?.toLowerCase().includes(lower) || r.username?.toLowerCase().includes(lower));
  }, [reviewers, reviewerSearch, reviewerFilter, selectedReviewer, t]);

  const handleReviewerValueChange = (val: string | null) => {
    if (!val || val === t("allReviewers")) {
      setReviewerFilter("all");
    } else {
      const selected = reviewers.find((r) => (r.username ?? "") === val);
      if (selected) {
        setReviewerFilter(selected.id);
      }
    }
  };

  const handleReviewerOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      const selectedName = reviewerFilter === "all" ? t("allReviewers") : (selectedReviewer?.username ?? "");
      setReviewerSearch(selectedName);
    } else {
      setReviewerSearch("");
    }
  };

  // Query reports
  const { data: reportsData, isLoading } = useQuery<FindManyResponse<ContentReport>>({
    queryKey: [
      "reports",
      pagination,
      debouncedSearch,
      activeTab,
      sorting,
      dateRange,
      actionFilter,
      categoryFilter,
      reviewerFilter,
    ],
    queryFn: async () => {
      const sortStr = sorting.length > 0 ? `${sorting[0]!.id},${sorting[0]!.desc ? "desc" : "asc"}` : "reportedAt,desc";
      const params: Record<string, unknown> = {
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
        sort: sortStr,
      };

      if (debouncedSearch) {
        params.keyword = debouncedSearch;
      }

      if (activeTab !== "all") {
        params.status = activeTab;
      }

      if (actionFilter !== "all") {
        params.actionTaken = actionFilter;
      }

      if (categoryFilter !== "all") {
        params.categories = categoryFilter;
      }

      if (reviewerFilter !== "all") {
        params.reviewerId = reviewerFilter;
      }

      if (dateRange?.from) params.reportedFrom = dateRange.from.toISOString();
      if (dateRange?.to) params.reportedTo = dateRange.to.toISOString();

      const response = await axiosGateway.get<FindManyResponse<ContentReport>>("/api/posts/reports", { params });
      return response.data;
    },
  });

  // Query total/stats via all reports query
  const { data: allReportsResponse } = useQuery<FindManyResponse<ContentReport>>({
    queryKey: ["reports-stats-all", dateRange],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        limit: 1000,
      };
      if (dateRange?.from) params.reportedFrom = dateRange.from.toISOString();
      if (dateRange?.to) params.reportedTo = dateRange.to.toISOString();

      const response = await axiosGateway.get<FindManyResponse<ContentReport>>("/api/posts/reports", { params });
      return response.data;
    },
  });

  // Compute Stats values
  const stats = React.useMemo(() => {
    const data = allReportsResponse?.data || [];
    const total = data.length;
    const pending = data.filter((r) => r.status === "pending").length;
    const resolved = data.filter((r) => r.status === "resolved" || r.status === "dismissed").length;
    const efficiency = total > 0 ? Math.round((resolved / total) * 100) : 0;

    return { total, pending, resolved, efficiency };
  }, [allReportsResponse]);

  // Assign Reviewer Mutation
  const { mutate: assignReviewerMutation, isPending: isAssigning } = useMutation({
    mutationFn: async ({ reportId, reviewerId }: { reportId: string; reviewerId: string }) => {
      return await axiosGateway.patch(`/api/posts/reports/${reportId}/assign-reviewer`, { reviewerId });
    },
    onSuccess: () => {
      toast.success(t("dialog.assignSuccess"));
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["reports-stats-all"] });
    },
    onError: () => {
      toast.error(t("dialog.assignError"));
    },
  });

  // Review Report Mutation
  const { mutate: submitReviewMutation, isPending: isSubmittingReview } = useMutation({
    mutationFn: async ({
      reportId,
      status,
      actionTaken,
      reviewerNotes,
    }: {
      reportId: string;
      status: "pending" | "under_review" | "resolved" | "dismissed";
      actionTaken: "post_removed" | "account_warned" | "account_suspended" | "no_action";
      reviewerNotes: string;
    }) => {
      return await axiosGateway.patch(`/api/posts/reports/${reportId}`, {
        status,
        actionTaken,
        reviewerNotes,
      });
    },
    onSuccess: () => {
      toast.success(t("dialog.success"));
      handleCloseReviewDialog();
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["reports-stats-all"] });
    },
    onError: () => {
      toast.error(t("dialog.error"));
    },
  });

  // Delete Report Mutation
  const { mutate: deleteReportMutation, isPending: isDeleting } = useMutation({
    mutationFn: async (reportId: string) => {
      return await axiosGateway.delete(`/api/posts/reports/${reportId}`);
    },
    onSuccess: () => {
      toast.success(t("deleteSuccess"));
      setReportToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["reports-stats-all"] });
    },
    onError: () => {
      toast.error(t("deleteError"));
    },
  });

  // Bulk Delete Reports Mutation
  const { mutate: deleteManyReportsMutation, isPending: isDeletingMany } = useMutation({
    mutationFn: async (ids: string[]) => {
      return await Promise.all(ids.map((id) => axiosGateway.delete(`/api/posts/reports/${id}`)));
    },
    onSuccess: () => {
      toast.success(t("deleteManySuccess"));
      setRowSelection({});
      setIsBulkDeleteOpen(false);
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["reports-stats-all"] });
    },
    onError: () => {
      toast.error(t("deleteError"));
    },
  });

  const columns: ColumnDef<ContentReport>[] = React.useMemo(
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
          const isPost = row.original.type === "post";
          const filename = isPost ? row.original.post?.postMedia?.[0]?.thumbnailUrl : row.original.story?.thumbnailUrl;
          const mediaType = isPost ? row.original.post?.postMedia?.[0]?.mediaType : row.original.story?.mediaType;

          const mediaUrl = getMediaUrl(filename, row.original.type, mediaType);

          return (
            <div className="aspect-3/4 w-12 h-16 rounded-md bg-muted overflow-hidden shrink-0 border border-border relative">
              <Image src={mediaUrl} alt="" fill className="object-cover" />
            </div>
          );
        },
      },
      {
        accessorKey: "type",
        header: t("table.type"),
        cell: ({ row }) => {
          const isPost = row.original.type === "post";
          const Icon = isPost ? FileText : Video;
          return (
            <Badge
              variant="secondary"
              className={cn(
                "flex items-center gap-1.5 px-2 py-0.5 h-6 w-fit border transition-colors",
                isPost
                  ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:bg-indigo-400/10 dark:text-indigo-400"
                  : "bg-pink-500/10 text-pink-600 border-pink-500/20 dark:bg-pink-400/10 dark:text-pink-400",
              )}
            >
              <Icon className="size-3" />
              <span className="capitalize text-xs font-semibold">{t(row.original.type)}</span>
            </Badge>
          );
        },
      },
      {
        accessorKey: "reporter",
        header: t("table.reporter"),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Avatar className="size-8">
              <AvatarImage
                src={(row.original.reporter?.image && `/${row.original.reporter.image}`) || "/default-avatar.png"}
              />
              <AvatarFallback className="text-xs">{row.original.reporter?.name?.[0] || "U"}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium truncate max-w-[100px]">
                {row.original.reporter?.name || "Unknown"}
              </span>
              <span className="text-xs text-muted-foreground font-medium truncate max-w-[100px]">
                @{row.original.reporter?.username || "unknown"}
              </span>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "reportedUser",
        header: t("table.reportedUser"),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Avatar className="size-8">
              <AvatarImage
                src={
                  (row.original.reportedUser?.image && `/${row.original.reportedUser.image}`) || "/default-avatar.png"
                }
              />
              <AvatarFallback className="text-xs">{row.original.reportedUser?.name?.[0] || "U"}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium truncate max-w-[100px]">
                {row.original.reportedUser?.name || "Unknown"}
              </span>
              <span className="text-xs text-muted-foreground font-medium truncate max-w-[100px]">
                @{row.original.reportedUser?.username || "unknown"}
              </span>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "reason",
        header: t("table.reason"),
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5 min-w-[120px]">
            <Badge
              variant="outline"
              className="w-fit text-xs font-bold tracking-wide uppercase px-1.5 py-0.2 bg-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-400"
            >
              {row.original.reason?.category}
            </Badge>
            <span
              className="text-xs text-muted-foreground line-clamp-1 max-w-[150px]"
              title={row.original.reason?.description}
            >
              {row.original.reason?.description}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: t("table.status"),
        cell: ({ row }) => {
          const status = row.original.status;
          return (
            <Badge
              className={cn(
                "px-2 py-0.5 h-6 text-xs font-semibold capitalize",
                status === "pending" &&
                  "bg-yellow-500/10 text-yellow-600 border border-yellow-500/20 dark:bg-yellow-400/10 dark:text-yellow-400",
                status === "under_review" &&
                  "bg-blue-500/10 text-blue-600 border border-blue-500/20 dark:bg-blue-400/10 dark:text-blue-400",
                status === "resolved" &&
                  "bg-green-500/10 text-green-600 border border-green-500/20 dark:bg-green-400/10 dark:text-green-400",
                status === "dismissed" &&
                  "bg-gray-500/10 text-gray-600 border border-gray-500/20 dark:bg-gray-400/10 dark:text-gray-400",
              )}
              variant="secondary"
            >
              {t(`status.${status}`)}
            </Badge>
          );
        },
      },
      {
        accessorKey: "actionTaken",
        header: t("table.action"),
        cell: ({ row }) => {
          const action = row.original.actionTaken;
          if (!action) return <span className="text-xs text-muted-foreground">—</span>;
          return (
            <Badge
              className={cn(
                "px-2 py-0.5 h-6 text-xs font-semibold capitalize",
                action === "post_removed" && "bg-red-500/10 text-red-600 border border-red-500/20",
                action === "account_warned" && "bg-orange-500/10 text-orange-600 border border-orange-500/20",
                action === "account_suspended" && "bg-purple-500/10 text-purple-600 border border-purple-500/20",
                action === "no_action" && "bg-slate-500/10 text-slate-600 border border-slate-500/20",
              )}
              variant="outline"
            >
              {t(`actionTaken.${action}`)}
            </Badge>
          );
        },
      },
      {
        accessorKey: "reviewer",
        header: t("table.reviewer"),
        cell: ({ row }) => (
          <ReviewerCell
            report={row.original}
            canAssignReviewer={canAssignReviewer}
            reviewers={reviewers}
            isAssigning={isAssigning}
            onAssign={assignReviewerMutation}
            t={t}
          />
        ),
      },
      {
        accessorKey: "reportedAt",
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
            <span className="text-xs font-medium">{format(new Date(row.original.reportedAt), "MMM d, yyyy")}</span>
            <span className="text-xs text-muted-foreground">{format(new Date(row.original.reportedAt), "HH:mm")}</span>
          </div>
        ),
      },
      {
        accessorKey: "resolvedAt",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-4 h-8 gap-1 p-0 font-semibold text-xs uppercase tracking-wider text-muted-foreground"
          >
            {t("table.resolvedAt")}
            <ArrowUpDown className="size-3" />
          </Button>
        ),
        cell: ({ row }) => {
          const resolvedAt = row.original.resolvedAt;
          if (!resolvedAt) return <span className="text-xs text-muted-foreground">—</span>;
          return (
            <div className="flex flex-col gap-0.5 whitespace-nowrap">
              <span className="text-xs font-medium text-green-500">{format(new Date(resolvedAt), "MMM d, yyyy")}</span>
              <span className="text-xs text-muted-foreground">{format(new Date(resolvedAt), "HH:mm")}</span>
            </div>
          );
        },
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const report = row.original;
          const hasReviewer = !!report.reviewer;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs">{t("table.actions")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {!hasReviewer && report.status === "pending" && (
                  <DropdownMenuItem
                    className="text-xs"
                    onClick={() =>
                      currentUserId &&
                      assignReviewerMutation({
                        reportId: report.id,
                        reviewerId: currentUserId,
                      })
                    }
                    disabled={isAssigning}
                  >
                    <User className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                    {t("actions.assign")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className="text-xs"
                  onClick={() => setReviewingReport(report)}
                  disabled={report.status === "resolved" || report.status === "dismissed"}
                >
                  <Scale className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  {t("actions.review")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-xs text-destructive focus:text-destructive"
                  onClick={() => setReportToDelete(report.id)}
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                  {t("actions.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [
      t,
      setReviewingReport,
      submitReviewMutation,
      assignReviewerMutation,
      setReportToDelete,
      currentUserId,
      canAssignReviewer,
      reviewers,
      isAssigning,
    ],
  );

  const tableData = React.useMemo(() => reportsData?.data ?? [], [reportsData?.data]);
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
    pageCount: reportsData?.metadata ? Math.ceil(reportsData.metadata.total / reportsData.metadata.limit) : -1,
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
              <p className="text-sm font-medium text-muted-foreground">{t("stats.totalReports")}</p>
              {isLoading ? (
                <Skeleton className="h-8 w-16 mt-1" />
              ) : (
                <h3 className="text-2xl font-bold text-foreground">{stats.total}</h3>
              )}
            </div>
            <div className="p-3 rounded-md relative z-10 border bg-blue-500/10 border-blue-500/20">
              <ShieldAlert className="w-6 h-6 text-blue-500" />
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 blur-3xl opacity-20 rounded-full bg-blue-500/10" />
          </Card>

          <Card className="p-6 flex flex-row justify-between items-start gap-4 bg-card border border-border overflow-hidden relative">
            <div className="relative z-10">
              <p className="text-sm font-medium text-muted-foreground">{t("stats.pendingReports")}</p>
              {isLoading ? (
                <Skeleton className="h-8 w-16 mt-1" />
              ) : (
                <h3 className="text-2xl font-bold text-foreground">{stats.pending}</h3>
              )}
            </div>
            <div className="p-3 rounded-md relative z-10 border bg-yellow-500/10 border-yellow-500/20">
              <Clock className="w-6 h-6 text-yellow-500" />
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 blur-3xl opacity-20 rounded-full bg-yellow-500/10" />
          </Card>

          <Card className="p-6 flex flex-row justify-between items-start gap-4 bg-card border border-border overflow-hidden relative">
            <div className="relative z-10">
              <p className="text-sm font-medium text-muted-foreground">{t("stats.resolvedReports")}</p>
              {isLoading ? (
                <Skeleton className="h-8 w-16 mt-1" />
              ) : (
                <h3 className="text-2xl font-bold text-foreground">{stats.resolved}</h3>
              )}
            </div>
            <div className="p-3 rounded-md relative z-10 border bg-green-500/10 border-green-500/20">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 blur-3xl opacity-20 rounded-full bg-green-500/10" />
          </Card>

          <Card className="p-6 flex flex-row justify-between items-start gap-4 bg-card border border-border overflow-hidden relative">
            <div className="relative z-10">
              <p className="text-sm font-medium text-muted-foreground">{t("stats.efficiencyRate")}</p>
              {isLoading ? (
                <Skeleton className="h-8 w-16 mt-1" />
              ) : (
                <h3 className="text-2xl font-bold text-foreground">{stats.efficiency}%</h3>
              )}
            </div>
            <div className="p-3 rounded-md relative z-10 border bg-purple-500/10 border-purple-500/20">
              <Scale className="w-6 h-6 text-purple-500" />
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 blur-3xl opacity-20 rounded-full bg-purple-500/10" />
          </Card>
        </div>

        {/* Filters */}
        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <DatePickerWithRange date={dateRange} setDate={setDateRange} placeholder={t("table.date")} />

              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder={t("filterStatus")} />
                </SelectTrigger>
                <SelectContent>
                  {["all", "pending", "under_review", "resolved", "dismissed"].map((tab) => (
                    <SelectItem key={tab} value={tab} className="text-xs">
                      {tab === "all" ? t("allStatuses") : t(`tabs.${tab}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder={t("filterAction")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    {t("allActions")}
                  </SelectItem>
                  {["post_removed", "account_warned", "account_suspended", "no_action"].map((act) => (
                    <SelectItem key={act} value={act} className="text-xs">
                      {t(`actionTaken.${act}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder={t("table.reason")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    {t("allReasons")}
                  </SelectItem>
                  {["spam", "harassment", "violence", "hate_speech", "misinformation", "copyright", "adult"].map(
                    (cat) => (
                      <SelectItem key={cat} value={cat} className="text-xs capitalize">
                        {cat.replace("_", " ")}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>

              <Combobox
                value={reviewerFilter === "all" ? t("allReviewers") : (selectedReviewer?.username ?? "")}
                onValueChange={handleReviewerValueChange}
                onOpenChange={handleReviewerOpenChange}
                inputValue={reviewerSearch}
                onInputValueChange={setReviewerSearch}
                items={comboboxItems}
              >
                <ComboboxInput placeholder={t("filterReviewer")} className="bg-background border-border text-xs" />
                <ComboboxContent className="z-50">
                  <ComboboxList>
                    <ComboboxItem value={t("allReviewers")} className="text-xs">
                      {t("allReviewers")}
                    </ComboboxItem>
                    {filteredReviewers.map((rev) => (
                      <ComboboxItem key={rev.id} value={rev.username ?? ""} className="text-xs">
                        {rev.username ?? ""}
                      </ComboboxItem>
                    ))}
                    {filteredReviewers.length === 0 && reviewerSearch.trim() && (
                      <ComboboxEmpty className="py-2 text-center text-xs text-muted-foreground">
                        {t("noResults")}
                      </ComboboxEmpty>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
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
              <Button
                variant="destructive"
                className="h-9 gap-2 font-medium"
                disabled={Object.keys(rowSelection).length === 0 || isDeletingMany}
                onClick={() => setIsBulkDeleteOpen(true)}
              >
                <Trash2 className="size-4" />
                <span>{t("deleteSelected")}</span>
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
              total: reportsData?.metadata?.total || 0,
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
              <span>
                {reportsData?.metadata ? Math.ceil(reportsData.metadata.total / reportsData.metadata.limit) : 0}
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

      {/* Review Dialog */}
      <Dialog open={!!reviewingReport} onOpenChange={(open) => !open && handleCloseReviewDialog()}>
        <DialogContent className="max-w-md bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{t("dialog.title")}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">{t("dialog.description")}</DialogDescription>
          </DialogHeader>

          {reviewingReport && (
            <form
              onSubmit={reviewForm.handleSubmit((values) =>
                submitReviewMutation({
                  reportId: reviewingReport.id,
                  status: values.status,
                  actionTaken: values.actionTaken,
                  reviewerNotes: values.reviewerNotes,
                }),
              )}
            >
              <FieldGroup className="py-2">
                {/* Report summary info */}
                <div className="grid grid-cols-2 gap-3 text-xs bg-muted/20 p-3 rounded-lg border border-border/55">
                  <div>
                    <p className="font-semibold text-muted-foreground">{t("dialog.reporter")}</p>
                    <p className="font-medium mt-0.5">@{reviewingReport.reporter?.username || "unknown"}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-muted-foreground">{t("dialog.reported")}</p>
                    <p className="font-medium mt-0.5">@{reviewingReport.reportedUser?.username || "unknown"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="font-semibold text-muted-foreground">{t("dialog.additionalInfo")}</p>
                    <p className="mt-0.5 italic">{reviewingReport.additionalInfo || t("dialog.none")}</p>
                  </div>
                </div>

                {/* Status input */}
                <div className="flex items-center gap-2">
                  <Controller
                    name="status"
                    control={reviewForm.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="status">{t("dialog.statusLabel")}</FieldLabel>
                        <FieldContent>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger id="status" className="bg-background border-border w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {["pending", "under_review", "resolved", "dismissed"].map((stat) => (
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
                  {/* Action input */}
                  <Controller
                    name="actionTaken"
                    control={reviewForm.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="action">{t("dialog.actionLabel")}</FieldLabel>
                        <FieldContent>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger id="action" className="bg-background border-border w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {["post_removed", "account_warned", "account_suspended", "no_action"].map((act) => (
                                <SelectItem key={act} value={act} className="text-xs">
                                  {t(`actionTaken.${act}`)}
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

                {/* Notes input */}
                <Controller
                  name="reviewerNotes"
                  control={reviewForm.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="notes">{t("dialog.notesLabel")}</FieldLabel>
                      <FieldContent>
                        <Textarea
                          id="notes"
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
                  <Button type="button" variant="outline" onClick={handleCloseReviewDialog}>
                    {t("cancel")}
                  </Button>
                  <Button type="submit" disabled={isSubmittingReview}>
                    {t("dialog.submit")}
                  </Button>
                </div>
              </FieldGroup>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Report Alert Dialog */}
      <AlertDialog open={!!reportToDelete} onOpenChange={(open) => !open && setReportToDelete(null)}>
        <AlertDialogContent className="bg-card border border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">{t("confirmDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              {t("confirmDeleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={() => reportToDelete && deleteReportMutation(reportToDelete)}
            >
              {t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Alert Dialog */}
      <AlertDialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <AlertDialogContent className="bg-card border border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">{t("confirmBulkDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              {t("confirmBulkDeleteDescription", {
                count: Object.keys(rowSelection).length,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeletingMany}
              onClick={() => deleteManyReportsMutation(Object.keys(rowSelection))}
            >
              {t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
