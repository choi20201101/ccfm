import { create } from "zustand";

interface TokensState {
  selectedPeriod: "today" | "week" | "month" | "all";
  setSelectedPeriod: (period: "today" | "week" | "month" | "all") => void;
}

export const useTokensStore = create<TokensState>((set) => ({
  selectedPeriod: "today",
  setSelectedPeriod: (period) => set({ selectedPeriod: period }),
}));
