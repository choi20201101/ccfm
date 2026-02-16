import { useState } from "react";
import type { SetupData } from "../SetupPage";

const CHANNELS = [
  { type: "telegram", name: "Telegram", desc: "Popular messaging with bot API" },
  { type: "discord", name: "Discord", desc: "Community-focused platform" },
  { type: "slack", name: "Slack", desc: "Team collaboration" },
];

interface Props {
  data: SetupData;
  onUpdate: (patch: Partial<SetupData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function ChannelStep({ data, onUpdate, onNext, onPrev }: Props) {
  const [selected, setSelected] = useState(data.channel?.type ?? "");
  const [token, setToken] = useState(data.channel?.token ?? "");

  const handleNext = () => {
    if (selected && token) {
      onUpdate({ channel: { type: selected, token } });
    } else {
      onUpdate({ channel: null });
    }
    onNext();
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900">Connect a Channel (Optional)</h2>
      <p className="mt-1 text-sm text-gray-600">Connect a messaging platform or skip for now.</p>

      <div className="mt-6 space-y-3">
        {CHANNELS.map((ch) => (
          <button
            key={ch.type}
            onClick={() => setSelected(ch.type)}
            className={`w-full rounded-lg border-2 p-4 text-left transition-colors ${
              selected === ch.type
                ? "border-brand-500 bg-brand-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <p className="font-semibold text-gray-900">{ch.name}</p>
            <p className="text-sm text-gray-500">{ch.desc}</p>
          </button>
        ))}
      </div>

      {selected && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700">Bot Token</label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Enter bot token..."
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-brand-500 focus:outline-none"
          />
        </div>
      )}

      <div className="mt-8 flex justify-between">
        <button onClick={onPrev} className="rounded-lg px-4 py-2 text-gray-600 hover:bg-gray-100">Back</button>
        <button onClick={handleNext} className="rounded-lg bg-brand-600 px-6 py-2 text-white hover:bg-brand-700">
          {selected ? "Next" : "Skip"}
        </button>
      </div>
    </div>
  );
}
