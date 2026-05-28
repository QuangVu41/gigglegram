"use client";

import { ProgressUpload } from "@/components/pages/home/progress-upload";
import {
  Stepper,
  StepperContent,
  StepperNav,
  StepperPanel,
} from "@/components/reui/stepper";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useCreatePostStore } from "@/components/pages/home/create-post-provider";
import { FileWithPreview } from "@/hooks/use-file-upload";
import MediaPreviewStepper from "@/components/common/media-preview-stepper";
import ImageEditor from "@/components/common/image-editor";
import VideoEditor from "@/components/common/video-editor";
import CreatePostForm from "@/components/pages/home/create-post-form";
import { useTranslations } from "next-intl";

const steps = [1, 2, 3];

export function CreatePostStepper() {
  const t = useTranslations("CreatePostStepper");
  const [currentStep, setCurrentStep] = useState(1);
  const selectedFiles = useCreatePostStore((state) => state.selectedFiles);
  const setSelectedFiles = useCreatePostStore(
    (state) => state.setSelectedFiles,
  );
  const setSelectedFileIndex = useCreatePostStore(
    (state) => state.setSelectedFileIndex,
  );
  const selectedFileIndex = useCreatePostStore(
    (state) => state.selectedFileIndex,
  );
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
          disabled={currentStep === 1}
        >
          <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
        </Button>
        <Button
          variant="outline"
          onClick={() => setCurrentStep((prev) => prev + 1)}
          disabled={
            currentStep === steps.length ||
            (currentStep === 1 && selectedFiles.length === 0)
          }
          className={`${currentStep === 3 && "hidden"}`}
        >
          {t("navigation.next")}
        </Button>
        <div
          id="create-post-share-btn"
          className={`${currentStep !== 3 && "hidden"}`}
        ></div>
      </StepperNav>
      <StepperPanel className="text-sm flex-1 min-h-0">
        {steps.map((step) => (
          <StepperContent
            key={step}
            value={step}
            className={`relative flex flex-col lg:flex-row items-center lg:items-start lg:justify-center gap-6 lg:gap-8 w-full h-full`}
          >
            {step === 1 && (
              <div className="w-full flex justify-center">
                <ProgressUpload
                  i18nKey="CreatePostStepper.upload"
                  onFilesChange={(files) => setSelectedFiles(files)}
                />
              </div>
            )}
            {(step === 2 || step === 3) && (
              <div className="w-full lg:w-1/2 shrink-0 flex items-center justify-center relative">
                <MediaPreviewStepper
                  mediaFiles={selectedFiles}
                  setSelectedFileIndex={setSelectedFileIndex}
                  onVideoRef={onVideoRef}
                />
                {step === 3 && (
                  <div
                    id="create-post-tag-people"
                    className="absolute bottom-4 left-4 z-15"
                  ></div>
                )}
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
            {step === 3 && (
              <div className="w-full lg:w-1/2 flex flex-col max-w-xl mx-auto lg:mx-0">
                <CreatePostForm />
              </div>
            )}
          </StepperContent>
        ))}
      </StepperPanel>
    </Stepper>
  );
}
