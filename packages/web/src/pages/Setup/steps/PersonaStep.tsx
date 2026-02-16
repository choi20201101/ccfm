import type { SetupData } from "../SetupPage";

interface Props {
  data: SetupData;
  onUpdate: (patch: Partial<SetupData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function PersonaStep({ data, onUpdate, onNext, onPrev }: Props) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900">Bot Persona</h2>
      <p className="mt-1 text-sm text-gray-600">Customize your bot's identity.</p>

      <div className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input
            value={data.persona.name}
            onChange={(e) => onUpdate({ persona: { ...data.persona, name: e.target.value } })}
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-brand-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">System Prompt</label>
          <textarea
            value={data.persona.systemPrompt}
            onChange={(e) => onUpdate({ persona: { ...data.persona, systemPrompt: e.target.value } })}
            rows={4}
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-brand-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <button onClick={onPrev} className="rounded-lg px-4 py-2 text-gray-600 hover:bg-gray-100">Back</button>
        <button onClick={onNext} className="rounded-lg bg-brand-600 px-6 py-2 text-white hover:bg-brand-700">Next</button>
      </div>
    </div>
  );
}
