import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { InstancesPage } from './pages/InstancesPage.tsx';
import { FlowsPage } from './pages/FlowsPage.tsx';
import { FlowEditorPage } from './pages/FlowEditorPage.tsx';
import { ContactsPage } from './pages/ContactsPage.tsx';
import { ConversationsPage } from './pages/ConversationsPage.tsx';
import { WebhooksPage } from './pages/WebhooksPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<HomePage />} />

        {/* Protected — App Layout */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/flows" element={<FlowsPage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/conversations" element={<ConversationsPage />} />
          <Route path="/instances" element={<InstancesPage />} />
          <Route path="/webhooks" element={<WebhooksPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Flow Editor — Full screen, no sidebar */}
        <Route path="/flows/:id/edit" element={<FlowEditorPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
