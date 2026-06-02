import { Schema, model, Document } from 'mongoose';

export type LlmProvider = 'openai' | 'anthropic' | 'gemini' | 'ollama' | 'openai-compatible';

export interface IPlatformConfig extends Document {
  llm: {
    provider: LlmProvider;
    api_key: string;      // stored server-side only — never returned to client
    base_url: string;     // required for ollama / openai-compatible
    model: string;
    enabled: boolean;
  };
  verification: {
    require_email_verification: boolean;
    require_phone_for_non_org: boolean;
    reverification_interval_days: number;  // 0 = disabled
    last_reverify_at?: Date;
  };
}

const PlatformConfigSchema = new Schema<IPlatformConfig>(
  {
    llm: {
      provider: {
        type: String,
        enum: ['openai', 'anthropic', 'gemini', 'ollama', 'openai-compatible'],
        default: 'gemini',
      },
      api_key:  { type: String, default: '' },
      base_url: { type: String, default: '' },
      model:    { type: String, default: 'gemini-2.0-flash' },
      enabled:  { type: Boolean, default: false },
    },
    verification: {
      require_email_verification:    { type: Boolean, default: false },
      require_phone_for_non_org:     { type: Boolean, default: false },
      reverification_interval_days:  { type: Number, default: 0 },
      last_reverify_at:              { type: Date },
    },
  },
  { timestamps: false }
);

export const PlatformConfig = model<IPlatformConfig>('PlatformConfig', PlatformConfigSchema);
