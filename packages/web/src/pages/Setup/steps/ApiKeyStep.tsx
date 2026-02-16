import type { SetupData } from "../SetupPage";

interface Props {
  data: SetupData;
  onUpdate: (patch: Partial<SetupData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function ApiKeyStep({ data, onUpdate, onNext, onPrev }: Props) {
  const skip = data.provider === "ollama";

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900">API Key</h2>
      <p className="mt-1 text-sm text-gray-600">
        {skip
          ? "Ollama runs locally — no API key needed."
          : `Enter your ${data.provider} API key.`}
      </p>

      {!skip && (
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700">API Key</label>
          <input
            type="password"
            value={data.apiKey}
            onChange={(e) => onUpdate({ apiKey: e.target.value })}
            placeholder="sk-..."
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      )}

      <div className="mt-8 flex justify-between">
        <button onClick={onPrev} className="rounded-lg px-4 py-2 text-gray-600 hover:bg-gray-100">Back</button>
        <button
          onClick={onNext}
          disabled={!skip && !data.apiKey}
          className="rounded-lg bg-brand-600 px-6 py-2 text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {skip ? "Skip" : "Next"}
        </button>
      </div>
    </div>
  );
}
