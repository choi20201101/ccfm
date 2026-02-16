import { create } from "zustand";

interface ConfigState {
  isSetupComplete: boolean;
  isLoading: boolean;
  setSetupComplete: (val: boolean) => void;
  setLoading: (val: boolean) => void;
}

export const useConfigStore = create<ConfigState>((set) => ({
  isSetupComplete: false,
  isLoading: true,
  setSetupComplete: (val) => set({ isSetupComplete: val }),
  setLoading: (val) => set({ isLoading: val }),
}));
