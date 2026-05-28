"use client";

import {
  Stepper,
  StepperContent,
  StepperPanel,
} from "@/components/reui/stepper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRef, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslations } from "next-intl";
import { useUserStories } from "@/hooks/use-user-stories";
import { useCreateHighlight } from "@/hooks/use-create-highlight";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useInView } from "react-intersection-observer";
import Image from "next/image";
import { cn, getMediaUrl } from "@/lib/utils";

interface CreateHighlightStepperProps {
  onClose: () => void;
}

const steps = [1, 2, 3];

const createHighlightSchema = z.object({
  title: z.string().min(1, "Name is required"),
  storyIds: z.array(z.string()).min(1, "Must select at least one story"),
  coverStoryId: z.string().nullable(),
});

type CreateHighlightValues = z.infer<typeof createHighlightSchema>;

export function CreateHighlightStepper({
  onClose,
}: CreateHighlightStepperProps) {
  const t = useTranslations("CreateHighlight");
  const [currentStep, setCurrentStep] = useState(1);

  const form = useForm<CreateHighlightValues>({
    resolver: zodResolver(createHighlightSchema),
    defaultValues: {
      title: "",
      storyIds: [],
      coverStoryId: null,
    },
    mode: "onChange",
  });

  const title = form.watch("title");
  const selectedStoryIds = form.watch("storyIds");
  const coverStoryId = form.watch("coverStoryId");

  const {
    data: storiesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingStories,
  } = useUserStories();

  const createHighlightMutation = useCreateHighlight();
  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  // Extract all stories from pages
  const allStories = storiesData?.pages.flatMap((page) => page.data) || [];

  const handleNext = () => {
    if (currentStep === 1) {
      if (!title.trim()) {
        toast.error(t("nameRequired"));
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (selectedStoryIds.length === 0) {
        toast.error(t("mustSelectOne"));
        return;
      }
      setCurrentStep(3);
      if (!coverStoryId && selectedStoryIds.length > 0) {
        form.setValue("coverStoryId", selectedStoryIds[0] as string);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleDone = form.handleSubmit((data) => {
    if (data.storyIds.length === 0) {
      toast.error(t("mustSelectOne"));
      return;
    }
    createHighlightMutation.mutate(
      {
        title: data.title,
        storyIds: data.storyIds,
        coverStoryId: data.coverStoryId || data.storyIds[0]!,
      },
      {
        onSuccess: () => {
          toast.success(t("success"));
          onClose();
        },
        onError: () => {
          toast.error(t("error"));
        },
      },
    );
  });

  const toggleStorySelection = (storyId: string) => {
    const currentSelected = form.getValues("storyIds");
    if (currentSelected.includes(storyId)) {
      form.setValue(
        "storyIds",
        currentSelected.filter((id) => id !== storyId),
      );
    } else {
      form.setValue("storyIds", [...currentSelected, storyId]);
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="p-4 border-b border-border flex flex-row items-center justify-between shrink-0 relative">
        {currentStep > 1 && (
          <button
            onClick={handleBack}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-accent/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <h2 className="text-base font-bold text-center flex-1">
          {currentStep === 1
            ? t("title")
            : currentStep === 2
              ? t("stories")
              : t("chooseCover")}
        </h2>
      </div>
      <Stepper
        value={currentStep}
        onValueChange={setCurrentStep}
        className="w-full flex-1 flex flex-col h-full min-h-0"
      >
        <StepperPanel className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
          {/* Step 1: Input Name */}
          <StepperContent
            value={1}
            className="h-full flex flex-col p-4 w-full relative"
          >
            <div className="flex flex-col justify-center gap-4">
              <Input
                {...form.register("title")}
                placeholder={t("namePlaceholder")}
                className="text-center text-lgbg-background border-border"
                autoFocus
              />
            </div>
            <div className="pt-4">
              <Button
                className="w-full text-base"
                onClick={handleNext}
                disabled={!title.trim()}
              >
                {t("next")}
              </Button>
            </div>
          </StepperContent>

          {/* Step 2: Select Stories */}
          <StepperContent
            value={2}
            className="h-[500px] flex flex-col w-full relative"
          >
            <div className="flex-1 overflow-y-auto no-scrollbar p-1">
              {isLoadingStories ? (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : allStories.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  {t("noStories")}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-1">
                  {allStories.map((story) => {
                    const isSelected = selectedStoryIds.includes(story.id);
                    return (
                      <div
                        key={story.id}
                        className="relative aspect-9/16 bg-muted cursor-pointer overflow-hidden group"
                        onClick={() => toggleStorySelection(story.id)}
                      >
                        <Image
                          src={getMediaUrl(
                            story.thumbnailUrl,
                            "story",
                            story.mediaType,
                          )}
                          alt={story.altText || "Story"}
                          fill
                          className={cn(
                            "object-cover transition-all duration-200",
                            isSelected
                              ? "opacity-70 scale-[0.98]"
                              : "hover:opacity-90",
                          )}
                          sizes="(max-width: 768px) 33vw, 20vw"
                        />
                        <div className="absolute top-2 left-2 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                          {new Date(story.createdAt).toLocaleDateString()}
                        </div>
                        <div className="absolute bottom-2 right-2 flex items-center justify-center">
                          <div
                            className={cn(
                              "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                              isSelected
                                ? "bg-blue-500 border-blue-500 text-white"
                                : "bg-transparent border-white/80 group-hover:border-white",
                            )}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {/* Infinite Scroll Trigger */}
                  <div
                    ref={ref}
                    className="col-span-3 h-14 flex items-center justify-center"
                  >
                    {isFetchingNextPage && (
                      <Loader2 className="w-6! h-6! animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-border mt-auto">
              <Button
                className="w-full text-base"
                onClick={handleNext}
                disabled={selectedStoryIds.length === 0}
              >
                {t("next")}
              </Button>
            </div>
          </StepperContent>

          {/* Step 3: Choose Cover */}
          <StepperContent
            value={3}
            className="h-[500px] flex flex-col w-full relative"
          >
            <div className="flex-1 flex flex-col">
              {/* Cover Preview */}
              <div className="flex-1 flex flex-col items-center justify-center p-6 border-b border-border">
                <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-background shadow-lg">
                  {coverStoryId ? (
                    <Image
                      src={getMediaUrl(
                        allStories.find((s) => s.id === coverStoryId)
                          ?.thumbnailUrl,
                        "story",
                        allStories.find((s) => s.id === coverStoryId)
                          ?.mediaType,
                      )}
                      alt="Cover Preview"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                      Cover
                    </div>
                  )}
                </div>
              </div>

              {/* Selected Stories List */}
              <div className="h-32 bg-background border-t border-border p-2 overflow-x-auto no-scrollbar whitespace-nowrap">
                <div className="flex gap-2">
                  {selectedStoryIds.map((storyId) => {
                    const story = allStories.find((s) => s.id === storyId);
                    if (!story) return null;
                    const isSelected = coverStoryId === storyId;
                    return (
                      <div
                        key={story.id}
                        className={cn(
                          "relative w-24 h-24 shrink-0 cursor-pointer overflow-hidden rounded",
                          isSelected
                            ? "ring-2 ring-blue-500"
                            : "opacity-60 hover:opacity-100",
                        )}
                        onClick={() => form.setValue("coverStoryId", story.id)}
                      >
                        <Image
                          src={getMediaUrl(
                            story.thumbnailUrl,
                            "story",
                            story.mediaType,
                          )}
                          alt={story.altText || "Story cover"}
                          fill
                          className="object-cover"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-border">
              <Button
                className="w-full text-base"
                onClick={handleDone}
                disabled={createHighlightMutation.isPending}
              >
                {createHighlightMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  t("done")
                )}
              </Button>
            </div>
          </StepperContent>
        </StepperPanel>
      </Stepper>
    </div>
  );
}
