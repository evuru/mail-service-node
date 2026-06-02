import { Router, Request, Response } from 'express';
import { requireApiKey, optionalAuth } from '../middleware/auth';
import { PayloadSchema } from '../models/PayloadSchema';
import { PayloadSchemaVersion } from '../models/PayloadSchemaVersion';
import { Template } from '../models/Template';
import { getPlanLimitsForOwner } from '../services/planLimits';

export const payloadSchemasRouter = Router();

async function nextSchemaVersion(schemaId: string): Promise<number> {
  const last = await PayloadSchemaVersion.findOne({ schema_id: schemaId }).sort({ version: -1 }).lean();
  return (last?.version ?? 0) + 1;
}

// ─── List / Get ───────────────────────────────────────────────────────────────

payloadSchemasRouter.get('/', requireApiKey, async (_req: Request, res: Response): Promise<void> => {
  try {
    const schemas = await PayloadSchema.find().sort({ created_at: -1 });

    const ids = schemas.map((s) => s._id);
    const usage = await Template.aggregate([
      { $match: { payload_schema_id: { $in: ids } } },
      { $group: { _id: '$payload_schema_id', count: { $sum: 1 } } },
    ]);
    const usageMap = Object.fromEntries(usage.map((u) => [u._id, u.count]));

    res.json(schemas.map((s) => ({ ...s.toObject(), template_count: usageMap[s._id] ?? 0 })));
  } catch {
    res.status(500).json({ error: 'Failed to fetch schemas' });
  }
});

payloadSchemasRouter.get('/:id', requireApiKey, async (req: Request, res: Response): Promise<void> => {
  try {
    const schema = await PayloadSchema.findById(req.params.id);
    if (!schema) { res.status(404).json({ error: 'Schema not found' }); return; }

    const templates = await Template.find({ payload_schema_id: req.params.id }, 'slug name');
    res.json({ ...schema.toObject(), templates });
  } catch {
    res.status(500).json({ error: 'Failed to fetch schema' });
  }
});

// ─── Version history routes ───────────────────────────────────────────────────

payloadSchemasRouter.get('/:id/versions', requireApiKey, async (req: Request, res: Response): Promise<void> => {
  try {
    const schema = await PayloadSchema.findById(req.params.id).lean();
    if (!schema) { res.status(404).json({ error: 'Schema not found' }); return; }

    const versions = await PayloadSchemaVersion.find({ schema_id: req.params.id })
      .sort({ version: -1 })
      .select('_id version author_id note created_at')
      .lean();

    res.json({ active_version: schema.active_version, versions });
  } catch {
    res.status(500).json({ error: 'Failed to fetch schema versions' });
  }
});

payloadSchemasRouter.get('/:id/versions/:v', requireApiKey, async (req: Request, res: Response): Promise<void> => {
  try {
    const schema = await PayloadSchema.findById(req.params.id).lean();
    if (!schema) { res.status(404).json({ error: 'Schema not found' }); return; }

    const v = Number(req.params.v);
    if (!Number.isInteger(v) || v < 1) { res.status(400).json({ error: 'Invalid version number' }); return; }

    const version = await PayloadSchemaVersion.findOne({ schema_id: req.params.id, version: v }).lean();
    if (!version) { res.status(404).json({ error: 'Version not found' }); return; }

    res.json({ ...version, is_active: schema.active_version === v });
  } catch {
    res.status(500).json({ error: 'Failed to fetch schema version' });
  }
});

