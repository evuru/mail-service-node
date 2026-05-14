import { Schema, model, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type AppRole = 'owner' | 'editor' | 'viewer';

export interface IAppMember extends Document<string> {
  _id: string;
  app_id: string;
  user_id: string;
  role: AppRole;          // legacy — kept for migration compat
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
  can_manage: boolean;    // settings, API key, member management
  created_at: Date;
}

const AppMemberSchema = new Schema<IAppMember>(
  {
    _id:        { type: String, default: uuidv4 },
    app_id:     { type: String, required: true, ref: 'EmailApp' },
    user_id:    { type: String, required: true, ref: 'User' },
    role:       { type: String, enum: ['owner', 'editor', 'viewer'], default: 'editor' },
    can_read:   { type: Boolean, default: true },
    can_write:  { type: Boolean, default: false },
    can_delete: { type: Boolean, default: false },
    can_manage: { type: Boolean, default: false },
  },
  { _id: false, timestamps: false },
);

AppMemberSchema.index({ app_id: 1, user_id: 1 }, { unique: true });
AppMemberSchema.index({ user_id: 1 });

// Helpers — always use these instead of checking .role directly

export function canRead(m: IAppMember):   boolean { return m.can_read   ?? (m.role !== undefined); }
export function canWrite(m: IAppMember):  boolean { return m.can_write  ?? (m.role === 'owner' || m.role === 'editor'); }
export function canDelete(m: IAppMember): boolean { return m.can_delete ?? (m.role === 'owner'); }
export function canManage(m: IAppMember): boolean { return m.can_manage ?? (m.role === 'owner'); }

export function permissionsFromRole(role: AppRole): Pick<IAppMember, 'can_read' | 'can_write' | 'can_delete' | 'can_manage'> {
  return {
    can_read:   true,
    can_write:  role === 'owner' || role === 'editor',
    can_delete: role === 'owner',
    can_manage: role === 'owner',
  };
}

export const AppMember = model<IAppMember>('AppMember', AppMemberSchema);
