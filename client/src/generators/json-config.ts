import type { ExportConfig, GeneratedFile, LanguageGenerator } from './types';
import { generateEnv } from './utils';

export const jsonConfigGenerator: LanguageGenerator = {
  id: 'json',
  name: 'JSON',
  category: 'request-examples',
  color: '#F5A623',
  generate(config: ExportConfig): GeneratedFile[] {
    const output = {
      apps: Object.fromEntries(
        config.apps.map((a) => [a.key, { fromEmail: a.fromEmail, keyEnv: a.envVarName }]),
      ),
      templates: Object.fromEntries(
        config.apps.flatMap((a) =>
          a.templates.map((t) => [
            t.camelName,
            {
              app: a.key,
              slug: t.slug,
              ...(t.schema
                ? {
                    payload: Object.fromEntries(
                      t.schema.map((f) => [f.key, { type: f.type, required: f.required, description: f.description, example: f.example }]),
                    ),
                  }
                : {}),
            },
          ]),
        ),
      ),
    };

    return [
      { filename: 'mail_config.json', content: JSON.stringify(output, null, 2), syntax: 'json' },
      { filename: '.env', content: generateEnv(config), syntax: 'shell' },
    ];
  },
};
