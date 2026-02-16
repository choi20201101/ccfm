import { useConfig, useUpdateConfig } from "@/api/hooks";
import { Card } from "@/components/common/Card";
import { Loading } from "@/components/common/Loading";
import { useState } from "react";

export function SettingsPage() {
  const { data: config, isLoading } = useConfig();
  const updateConfig = useUpdateConfig();
  const [jsonText, setJsonText] = useState("");

  if (isLoading) return <Loading />;

  const handleSave = () => {
    try {
      const parsed = JSON.parse(jsonText);
      updateConfig.mutate(parsed);
    } catch {
      alert("Invalid JSON");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      <Card title="Current Configuration">
        <pre className="max-h-96 overflow-auto rounded-lg bg-gray-50 p-4 text-xs text-gray-800">
          {JSON.stringify(config, null, 2)}
        </pre>
      </Card>

      <Card title="Update Configuration">
        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          rows={8}
          placeholder="Paste JSON configuration patch..."
          className="w-full rounded-lg border border-gray-300 p-3 font-mono text-xs focus:border-brand-500 focus:outline-none"
        />
        <button
          onClick={handleSave}
          disabled={updateConfig.isPending}
          className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {updateConfig.isPending ? "Saving..." : "Save Changes"}
        </button>
      </Card>
    </div>
  );
}
