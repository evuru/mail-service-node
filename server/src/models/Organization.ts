import { Schema, model, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IOrganization extends Document<string> {
  _id: string;
  name: string;
  slug: string;
  logo_base64?: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    _id:         { type: String, default: uuidv4 },
    name:        { type: String, required: true, trim: true },
    slug:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    logo_base64: { type: String, default: '' },
    created_by:  { type: String, required: true, ref: 'User' },
  },
  {
    _id: false,
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  },
);

OrganizationSchema.index({ slug: 1 }, { unique: true });

export const Organization = model<IOrganization>('Organization', OrganizationSchema);

export function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
