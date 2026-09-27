import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../lib/auth';
import { ProtectedRoute } from '../lib/ProtectedRoute';
import { Shell } from '../layout/Shell';
import { LoginPage } from '../pages/LoginPage';
import { AnalyticsPage } from '../pages/AnalyticsPage';
import { OperatorsPage } from '../pages/OperatorsPage';
import { UsersPage } from '../pages/UsersPage';
import { SettingsPage } from '../pages/SettingsPage';
import { AuditLogsPage } from '../pages/AuditLogsPage';
import { MarketingPage } from '../pages/MarketingPage';
import { IntegrationsPage } from '../pages/IntegrationsPage';
import { ComplaintsPage } from '../pages/ComplaintsPage';

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Shell />
            </ProtectedRoute>
          }
        >
          <Route index element={<AnalyticsPage />} />
          <Route path="operators" element={<OperatorsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="audit-logs" element={<AuditLogsPage />} />
          <Route path="marketing" element={<MarketingPage />} />
          <Route path="integrations" element={<IntegrationsPage />} />
          <Route path="complaints" element={<ComplaintsPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
