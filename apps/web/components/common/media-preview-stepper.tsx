"use client";

import { Stepper, StepperContent, StepperNav, StepperPanel } from "@/components/reui/stepper";
import { FileWithPreview } from "@/hooks/use-file-upload";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import ImagePreview from "@/components/common/image-preview";
import VideoPreview from "./video-preivew";

interface MediaPreviewStepperProps {
  mediaFiles: FileWithPreview[];
  setSelectedFileIndex?: (index: number) => void;
  onVideoRef?: (videoElement: HTMLVideoElement | null) => void;
}

const MediaPreviewStepper = ({ mediaFiles, setSelectedFileIndex, onVideoRef }: MediaPreviewStepperProps) => {
  const steps = mediaFiles.map((_, idx) => idx + 1);
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    if (setSelectedFileIndex) {
      setSelectedFileIndex(currentStep - 1);
    }
  }, [currentStep]);

  return (
    <Stepper value={currentStep} onValueChange={(value) => setCurrentStep(value)} className="w-full space-y-8 flex-1">
      <StepperPanel className="text-sm relative">
        {mediaFiles.map((file, idx) => (
          <StepperContent key={file.id} value={idx + 1} className={`flex items-start justify-center gap-2`}>
            <Card className="relative overflow-y-auto shadow-none no-scrollbar bg-background border-0 p-0">
              {file.file.type.startsWith("image/") && <ImagePreview file={file} />}
              {file.file.type.startsWith("video/") && <VideoPreview file={file} onVideoRef={onVideoRef} />}
            </Card>
          </StepperContent>
        ))}
        <Button
          variant="outline"
          size="icon"
          className="rounded-full absolute top-1/2 -translate-y-1/2 z-12 left-2"
          onClick={() => setCurrentStep((prev) => prev - 1)}
          disabled={currentStep === 1}
        >
          <ChevronLeft />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full absolute top-1/2 -translate-y-1/2 z-12 right-2"
          onClick={() => setCurrentStep((prev) => prev + 1)}
          disabled={currentStep === steps.length}
        >
          <ChevronRight />
        </Button>
      </StepperPanel>
    </Stepper>
  );
};

export default MediaPreviewStepper;
