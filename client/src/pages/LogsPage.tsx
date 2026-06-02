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

  return (
    <>
      <Header
        actions={
          <button onClick={fetchLogs} className="btn-secondary">
            Refresh
          </button>
        }
      />
      <main className="page-content">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="flex gap-1 bg-[var(--surface-raised)] rounded-lg p-1">
            {(['all', 'success', 'failed'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-3 py-1 text-sm rounded-md font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-[var(--surface)] shadow-sm text-[var(--text-primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <input
            value={slugFilter}
            onChange={(e) => { setSlugFilter(e.target.value); setPage(1); }}
            placeholder="Filter by template slug…"
            className="input w-56"
          />
          {data && (
            <span className="text-sm text-[var(--text-muted)] ml-auto">
              {data.total} result{data.total !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <LogsTable logs={data?.logs ?? []} isLoading={isLoading} />

          {data && data.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)]">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-ghost disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-[var(--text-secondary)]">
                Page {data.page} of {data.pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                disabled={page === data.pages}
                className="btn-ghost disabled:opacity-40"
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
