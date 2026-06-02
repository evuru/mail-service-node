import { format } from 'date-fns';
import { MailOpen } from 'lucide-react';
import type { EmailLog } from '../types';
import { Badge } from './Badge';

interface LogsTableProps {
  logs: EmailLog[];
  isLoading?: boolean;
}

export function LogsTable({ logs, isLoading }: LogsTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-[var(--text-muted)] text-sm">
        Loading logs…
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-[var(--text-muted)]">
        <MailOpen className="w-8 h-8 mb-2 opacity-40" />
        <p className="text-sm">No logs found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="text-left py-3 px-4 font-medium text-[var(--text-muted)] whitespace-nowrap">Sent At</th>
            <th className="text-left py-3 px-4 font-medium text-[var(--text-muted)]">Recipient</th>
            <th className="text-left py-3 px-4 font-medium text-[var(--text-muted)]">Template</th>
            <th className="text-left py-3 px-4 font-medium text-[var(--text-muted)]">Ver.</th>
            <th className="text-left py-3 px-4 font-medium text-[var(--text-muted)]">Status</th>
            <th className="text-left py-3 px-4 font-medium text-[var(--text-muted)]">Error</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {logs.map((log) => (
            <tr key={log._id} className="hover:bg-[var(--surface-raised)] transition-colors">
              <td className="py-3 px-4 text-[var(--text-muted)] whitespace-nowrap font-mono text-xs">
                {format(new Date(log.sent_at), 'MMM d, HH:mm:ss')}
              </td>
              <td className="py-3 px-4 text-[var(--text-primary)] max-w-[180px] truncate">{log.recipient}</td>
              <td className="py-3 px-4">
                <code className="text-xs bg-[var(--surface-raised)] px-1.5 py-0.5 rounded-md text-[var(--text-secondary)] font-mono">
                  {log.template_slug}
                </code>
              </td>
              <td className="py-3 px-4">
                {log.template_version != null ? (
                  <span className="text-xs font-mono text-[var(--text-muted)] bg-[var(--surface-raised)] px-1.5 py-0.5 rounded-md">
                    v{log.template_version}
                  </span>
                ) : (
                  <span className="text-xs text-[var(--text-muted)]">—</span>
                )}
              </td>
              <td className="py-3 px-4">
                <Badge variant={log.status === 'success' ? 'success' : 'error'}>
                  {log.status}
                </Badge>
              </td>
              <td className="py-3 px-4 text-xs text-red-500 dark:text-red-400 max-w-[200px] truncate">
                {log.error_message || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
