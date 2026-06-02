import { Schema, model, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type FieldType = 'string' | 'number' | 'boolean' | 'array' | 'object';

export interface ISchemaField {
  key: string;
  type: FieldType;
  required: boolean;
  example: string;
  description: string;
}

export interface IPayloadSchema extends Document<string> {
  _id: string;
  name: string;
  description: string;
  is_system: boolean;
  fields: ISchemaField[];
  active_version: number;  // 0 = no versions yet; ≥1 = current active version number
  created_at: Date;
  updated_at: Date;
}

export const SchemaFieldSchema = new Schema<ISchemaField>(
  {
    key: { type: String, required: true, trim: true },
    type: { type: String, enum: ['string', 'number', 'boolean', 'array', 'object'], default: 'string' },
    required: { type: Boolean, default: false },
    example: { type: String, default: '' },
    description: { type: String, default: '' },
  },
  { _id: false }
);

const PayloadSchemaSchema = new Schema<IPayloadSchema>(
  {
    _id: { type: String, default: uuidv4 },
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: '' },
    is_system: { type: Boolean, default: false },
    fields: { type: [SchemaFieldSchema], default: [] },
    active_version: { type: Number, default: 0 },
  },
  {
    _id: false,
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

export const PayloadSchema = model<IPayloadSchema>('PayloadSchema', PayloadSchemaSchema);
