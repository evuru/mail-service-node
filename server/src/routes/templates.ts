import { Router, Request, Response } from 'express';
import { requireApiKey, optionalAuth } from '../middleware/auth';
import { Template } from '../models/Template';
import { TemplateVersion } from '../models/TemplateVersion';
import { PayloadSchema } from '../models/PayloadSchema';
import { getPlanLimitsForOwner } from '../services/planLimits';

export const templatesRouter = Router();

templatesRouter.use(requireApiKey, optionalAuth);

function appFilter(req: Request) {
  return { $or: [{ app_id: req.emailApp!._id }, { app_id: null }] };
}

async function withSchema(template: object) {
  const doc = template as Record<string, unknown>;
  let payload_schema = null;
  if (doc.payload_schema_id) {
    payload_schema = await PayloadSchema.findById(doc.payload_schema_id).lean();
  }
  return { ...doc, payload_schema };
}

async function nextVersion(templateId: string): Promise<number> {
  const last = await TemplateVersion.findOne({ template_id: templateId }).sort({ version: -1 }).lean();
  return (last?.version ?? 0) + 1;
}

// ─── List / Get ───────────────────────────────────────────────────────────────

templatesRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const templates = await Template.find(appFilter(req)).sort({ created_at: -1 });
    res.json(templates);
  } catch {
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

templatesRouter.get('/:slug', async (req: Request, res: Response): Promise<void> => {
  try {
    const template =
      await Template.findOne({ slug: req.params.slug, app_id: req.emailApp!._id }).lean() ??
      await Template.findOne({ slug: req.params.slug, app_id: null }).lean();

    if (!template) { res.status(404).json({ error: 'Template not found' }); return; }
    res.json(await withSchema(template));
  } catch {
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// ─── Version history routes ───────────────────────────────────────────────────

// GET /:slug/versions — list all versions (meta only, no html)
templatesRouter.get('/:slug/versions', async (req: Request, res: Response): Promise<void> => {
  try {
    const template =
      await Template.findOne({ slug: req.params.slug, app_id: req.emailApp!._id }).lean() ??
      await Template.findOne({ slug: req.params.slug, app_id: null }).lean();

    if (!template) { res.status(404).json({ error: 'Template not found' }); return; }

    const versions = await TemplateVersion.find({ template_id: template._id })
      .sort({ version: -1 })
      .select('_id version author_id note created_at')
      .lean();

    res.json({ active_version: template.active_version, versions });
  } catch {
    res.status(500).json({ error: 'Failed to fetch versions' });
  }
});

// GET /:slug/versions/:v — full content of a specific version
templatesRouter.get('/:slug/versions/:v', async (req: Request, res: Response): Promise<void> => {
  try {
    const template =
      await Template.findOne({ slug: req.params.slug, app_id: req.emailApp!._id }).lean() ??
      await Template.findOne({ slug: req.params.slug, app_id: null }).lean();

    if (!template) { res.status(404).json({ error: 'Template not found' }); return; }

    const v = Number(req.params.v);
    if (!Number.isInteger(v) || v < 1) { res.status(400).json({ error: 'Invalid version number' }); return; }

    const version = await TemplateVersion.findOne({ template_id: template._id, version: v }).lean();
    if (!version) { res.status(404).json({ error: 'Version not found' }); return; }

    res.json({ ...version, is_active: template.active_version === v });
  } catch {
    res.status(500).json({ error: 'Failed to fetch version' });
  }
});

// POST /:slug/versions — explicitly commit the current working draft as a new version
templatesRouter.post('/:slug/versions', async (req: Request, res: Response): Promise<void> => {
  try {
    const template = await Template.findOne({ slug: req.params.slug, app_id: req.emailApp!._id });
    if (!template) { res.status(404).json({ error: 'Template not found or not editable' }); return; }

    // Enforce plan limit
    const limits = await getPlanLimitsForOwner(req.emailApp!.owner_id);
    if (limits.max_versions_per_template !== -1 && limits.max_versions_per_template !== 0) {
      const count = await TemplateVersion.countDocuments({ template_id: template._id });
      if (count >= limits.max_versions_per_template) {
        res.status(403).json({
          error: `Version limit reached (${limits.max_versions_per_template} per template). Upgrade your plan or delete older versions.`,
        });
        return;
      }
    }
    if (limits.max_versions_per_template === 0) {
      res.status(403).json({ error: 'Versioning is not available on your current plan.' });
      return;
    }

    const note = (req.body?.note as string | undefined) ?? '';
    const newVNum = await nextVersion(template._id);

    const version = await TemplateVersion.create({
      template_id: template._id,
      version: newVNum,
      html: template.body_html,
      subject: template.subject,
      author_id: req.user?._id ?? null,
      note,
    });

    // First commit ever → auto-activate
    if (template.active_version === 0) {
      template.active_version = newVNum;
      await template.save();
    }

    res.status(201).json({ version, active_version: template.active_version });
  } catch {
    res.status(500).json({ error: 'Failed to commit version' });
  }
});

// PUT /:slug/versions/:v — update a version's html/subject in place
templatesRouter.put('/:slug/versions/:v', async (req: Request, res: Response): Promise<void> => {
  try {
    const template = await Template.findOne({ slug: req.params.slug, app_id: req.emailApp!._id });
    if (!template) { res.status(404).json({ error: 'Template not found or not editable' }); return; }

    const v = Number(req.params.v);
    if (!Number.isInteger(v) || v < 1) { res.status(400).json({ error: 'Invalid version number' }); return; }

    const { html, subject, note } = req.body as { html?: string; subject?: string; note?: string };
    const update: Record<string, unknown> = {};
    if (html !== undefined) update.html = html;
    if (subject !== undefined) update.subject = subject;
    if (note !== undefined) update.note = note;

    const version = await TemplateVersion.findOneAndUpdate(
      { template_id: template._id, version: v },
      { $set: update },
      { new: true }
    );
    if (!version) { res.status(404).json({ error: 'Version not found' }); return; }

    // If this is the active version, keep Template.body_html in sync
    if (template.active_version === v) {
      if (html !== undefined) template.body_html = html;
      if (subject !== undefined) template.subject = subject;
      await template.save();
    }

    res.json(version);
  } catch {
    res.status(500).json({ error: 'Failed to update version' });
  }
});

// DELETE /:slug/versions/:v — delete a version (blocked if it's the active version)
templatesRouter.delete('/:slug/versions/:v', async (req: Request, res: Response): Promise<void> => {
  try {
    const template = await Template.findOne({ slug: req.params.slug, app_id: req.emailApp!._id });
    if (!template) { res.status(404).json({ error: 'Template not found or not editable' }); return; }

    const v = Number(req.params.v);
    if (!Number.isInteger(v) || v < 1) { res.status(400).json({ error: 'Invalid version number' }); return; }

    if (template.active_version === v) {
      res.status(409).json({ error: 'Cannot delete the active version. Activate another version first.' });
      return;
    }

    const deleted = await TemplateVersion.findOneAndDelete({ template_id: template._id, version: v });
    if (!deleted) { res.status(404).json({ error: 'Version not found' }); return; }

    res.json({ message: `Version ${v} deleted` });
  } catch {
    res.status(500).json({ error: 'Failed to delete version' });
  }
});

// PUT /:slug/activate/:v — promote a version to active
templatesRouter.put('/:slug/activate/:v', async (req: Request, res: Response): Promise<void> => {
  try {
    const template = await Template.findOne({ slug: req.params.slug, app_id: req.emailApp!._id });
    if (!template) { res.status(404).json({ error: 'Template not found or not editable' }); return; }

    const v = Number(req.params.v);
    if (!Number.isInteger(v) || v < 1) { res.status(400).json({ error: 'Invalid version number' }); return; }

    const version = await TemplateVersion.findOne({ template_id: template._id, version: v }).lean();
    if (!version) { res.status(404).json({ error: 'Version not found' }); return; }

    template.active_version = v;
    // Keep body_html in sync with active version so the send pipeline fallback is correct
    template.body_html = version.html;
    template.subject = version.subject;
    await template.save();

    res.json({ message: `Version ${v} is now active`, active_version: v });
  } catch {
    res.status(500).json({ error: 'Failed to activate version' });
  }
});

// POST /:slug/restore/:v — clone an old version as a new version
templatesRouter.post('/:slug/restore/:v', async (req: Request, res: Response): Promise<void> => {
  try {
    const template = await Template.findOne({ slug: req.params.slug, app_id: req.emailApp!._id });
    if (!template) { res.status(404).json({ error: 'Template not found or not editable' }); return; }

    const v = Number(req.params.v);
    if (!Number.isInteger(v) || v < 1) { res.status(400).json({ error: 'Invalid version number' }); return; }

    const source = await TemplateVersion.findOne({ template_id: template._id, version: v }).lean();
    if (!source) { res.status(404).json({ error: 'Source version not found' }); return; }

    // Check plan limit before creating
    const limits = await getPlanLimitsForOwner(req.emailApp!.owner_id);
    if (limits.max_versions_per_template !== -1 && limits.max_versions_per_template !== 0) {
      const count = await TemplateVersion.countDocuments({ template_id: template._id });
      if (count >= limits.max_versions_per_template) {
        res.status(403).json({
          error: `Version limit reached (${limits.max_versions_per_template}). Delete older versions first.`,
        });
        return;
      }
    }

    const newVNum = await nextVersion(template._id);
    const note = (req.body?.note as string) || `Restored from v${v}`;

    const newVersion = await TemplateVersion.create({
      template_id: template._id,
      version: newVNum,
      html: source.html,
      subject: source.subject,
      author_id: req.user?._id ?? null,
      note,
    });

    // Load restored content into the working draft
    template.body_html = source.html;
    template.subject = source.subject;
    await template.save();

    res.status(201).json({ message: `Restored v${v} as v${newVNum}`, version: newVersion });
  } catch {
    res.status(500).json({ error: 'Failed to restore version' });
  }
});

// ─── CRUD ─────────────────────────────────────────────────────────────────────

// POST — create a new template (no automatic version; user commits explicitly)
templatesRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  const { slug, name, subject, body_html, sender_name, use_layout, is_layout, layout_slug, payload_schema_id } = req.body;
  if (!slug || !name || !subject || !body_html) {
    res.status(400).json({ error: 'slug, name, subject, and body_html are required' });
    return;
  }
  try {
    const template = await Template.create({
      slug, name, subject, body_html, sender_name,
      use_layout, is_layout,
      layout_slug: layout_slug || null,
      app_id: req.emailApp!._id,
      is_global: false,
      payload_schema_id: payload_schema_id || null,
      active_version: 0,
    });
    res.status(201).json(template);
  } catch (err: unknown) {
    const e = err as { code?: number };
    if (e.code === 11000) { res.status(409).json({ error: 'A template with this slug already exists in this app' }); return; }
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// PUT — update working draft (metadata + body_html/subject). No version created.
templatesRouter.put('/:slug', async (req: Request, res: Response): Promise<void> => {
  const { name, subject, body_html, sender_name, use_layout, is_layout, layout_slug, payload_schema_id } = req.body;
  try {
    const template = await Template.findOne({ slug: req.params.slug, app_id: req.emailApp!._id });
    if (!template) { res.status(404).json({ error: 'Template not found or not editable' }); return; }

    if (name !== undefined) template.name = name;
    if (sender_name !== undefined) template.sender_name = sender_name;
    if (use_layout !== undefined) template.use_layout = use_layout;
    if (is_layout !== undefined) template.is_layout = is_layout;
    if ('layout_slug' in req.body) template.layout_slug = layout_slug ?? null;
    if ('payload_schema_id' in req.body) template.payload_schema_id = payload_schema_id ?? null;
    if (body_html !== undefined) template.body_html = body_html;
    if (subject !== undefined) template.subject = subject;

    await template.save();
    const saved = template.toObject();
    res.json(await withSchema(saved));
  } catch {
    res.status(500).json({ error: 'Failed to save template' });
  }
});

// DELETE — remove template and all its versions
templatesRouter.delete('/:slug', async (req: Request, res: Response): Promise<void> => {
  try {
    const template = await Template.findOne({ slug: req.params.slug, app_id: req.emailApp!._id });
    if (!template) { res.status(404).json({ error: 'Template not found or not deletable' }); return; }
    if (template.is_system) { res.status(403).json({ error: 'System templates cannot be deleted' }); return; }
    await TemplateVersion.deleteMany({ template_id: template._id });
    await template.deleteOne();
    res.json({ message: 'Template deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete template' });
  }
});