// POST /:id/versions — explicitly commit current schema fields as a new version
payloadSchemasRouter.post('/:id/versions', requireApiKey, optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const schema = await PayloadSchema.findById(req.params.id);
    if (!schema) { res.status(404).json({ error: 'Schema not found' }); return; }

    // Enforce plan limit (reuses template version limit for schemas)
    const limits = await getPlanLimitsForOwner(req.emailApp!.owner_id);
    if (limits.max_versions_per_template === 0) {
      res.status(403).json({ error: 'Versioning is not available on your current plan.' });
      return;
    }
    if (limits.max_versions_per_template !== -1) {
      const count = await PayloadSchemaVersion.countDocuments({ schema_id: req.params.id });
      if (count >= limits.max_versions_per_template) {
        res.status(403).json({
          error: `Version limit reached (${limits.max_versions_per_template}). Upgrade your plan or delete older versions.`,
        });
        return;
      }
    }

    const note = (req.body?.note as string | undefined) ?? '';
    const newVNum = await nextSchemaVersion(req.params.id);

    const version = await PayloadSchemaVersion.create({
      schema_id: schema._id,
      version: newVNum,
      fields: schema.fields,
      author_id: req.user?._id ?? null,
      note,
    });

    if (schema.active_version === 0) {
      schema.active_version = newVNum;
      await schema.save();
    }

    res.status(201).json({ version, active_version: schema.active_version });
  } catch {
    res.status(500).json({ error: 'Failed to commit schema version' });
  }
});

// PUT /:id/versions/:v — update a schema version's fields in place
payloadSchemasRouter.put('/:id/versions/:v', requireApiKey, async (req: Request, res: Response): Promise<void> => {
  try {
    const schema = await PayloadSchema.findById(req.params.id);
    if (!schema) { res.status(404).json({ error: 'Schema not found' }); return; }

    const v = Number(req.params.v);
    if (!Number.isInteger(v) || v < 1) { res.status(400).json({ error: 'Invalid version number' }); return; }

    const { fields, note } = req.body as { fields?: unknown; note?: string };
    const update: Record<string, unknown> = {};
    if (fields !== undefined) update.fields = fields;
    if (note !== undefined) update.note = note;

    const version = await PayloadSchemaVersion.findOneAndUpdate(
      { schema_id: req.params.id, version: v },
      { $set: update },
      { new: true }
    );
    if (!version) { res.status(404).json({ error: 'Version not found' }); return; }

    // Keep schema.fields in sync if this is the active version
    if (schema.active_version === v && fields !== undefined) {
      schema.fields = fields as typeof schema.fields;
      await schema.save();
    }

    res.json(version);
  } catch {
    res.status(500).json({ error: 'Failed to update schema version' });
  }
});

// DELETE /:id/versions/:v — delete a version (blocked if active)
payloadSchemasRouter.delete('/:id/versions/:v', requireApiKey, async (req: Request, res: Response): Promise<void> => {
  try {
    const schema = await PayloadSchema.findById(req.params.id).lean();
    if (!schema) { res.status(404).json({ error: 'Schema not found' }); return; }

    const v = Number(req.params.v);
    if (!Number.isInteger(v) || v < 1) { res.status(400).json({ error: 'Invalid version number' }); return; }

    if (schema.active_version === v) {
      res.status(409).json({ error: 'Cannot delete the active version. Activate another version first.' });
      return;
    }

    const deleted = await PayloadSchemaVersion.findOneAndDelete({ schema_id: req.params.id, version: v });
    if (!deleted) { res.status(404).json({ error: 'Version not found' }); return; }

    res.json({ message: `Version ${v} deleted` });
  } catch {
    res.status(500).json({ error: 'Failed to delete schema version' });
  }
});

// PUT /:id/activate/:v
payloadSchemasRouter.put('/:id/activate/:v', requireApiKey, async (req: Request, res: Response): Promise<void> => {
  try {
    const schema = await PayloadSchema.findById(req.params.id);
    if (!schema) { res.status(404).json({ error: 'Schema not found' }); return; }

    const v = Number(req.params.v);
    if (!Number.isInteger(v) || v < 1) { res.status(400).json({ error: 'Invalid version number' }); return; }

    const version = await PayloadSchemaVersion.findOne({ schema_id: req.params.id, version: v }).lean();
    if (!version) { res.status(404).json({ error: 'Version not found' }); return; }

    schema.active_version = v;
    schema.fields = version.fields as typeof schema.fields;
    await schema.save();

    res.json({ message: `Version ${v} is now active`, active_version: v });
  } catch {
    res.status(500).json({ error: 'Failed to activate schema version' });
  }
});

