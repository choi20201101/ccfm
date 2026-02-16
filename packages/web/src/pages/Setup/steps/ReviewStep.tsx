import type { SetupData } from "../SetupPage";

interface Props {
  data: SetupData;
  onFinish: () => void;
  onPrev: () => void;
  loading: boolean;
  error?: string | null;
}

export function ReviewStep({ data, onFinish, onPrev, loading, error }: Props) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900">Review & Finish</h2>
      <p className="mt-1 text-sm text-gray-600">Review your configuration before completing setup.</p>

      <div className="mt-6 space-y-4 rounded-lg bg-gray-50 p-4">
        <Row label="Provider" value={data.provider} />
        <Row label="API Key" value={data.apiKey ? "****" + data.apiKey.slice(-4) : "Not set"} />
        <Row label="Model" value={data.model} />
        <Row label="Channel" value={data.channel ? `${data.channel.type} (configured)` : "None"} />
        <Row label="Bot Name" value={data.persona.name} />
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-8 flex justify-between">
        <button onClick={onPrev} className="rounded-lg px-4 py-2 text-gray-600 hover:bg-gray-100">Back</button>
        <button
          onClick={onFinish}
          disabled={loading}
          className="rounded-lg bg-brand-600 px-6 py-2 text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "Setting up..." : "Complete Setup"}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="font-medium text-gray-600">{label}</span>
      <span className="text-gray-900">{value}</span>
    </div>
  );
}
