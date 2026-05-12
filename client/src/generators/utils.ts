import type { ExportApp, ExportConfig, SchemaField } from './types';

export function toCamel(str: string): string {
  return str
    .replace(/[-_\s]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^[A-Z]/, (c) => c.toLowerCase());
}

export function toPascal(str: string): string {
  const c = toCamel(str);
  return c.charAt(0).toUpperCase() + c.slice(1);
}

export function toEnvKey(str: string): string {
  return str.replace(/[-\s]+/g, '_').toUpperCase().replace(/[^A-Z0-9_]/g, '');
}

export function toSnake(str: string): string {
  return str.replace(/[-\s]+/g, '_').toLowerCase().replace(/[^a-z0-9_]/g, '');
}

export function toKebab(str: string): string {
  return str.replace(/[_\s]+/g, '-').toLowerCase().replace(/[^a-z0-9-]/g, '');
}

export function generateEnv(config: ExportConfig): string {
  const lines = [
    `${config.serviceUrlVarName}=${config.serviceUrl || 'https://mail.yourdomain.com'}`,
  ];
  for (const app of config.apps) {
    lines.push(`${app.envVarName}=${app.apiKeyValue}`);
  }
  return lines.join('\n') + '\n';
}

export function schemaComment(fields: SchemaField[]): string {
  return fields
    .map((f) => `  ${f.key} (${f.type}${f.required ? '' : ', optional'})${f.description ? ' — ' + f.description : ''}`)
    .join('\n');
}

export function allTemplates(config: ExportConfig): ExportApp['templates'] {
  return config.apps.flatMap((a) => a.templates);
}
