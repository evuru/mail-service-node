# Mail Service SDK Generator

A pure TypeScript code-generation library that turns a structured config object into ready-to-use mail client files in 20 languages.

The generator layer is **completely framework-agnostic**. The React page in `SDKExportPage.tsx` is just a UI shell — all the real work happens in this folder and it can be extracted as-is into an npm package.

---

## Architecture

```
generators/
  types.ts          ← shared interfaces (ExportConfig, GeneratedFile, LanguageGenerator, …)
  utils.ts          ← string helpers (toCamel, toPascal, toEnvKey, generateEnv, …)
  index.ts          ← registry — imports all generators, exports `generators[]` + `generatorMap`
  typescript.ts     ← Full SDK generator
  javascript.ts     ← Full SDK generator
  python.ts         ← Full SDK generator
  php.ts            ← Full SDK generator
  go.ts             ← Full SDK generator
  ruby.ts           ← Full SDK generator
  java.ts           ← Full SDK generator
  csharp.ts         ← Full SDK generator
  kotlin.ts         ← Full SDK generator
  swift.ts          ← Full SDK generator
  shell.ts          ← Request-example generator
  http.ts           ← Request-example generator
  powershell.ts     ← Request-example generator
  r.ts              ← Request-example generator
  json-config.ts    ← Request-example generator (config-only)
  c.ts              ← Request-example generator
  cpp.ts            ← Request-example generator
  objc.ts           ← Request-example generator
  ocaml.ts          ← Request-example generator
  clojure.ts        ← Request-example generator
```

### Data flow

```
App data (EmailApp, Template, PayloadSchema)
           │
           ▼
      buildExportConfig()          ← in SDKExportPage.tsx
           │
           ▼  ExportConfig
      generator.generate(config)   ← one call, pure function
           │
           ▼  GeneratedFile[]
      JSZip / download             ← browser or Node.js
```

Everything from `buildExportConfig()` downward has zero React dependency.

---

## Core types

### `ExportConfig` — the input

```typescript
interface ExportConfig {
  apps: ExportApp[];           // selected apps, in display order
  serviceUrl: string;          // e.g. "https://mail.yourapp.com"
  serviceUrlVarName: string;   // e.g. "MAIL_SERVICE_URL"
}

interface ExportApp {
  key: string;         // camelCase identifier, e.g. "notify"
  name: string;        // display name, e.g. "Notify App"
  fromEmail: string;   // smtp_user — used as the "from" address in comments
  envVarName: string;  // e.g. "MAIL_KEY_NOTIFY" — what goes in .env
  apiKeyValue: string; // the actual API key value — written into .env
  templates: ExportTemplate[];
}

interface ExportTemplate {
  camelName: string;            // camelCase key in config, e.g. "passwordReset"
  slug: string;                 // the real template slug, e.g. "password-reset"
  name: string;                 // human label, e.g. "Password Reset"
  appKey: string;               // which app sends it — must match an ExportApp.key
  schema: SchemaField[] | null; // null → generic data param; array → typed helper
}

interface SchemaField {
  key: string;          // snake_case field name, e.g. "user_name"
  type: FieldType;      // 'string' | 'number' | 'boolean' | 'array' | 'object'
  required: boolean;
  description: string;
  example: string;
}
```

### `GeneratedFile` — the output

```typescript
interface GeneratedFile {
  filename: string;  // e.g. "mail.service.ts"
  content: string;   // the full file content as a string
  syntax: string;    // hint for syntax highlighting, e.g. "typescript"
}
```

### `LanguageGenerator` — the contract every generator implements

```typescript
interface LanguageGenerator {
  id: string;                               // unique key, e.g. "typescript"
  name: string;                             // display label, e.g. "TypeScript"
  category: 'full-sdk' | 'request-examples';
  color: string;                            // hex, for the language card
  generate(config: ExportConfig): GeneratedFile[];
}
```

`generate()` is a **pure function** — no side effects, no async, no globals. Given the same config it always returns the same files.

---

## Generator categories

| Category | Produces | Languages |
|---|---|---|
| `full-sdk` | `config` + `service` + `.env` | TypeScript, JavaScript, Python, PHP, Go, Ruby, Java, C#, Kotlin, Swift |
| `request-examples` | example requests + `.env` | Shell, HTTP, PowerShell, R, JSON, C, C++, Objective-C, OCaml, Clojure |

**Full-SDK generators** produce a config file (app & template map), a service class (with typed per-template helpers when `schema` is provided), and an `.env` file.

**Request-example generators** produce a set of ready-to-run HTTP calls (one per template) and an `.env` file. No service class — these are for languages where shipping a full library isn't practical.

---

## Typed helpers (PayloadSchema integration)

When `ExportTemplate.schema` is non-null, full-SDK generators emit a typed helper method for that template instead of a generic one.

