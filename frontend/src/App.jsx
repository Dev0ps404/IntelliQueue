import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import AdminDashboard from "./pages/AdminDashboard";
import Analytics from "./pages/Analytics";
import MyToken from "./pages/MyToken";
import QueueStatus from "./pages/QueueStatus";
import Settings from "./pages/Settings";
import UserPanel from "./pages/UserPanel";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={<Navigate replace to="/dashboard" />} />
        <Route path="dashboard" element={<UserPanel />} />
        <Route path="live-queue" element={<AdminDashboard />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<Settings />} />
        <Route path="my-token" element={<MyToken />} />
        <Route path="queue-status" element={<QueueStatus />} />
        <Route
          path="user-panel"
          element={<Navigate replace to="/dashboard" />}
        />
        <Route
          path="admin-dashboard"
          element={<Navigate replace to="/live-queue" />}
        />
        <Route path="*" element={<Navigate replace to="/dashboard" />} />
      </Route>
    </Routes>
  );
};

export default App;
