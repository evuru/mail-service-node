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
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        Loading logs...
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-gray-400">
        <MailOpen className="w-8 h-8 mb-2" />
        <p className="text-sm">No logs found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-3 px-4 font-medium text-gray-500 whitespace-nowrap">Sent At</th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">Recipient</th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">Template</th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">Error</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {logs.map((log) => (
            <tr key={log._id} className="hover:bg-gray-50 transition-colors">
              <td className="py-3 px-4 text-gray-500 whitespace-nowrap font-mono text-xs">
                {format(new Date(log.sent_at), 'MMM d, HH:mm:ss')}
              </td>
              <td className="py-3 px-4 text-gray-900 max-w-[180px] truncate">{log.recipient}</td>
              <td className="py-3 px-4">
                <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                  {log.template_slug}
                </code>
              </td>
              <td className="py-3 px-4">
                <Badge variant={log.status === 'success' ? 'success' : 'error'}>
                  {log.status}
                </Badge>
              </td>
              <td className="py-3 px-4 text-xs text-red-500 max-w-[200px] truncate">
                {log.error_message || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
