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
  fields: ISchemaField[];
  created_at: Date;
  updated_at: Date;
}

const SchemaFieldSchema = new Schema<ISchemaField>(
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
    fields: { type: [SchemaFieldSchema], default: [] },
  },
  {
    _id: false,
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

export const PayloadSchema = model<IPayloadSchema>('PayloadSchema', PayloadSchemaSchema);
