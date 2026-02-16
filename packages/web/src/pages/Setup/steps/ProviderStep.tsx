import type { SetupData } from "../SetupPage";

const PROVIDERS = [
  { id: "anthropic", name: "Anthropic (Claude)", desc: "Best for reasoning and conversation" },
  { id: "openai", name: "OpenAI (GPT)", desc: "Versatile general-purpose models" },
  { id: "google", name: "Google (Gemini)", desc: "Multimodal with large context" },
  { id: "ollama", name: "Ollama (Local)", desc: "Privacy-first, runs locally" },
];

interface Props {
  data: SetupData;
  onUpdate: (patch: Partial<SetupData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function ProviderStep({ data, onUpdate, onNext, onPrev }: Props) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900">Choose a Provider</h2>
      <p className="mt-1 text-sm text-gray-600">Select the AI provider you'd like to use.</p>

      <div className="mt-6 space-y-3">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            onClick={() => onUpdate({ provider: p.id })}
            className={`w-full rounded-lg border-2 p-4 text-left transition-colors ${
              data.provider === p.id
                ? "border-brand-500 bg-brand-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <p className="font-semibold text-gray-900">{p.name}</p>
            <p className="text-sm text-gray-500">{p.desc}</p>
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
