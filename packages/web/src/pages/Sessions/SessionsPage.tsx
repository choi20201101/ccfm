import { useSessions } from "@/api/hooks";
import { Card } from "@/components/common/Card";
import { Loading } from "@/components/common/Loading";

export function SessionsPage() {
  const { data: sessions, isLoading } = useSessions();

  if (isLoading) return <Loading />;

  const list = (sessions ?? []) as Array<Record<string, unknown>>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Sessions</h1>

      {list.length === 0 ? (
        <Card><p className="text-sm text-gray-500">No active sessions.</p></Card>
      ) : (
        <div className="space-y-3">
          {list.map((s, i) => (
            <Card key={i}>
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">{String(s.key ?? `Session ${i + 1}`)}</span>
                <span className="text-xs text-gray-500">{String(s.agentId ?? "default")}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
