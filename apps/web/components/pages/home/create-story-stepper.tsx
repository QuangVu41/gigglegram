"use client";

import { ProgressUpload } from "@/components/pages/home/progress-upload";
import {
  Stepper,
  StepperContent,
  StepperNav,
  StepperPanel,
} from "@/components/reui/stepper";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCreateStoryStore } from "@/components/pages/home/create-story-provider";
import { FileWithPreview } from "@/hooks/use-file-upload";
import MediaPreviewStepper from "@/components/common/media-preview-stepper";
import ImageEditor from "@/components/common/image-editor";
import VideoEditor from "@/components/common/video-editor";
import { useTranslations } from "next-intl";
import { axiosGateway, OkResponse } from "@/lib/axios-config";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { stories } from "@repo/database";
import { LoadingSwap } from "@/components/ui/loading-swap";
import { DialogClose } from "@/components/ui/dialog";

const steps = [1, 2];

export function CreateStoryStepper() {
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const t = useTranslations("CreateStoryStepper");
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const selectedFiles = useCreateStoryStore((state) => state.selectedFiles);
  const setSelectedFiles = useCreateStoryStore(
    (state) => state.setSelectedFiles,
  );
  const selectedFileIndex = useCreateStoryStore(
    (state) => state.selectedFileIndex,
  );
  const setSelectedFileIndex = useCreateStoryStore(
    (state) => state.setSelectedFileIndex,
  );
  const isLoading = useCreateStoryStore((state) => state.isLoading);
  const setIsLoading = useCreateStoryStore((state) => state.setIsLoading);

  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(
    null,
  );
  const currentFile = selectedFiles[selectedFileIndex];

  useEffect(() => {
    if (currentStep === 1) {
      setSelectedFiles([]);
    }
  }, [currentStep, setSelectedFiles]);

  const onEditImageFile = (editedFile: FileWithPreview) => {
    const newSelectedFiles = selectedFiles.map((file) =>
      file.id === editedFile.id
        ? {
            ...file,
            selectedFilter: editedFile.selectedFilter,
            editedFile: editedFile.file,
            editedPreview: editedFile.preview,
          }
        : file,
    );
    setSelectedFiles(newSelectedFiles);
  };

  const onEditVideoMetadata = (
    editedMetadata: Pick<
      FileWithPreview,
      "audioOmitted" | "millisecondsToExtractThumbnail" | "id"
    >,
  ) => {
    const newSelectedFiles = selectedFiles.map((file) =>
      file.id === editedMetadata.id
        ? {
            ...file,
            audioOmitted: editedMetadata.audioOmitted ?? file.audioOmitted,
            millisecondsToExtractThumbnail:
              editedMetadata.millisecondsToExtractThumbnail ??
              file.millisecondsToExtractThumbnail,
          }
        : file,
    );
    setSelectedFiles(newSelectedFiles);
  };

  const onVideoRef = (videoElement: HTMLVideoElement | null) => {
    setVideoElement(videoElement);
  };

  const handleShareStory = async () => {
    if (!currentFile) return;
    try {
      setIsLoading(true);
      const formData = new FormData();
      const fileToUpload = currentFile.editedFile || currentFile.file;

      if (!(fileToUpload instanceof File)) {
        toast.error(t("invalidFileFormat"));
        return;
      }

      formData.append("media", fileToUpload);

      const res = await axiosGateway.post<
        OkResponse<typeof stories.$inferSelect>
      >("/api/posts/stories", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (res.data.success) {
        toast.success(t("successMessage"));
        queryClient.invalidateQueries({ queryKey: ["stories-feed"] });
        closeBtnRef.current?.click();
      }
    } catch (e) {
      toast.error(t("errorMessage"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Stepper
      value={currentStep}
      onValueChange={(value) => setCurrentStep(value)}
      className="w-full flex-1 flex flex-col space-y-4 lg:space-y-6"
    >
      <StepperNav className="justify-between shrink-0">
        <Button
          variant="outline"
          className="md:px-4 px-2"
          onClick={() => setCurrentStep((prev) => prev - 1)}
          disabled={currentStep === 1 || isLoading}
        >
          <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
        </Button>

        {currentStep === 1 && (
          <Button
            variant="outline"
            onClick={() => setCurrentStep((prev) => prev + 1)}
            disabled={selectedFiles.length === 0}
          >
            {t("navigation.next")}
          </Button>
        )}

        {currentStep === 2 && (
          <Button
            onClick={handleShareStory}
            disabled={isLoading || selectedFiles.length === 0}
          >
            <LoadingSwap isLoading={isLoading}>
              {t("actions.share")}
            </LoadingSwap>
          </Button>
        )}
      </StepperNav>
      <StepperPanel
        className={`text-sm flex-1 min-h-0 transition-opacity duration-200 ${isLoading ? "pointer-events-none opacity-50" : ""}`}
      >
        {steps.map((step) => (
          <StepperContent
            key={step}
            value={step}
            className={`relative flex flex-col lg:flex-row items-center lg:items-start lg:justify-center gap-6 lg:gap-8 w-full h-full`}
          >
            {step === 1 && (
              <div className="w-full flex justify-center">
                <ProgressUpload
                  i18nKey="CreateStoryStepper.upload"
                  maxFiles={1}
                  onFilesChange={(files) => setSelectedFiles(files.slice(0, 1))}
                />
              </div>
            )}
            {step === 2 && (
              <div className="w-full lg:w-1/2 shrink-0 flex items-center justify-center relative">
                <MediaPreviewStepper
                  mediaFiles={selectedFiles}
                  setSelectedFileIndex={setSelectedFileIndex}
                  onVideoRef={onVideoRef}
                  showNavigateBtns={false}
                />
              </div>
            )}
            {step === 2 &&
              currentFile &&
              currentFile.file.type.startsWith("image/") && (
                <div className="w-full lg:w-1/2 flex flex-col">
                  <ImageEditor
                    editingFile={currentFile}
                    onEditFile={onEditImageFile}
                  />
                </div>
              )}
            {step === 2 &&
              currentFile &&
              currentFile.file.type.startsWith("video/") && (
                <div className="w-full lg:w-1/2 flex flex-col">
                  <VideoEditor
                    videoFile={currentFile}
                    onEditVideoMetadata={onEditVideoMetadata}
                    videoRef={videoElement}
                  />
                </div>
              )}
          </StepperContent>
        ))}
        <DialogClose className="hidden" ref={closeBtnRef} />
      </StepperPanel>
    </Stepper>
  );
}
