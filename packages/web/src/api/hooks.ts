import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

// --- Status ---
export function useStatus() {
  return useQuery({
    queryKey: ["status"],
    queryFn: () => api.get<{ version: string; uptime: number; timestamp: number }>("/status"),
    refetchInterval: 10_000,
  });
}

// --- Config ---
export function useConfig() {
  return useQuery({
    queryKey: ["config"],
    queryFn: () => api.get<Record<string, unknown>>("/config"),
  });
}

export function useUpdateConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Record<string, unknown>) => api.put("/config", patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["config"] }),
  });
}

// --- Channels ---
export function useChannels() {
  return useQuery({
    queryKey: ["channels"],
    queryFn: () => api.get<Record<string, unknown>>("/channels"),
  });
}

// --- Providers ---
export function useProviders() {
  return useQuery({
    queryKey: ["providers"],
    queryFn: () => api.get<Record<string, unknown>>("/providers"),
  });
}

// --- Tokens ---
export function useTokenUsage() {
  return useQuery({
    queryKey: ["tokens", "usage"],
    queryFn: () => api.get<Record<string, unknown>>("/tokens/usage"),
    refetchInterval: 30_000,
  });
}

export function useTokenBudget() {
  return useQuery({
    queryKey: ["tokens", "budget"],
    queryFn: () => api.get<Record<string, unknown>>("/tokens/budget"),
    refetchInterval: 60_000,
  });
}

// --- Sessions ---
export function useSessions() {
  return useQuery({
    queryKey: ["sessions"],
    queryFn: () => api.get<unknown[]>("/sessions"),
  });
}

// --- Setup ---
export function useSetupValidate() {
  return useMutation({
    mutationFn: (data: { step: string; data: Record<string, unknown> }) =>
      api.post<{ valid: boolean; errors?: string[] }>("/setup/validate", data),
  });
}

export function useSetupComplete() {
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post("/setup/complete", data),
  });
}
