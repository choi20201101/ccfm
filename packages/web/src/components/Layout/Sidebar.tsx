import { NavLink } from "react-router-dom";
import { useUiStore } from "@/stores/ui";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: "grid" },
  { path: "/tokens", label: "Tokens", icon: "coins" },
  { path: "/channels", label: "Channels", icon: "radio" },
  { path: "/providers", label: "Providers", icon: "cloud" },
  { path: "/sessions", label: "Sessions", icon: "messages" },
  { path: "/settings", label: "Settings", icon: "settings" },
  { path: "/logs", label: "Logs", icon: "terminal" },
];

export function Sidebar() {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform duration-200 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      } lg:static lg:translate-x-0`}
    >
      <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6">
        <span className="text-xl font-bold text-brand-600">CCFM</span>
        <span className="text-sm text-gray-500">Bot</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`
            }
          >
            <span className="w-5 text-center text-xs uppercase tracking-wider text-gray-400">
              {item.icon.slice(0, 2)}
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-gray-200 p-4">
        <p className="text-xs text-gray-400">CCFM Bot v0.1.0</p>
      </div>
    </aside>
  );
}
