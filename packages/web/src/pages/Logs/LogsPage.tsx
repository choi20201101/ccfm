import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/common/Card";

export function LogsPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const es = new EventSource("/api/v1/logs");
    es.onopen = () => setConnected(true);
    es.onmessage = (event) => {
      setLogs((prev) => [...prev.slice(-500), event.data]);
    };
    es.onerror = () => setConnected(false);
    return () => es.close();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Live Logs</h1>
        <span className={`text-sm ${connected ? "text-green-600" : "text-red-500"}`}>
          {connected ? "Connected" : "Disconnected"}
        </span>
      </div>

      <Card>
        <div className="h-[calc(100vh-16rem)] overflow-y-auto rounded-lg bg-gray-900 p-4 font-mono text-xs text-green-400">
          {logs.length === 0 ? (
            <p className="text-gray-500">Waiting for log events...</p>
          ) : (
            logs.map((line, i) => <div key={i}>{line}</div>)
          )}
          <div ref={bottomRef} />
        </div>
      </Card>
    </div>
  );
}
