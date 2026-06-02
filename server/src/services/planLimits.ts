import { Organization } from '../models/Organization';
import { Plan } from '../models/Plan';
import type { IPlanLimits } from '../models/Plan';

const DEFAULT_LIMITS: IPlanLimits = {
  max_apps: -1,
  max_emails_per_month: -1,
  max_members: -1,
  max_templates: -1,
  max_versions_per_template: -1,
  ai_enabled: false,
  custom_domain: false,
  priority_support: false,
};

/** Resolves the effective plan limits for the owner of an email app. */
export async function getPlanLimitsForOwner(ownerId: string): Promise<IPlanLimits> {
  const org = await Organization.findOne({ created_by: ownerId }).lean();
  if (!org?.plan_id) return DEFAULT_LIMITS;
  const plan = await Plan.findById(org.plan_id).lean();
  if (!plan) return DEFAULT_LIMITS;
  return { ...DEFAULT_LIMITS, ...plan.limits };
}
