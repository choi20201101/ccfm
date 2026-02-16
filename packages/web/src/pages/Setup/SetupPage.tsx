import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { WelcomeStep } from "./steps/WelcomeStep";
import { ProviderStep } from "./steps/ProviderStep";
import { ApiKeyStep } from "./steps/ApiKeyStep";
import { ModelStep } from "./steps/ModelStep";
import { ChannelStep } from "./steps/ChannelStep";
import { PersonaStep } from "./steps/PersonaStep";
import { ReviewStep } from "./steps/ReviewStep";
import { useConfigStore } from "@/stores/config";
import { useSetupComplete } from "@/api/hooks";

const STEPS = ["Welcome", "Provider", "API Key", "Model", "Channel", "Persona", "Review"];

export interface SetupData {
  provider: string;
  apiKey: string;
  model: string;
  channel: { type: string; token: string } | null;
  persona: { name: string; systemPrompt: string };
}

export function SetupPage() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<SetupData>({
    provider: "anthropic",
    apiKey: "",
    model: "claude-sonnet-4",
    channel: null,
    persona: { name: "CCFM Bot", systemPrompt: "You are a helpful AI assistant." },
  });

  const navigate = useNavigate();
  const setSetupComplete = useConfigStore((s) => s.setSetupComplete);
  const setupComplete = useSetupComplete();

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));
  const update = (patch: Partial<SetupData>) => setData((d) => ({ ...d, ...patch }));

  const finish = async () => {
    await setupComplete.mutateAsync(data as unknown as Record<string, unknown>);
    setSetupComplete(true);
    navigate("/");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-blue-50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-lg">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="mb-2 flex justify-between text-xs text-gray-500">
            {STEPS.map((s, i) => (
              <span key={s} className={i <= step ? "font-semibold text-brand-600" : ""}>{s}</span>
            ))}
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-brand-500 transition-all"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        {step === 0 && <WelcomeStep onNext={next} />}
        {step === 1 && <ProviderStep data={data} onUpdate={update} onNext={next} onPrev={prev} />}
        {step === 2 && <ApiKeyStep data={data} onUpdate={update} onNext={next} onPrev={prev} />}
        {step === 3 && <ModelStep data={data} onUpdate={update} onNext={next} onPrev={prev} />}
        {step === 4 && <ChannelStep data={data} onUpdate={update} onNext={next} onPrev={prev} />}
        {step === 5 && <PersonaStep data={data} onUpdate={update} onNext={next} onPrev={prev} />}
        {step === 6 && <ReviewStep data={data} onFinish={finish} onPrev={prev} loading={setupComplete.isPending} />}
      </div>
    </div>
  );
}
