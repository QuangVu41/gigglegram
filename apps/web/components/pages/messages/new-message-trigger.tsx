"use client";

import { SquarePen } from "lucide-react";
import { useState } from "react";
import { NewMessageModal } from "./new-message-modal";

export const NewMessageTrigger = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        className="p-2 hover:bg-accent rounded-full transition-colors"
        onClick={() => setIsModalOpen(true)}
      >
        <SquarePen className="size-6" />
      </button>

      <NewMessageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
