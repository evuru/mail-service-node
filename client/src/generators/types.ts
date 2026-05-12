export type FieldType = 'string' | 'number' | 'boolean' | 'array' | 'object';

export interface SchemaField {
  key: string;
  type: FieldType;
  required: boolean;
  description: string;
  example: string;
}

export interface ExportTemplate {
  camelName: string;   // e.g. "welcome", "passwordReset"
  slug: string;        // e.g. "welcome-email"
  name: string;        // e.g. "Welcome Email"
  appKey: string;      // which app sends it
  schema: SchemaField[] | null;
}

export interface ExportApp {
  key: string;         // camelCase, e.g. "notify"
  name: string;        // display name
  fromEmail: string;   // smtp_user
  envVarName: string;  // e.g. "MAIL_KEY_NOTIFY"
  apiKeyValue: string; // actual API key (goes in .env)
  templates: ExportTemplate[];
}

export interface ExportConfig {
  apps: ExportApp[];
  serviceUrl: string;
  serviceUrlVarName: string;
}

export interface GeneratedFile {
  filename: string;
  content: string;
  syntax: string;
}

export interface LanguageGenerator {
  id: string;
  name: string;
  category: 'full-sdk' | 'request-examples';
  color: string;
  generate(config: ExportConfig): GeneratedFile[];
}
