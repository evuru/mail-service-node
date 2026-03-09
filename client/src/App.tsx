import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Dashboard } from './pages/Dashboard';
import { TemplateEditor } from './pages/TemplateEditor';
import { LogsPage } from './pages/LogsPage';
import { SettingsPage } from './pages/SettingsPage';
import { SchemasPage } from './pages/SchemasPage';
import { AppsPage } from './pages/AppsPage';
import { AppSettingsPage } from './pages/AppSettingsPage';
import { UsersPage } from './pages/UsersPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { LandingPage } from './pages/LandingPage';
import { FeaturesPage } from './pages/FeaturesPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { DocsPage } from './pages/DocsPage';
import { PricingPage } from './pages/PricingPage';
import { PlatformSettingsPage } from './pages/PlatformSettingsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected app shell */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="templates" element={<Dashboard />} />
            <Route path="templates/new" element={<TemplateEditor />} />
            <Route path="templates/:slug" element={<TemplateEditor />} />
            <Route path="schemas" element={<SchemasPage />} />
            <Route path="logs" element={<LogsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="apps" element={<AppsPage />} />
            <Route path="apps/:id/settings" element={<AppSettingsPage />} />

            {/* Superadmin only */}
            <Route element={<ProtectedRoute requireSuperadmin />}>
              <Route path="users" element={<UsersPage />} />
              <Route path="platform-settings" element={<PlatformSettingsPage />} />
            </Route>
          </Route>
        </Route>

        {/* Catch-all → home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