| Language | Typed form |
|---|---|
| TypeScript | `data: { user_name: string; email?: string }` inline object type |
| JavaScript | `@param {string} data.user_name` JSDoc |
| Python | `user_name: str, email: str = None` keyword args |
| PHP | `string $userName, string $email` params + docblock |
| Go | dedicated `WelcomeData` struct |
| Ruby | `user_name:, email: nil` keyword args |
| Java | explicit `String userName, String email` params |
| C# | explicit typed params |
| Kotlin | explicit typed params with nullable optionals |
| Swift | explicit typed params with optional `?` |

If `schema` is `null`, every generator falls back to a generic `data: Record<string, any>` / `dict` / `array` parameter.

---

## Adding a new language

1. Create `generators/<lang>.ts` and export a `LanguageGenerator`:

```typescript
import type { ExportConfig, GeneratedFile, LanguageGenerator } from './types';
import { generateEnv } from './utils';

export const dartGenerator: LanguageGenerator = {
  id: 'dart',
  name: 'Dart',
  category: 'full-sdk',   // or 'request-examples'
  color: '#0175C2',
  generate(config: ExportConfig): GeneratedFile[] {
    return [
      { filename: 'mail_config.dart', content: genConfig(config), syntax: 'dart' },
      { filename: 'mail_service.dart', content: genService(config), syntax: 'dart' },
      { filename: '.env',              content: generateEnv(config), syntax: 'shell' },
    ];
  },
};
```

2. Add it to `generators/index.ts`:

```typescript
import { dartGenerator } from './dart';

export const generators = [
  // ...existing
  dartGenerator,
];
```

That's it — the page picks it up automatically from the registry.

---

## Path to npm package

The generators are already structured as a library. These are the exact steps to ship.

### What to extract (the package)

Everything in this folder (`generators/`) is the package. No React, no browser, no axios — pure string-in, string-out.

```
mail-service-sdk-gen/      ← new package repo (or monorepo workspace)
  src/
    index.ts               ← re-export generators, generatorMap, types
    types.ts               ← (copy as-is)
    utils.ts               ← (copy as-is)
    typescript.ts          ← (copy as-is)
    javascript.ts          ← … all 20 generators
    …
  package.json
  tsconfig.json
  README.md
```

### `package.json` for the package

```json
{
  "name": "@mail-service/sdk-gen",
  "version": "1.0.0",
  "description": "Generate mail service SDK clients for 20+ languages",
  "main": "dist/index.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.esm.js",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.3.0"
  }
}
```

Use `tsup` (zero-config bundler) — no webpack/rollup config needed.

### Public API the package would expose

```typescript
import { generators, generatorMap } from '@mail-service/sdk-gen';
import type { ExportConfig, GeneratedFile, LanguageGenerator } from '@mail-service/sdk-gen';

// List all generators
generators.forEach(g => console.log(g.id, g.name, g.category));

// Generate files for a specific language
const config: ExportConfig = { ... };
const files: GeneratedFile[] = generatorMap['typescript'].generate(config);

// files[0].filename  → "mail.config.ts"
// files[0].content   → full file string
// files[0].syntax    → "typescript"
```

### What stays in the app (not in the package)

| Thing | Stays in app | Why |
|---|---|---|
| `SDKExportPage.tsx` | ✅ | React UI, browser-only |
| `buildExportConfig()` | ✅ | Reads from Zustand stores |
| JSZip / download | ✅ | Browser API |
| Fetching templates per-app | ✅ | Needs axios + auth token |

### What moves to the package

| Thing | Moves | Notes |
|---|---|---|
| `generators/types.ts` | ✅ | Copy as-is |
| `generators/utils.ts` | ✅ | Copy as-is |
| `generators/index.ts` | ✅ | Remove React-world imports if any (there are none) |
| All 20 generator files | ✅ | Copy as-is |

### Zip in Node.js (CLI usage)

The `jszip` dependency stays in the app since it's browser-oriented. In the npm package / CLI context, use `adm-zip` or Node's built-in `zlib` + `tar` stream instead:

```typescript
// cli usage (Node.js)
import { generatorMap } from '@mail-service/sdk-gen';
import AdmZip from 'adm-zip';

const files = generatorMap['typescript'].generate(config);
const zip = new AdmZip();
files.forEach(f => zip.addFile(f.filename, Buffer.from(f.content)));
zip.writeZip('./mail-sdk-typescript.zip');
```

---

## Design decisions to preserve

- **`generate()` is always synchronous and pure.** No async, no I/O, no env reads inside generators. All data is passed in via `ExportConfig`. This makes generators trivially testable and usable in any environment.

- **`.env` is always the last file.** Generators use `generateEnv(config)` from `utils.ts` — all env files are identical in format. If you add a generator, call `generateEnv` and put it last.

- **`camelName` on `ExportTemplate` is the config key, not the slug.** `slug` is the raw API slug; `camelName` is what appears as the key in the generated config object. `buildExportConfig()` in the page derives this via `toCamel(slug.replace(/-/g, ' '))`. If the slug-to-camel mapping ever needs to change, that's the only place to fix it.

- **`schema: null` means generic, `schema: []` means typed-but-empty.** Generators treat both as "no typed helper", but `null` specifically means "no schema linked". Keep this distinction if you add generators.
