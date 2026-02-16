import { Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "./components/Layout/MainLayout";
import { SetupPage } from "./pages/Setup/SetupPage";
import { DashboardPage } from "./pages/Dashboard/DashboardPage";
import { TokensPage } from "./pages/Tokens/TokensPage";
import { ChannelsPage } from "./pages/Channels/ChannelsPage";
import { ProvidersPage } from "./pages/Providers/ProvidersPage";
import { SessionsPage } from "./pages/Sessions/SessionsPage";
import { SettingsPage } from "./pages/Settings/SettingsPage";
import { LogsPage } from "./pages/Logs/LogsPage";
import { useConfigStore } from "./stores/config";

export function App() {
  const isSetupComplete = useConfigStore((s) => s.isSetupComplete);

  if (!isSetupComplete) {
    return (
      <Routes>
        <Route path="/setup/*" element={<SetupPage />} />
        <Route path="*" element={<Navigate to="/setup" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/tokens" element={<TokensPage />} />
        <Route path="/channels" element={<ChannelsPage />} />
        <Route path="/providers" element={<ProvidersPage />} />
        <Route path="/sessions" element={<SessionsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/logs" element={<LogsPage />} />
      </Route>
      <Route path="/setup/*" element={<SetupPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
