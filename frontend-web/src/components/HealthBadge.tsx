import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL } from "@/config";

type HealthResponse = { data?: { status?: string; env?: string } };

async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE_URL}/health`);
  if (!res.ok) throw new Error(`health ${res.status}`);
  return res.json();
}

/**
 * Small backend-connectivity indicator. Its real job in the scaffold is to
 * prove CORS + API reachability end-to-end from the browser.
 */
export default function HealthBadge() {
  const { data, isError, isPending } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: 30_000,
    retry: 1,
  });

  const ok = !isPending && !isError && data?.data?.status === "ok";
  const label = isPending ? "connecting…" : ok ? `API ok (${data?.data?.env ?? "?"})` : "API unreachable";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        ok ? "bg-green-100 text-green-800" : isPending ? "bg-gray-100 text-gray-600" : "bg-red-100 text-red-800"
      }`}
      title={`${API_BASE_URL}/health`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-green-600" : isPending ? "bg-gray-400" : "bg-red-600"}`} />
      {label}
    </span>
  );
}
