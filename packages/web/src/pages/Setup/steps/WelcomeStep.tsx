export function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center">
      <h1 className="text-3xl font-bold text-gray-900">Welcome to CCFM Bot</h1>
      <p className="mt-3 text-gray-600">
        Let's set up your AI chatbot in a few simple steps. You'll configure a
        provider, pick a model, and optionally connect a messaging channel.
      </p>
      <div className="mt-8">
        <button onClick={onNext} className="rounded-lg bg-brand-600 px-6 py-3 text-white hover:bg-brand-700 transition-colors">
          Get Started
        </button>
      </div>
    </div>
  );
}
