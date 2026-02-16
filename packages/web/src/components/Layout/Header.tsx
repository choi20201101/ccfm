import { useUiStore } from "@/stores/ui";
import { useStatus } from "@/api/hooks";

export function Header() {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const { data: status } = useStatus();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <button
        onClick={toggleSidebar}
        className="rounded-md p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="flex items-center gap-4">
        {status && (
          <div className="flex items-center gap-2 text-sm">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-gray-600">Online</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-500">
              Uptime: {Math.floor((status.uptime ?? 0) / 60)}m
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
