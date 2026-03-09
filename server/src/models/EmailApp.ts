import { Schema, model, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IEmailApp extends Document<string> {
  _id: string;
  app_name: string;          // used as {{appName}} in templates
  owner_id: string;          // ref User
  app_url?: string;          // optional public URL of the app (used in unsubscribe links)
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string;
  smtp_pass: string;
  smtp_from_name: string;
  api_key: string;           // generated UUID — used for X-API-KEY auth
  llm_enabled: boolean;      // whether AI features are enabled for this app
  llm_min_role: 'owner' | 'editor' | 'viewer';  // minimum member role to use AI
  created_at: Date;
  updated_at: Date;
}

const EmailAppSchema = new Schema<IEmailApp>(
  {
    _id: { type: String, default: uuidv4 },
    app_name: { type: String, required: true, trim: true },
    owner_id: { type: String, required: true, ref: 'User' },
    app_url: { type: String, default: '' },
    smtp_host: { type: String, default: '' },
    smtp_port: { type: Number, default: 587 },
    smtp_secure: { type: Boolean, default: false },
    smtp_user: { type: String, default: '' },
    smtp_pass: { type: String, default: '' },
    smtp_from_name: { type: String, default: '' },
    api_key:      { type: String, required: true, unique: true, default: uuidv4 },
    llm_enabled:  { type: Boolean, default: false },
    llm_min_role: { type: String, enum: ['owner', 'editor', 'viewer'], default: 'editor' },
  },
  {
    _id: false,
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// owner_id lookup index only (api_key index is created by unique: true above)
EmailAppSchema.index({ owner_id: 1 });

export const EmailApp = model<IEmailApp>('EmailApp', EmailAppSchema);
