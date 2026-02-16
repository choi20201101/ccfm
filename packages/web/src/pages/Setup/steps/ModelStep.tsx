import type { SetupData } from "../SetupPage";

const MODELS: Record<string, Array<{ id: string; name: string; desc: string }>> = {
  anthropic: [
    { id: "claude-sonnet-4", name: "Claude Sonnet 4", desc: "Best balance of speed and quality" },
    { id: "claude-opus-4", name: "Claude Opus 4", desc: "Most capable, higher cost" },
    { id: "claude-haiku-3.5", name: "Claude Haiku 3.5", desc: "Fastest, most affordable" },
  ],
  openai: [
    { id: "gpt-4o", name: "GPT-4o", desc: "Most capable OpenAI model" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini", desc: "Fast and affordable" },
  ],
  google: [
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", desc: "Fast with large context" },
  ],
  ollama: [
    { id: "llama3.1", name: "Llama 3.1", desc: "Open-source, runs locally" },
    { id: "mistral", name: "Mistral", desc: "Efficient open-source model" },
  ],
};

interface Props {
  data: SetupData;
  onUpdate: (patch: Partial<SetupData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function ModelStep({ data, onUpdate, onNext, onPrev }: Props) {
  const models = MODELS[data.provider] ?? [];

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900">Select a Model</h2>
      <p className="mt-1 text-sm text-gray-600">Choose the model for your bot.</p>

      <div className="mt-6 space-y-3">
        {models.map((m) => (
          <button
            key={m.id}
            onClick={() => onUpdate({ model: m.id })}
            className={`w-full rounded-lg border-2 p-4 text-left transition-colors ${
              data.model === m.id
                ? "border-brand-500 bg-brand-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <p className="font-semibold text-gray-900">{m.name}</p>
            <p className="text-sm text-gray-500">{m.desc}</p>
          </button>
        ))}
      </div>

      <div className="mt-8 flex justify-between">
        <button onClick={onPrev} className="rounded-lg px-4 py-2 text-gray-600 hover:bg-gray-100">Back</button>
        <button onClick={onNext} className="rounded-lg bg-brand-600 px-6 py-2 text-white hover:bg-brand-700">Next</button>
      </div>
    </div>
  );
}
