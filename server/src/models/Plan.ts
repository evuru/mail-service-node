import { Schema, model, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IPlanLimits {
  max_apps: number;                   // -1 = unlimited
  max_emails_per_month: number;       // -1 = unlimited
  max_members: number;                // -1 = unlimited
  max_templates: number;              // -1 = unlimited
  max_versions_per_template: number;  // -1 = unlimited; 0 = versioning disabled
  ai_enabled: boolean;
  custom_domain: boolean;
  priority_support: boolean;
}

export interface IPlan extends Document<string> {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price_monthly: number;       // USD — 0 = free
  price_yearly: number;        // USD per month when billed yearly
  limits: IPlanLimits;
  features: string[];          // marketing bullet points
  badge?: string;              // e.g. "Most Popular"
  is_active: boolean;
  is_public: boolean;          // shown on /pricing page
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

const PlanSchema = new Schema<IPlan>(
  {
    _id:        { type: String, default: uuidv4 },
    name:       { type: String, required: true, trim: true },
    slug:       { type: String, required: true, unique: true, lowercase: true, trim: true },
    description:{ type: String, default: '' },
    price_monthly: { type: Number, required: true, default: 0 },
    price_yearly:  { type: Number, required: true, default: 0 },
    limits: {
      max_apps:                    { type: Number, default: -1 },
      max_emails_per_month:        { type: Number, default: -1 },
      max_members:                 { type: Number, default: -1 },
      max_templates:               { type: Number, default: -1 },
      max_versions_per_template:   { type: Number, default: -1 },
      ai_enabled:                  { type: Boolean, default: false },
      custom_domain:               { type: Boolean, default: false },
      priority_support:            { type: Boolean, default: false },
    },
    features:   { type: [String], default: [] },
    badge:      { type: String, default: '' },
    is_active:  { type: Boolean, default: true },
    is_public:  { type: Boolean, default: true },
    sort_order: { type: Number, default: 0 },
  },
  { _id: false, timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

PlanSchema.index({ is_public: 1, sort_order: 1 });

export const Plan = model<IPlan>('Plan', PlanSchema);
