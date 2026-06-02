import { Schema, model, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IPlatformMailer extends Document<string> {
  _id: string;
  name: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;          // stored server-side only — never returned to client
  from_name: string;
  from_email: string;
  priority: number;      // lower number = tried first
  is_active: boolean;
  created_at: Date;
}

const PlatformMailerSchema = new Schema<IPlatformMailer>(
  {
    _id:        { type: String, default: uuidv4 },
    name:       { type: String, required: true, trim: true },
    host:       { type: String, required: true, trim: true },
    port:       { type: Number, required: true, default: 587 },
    secure:     { type: Boolean, default: false },
    user:       { type: String, required: true, trim: true },
    pass:       { type: String, required: true },
    from_name:  { type: String, default: '' },
    from_email: { type: String, default: '' },
    priority:   { type: Number, default: 1 },
    is_active:  { type: Boolean, default: true },
  },
  { _id: false, timestamps: { createdAt: 'created_at', updatedAt: false } }
);

PlatformMailerSchema.index({ priority: 1 });

export const PlatformMailer = model<IPlatformMailer>('PlatformMailer', PlatformMailerSchema);
