import { useEffect, useState, useCallback } from 'react';
import client from '../api/client';
import { Header } from '../components/Header';
import { LogsTable } from '../components/LogsTable';
import type { LogsResponse } from '../types';

type StatusFilter = 'all' | 'success' | 'failed';

export function LogsPage() {
  const [data, setData] = useState<LogsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [slugFilter, setSlugFilter] = useState('');

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (slugFilter.trim()) params.set('template_slug', slugFilter.trim());
      const { data: res } = await client.get<LogsResponse>(`/logs?${params}`);
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, slugFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const actions = (
    <button
      onClick={fetchLogs}
      className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
    >
      Refresh
    </button>
  );

  return (
    <>
      <Header actions={actions} />
      <main className="flex-1 overflow-y-auto p-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(['all', 'success', 'failed'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-3 py-1 text-sm rounded-md font-medium transition-colors ${
                  statusFilter === s ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <input
            value={slugFilter}
            onChange={(e) => { setSlugFilter(e.target.value); setPage(1); }}
            placeholder="Filter by template slug..."
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
          />
          {data && (
            <span className="text-sm text-gray-500 ml-auto">
              {data.total} total result{data.total !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200">
          <LogsTable logs={data?.logs ?? []} isLoading={isLoading} />

          {/* Pagination */}
          {data && data.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {data.page} of {data.pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                disabled={page === data.pages}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
