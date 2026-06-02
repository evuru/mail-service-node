import { Schema, model, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

export type UserRole = 'superadmin' | 'user';

export interface IUser extends Document<string> {
  _id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  is_active: boolean;
  org_id?: string;
  is_org_admin?: boolean;
  profile_image_base64?: string;
  phone?: string;
  phone_verified: boolean;
  email_verified: boolean;
  email_verified_at?: Date;
  email_verify_token?: string;
  email_verify_token_expires?: Date;
  created_at: Date;
  updated_at: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    _id:                   { type: String, default: uuidv4 },
    name:                  { type: String, required: true, trim: true },
    email:                 { type: String, required: true, unique: true, lowercase: true, trim: true },
    password_hash:         { type: String, required: true },
    role:                  { type: String, enum: ['superadmin', 'user'], default: 'user' },
    is_active:             { type: Boolean, default: true },
    org_id:                { type: String, ref: 'Organization', default: null },
    is_org_admin:          { type: Boolean, default: false },
    profile_image_base64:  { type: String, default: '' },
    phone:                 { type: String, default: '' },
    phone_verified:        { type: Boolean, default: false },
    email_verified:               { type: Boolean, default: false },
    email_verified_at:            { type: Date },
    email_verify_token:           { type: String, default: '' },
    email_verify_token_expires:   { type: Date },
  },
  {
    _id: false,
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// email index is created by unique: true above — no duplicate needed

UserSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password_hash);
};

export const User = model<IUser>('User', UserSchema);

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}
