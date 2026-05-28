import { Switch } from "@/components/ui/switch";
import { Field, FieldLabel } from "@/components/ui/field";
import { FileWithPreview } from "@/hooks/use-file-upload";
import { useEffect } from "react";
import { useTranslations } from "next-intl";

interface VideoAudioToggleProps {
  videoRef?: HTMLVideoElement | null;
  file: FileWithPreview;
  onEditVideoMetadata?: (
    editedMetadata: Pick<
      FileWithPreview,
      "audioOmitted" | "millisecondsToExtractThumbnail" | "id"
    >,
  ) => void;
}

const VideoAudioToggle = ({
  videoRef,
  file,
  onEditVideoMetadata,
}: VideoAudioToggleProps) => {
  const t = useTranslations("Common");
  useEffect(() => {
    if (videoRef && file.audioOmitted === true) {
      videoRef.muted = true;
    }
  }, [videoRef]);

  return (
    <Field orientation="horizontal">
      <FieldLabel htmlFor="switch-basic" className="text-xl font-semibold">
        {file.hasAudio
          ? t("videoAudioToggle.toggleAudio")
          : t("videoAudioToggle.noAudioAvailable")}
      </FieldLabel>
      <Switch
        id="switch-basic"
        checked={!file.audioOmitted}
        disabled={!file.hasAudio}
        onCheckedChange={(value) => {
          if (videoRef) {
            videoRef.muted = !value;
          }
          onEditVideoMetadata?.({ audioOmitted: !value, id: file.id });
        }}
      />
    </Field>
  );
};

export default VideoAudioToggle;
