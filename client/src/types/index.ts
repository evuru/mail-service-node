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
  template_count?: number;
  templates?: { slug: string; name: string }[];
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
}

export interface EmailLog {
  _id: string;
  app_id?: string | null;
  template_id: string;
  template_slug: string;
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
  created_at: string;
  updated_at: string;
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

// ─── SMTP Provider Presets ────────────────────────────────────────────────────

export interface SmtpProvider {
  id: string;
  name: string;
  host: string;
  port: number;
  secure: boolean;
  description?: string;
}
