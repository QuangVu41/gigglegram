"use client";

import { ProgressUpload } from "@/components/pages/home/progress-upload";
import { Stepper, StepperContent, StepperNav, StepperPanel } from "@/components/reui/stepper";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useCreatePostStore } from "@/components/pages/home/create-post-provider";
import { FileWithPreview } from "@/hooks/use-file-upload";
import MediaPreviewStepper from "@/components/common/media-preview-stepper";
import ImageEditor from "@/components/common/image-editor";
import VideoEditor from "@/components/common/video-editor";
import CreatePostForm from "@/components/pages/home/create-post-form";

const steps = [1, 2, 3];

export function CreatePostStepper() {
  const [currentStep, setCurrentStep] = useState(1);
  const selectedFiles = useCreatePostStore((state) => state.selectedFiles);
  const setSelectedFiles = useCreatePostStore((state) => state.setSelectedFiles);
  const setSelectedFileIndex = useCreatePostStore((state) => state.setSelectedFileIndex);
  const selectedFileIndex = useCreatePostStore((state) => state.selectedFileIndex);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const currentFile = selectedFiles[selectedFileIndex];

  useEffect(() => {
    if (currentStep === 1) {
      setSelectedFiles([]);
    }
  }, [currentStep, setSelectedFiles]);

  const onEditImageFile = (editedFile: FileWithPreview) => {
    const newSelectedFiles = selectedFiles.map((file) =>
      file.id === editedFile.id ? { ...file, editedFile: editedFile.file, editedPreview: editedFile.preview } : file,
    );
    setSelectedFiles(newSelectedFiles);
  };

  const onEditVideoMetadata = (
    editedMetadata: Pick<FileWithPreview, "audioOmitted" | "millisecondsToExtractThumbnail" | "id">,
  ) => {
    const newSelectedFiles = selectedFiles.map((file) =>
      file.id === editedMetadata.id
        ? {
            ...file,
            audioOmitted: editedMetadata.audioOmitted ?? file.audioOmitted,
            millisecondsToExtractThumbnail:
              editedMetadata.millisecondsToExtractThumbnail ?? file.millisecondsToExtractThumbnail,
          }
        : file,
    );
    setSelectedFiles(newSelectedFiles);
  };

  const onVideoRef = (videoElement: HTMLVideoElement | null) => {
    setVideoElement(videoElement);
  };

  return (
    <Stepper value={currentStep} onValueChange={(value) => setCurrentStep(value)} className="w-full space-y-8">
      <StepperNav className="justify-between">
        <Button variant="outline" onClick={() => setCurrentStep((prev) => prev - 1)} disabled={currentStep === 1}>
          <ArrowLeft />
        </Button>
        <Button
          variant="outline"
          onClick={() => setCurrentStep((prev) => prev + 1)}
          disabled={currentStep === steps.length || (currentStep === 1 && selectedFiles.length === 0)}
          className={`${currentStep === 3 && "hidden"}`}
        >
          Next
        </Button>
        <Button
          variant="default"
          onClick={() => setCurrentStep((prev) => prev + 1)}
          className={`${currentStep !== 3 && "hidden"}`}
        >
          Share
        </Button>
      </StepperNav>
      <StepperPanel className="text-sm">
        {steps.map((step) => (
          <StepperContent
            key={step}
            value={step}
            className={`flex flex-col md:flex-row items-start justify-center gap-2`}
          >
            {step === 1 && <ProgressUpload />}
            {(step === 2 || step === 3) && (
              <MediaPreviewStepper
                mediaFiles={selectedFiles}
                setSelectedFileIndex={setSelectedFileIndex}
                onVideoRef={onVideoRef}
              />
            )}
            {step === 2 && currentFile && currentFile.file.type.startsWith("image/") && (
              <ImageEditor editingFile={currentFile} onEditedFile={onEditImageFile} />
            )}
            {step === 2 && currentFile && currentFile.file.type.startsWith("video/") && (
              <VideoEditor videoFile={currentFile} onEditVideoMetadata={onEditVideoMetadata} videoRef={videoElement} />
            )}
            {step === 3 && <CreatePostForm />}
          </StepperContent>
        ))}
      </StepperPanel>
    </Stepper>
  );
}
