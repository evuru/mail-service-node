export type FieldType = 'string' | 'number' | 'boolean' | 'array' | 'object';

export interface SchemaField {
  key: string;
  type: FieldType;
  required: boolean;
  example: string;
  description: string;
}

export interface PayloadSchema {
  _id: string;
  name: string;
  description: string;
  fields: SchemaField[];
  active_version: number;
  template_count?: number;
  templates?: { slug: string; name: string }[];
  created_at: string;
  updated_at: string;
}

export interface PayloadSchemaVersion {
  _id: string;
  schema_id: string;
  version: number;
  fields: SchemaField[];
  author_id: string | null;
  note: string;
  is_active?: boolean;
  created_at: string;
}

export interface Template {
  _id: string;
  slug: string;
  name: string;
  subject: string;
  body_html: string;
  sender_name: string;
  use_layout: boolean;
  is_layout: boolean;
  is_global?: boolean;
  app_id?: string | null;
  layout_slug?: string | null;
  payload_schema_id?: string | null;
  payload_schema?: PayloadSchema | null;
  active_version: number;
  created_at: string;
  updated_at: string;
}

export interface TemplateVersion {
  _id: string;
  template_id: string;
  version: number;
  html: string;
  subject: string;
  author_id: string | null;
  note: string;
  is_active?: boolean;
  created_at: string;
}

export interface EmailLog {
  _id: string;
  app_id?: string | null;
  template_id: string;
  template_slug: string;
  template_version?: number | null;
  recipient: string;
  status: 'success' | 'failed';
  error_message?: string;
  sent_at: string;
}

export interface LogsResponse {
  logs: EmailLog[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface PreviewResponse {
  subject: string;
  html: string;
}

export interface SendPayload {
  template_slug: string;
  recipient: string;
  data: Record<string, unknown>;
  version?: number;
}

// ─── Auth / Users ─────────────────────────────────────────────────────────────

export type UserRole = 'superadmin' | 'user';

export interface User {
  _id: string;
  email: string;
  name?: string;
  role: UserRole;
  is_active: boolean;
  org_id?: string | null;
  is_org_admin?: boolean;
  profile_image_base64?: string;
  phone?: string;
  phone_verified?: boolean;
  email_verified?: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Organisations ────────────────────────────────────────────────────────────

export interface Organization {
  _id: string;
  name: string;
  slug: string;
  logo_base64?: string;
  created_by: string;
  llm?: OrgLlmConfig | null;
  verification?: OrgVerificationConfig | null;
  created_at: string;
  updated_at: string;
}

export interface OrgVerificationConfig {
  require_phone: boolean;
}

export interface PlatformVerificationConfig {
  require_email_verification: boolean;
  require_phone_for_non_org: boolean;
  reverification_interval_days: number;
  last_reverify_at?: string | null;
}

// ─── LLM / AI ─────────────────────────────────────────────────────────────────

export type LlmProvider = 'openai' | 'anthropic' | 'gemini' | 'ollama' | 'openai-compatible';

export interface PlatformLlmConfig {
  provider: LlmProvider;
  api_key_set: boolean;   // true if an api_key is stored server-side
  base_url: string;
  model: string;
  enabled: boolean;
}

// Org-level LLM config — same shape as platform, but scoped to the org.
// api_key is never returned; api_key_set indicates whether one is stored.
export interface OrgLlmConfig {
  provider: LlmProvider;
  api_key_set: boolean;
  base_url: string;
  model: string;
  enabled: boolean;
}

// ─── Email Apps ───────────────────────────────────────────────────────────────

export type MemberRole = 'owner' | 'editor' | 'viewer';

export interface AppPermissions {
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  can_manage: boolean;
}

export interface EmailApp {
  _id: string;
  app_name: string;
  owner_id: string;
  app_url?: string;
  api_key: string;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string;
  smtp_pass: string;
  smtp_from_name: string;
  smtp_from_email: string;
  llm_enabled: boolean;
  llm_min_role: MemberRole;
  my_role?: MemberRole;
  my_permissions?: AppPermissions | null;
  created_at: string;
  updated_at: string;
}

export interface AppMember {
  _id: string;
  app_id: string;
  user_id: string;
  role: MemberRole;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  can_manage: boolean;
  created_at: string;
  user?: { _id: string; name: string; email: string } | null;
}

// ─── Plans ────────────────────────────────────────────────────────────────────

export interface PlanLimits {
  max_apps: number;
  max_emails_per_month: number;
  max_members: number;
  max_templates: number;
  max_versions_per_template: number;  // -1 = unlimited, 0 = disabled
  ai_enabled: boolean;
  custom_domain: boolean;
  priority_support: boolean;
}

export interface Plan {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  limits: PlanLimits;
  features: string[];
  badge?: string;
  is_active: boolean;
  is_public: boolean;
  sort_order: number;
  subscriber_count?: number;
  created_at: string;
  updated_at: string;
}

export interface OrgPlanUsage {
  member_count: number;
  app_count: number;
  template_count: number;
  emails_month: number;
}

export interface FinanceDistribution {
  plan_id: string;
  name: string;
  count: number;
  revenue: number;
}

export interface FinanceData {
  mrr: number;
  arr: number;
  total_orgs: number;
  paid_orgs: number;
  emails_month: number;
  paid_apps: number;
  distribution: FinanceDistribution[];
  mrr_trend: { month: string; mrr: number }[];
  recent_assignments: { org_id: string; plan: string; created_at: string }[];
}

// ─── Platform Mailers ─────────────────────────────────────────────────────────

export interface PlatformMailer {
  _id: string;
  name: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  from_name: string;
  from_email: string;
  priority: number;
  is_active: boolean;
  pass_set: boolean;   // pass is never returned from server
  created_at: string;
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

export interface DashboardStats {
  total_users: number;
  total_orgs: number;
  total_apps: number;
  emails_30d: number;
  emails_7d: number;
}

export interface DashboardChartPoint {
  date: string;    // YYYY-MM-DD
  total: number;
  success: number;
  failed: number;
}

export interface DashboardLog {
  _id: string;
  app_id?: string | null;
  app_name?: string | null;
  template_slug: string;
  recipient: string;
  status: 'success' | 'failed' | 'unsubscribed';
  sent_at: string;
}

export interface TopApp {
  app_id: string;
  app_name: string;
  count: number;
}

export interface DashboardData {
  stats: DashboardStats;
  chart: DashboardChartPoint[];
  recent_logs: DashboardLog[];
  top_apps: TopApp[];
}

// ─── SMTP Provider Presets ────────────────────────────────────────────────────

export interface SmtpProvider {
  id: string;
  name: string;
  host: string;
  port: number;
  secure: boolean;
  description?: string;
}
