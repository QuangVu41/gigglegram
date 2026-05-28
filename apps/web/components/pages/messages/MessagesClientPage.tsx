"use client";

import { useTranslations } from "next-intl";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { NewMessageModal } from "./new-message-modal";

const MessagesClientPage = () => {
  const t = useTranslations("MessagesPage");
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="h-full flex flex-col items-center justify-center p-4 text-center">
      <div className="size-24 rounded-full border-2 border-foreground flex items-center justify-center mb-4">
        <Send className="size-12 rotate-[-10deg]" />
      </div>
      <h2 className="text-xl font-bold mb-1">{t("yourMessages")}</h2>
      <p className="text-muted-foreground mb-6 max-w-xs">{t("description")}</p>
      <Button
        className="rounded-xl px-6 py-5 font-semibold"
        onClick={() => setIsModalOpen(true)}
      >
        {t("sendMessage")}
      </Button>

      <NewMessageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};

export default MessagesClientPage;
