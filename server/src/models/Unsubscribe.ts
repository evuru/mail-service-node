import { Schema, model, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IUnsubscribe extends Document<string> {
  _id: string;
  app_id: string;
  email: string;
  unsubscribed_at: Date;
}

const UnsubscribeSchema = new Schema<IUnsubscribe>(
  {
    _id: { type: String, default: uuidv4 },
    app_id: { type: String, required: true, ref: 'EmailApp' },
    email: { type: String, required: true, lowercase: true, trim: true },
    unsubscribed_at: { type: Date, default: Date.now },
  },
  { _id: false, timestamps: false }
);

// Unique per app + email pair — can't unsubscribe twice
UnsubscribeSchema.index({ app_id: 1, email: 1 }, { unique: true });

export const Unsubscribe = model<IUnsubscribe>('Unsubscribe', UnsubscribeSchema);
