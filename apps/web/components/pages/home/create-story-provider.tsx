"use client";

import { createContext, useContext, useState } from "react";
import { FileWithPreview } from "@/hooks/use-file-upload";
import { createStore, StoreApi, useStore } from "zustand";

interface CreateStoryStore {
  isLoading: boolean;
  selectedFiles: FileWithPreview[];
  selectedFileIndex: number;
  setIsLoading: (isLoading: boolean) => void;
  setSelectedFileIndex: (index: number) => void;
  setSelectedFiles: (files: FileWithPreview[]) => void;
}

interface CreateStoryProviderProps {
  children: React.ReactNode;
}

const CreateStoryContext = createContext<
  StoreApi<CreateStoryStore> | undefined
>(undefined);

const CreateStoryProvider = ({ children }: CreateStoryProviderProps) => {
  const [store] = useState(() =>
    createStore<CreateStoryStore>((set) => ({
      isLoading: false,
      selectedFiles: [],
      selectedFileIndex: 0,
      setIsLoading: (isLoading: boolean) => set({ isLoading }),
      setSelectedFileIndex: (index: number) =>
        set({ selectedFileIndex: index }),
      setSelectedFiles: (files: FileWithPreview[]) =>
        set({ selectedFiles: files }),
    })),
  );

  return (
    <CreateStoryContext.Provider value={store}>
      {children}
    </CreateStoryContext.Provider>
  );
};

export function useCreateStoryStore<T>(
  selector: (state: CreateStoryStore) => T,
) {
  const context = useContext(CreateStoryContext);

  if (!context)
    throw new Error(
      "useCreateStoryStore must be used within a CreateStoryProvider",
    );

  return useStore(context, selector);
}

export default CreateStoryProvider;
