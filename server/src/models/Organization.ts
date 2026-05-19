import { Schema, model, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import type { LlmProvider } from './PlatformConfig';

export interface IOrgLlm {
  provider: LlmProvider;
  api_key: string;   // stored server-side only — never returned to client
  base_url: string;  // required for ollama / openai-compatible
  model: string;
  enabled: boolean;
}

export interface IOrganization extends Document<string> {
  _id: string;
  name: string;
  slug: string;
  logo_base64?: string;
  created_by: string;
  llm: IOrgLlm;
  created_at: Date;
  updated_at: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    _id:         { type: String, default: uuidv4 },
    name:        { type: String, required: true, trim: true },
    slug:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    logo_base64: { type: String, default: '' },
    created_by:  { type: String, required: true, ref: 'User' },
    llm: {
      provider: {
        type: String,
        enum: ['openai', 'anthropic', 'gemini', 'ollama', 'openai-compatible'],
        default: 'gemini',
      },
      api_key:  { type: String, default: '' },
      base_url: { type: String, default: '' },
      model:    { type: String, default: '' },
      enabled:  { type: Boolean, default: false },
    },
  },
  {
    _id: false,
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

OrganizationSchema.index({ slug: 1 }, { unique: true });

export const Organization = model<IOrganization>('Organization', OrganizationSchema);

export function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
