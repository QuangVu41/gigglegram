import { Switch } from "@/components/ui/switch";
import { Field, FieldLabel } from "@/components/ui/field";
import { FileWithPreview } from "@/hooks/use-file-upload";
import { useEffect } from "react";

interface VideoAudioToggleProps {
  videoRef?: HTMLVideoElement | null;
  file: FileWithPreview;
  onEditVideoMetadata?: (
    editedMetadata: Pick<FileWithPreview, "audioOmitted" | "millisecondsToExtractThumbnail" | "id">,
  ) => void;
}

const VideoAudioToggle = ({ videoRef, file, onEditVideoMetadata }: VideoAudioToggleProps) => {
  useEffect(() => {
    if (videoRef && file.audioOmitted === true) {
      videoRef.muted = true;
    }
  }, [videoRef]);

  return (
    <Field orientation="horizontal">
      <FieldLabel htmlFor="switch-basic" className="text-xl font-semibold">
        Toggle audio
      </FieldLabel>
      <Switch
        id="switch-basic"
        checked={!file.audioOmitted}
        onCheckedChange={(value) => {
          videoRef && (videoRef.muted = !value);
          onEditVideoMetadata?.({ audioOmitted: !value, id: file.id });
        }}
      />
    </Field>
  );
};

export default VideoAudioToggle;
