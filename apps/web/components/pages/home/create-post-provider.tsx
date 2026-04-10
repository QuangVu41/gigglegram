import type { FindManyQueryDto } from "@repo/types/common";
import { createContext, useContext, useState } from "react";
import { FileWithPreview } from "@/hooks/use-file-upload";
import { createStore, StoreApi, useStore } from "zustand";
import { locations, users } from "@repo/database";
import { axiosGateway, FindManyResponse } from "@/lib/axios-config";

interface CreatePostStore {
  isLoading: boolean;
  selectedFiles: FileWithPreview[];
  selectedFileIndex: number;
  setIsLoading: (isLoading: boolean) => void;
  locations: (typeof locations.$inferSelect)[];
  collaborators: (typeof users.$inferSelect)[];
  setSelectedFileIndex: (index: number) => void;
  setSelectedFiles: (files: FileWithPreview[]) => void;
  fetchLocations: (query: Partial<FindManyQueryDto> & Record<string, string | number | string[]>) => void;
  fetchCollaborators: (query: Partial<FindManyQueryDto> & Record<string, string | number | string[]>) => void;
  clearLocations: () => void;
  clearCollaborators: () => void;
}

interface CreatePostProviderProps {
  children: React.ReactNode;
}

const CreatePostContext = createContext<StoreApi<CreatePostStore> | undefined>(undefined);

const CreatePostProvider = ({ children }: CreatePostProviderProps) => {
  const [store] = useState(() =>
    createStore<CreatePostStore>((set) => ({
      isLoading: false,
      selectedFiles: [],
      selectedFileIndex: 0,
      locations: [],
      collaborators: [],
      setIsLoading: (isLoading: boolean) => set({ isLoading }),
      setSelectedFileIndex: (index: number) => set({ selectedFileIndex: index }),
      setSelectedFiles: (files: FileWithPreview[]) => set({ selectedFiles: files }),
      fetchLocations: async (query: Partial<FindManyQueryDto> & Record<string, string | number | string[]>) => {
        set({ isLoading: true, locations: [] });

        try {
          const res = await axiosGateway.get<FindManyResponse<typeof locations.$inferSelect>>(`/api/posts/locations`, {
            params: query,
          });
          const data = res.data.data;

          set({ locations: data, isLoading: false });
        } catch {
          set({
            isLoading: false,
            locations: [],
          });
        } finally {
          set({ isLoading: false });
        }
      },
      fetchCollaborators: async (query: Partial<FindManyQueryDto> & Record<string, string | number | string[]>) => {
        set({ isLoading: true, collaborators: [] });

        try {
          const res = await axiosGateway.get<FindManyResponse<typeof users.$inferSelect>>(`/api/users`, {
            params: query,
          });
          const data = res.data.data;

          set({ collaborators: data, isLoading: false });
        } catch {
          set({
            isLoading: false,
            collaborators: [],
          });
        } finally {
          set({ isLoading: false });
        }
      },
      clearLocations: () => set({ locations: [] }),
      clearCollaborators: () => set({ collaborators: [] }),
    })),
  );

  return <CreatePostContext.Provider value={store}>{children}</CreatePostContext.Provider>;
};

export function useCreatePostStore<T>(selector: (state: CreatePostStore) => T) {
  const context = useContext(CreatePostContext);

  if (!context) throw new Error("useCartItemsStore must be used within a CartItemsProvider");

  return useStore(context, selector);
}

export default CreatePostProvider;
