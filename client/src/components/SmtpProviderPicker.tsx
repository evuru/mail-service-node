import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import client from '../api/client';
import type { SmtpProvider } from '../types';

interface Props {
  onSelect: (provider: SmtpProvider) => void;
}

export function SmtpProviderPicker({ onSelect }: Props) {
  const [providers, setProviders] = useState<SmtpProvider[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    client.get<SmtpProvider[]>('/smtp-providers').then((r) => setProviders(r.data)).catch(() => {});
  }, []);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="btn-secondary flex items-center gap-1.5"
      >
        <span>Provider presets</span>
        <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
      </button>

      {open && (
        <>
          <div className="absolute z-20 top-full mt-1 left-0 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-modal min-w-[220px] py-1">
            {providers.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => { onSelect(p); setOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--surface-raised)] transition-colors"
              >
                <div className="font-medium text-[var(--text-primary)]">{p.name}</div>
                <div className="text-xs text-[var(--text-muted)]">{p.host} : {p.port}</div>
              </button>
            ))}
          </div>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
        </>
      )}
    </div>
  );
}
