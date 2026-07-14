import { createContext, useContext, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ServiceDay, ServiceDayStatus } from "../types/serviceDay";
import {
  type ServiceDayDraft,
  createServiceDay as createServiceDayApi,
  deleteServiceDay as deleteServiceDayApi,
  fetchServiceDays,
  updateServiceDay as updateServiceDayApi,
  updateServiceDayStatus as updateServiceDayStatusApi,
} from "../util/serviceDaysApi";
import { useAuth } from "./Authcontext";

export type ServiceDayContextValue = {
  serviceDays: ServiceDay[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addServiceDay: (draft: ServiceDayDraft) => Promise<ServiceDay>;
  updateServiceDay: (id: string, draft: ServiceDayDraft) => Promise<ServiceDay>;
  removeServiceDay: (id: string) => Promise<void>;
  setStatus: (id: string, status: ServiceDayStatus) => Promise<void>;
};

const noop = async () => {};

export const ServiceDayContext = createContext<ServiceDayContextValue>({
  serviceDays: [],
  isLoading: false,
  error: null,
  refresh: noop,
  addServiceDay: async () => {
    throw new Error("ServiceDayContext not mounted");
  },
  updateServiceDay: async () => {
    throw new Error("ServiceDayContext not mounted");
  },
  removeServiceDay: noop,
  setStatus: noop,
});

const QUERY_KEY = ["service-days"] as const;

export function ServiceDayContextProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();

  const query = useQuery({
    queryKey: [...QUERY_KEY, user?.id ?? "anonymous"],
    queryFn: fetchServiceDays,
    enabled: !!user && !authLoading,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const addMutation = useMutation({ mutationFn: createServiceDayApi, onSuccess: invalidate });
  const updateMutation = useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: ServiceDayDraft }) => updateServiceDayApi(id, draft),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({ mutationFn: deleteServiceDayApi, onSuccess: invalidate });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ServiceDayStatus }) => updateServiceDayStatusApi(id, status),
    onSuccess: invalidate,
  });

  const value: ServiceDayContextValue = {
    serviceDays: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refresh: async () => {
      await query.refetch();
    },
    addServiceDay: (draft) => addMutation.mutateAsync(draft),
    updateServiceDay: (id, draft) => updateMutation.mutateAsync({ id, draft }),
    removeServiceDay: async (id) => {
      await deleteMutation.mutateAsync(id);
    },
    setStatus: async (id, status) => {
      await statusMutation.mutateAsync({ id, status });
    },
  };

  return <ServiceDayContext.Provider value={value}>{children}</ServiceDayContext.Provider>;
}

export function useServiceDays(): ServiceDayContextValue {
  return useContext(ServiceDayContext);
}
