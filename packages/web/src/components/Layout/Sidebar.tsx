import { NavLink } from "react-router-dom";
import { useUiStore } from "@/stores/ui";

const NAV_ITEMS = [
  { path: "/chat", label: "Chat", icon: "Ch" },
  { path: "/", label: "Dashboard", icon: "Da" },
  { path: "/tokens", label: "Tokens", icon: "Tk" },
  { path: "/channels", label: "Channels", icon: "Ch" },
  { path: "/providers", label: "Providers", icon: "Pr" },
  { path: "/sessions", label: "Sessions", icon: "Se" },
  { path: "/settings", label: "Settings", icon: "St" },
  { path: "/logs", label: "Logs", icon: "Lo" },
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
            end={item.path === "/" || item.path === "/chat"}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brand-50 text-brand-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`
            }
          >
            <span className="flex h-6 w-6 items-center justify-center rounded bg-gray-100 text-[10px] font-bold text-gray-500">
              {item.icon}
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
