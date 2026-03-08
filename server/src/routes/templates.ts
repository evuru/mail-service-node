import { Router, Request, Response } from 'express';
import { requireApiKey } from '../middleware/auth';
import { Template } from '../models/Template';
import { PayloadSchema } from '../models/PayloadSchema';

export const templatesRouter = Router();

// All template routes are app-scoped via API key
templatesRouter.use(requireApiKey);

// Visible templates: app-specific + global (app_id: null)
function appFilter(req: Request) {
  return { $or: [{ app_id: req.emailApp!._id }, { app_id: null }] };
}

// GET all
templatesRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const templates = await Template.find(appFilter(req)).sort({ created_at: -1 });
    res.json(templates);
  } catch {
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// GET single — populates full payload_schema inline
templatesRouter.get('/:slug', async (req: Request, res: Response): Promise<void> => {
  try {
    const template =
      await Template.findOne({ slug: req.params.slug, app_id: req.emailApp!._id }).lean() ??
      await Template.findOne({ slug: req.params.slug, app_id: null }).lean();

    if (!template) { res.status(404).json({ error: 'Template not found' }); return; }

    let payload_schema = null;
    if (template.payload_schema_id) {
      payload_schema = await PayloadSchema.findById(template.payload_schema_id).lean();
    }
    res.json({ ...template, payload_schema });
  } catch {
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// POST create — scoped to current app
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
    });
    res.status(201).json(template);
  } catch (err: unknown) {
    const e = err as { code?: number };
    if (e.code === 11000) { res.status(409).json({ error: 'A template with this slug already exists in this app' }); return; }
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// PUT update — only app-specific templates are editable
templatesRouter.put('/:slug', async (req: Request, res: Response): Promise<void> => {
  const { name, subject, body_html, sender_name, use_layout, is_layout, layout_slug, payload_schema_id } = req.body;
  try {
    const template = await Template.findOneAndUpdate(
      { slug: req.params.slug, app_id: req.emailApp!._id },
      {
        name, subject, body_html, sender_name, use_layout, is_layout,
        layout_slug: layout_slug ?? null,
        payload_schema_id: payload_schema_id ?? null,
      },
      { new: true, runValidators: true }
    ).lean();
    if (!template) { res.status(404).json({ error: 'Template not found or not editable' }); return; }

    let payload_schema = null;
    if (template.payload_schema_id) {
      payload_schema = await PayloadSchema.findById(template.payload_schema_id).lean();
    }
    res.json({ ...template, payload_schema });
  } catch {
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// DELETE — only app-specific templates
templatesRouter.delete('/:slug', async (req: Request, res: Response): Promise<void> => {
  try {
    const template = await Template.findOneAndDelete({ slug: req.params.slug, app_id: req.emailApp!._id });
    if (!template) { res.status(404).json({ error: 'Template not found or not deletable' }); return; }
    res.json({ message: 'Template deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete template' });
  }
});
