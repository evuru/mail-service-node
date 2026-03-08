import { Schema, model, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type AppRole = 'owner' | 'editor' | 'viewer';

export interface IAppMember extends Document<string> {
  _id: string;
  app_id: string;    // ref EmailApp
  user_id: string;   // ref User
  role: AppRole;
  created_at: Date;
}

const AppMemberSchema = new Schema<IAppMember>(
  {
    _id: { type: String, default: uuidv4 },
    app_id: { type: String, required: true, ref: 'EmailApp' },
    user_id: { type: String, required: true, ref: 'User' },
    role: { type: String, enum: ['owner', 'editor', 'viewer'], default: 'editor' },
    created_at: { type: Date, default: Date.now },
  },
  { _id: false, timestamps: false }
);

AppMemberSchema.index({ app_id: 1, user_id: 1 }, { unique: true });
AppMemberSchema.index({ user_id: 1 });

export const AppMember = model<IAppMember>('AppMember', AppMemberSchema);
