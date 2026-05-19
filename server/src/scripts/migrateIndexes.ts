/**
 * Run once per environment to apply all recommended production indexes.
 * Usage:
 *   npm run migrate:indexes:dev
 *   npm run migrate:indexes:staging
 *   npm run migrate:indexes:prod
 */

import mongoose from 'mongoose';

const INDEXES: {
  collection: string;
  index: Record<string, 1 | -1 | 'text'>;
  options: Record<string, unknown>;
  description: string;
}[] = [
  // Templates — unique per app + slug
  {
    collection: 'templates',
    index: { app_id: 1, slug: 1 },
    options: { unique: true, name: 'app_id_1_slug_1' },
    description: 'Unique template slug per app',
  },
  // Email logs — paging by app + date (most common query)
  {
    collection: 'emaillogs',
    index: { app_id: 1, created_at: -1 },
    options: { name: 'app_id_1_created_at_-1' },
    description: 'Log paging by app (newest first)',
  },
  // Email logs — TTL: auto-delete after 90 days
  {
    collection: 'emaillogs',
    index: { created_at: 1 },
    options: { expireAfterSeconds: 7_776_000, name: 'logs_ttl_90d' },
    description: 'TTL — auto-delete logs after 90 days',
  },
  // Users — org membership queries (admin Users page filter)
  {
    collection: 'users',
    index: { org_id: 1 },
    options: { name: 'users_org_id_1' },
    description: 'User lookup by org',
  },
  // Payload schemas — unique name
  {
    collection: 'payloadschemas',
    index: { name: 1 },
    options: { unique: true, name: 'payloadschemas_name_1' },
    description: 'Unique schema name',
  },
];

async function migrateIndexes(uri: string, label: string) {
  const safeUri = uri.replace(/:\/\/[^@]+@/, '://***@');
  console.log(`\n┌─ [${label}] connecting to ${safeUri}`);

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error('No DB connection');

  for (const { collection, index, options, description } of INDEXES) {
    try {
      await db.collection(collection).createIndex(index as unknown as Parameters<typeof db.collection>[0], options);
      console.log(`│  ✅  ${collection} — ${description}`);
    } catch (err: unknown) {
      const msg = (err as Error).message ?? String(err);
      // "already exists" is not an error — index is idempotent
      if (msg.includes('already exists') || msg.includes('IndexOptionsConflict')) {
        console.log(`│  ⏭   ${collection} — already exists (${options.name})`);
      } else {
        console.log(`│  ❌  ${collection} — ${msg}`);
      }
    }
  }

  await mongoose.disconnect();
  console.log(`└─ [${label}] done\n`);
}

async function main() {
  const targets: { uri: string; label: string }[] = [];

  if (process.env.MONGODB_URI_DEV)     targets.push({ uri: process.env.MONGODB_URI_DEV,     label: 'dev'     });
  if (process.env.MONGODB_URI_STAGING) targets.push({ uri: process.env.MONGODB_URI_STAGING, label: 'staging' });
  if (process.env.MONGODB_URI_PROD)    targets.push({ uri: process.env.MONGODB_URI_PROD,    label: 'prod'    });

  if (targets.length === 0) {
    console.error('No MONGODB_URI_* env vars found. Load an .env file first.');
    process.exit(1);
  }

  for (const t of targets) {
    try {
      await migrateIndexes(t.uri, t.label);
    } catch (err) {
      console.error(`[${t.label}] Connection failed — skipping:`, (err as Error).message);
    }
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
