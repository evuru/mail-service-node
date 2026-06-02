import { Schema, model, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface ITemplateVersion extends Document<string> {
  _id: string;
  template_id: string;
  version: number;
  html: string;
  subject: string;
  author_id: string | null;
  note: string;
  created_at: Date;
}

const TemplateVersionSchema = new Schema<ITemplateVersion>(
  {
    _id:         { type: String, default: uuidv4 },
    template_id: { type: String, ref: 'Template', required: true, index: true },
    version:     { type: Number, required: true },
    html:        { type: String, required: true },
    subject:     { type: String, required: true },
    author_id:   { type: String, ref: 'User', default: null },
    note:        { type: String, default: '' },
  },
  {
    _id: false,
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

TemplateVersionSchema.index({ template_id: 1, version: 1 }, { unique: true });

export const TemplateVersion = model<ITemplateVersion>('TemplateVersion', TemplateVersionSchema);
