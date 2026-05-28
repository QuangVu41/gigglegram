"use client";

import { useEffect, useState } from "react";
import {
  formatBytes,
  useFileUpload,
  type FileMetadata,
  type FileWithPreview,
} from "@/hooks/use-file-upload";
import Image from "next/image";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/reui/alert";
import { Badge } from "@/components/reui/badge";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CircleAlertIcon,
  ImageIcon,
  RefreshCwIcon,
  UploadIcon,
  VideoIcon,
  XIcon,
} from "lucide-react";
import { ALL_FORMATS, Input, UrlSource } from "mediabunny";
import { useTranslations } from "next-intl";

export interface FileUploadItem extends FileWithPreview {
  progress: number;
  status: "uploading" | "completed" | "error";
  error?: string;
}

interface ProgressUploadProps {
  maxFiles?: number;
  maxSize?: number;
  accept?: string;
  multiple?: boolean;
  className?: string;
  onFilesChange?: (files: FileWithPreview[]) => void;
  simulateUpload?: boolean;
  i18nKey: string;
}

export function ProgressUpload({
  maxFiles = 5,
  maxSize = Number(
    process.env.NEXT_PUBLIC_DEFAULT_VIDEO_SIZE_IN_BYTES || "104857600",
  ), // 100MB
  accept = process.env.NEXT_PUBLIC_ACCEPTED_IMAGE_FILE_TYPES! +
    "," +
    process.env.NEXT_PUBLIC_ACCEPTED_VIDEO_FILE_TYPES!,
  multiple = true,
  className,
  onFilesChange,
  simulateUpload = true,
  i18nKey,
}: ProgressUploadProps) {
  const t = useTranslations(i18nKey);
  const [uploadFiles, setUploadFiles] = useState<FileUploadItem[]>([]);
  const [
    { isDragging, errors },
    {
      removeFile,
      clearFiles,
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      getInputProps,
    },
  ] = useFileUpload({
    maxFiles,
    maxSize,
    accept,
    multiple,
    initialFiles: [],
    onFilesChange: async (newFiles) => {
      newFiles = await Promise.all(
        newFiles.map(async (file) => {
          if (file.file.type.startsWith("image/")) return file;
          const inputVideo = new Input({
            formats: ALL_FORMATS,
            source: new UrlSource(file.preview!),
          });
          const audioTrack = await inputVideo.getPrimaryAudioTrack();

          return {
            ...file,
            audioOmitted: audioTrack ? undefined : true,
            hasAudio: !!audioTrack,
          };
        }),
      );
      // Convert to upload items when files change, preserving existing status
      setUploadFiles((prev) =>
        newFiles.map((file) => {
          // Check if this file already exists in uploadFiles
          const existingFile = prev.find((existing) => existing.id === file.id);

          if (existingFile) {
            // Preserve existing file status and progress
            return {
              ...existingFile,
              ...file, // Update any changed properties from the file
            };
          }

          // New file - set to uploading
          return {
            ...file,
            progress: 0,
            status: "uploading" as const,
          };
        }),
      );
      onFilesChange?.(newFiles);
    },
  });

  // Simulate upload progress
  useEffect(() => {
    if (!simulateUpload) return;

    const interval = setInterval(() => {
      setUploadFiles((prev) =>
        prev.map((file) => {
          if (file.status !== "uploading") return file;

          const increment = Math.random() * 15 + 10; // 10-25% increment
          const newProgress = Math.min(file.progress + increment, 100);

          // Complete when progress reaches 100%
          if (newProgress >= 100) {
            return {
              ...file,
              progress: 100,
              status: "completed" as const,
            };
          }

          return {
            ...file,
            progress: newProgress,
          };
        }),
      );
    }, 500);

    return () => clearInterval(interval);
  }, [simulateUpload]);

  const retryUpload = (fileId: string) => {
    setUploadFiles((prev) =>
      prev.map((file) =>
        file.id === fileId
          ? {
              ...file,
              progress: 0,
              status: "uploading" as const,
              error: undefined,
            }
          : file,
      ),
    );
  };

  const removeUploadFile = (fileId: string) => {
    setUploadFiles((prev) => prev.filter((file) => file.id !== fileId));
    removeFile(fileId);
  };

  const getFileIcon = (file: File | FileMetadata) => {
    const type = file instanceof File ? file.type : file.type;
    if (type.startsWith("image/")) return <ImageIcon className="size-4" />;
    if (type.startsWith("video/")) return <VideoIcon className="size-4" />;
  };

  const completedCount = uploadFiles.filter(
    (f) => f.status === "completed",
  ).length;
  const errorCount = uploadFiles.filter((f) => f.status === "error").length;
  const uploadingCount = uploadFiles.filter(
    (f) => f.status === "uploading",
  ).length;

  return (
    <div className={cn("w-full", className)}>
      {/* Upload Area */}
      <div
        className={cn(
          "rounded-lg relative border border-dashed p-8 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input {...getInputProps()} className="sr-only" />

        <div className="flex flex-col items-center gap-4">
          <div
            className={cn(
              "flex h-16 w-16 items-center justify-center rounded-full",
              isDragging ? "bg-primary/10" : "bg-muted",
            )}
          >
            <UploadIcon
              className={cn(
                "h-6",
                isDragging ? "text-primary" : "text-muted-foreground",
              )}
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">{t("title")}</h3>
            <p className="text-muted-foreground text-sm">{t("description")}</p>
          </div>

          <Button onClick={openFileDialog}>
            <UploadIcon className="h-4 w-4" />
            {t("selectFromComputer")}
          </Button>
        </div>
      </div>

      {/* Upload Stats */}
      {uploadFiles.length > 0 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium">{t("stats.title")}</h4>
            <div className="flex items-center gap-2">
              {completedCount > 0 && (
                <Badge size="sm" variant="success-light">
                  {t("stats.completed", { count: completedCount })}
                </Badge>
              )}
              {errorCount > 0 && (
                <Badge size="sm" variant="destructive">
                  {t("stats.failed", { count: errorCount })}
                </Badge>
              )}
              {uploadingCount > 0 && (
                <Badge size="sm" variant="secondary">
                  {t("stats.uploading", { count: uploadingCount })}
                </Badge>
              )}
            </div>
          </div>

          <Button onClick={clearFiles} variant="outline" size="sm">
            {t("clearAll")}
          </Button>
        </div>
      )}

      {/* File List */}
      {uploadFiles.length > 0 && (
        <div className="mt-4 space-y-3">
          {uploadFiles.map((fileItem: FileUploadItem) => (
            <div
              key={fileItem.id}
              className="border-border bg-card rounded-lg border p-2.5"
            >
              <div className="flex items-start gap-2.5">
                {/* File Icon */}
                <div className="shrink-0">
                  {fileItem.preview &&
                  fileItem.file.type.startsWith("image/") ? (
                    <Image
                      src={fileItem.preview}
                      alt={fileItem.file.name}
                      width={48}
                      height={48}
                      unoptimized
                      className="rounded-lg h-12 w-12 border object-cover"
                    />
                  ) : (
                    <div className="border-border text-muted-foreground rounded-lg flex h-12 w-12 items-center justify-center border">
                      {getFileIcon(fileItem.file)}
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="min-w-0 flex-1">
                  <div className="mt-0.75 flex items-center justify-between">
                    <p className="inline-flex flex-col justify-center gap-1 truncate font-medium">
                      <span className="text-sm">{fileItem.file.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {formatBytes(fileItem.file.size)}
                      </span>
                    </p>
                    <div className="flex items-center gap-2">
                      {/* Remove Button */}
                      <Button
                        onClick={() => removeUploadFile(fileItem.id)}
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground size-6 hover:bg-transparent hover:opacity-100"
                      >
                        <XIcon className="size-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {fileItem.status === "uploading" && (
                    <div className="mt-2">
                      <Progress value={fileItem.progress} className="h-1" />
                    </div>
                  )}

                  {/* Error Message */}
                  {fileItem.status === "error" && fileItem.error && (
                    <Alert variant="destructive" className="mt-2 px-2 py-1">
                      <CircleAlertIcon className="size-4" />
                      <AlertTitle className="text-xs">
                        {fileItem.error}
                      </AlertTitle>
                      <AlertAction>
                        <Button
                          onClick={() => retryUpload(fileItem.id)}
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground size-6 hover:bg-transparent hover:opacity-100"
                        >
                          <RefreshCwIcon className="size-3.5" />
                        </Button>
                      </AlertAction>
                    </Alert>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error Messages */}
      {errors.length > 0 && (
        <Alert variant="destructive" className="mt-5">
          <CircleAlertIcon />
          <AlertTitle>{t("errors.title")}</AlertTitle>
          <AlertDescription>
            {errors.map((error, index) => (
              <p key={index} className="last:mb-0">
                {error}
              </p>
            ))}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
