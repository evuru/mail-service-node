import { Schema, model, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface ITemplate extends Document<string> {
  _id: string;
  slug: string;
  name: string;
  subject: string;
  body_html: string;
  sender_name: string;
  use_layout: boolean;
  is_layout: boolean;
  layout_slug?: string | null;
  app_id: string | null;       // null = global template (all apps can use it)
  is_global: boolean;          // true = visible to all apps even if app_id is set
  payload_schema_id?: string;
  created_at: Date;
  updated_at: Date;
}

const TemplateSchema = new Schema<ITemplate>(
  {
    _id: { type: String, default: uuidv4 },
    slug: { type: String, required: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    subject: { type: String, required: true },
    body_html: { type: String, required: true },
    sender_name: {
      type: String,
      default: function () {
        return process.env.SMTP_FROM_NAME || 'Mail Service';
      },
    },
    use_layout: { type: Boolean, default: true },
    is_layout: { type: Boolean, default: false },
    layout_slug: { type: String, default: null },
    app_id: { type: String, ref: 'EmailApp', default: null },
    is_global: { type: Boolean, default: false },
    payload_schema_id: { type: String, ref: 'PayloadSchema', default: null },
  },
  {
    _id: false,
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Slug is unique per app (null app_id = global namespace)
TemplateSchema.index({ slug: 1, app_id: 1 }, { unique: true });
TemplateSchema.index({ app_id: 1 });
TemplateSchema.index({ payload_schema_id: 1 });

export const Template = model<ITemplate>('Template', TemplateSchema);
