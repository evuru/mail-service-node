import { Router, Request, Response } from 'express';
import { requireApiKey } from '../middleware/auth';
import { PayloadSchema } from '../models/PayloadSchema';
import { Template } from '../models/Template';

export const payloadSchemasRouter = Router();

// GET all schemas (with count of templates using each)
payloadSchemasRouter.get('/', requireApiKey, async (_req: Request, res: Response): Promise<void> => {
  try {
    const schemas = await PayloadSchema.find().sort({ created_at: -1 });

    // Attach usage count per schema
    const ids = schemas.map((s) => s._id);
    const usage = await Template.aggregate([
      { $match: { payload_schema_id: { $in: ids } } },
      { $group: { _id: '$payload_schema_id', count: { $sum: 1 } } },
    ]);
    const usageMap = Object.fromEntries(usage.map((u) => [u._id, u.count]));

    const result = schemas.map((s) => ({
      ...s.toObject(),
      template_count: usageMap[s._id] ?? 0,
    }));

    res.json(result);
  } catch {
    res.status(500).json({ error: 'Failed to fetch schemas' });
  }
});

// GET single schema (with list of templates using it)
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

// POST create
payloadSchemasRouter.post('/', requireApiKey, async (req: Request, res: Response): Promise<void> => {
  const { name, description, fields } = req.body;
  if (!name?.trim()) { res.status(400).json({ error: 'name is required' }); return; }
  try {
    const schema = await PayloadSchema.create({ name, description, fields: fields ?? [] });
    res.status(201).json(schema);
  } catch (err: unknown) {
    const e = err as { code?: number };
    if (e.code === 11000) { res.status(409).json({ error: 'A schema with this name already exists' }); return; }
    res.status(500).json({ error: 'Failed to create schema' });
  }
});

// PUT update
payloadSchemasRouter.put('/:id', requireApiKey, async (req: Request, res: Response): Promise<void> => {
  const { name, description, fields } = req.body;
  try {
    const schema = await PayloadSchema.findByIdAndUpdate(
      req.params.id,
      { name, description, fields },
      { new: true, runValidators: true }
    );
    if (!schema) { res.status(404).json({ error: 'Schema not found' }); return; }
    res.json(schema);
  } catch {
    res.status(500).json({ error: 'Failed to update schema' });
  }
});

// DELETE (unlinks from templates first)
payloadSchemasRouter.delete('/:id', requireApiKey, async (req: Request, res: Response): Promise<void> => {
  try {
    const schema = await PayloadSchema.findByIdAndDelete(req.params.id);
    if (!schema) { res.status(404).json({ error: 'Schema not found' }); return; }
    // Unlink from any templates that referenced it
    await Template.updateMany({ payload_schema_id: req.params.id }, { $unset: { payload_schema_id: '' } });
    res.json({ message: 'Schema deleted and unlinked from templates' });
  } catch {
    res.status(500).json({ error: 'Failed to delete schema' });
  }
});
