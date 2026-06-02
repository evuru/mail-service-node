import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Dashboard } from './pages/Dashboard';
import { UserDashboardPage } from './pages/UserDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { TemplateEditor } from './pages/TemplateEditor';
import { LogsPage } from './pages/LogsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { SchemasPage } from './pages/SchemasPage';
import { AppsPage } from './pages/AppsPage';
import { AppSettingsPage } from './pages/AppSettingsPage';
import { UsersPage } from './pages/UsersPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { OrgSetupPage } from './pages/OrgSetupPage';
import { LandingPage } from './pages/LandingPage';
import { FeaturesPage } from './pages/FeaturesPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { DocsPage } from './pages/DocsPage';
import { PricingPage } from './pages/PricingPage';
import { PlatformSettingsPage } from './pages/PlatformSettingsPage';
import SDKExportPage from './pages/SDKExportPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { AdminPlansPage } from './pages/AdminPlansPage';

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
        <Route path="/verify-email" element={<VerifyEmailPage />} />

        {/* Org setup — authenticated but outside main layout */}
        <Route element={<ProtectedRoute />}>
          <Route path="/org-setup" element={<OrgSetupPage />} />
        </Route>

        {/* Protected app shell */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="dashboard"     element={<UserDashboardPage />} />
            <Route path="templates"     element={<Dashboard />} />
            <Route path="templates/new" element={<TemplateEditor />} />
            <Route path="templates/:slug" element={<TemplateEditor />} />
            <Route path="schemas"       element={<SchemasPage />} />
            <Route path="logs"          element={<LogsPage />} />
            <Route path="settings"      element={<SettingsPage />} />
            <Route path="profile"       element={<ProfilePage />} />
            <Route path="apps"          element={<AppsPage />} />
            <Route path="apps/:id/settings" element={<AppSettingsPage />} />
            <Route path="sdk-export"    element={<SDKExportPage />} />

            {/* Superadmin only */}
            <Route element={<ProtectedRoute requireSuperadmin />}>
              <Route path="admin"             element={<AdminDashboardPage />} />
              <Route path="admin/plans"       element={<AdminPlansPage />} />
              <Route path="users"             element={<UsersPage />} />
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
