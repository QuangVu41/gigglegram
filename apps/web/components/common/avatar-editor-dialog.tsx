"use client";

import { useState, useRef } from "react";
import AvatarEditor from "react-avatar-editor";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useTranslations } from "next-intl";
import { ImagePlus, Loader2, ZoomIn } from "lucide-react";
import { axiosGateway } from "@/lib/axios-config";
import { toast } from "sonner";

interface AvatarEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (url?: string) => void;
  uploadUrl?: string;
}

export function AvatarEditorDialog({ isOpen, onClose, onSuccess, uploadUrl }: AvatarEditorDialogProps) {
  const t = useTranslations("AccountsPage.editProfile.avatarEditor");
  const [image, setImage] = useState<File | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const editorRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImage(e.target.files[0] || null);
    }
  };

  const handleSave = async () => {
    if (!editorRef.current || !image) {
      toast.error(t("errors.noImage"));
      return;
    }

    setIsSubmitting(true);
    try {
      const canvas = editorRef.current.getImageScaledToCanvas();
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));

      if (!blob) throw new Error("Failed to create blob");

      const file = new File([blob], "avatar.jpeg", { type: "image/jpeg" });

      const formData = new FormData();
      formData.append("media", file);

      const res = await axiosGateway.post(uploadUrl || "/api/users/upload-photo", formData);
      const newUrl =
        res.data?.data?.user?.image || res.data?.data?.url || res.data?.url || res.data?.data?.image || res.data?.image;

      toast.success(t("saveSuccess"));
      onSuccess(newUrl);
      handleClose();
    } catch (error) {
      console.error(error);
      toast.error(t("errors.uploadFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setImage(null);
    setZoom(1);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          <div
            className="relative w-64 h-64 border-2 border-dashed border-border rounded-full overflow-hidden flex items-center justify-center bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => !image && fileInputRef.current?.click()}
          >
            {image ? (
              <AvatarEditor
                ref={editorRef}
                image={image}
                width={250}
                height={250}
                border={0}
                borderRadius={125}
                scale={zoom}
                rotate={0}
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <ImagePlus className="w-10 h-10" />
                <span className="text-sm font-medium">{t("uploadPhoto")}</span>
              </div>
            )}
          </div>

          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

          {image && (
            <div className="w-full flex flex-col gap-4 px-4">
              <div className="flex items-center gap-4">
                <ZoomIn className="w-4 h-4 text-muted-foreground" />
                <Slider
                  value={[zoom]}
                  min={1}
                  max={3}
                  step={0.01}
                  onValueChange={(value) => value[0] !== undefined && setZoom(value[0])}
                  className="flex-1"
                />
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={() => fileInputRef.current?.click()}>
                {t("uploadPhoto")}
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting || !image}>
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
