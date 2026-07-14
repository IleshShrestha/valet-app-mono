import { apiClient } from "./apiClient";

/** Fire-and-forget health ping so the backend is warm; never throws. */
export function runSilentHealthCheck(): void {
  void apiClient.get("/health", { skipAuthRefresh: true }).catch(() => undefined);
}
