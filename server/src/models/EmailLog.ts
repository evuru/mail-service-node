import { Schema, model, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type EmailStatus = 'success' | 'failed' | 'unsubscribed';

export interface IEmailLog extends Document<string> {
  _id: string;
  app_id: string | null;
  template_id: string | null;
  template_slug: string;
  recipient: string;
  status: EmailStatus;
  error_message?: string;
  sent_at: Date;
}

const EmailLogSchema = new Schema<IEmailLog>(
  {
    _id: { type: String, default: uuidv4 },
    app_id: { type: String, ref: 'EmailApp', default: null },
    template_id: { type: String, default: null },
    template_slug: { type: String, required: true },
    recipient: { type: String, required: true },
    status: { type: String, enum: ['success', 'failed', 'unsubscribed'], required: true },
    error_message: { type: String },
    sent_at: { type: Date, default: Date.now },
  },
  { _id: false, timestamps: false }
);

EmailLogSchema.index({ app_id: 1, sent_at: -1 });
EmailLogSchema.index({ template_id: 1 });
EmailLogSchema.index({ status: 1 });

export const EmailLog = model<IEmailLog>('EmailLog', EmailLogSchema);
