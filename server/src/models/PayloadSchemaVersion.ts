import { Schema, model, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import type { ISchemaField } from './PayloadSchema';
import { SchemaFieldSchema } from './PayloadSchema';

export interface IPayloadSchemaVersion extends Document<string> {
  _id: string;
  schema_id: string;
  version: number;
  fields: ISchemaField[];
  author_id: string | null;
  note: string;
  created_at: Date;
}

const PayloadSchemaVersionSchema = new Schema<IPayloadSchemaVersion>(
  {
    _id:       { type: String, default: uuidv4 },
    schema_id: { type: String, ref: 'PayloadSchema', required: true, index: true },
    version:   { type: Number, required: true },
    fields:    { type: [SchemaFieldSchema], default: [] },
    author_id: { type: String, ref: 'User', default: null },
    note:      { type: String, default: '' },
  },
  {
    _id: false,
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

PayloadSchemaVersionSchema.index({ schema_id: 1, version: 1 }, { unique: true });

export const PayloadSchemaVersion = model<IPayloadSchemaVersion>('PayloadSchemaVersion', PayloadSchemaVersionSchema);
