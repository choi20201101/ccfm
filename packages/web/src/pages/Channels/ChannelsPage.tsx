import { useChannels } from "@/api/hooks";
import { Card } from "@/components/common/Card";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Loading } from "@/components/common/Loading";

export function ChannelsPage() {
  const { data: channels, isLoading } = useChannels();

  if (isLoading) return <Loading />;

  const entries = Object.entries((channels ?? {}) as Record<string, Record<string, unknown>>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Channels</h1>
        <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700">
          Add Channel
        </button>
      </div>

      {entries.length === 0 ? (
        <Card><p className="text-sm text-gray-500">No channels configured. Add one to get started.</p></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {entries.map(([id, cfg]) => (
            <Card key={id}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">{id}</h3>
                <StatusBadge status={cfg.enabled ? "online" : "offline"} label={cfg.enabled ? "Active" : "Inactive"} />
              </div>
              <p className="mt-2 text-sm text-gray-500">Type: {String(cfg.type ?? id)}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