// POST /:id/restore/:v
payloadSchemasRouter.post('/:id/restore/:v', requireApiKey, optionalAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const schema = await PayloadSchema.findById(req.params.id);
    if (!schema) { res.status(404).json({ error: 'Schema not found' }); return; }

    const v = Number(req.params.v);
    if (!Number.isInteger(v) || v < 1) { res.status(400).json({ error: 'Invalid version number' }); return; }

    const source = await PayloadSchemaVersion.findOne({ schema_id: req.params.id, version: v }).lean();
    if (!source) { res.status(404).json({ error: 'Source version not found' }); return; }

    const limits = await getPlanLimitsForOwner(req.emailApp!.owner_id);
    if (limits.max_versions_per_template !== -1 && limits.max_versions_per_template !== 0) {
      const count = await PayloadSchemaVersion.countDocuments({ schema_id: req.params.id });
      if (count >= limits.max_versions_per_template) {
        res.status(403).json({ error: `Version limit reached (${limits.max_versions_per_template}). Delete older versions first.` });
        return;
      }
    }

    const newVNum = await nextSchemaVersion(req.params.id);
    const newVersion = await PayloadSchemaVersion.create({
      schema_id: schema._id,
      version: newVNum,
      fields: source.fields,
      author_id: req.user?._id ?? null,
      note: (req.body?.note as string) || `Restored from v${v}`,
    });

    schema.fields = source.fields as typeof schema.fields;
    await schema.save();

    res.status(201).json({ message: `Restored v${v} as v${newVNum}`, version: newVersion });
  } catch {
    res.status(500).json({ error: 'Failed to restore schema version' });
  }
});

// ─── CRUD ─────────────────────────────────────────────────────────────────────

payloadSchemasRouter.post('/', requireApiKey, optionalAuth, async (req: Request, res: Response): Promise<void> => {
  const { name, description, fields } = req.body;
  if (!name?.trim()) { res.status(400).json({ error: 'name is required' }); return; }
  try {
    const schema = await PayloadSchema.create({ name, description, fields: fields ?? [], active_version: 0 });
    res.status(201).json(schema);
  } catch (err: unknown) {
    const e = err as { code?: number };
    if (e.code === 11000) { res.status(409).json({ error: 'A schema with this name already exists' }); return; }
    res.status(500).json({ error: 'Failed to create schema' });
  }
});

// PUT — update working draft (fields/name/description). No version created.
payloadSchemasRouter.put('/:id', requireApiKey, optionalAuth, async (req: Request, res: Response): Promise<void> => {
  const { name, description, fields } = req.body;
  try {
    const schema = await PayloadSchema.findById(req.params.id);
    if (!schema) { res.status(404).json({ error: 'Schema not found' }); return; }

    if (name !== undefined) schema.name = name;
    if (description !== undefined) schema.description = description;
    if (fields !== undefined) schema.fields = fields;

    await schema.save();
    res.json(schema);
  } catch {
    res.status(500).json({ error: 'Failed to save schema' });
  }
});

// DELETE — remove schema and all its versions
payloadSchemasRouter.delete('/:id', requireApiKey, async (req: Request, res: Response): Promise<void> => {
  try {
    const schema = await PayloadSchema.findById(req.params.id);
    if (!schema) { res.status(404).json({ error: 'Schema not found' }); return; }
    if (schema.is_system) { res.status(403).json({ error: 'System schemas cannot be deleted' }); return; }
    await schema.deleteOne();
    await PayloadSchemaVersion.deleteMany({ schema_id: req.params.id });
    await Template.updateMany({ payload_schema_id: req.params.id }, { $unset: { payload_schema_id: '' } });
    res.json({ message: 'Schema deleted and unlinked from templates' });
  } catch {
    res.status(500).json({ error: 'Failed to delete schema' });
  }
});
