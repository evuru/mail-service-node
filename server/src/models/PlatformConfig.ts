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
  },
  { timestamps: false }
);

export const PlatformConfig = model<IPlatformConfig>('PlatformConfig', PlatformConfigSchema);
