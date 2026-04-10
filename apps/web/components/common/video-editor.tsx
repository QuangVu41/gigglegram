import { FileWithPreview } from "@/hooks/use-file-upload";
import VideoFramePicker from "@/components/common/video-frame-picker";
import { Input, ALL_FORMATS, UrlSource } from "mediabunny";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import VideoAudioToggle from "@/components/common/video-audio-toggle";

interface VideoEditorProps {
  videoFile: FileWithPreview;
  videoRef?: HTMLVideoElement | null;
  onEditVideoMetadata?: (
    editedMetadata: Pick<FileWithPreview, "audioOmitted" | "millisecondsToExtractThumbnail" | "id">,
  ) => void;
}

const VideoEditor = ({ videoFile, onEditVideoMetadata, videoRef }: VideoEditorProps) => {
  const [duration, setDuration] = useState(0);
  const inputVideo = new Input({
    formats: ALL_FORMATS,
    source: new UrlSource(videoFile.preview!),
  });

  useEffect(() => {
    async function getFileMetadata() {
      if (inputVideo) {
        try {
          const duration = await inputVideo.computeDuration();
          setDuration(Math.floor(duration));
        } catch (error) {
          toast.error("Failed to get video metadata");
        }
      }
    }
    getFileMetadata();
  }, [videoFile]);

  return (
    <div className="space-y-4 px-2">
      <VideoFramePicker
        src={videoFile.preview!}
        frameCount={duration}
        onChange={(time) => onEditVideoMetadata?.({ millisecondsToExtractThumbnail: time, id: videoFile.id })}
      />
      <VideoAudioToggle videoRef={videoRef} file={videoFile} onEditVideoMetadata={onEditVideoMetadata} />
    </div>
  );
};

export default VideoEditor;
