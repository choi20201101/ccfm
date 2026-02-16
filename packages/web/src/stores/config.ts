import { create } from "zustand";

interface ConfigState {
  isSetupComplete: boolean;
  isLoading: boolean;
  setSetupComplete: (val: boolean) => void;
  setLoading: (val: boolean) => void;
  checkSetupStatus: () => Promise<void>;
}

export const useConfigStore = create<ConfigState>((set) => ({
  isSetupComplete: localStorage.getItem("ccfm_setup_complete") === "true",
  isLoading: false,
  setSetupComplete: (val) => {
    localStorage.setItem("ccfm_setup_complete", String(val));
    set({ isSetupComplete: val });
  },
  setLoading: (val) => set({ isLoading: val }),
  checkSetupStatus: async () => {
    try {
      const res = await fetch("/api/v1/status");
      if (res.ok) {
        // Server is running - if we have local setup flag, keep it
        const saved = localStorage.getItem("ccfm_setup_complete") === "true";
        set({ isSetupComplete: saved, isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
