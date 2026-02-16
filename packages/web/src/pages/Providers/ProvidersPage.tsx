import { useProviders } from "@/api/hooks";
import { Card } from "@/components/common/Card";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Loading } from "@/components/common/Loading";

export function ProvidersPage() {
  const { data: providers, isLoading } = useProviders();

  if (isLoading) return <Loading />;

  const entries = Object.entries((providers ?? {}) as Record<string, Record<string, unknown>>);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Providers</h1>

      {entries.length === 0 ? (
        <Card><p className="text-sm text-gray-500">No providers configured.</p></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {entries.map(([id, cfg]) => (
            <Card key={id}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">{id}</h3>
                <StatusBadge status="online" label="Available" />
              </div>
              <p className="mt-2 text-sm text-gray-500">API: {String(cfg.api ?? "unknown")}</p>
              <p className="text-sm text-gray-500">
                Models: {Array.isArray(cfg.models) ? cfg.models.length : 0}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
