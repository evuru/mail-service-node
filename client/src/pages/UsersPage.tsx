import { useEffect, useState, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import {
  Search, ChevronLeft, ChevronRight, X,
  Shield, Building2, MoreVertical, UserCog, Trash2, UserPlus,
} from 'lucide-react';
import { Header } from '../components/Header';
import { PasswordInput } from '../components/PasswordInput';
import { useAuthStore } from '../store/authStore';
import client from '../api/client';
import type { User, UserRole } from '../types';

interface AdminUser extends User {
  org?: { name: string; slug: string } | null;
}
interface UsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  pages: number;
}
interface EditState {
  user: AdminUser;
  role: UserRole;
  is_active: boolean;
  is_org_admin: boolean;
  new_password: string;
}
interface AddState {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: UserRole;
  is_active: boolean;
}

const LIMIT = 20;
const emptyAdd = (): AddState => ({ name: '', email: '', password: '', phone: '', role: 'user', is_active: true });

// ─── Sub-components ───────────────────────────────────────────────────────────

function UserAvatar({ user, size = 'md' }: { user: AdminUser; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-10 h-10 text-base' : 'w-8 h-8 text-sm';
  if (user.profile_image_base64) {
    return <img src={user.profile_image_base64} alt={user.name || user.email} className={`${sz} rounded-full object-cover shrink-0`} />;
  }
  return (
    <div className={`${sz} rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center font-bold text-brand-600 dark:text-brand-400 shrink-0`}>
      {(user.name || user.email).charAt(0).toUpperCase()}
    </div>
  );
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button" role="switch" aria-checked={checked}
      onClick={onChange} disabled={disabled}
      className={`relative inline-flex w-10 h-[22px] rounded-full transition-colors duration-200 shrink-0 focus:outline-none
                  ${checked ? 'bg-emerald-500' : 'bg-[var(--border)]'}
                  ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`absolute top-[3px] left-[3px] w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${checked ? 'translate-x-[18px]' : 'translate-x-0'}`} />
    </button>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full border ${
      active
        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
        : 'bg-[var(--surface-raised)] text-[var(--text-muted)] border-[var(--border)]'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? 'bg-emerald-500' : 'bg-[var(--text-muted)]'}`} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function ActionMenu({ onEdit, onDelete, isSelf }: { onEdit: () => void; onDelete: () => void; isSelf: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-40 card shadow-modal z-20 py-1 animate-fade-in">
          <button onClick={() => { onEdit(); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] transition-colors">
            <UserCog className="w-3.5 h-3.5 text-[var(--text-muted)]" /> Edit details
          </button>
          {!isSelf && (
            <button onClick={() => { onDelete(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Delete user
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function FeedbackMsg({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return (
    <div className={`px-3 py-2 rounded-lg text-xs ${
      msg.ok
        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
        : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
    }`}>{msg.text}</div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function UsersPage() {
  const { user: me } = useAuthStore();

  const [data,        setData]        = useState<UsersResponse | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search,      setSearch]      = useState('');
  const [roleFilter,  setRoleFilter]  = useState<'' | UserRole>('');
  const [page,        setPage]        = useState(1);
  const [toggling,    setToggling]    = useState<string | null>(null);

  // Edit modal
  const [editState,   setEditState]   = useState<EditState | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editMsg,     setEditMsg]     = useState<{ ok: boolean; text: string } | null>(null);

  // Add modal
  const [showAdd,     setShowAdd]     = useState(false);
  const [addState,    setAddState]    = useState<AddState>(emptyAdd());
  const [addLoading,  setAddLoading]  = useState(false);
  const [addMsg,      setAddMsg]      = useState<{ ok: boolean; text: string } | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({
        page: String(page), limit: String(LIMIT),
        ...(search.trim() && { search: search.trim() }),
        ...(roleFilter && { role: roleFilter }),
      });
      const res = await client.get<UsersResponse>(`/admin/users?${params}`);
      setData(res.data);
    } catch { setError('Failed to load users'); }
    finally { setLoading(false); }
  }, [page, search, roleFilter]);

  useEffect(() => { void fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    const id = setTimeout(() => { setSearch(searchInput); setPage(1); }, 350);
    return () => clearTimeout(id);
  }, [searchInput]);

  const toggleActive = async (user: AdminUser) => {
    setToggling(user._id);
    try { await client.put(`/admin/users/${user._id}`, { is_active: !user.is_active }); void fetchUsers(); }
    catch { /* ignore */ }
    finally { setToggling(null); }
  };

  const openEdit = (user: AdminUser) => {
    setEditState({ user, role: user.role, is_active: user.is_active, is_org_admin: user.is_org_admin ?? false, new_password: '' });
    setEditMsg(null);
  };

  const saveEdit = async () => {
    if (!editState) return;
    setEditLoading(true); setEditMsg(null);
    try {
      const payload: Record<string, unknown> = {
        role: editState.role, is_active: editState.is_active, is_org_admin: editState.is_org_admin,
      };
      if (editState.new_password) payload.new_password = editState.new_password;
      await client.put(`/admin/users/${editState.user._id}`, payload);
      setEditState(null); void fetchUsers();
    } catch (err) { setEditMsg({ ok: false, text: (err as Error).message }); }
    finally { setEditLoading(false); }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    try { await client.delete(`/admin/users/${userId}`); void fetchUsers(); }
    catch (err) { setError((err as Error).message); }
  };

  const openAdd = () => { setAddState(emptyAdd()); setAddMsg(null); setShowAdd(true); };

  const saveAdd = async () => {
    const { name, email, password, phone, role, is_active } = addState;
    if (!name.trim() || !email.trim() || !password) {
      setAddMsg({ ok: false, text: 'Name, email and password are required' }); return;
    }
    setAddLoading(true); setAddMsg(null);
    try {
      await client.post('/admin/users', { name: name.trim(), email: email.trim(), password, phone: phone.trim(), role, is_active });
      setShowAdd(false); void fetchUsers();
    } catch (err) { setAddMsg({ ok: false, text: (err as Error).message }); }
    finally { setAddLoading(false); }
  };

  const safeDate = (s: string | undefined) => {
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  };

  const start = data ? (data.page - 1) * LIMIT + 1 : 0;
  const end   = data ? Math.min(data.page * LIMIT, data.total) : 0;

  return (
    <>
      <Header
        actions={
          <button onClick={openAdd} className="btn-primary">
            <UserPlus className="w-4 h-4" /> Add user
          </button>
        }
      />

      <main className="page-content">
        <div className="max-w-6xl">

          {/* ── Toolbar ─────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] pointer-events-none" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search name or email…"
                className="input pl-8 py-1.5 text-sm"
              />
            </div>

            <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--surface-raised)] border border-[var(--border)]">
              {([['', 'All'], ['superadmin', 'Superadmin'], ['user', 'User']] as ['' | UserRole, string][]).map(([val, label]) => (
                <button key={val} onClick={() => { setRoleFilter(val); setPage(1); }}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    roleFilter === val
                      ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            <div className="flex-1" />
            {data && (
              <span className="text-xs text-[var(--text-muted)]">
                {data.total === 0 ? '0 users' : `Showing ${start}–${end} of ${data.total}`}
              </span>
            )}
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* ── Loading skeletons ────────────────────────────────────── */}
          {loading && (
            <div className="card overflow-hidden">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-[var(--border)] last:border-0">
                  <div className="w-8 h-8 rounded-full bg-[var(--surface-raised)] animate-pulse shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-32 rounded bg-[var(--surface-raised)] animate-pulse" />
                    <div className="h-2.5 w-44 rounded bg-[var(--surface-raised)] animate-pulse" />
                  </div>
                  <div className="h-5 w-16 rounded-full bg-[var(--surface-raised)] animate-pulse" />
                  <div className="h-5 w-14 rounded-full bg-[var(--surface-raised)] animate-pulse" />
                  <div className="w-8 h-5 rounded-full bg-[var(--surface-raised)] animate-pulse" />
                </div>
              ))}
            </div>
          )}

          {/* ── Empty ───────────────────────────────────────────────── */}
          {!loading && data?.users.length === 0 && (
            <div className="empty-state">
              <p className="text-sm text-[var(--text-muted)]">No users found.</p>
            </div>
          )}

          {/* ── Table ───────────────────────────────────────────────── */}
          {!loading && (data?.users.length ?? 0) > 0 && (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-raised)]">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">User</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide hidden lg:table-cell">Email</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide hidden md:table-cell">Organisation</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Role</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide hidden xl:table-cell">Joined</th>
                    <th className="text-center px-4 py-2.5 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide hidden sm:table-cell">Access</th>
                    <th className="px-4 py-2.5 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {data?.users.map((user) => {
                    const isSelf   = user._id === me?._id;
                    const joinedAt = safeDate(user.created_at);
                    return (
                      <tr key={user._id} className="hover:bg-[var(--surface-raised)] transition-colors">

                        {/* User */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <UserAvatar user={user} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-[var(--text-primary)] truncate">{user.name || '—'}</span>
                                {isSelf && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 font-semibold shrink-0">You</span>
                                )}
                              </div>
                              {/* email shown inline below name on small screens */}
                              <div className="text-xs text-[var(--text-muted)] truncate lg:hidden">{user.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Email (separate column on large screens) */}
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-xs text-[var(--text-muted)] truncate block max-w-[180px]">{user.email}</span>
                        </td>

                        {/* Organisation */}
                        <td className="px-4 py-3 hidden md:table-cell">
                          {user.org ? (
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Building2 className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                              <span className="text-xs text-[var(--text-secondary)] truncate">{user.org.name}</span>
                              {user.is_org_admin && (
                                <span title="Org admin"><Shield className="w-3.5 h-3.5 text-brand-500 shrink-0" /></span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-[var(--text-muted)]">—</span>
                          )}
                        </td>

                        {/* Role */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                            user.role === 'superadmin'
                              ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                              : 'bg-[var(--surface-raised)] text-[var(--text-secondary)] border-[var(--border)]'
                          }`}>
                            {user.role === 'superadmin' ? 'Superadmin' : 'User'}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <StatusBadge active={user.is_active} />
                        </td>

                        {/* Joined */}
                        <td className="px-4 py-3 hidden xl:table-cell">
                          <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
                            {joinedAt ? format(joinedAt, 'MMM d, yyyy') : '—'}
                          </span>
                        </td>

                        {/* Access toggle */}
                        <td className="px-4 py-3 text-center hidden sm:table-cell">
                          <Toggle
                            checked={user.is_active}
                            onChange={() => toggleActive(user)}
                            disabled={isSelf || toggling === user._id}
                          />
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <ActionMenu
                            onEdit={() => openEdit(user)}
                            onDelete={() => deleteUser(user._id)}
                            isSelf={isSelf}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination footer */}
              {data && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)] bg-[var(--surface-raised)]">
                  <span className="text-xs text-[var(--text-muted)]">
                    {data.total === 0 ? 'No users' : `Showing ${start}–${end} of ${data.total} users`}
                  </span>
                  {data.pages > 1 && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                        className="btn-ghost py-1 px-2.5 text-xs gap-1 disabled:opacity-40">
                        <ChevronLeft className="w-3.5 h-3.5" /> Previous
                      </button>
                      <span className="text-xs text-[var(--text-muted)] px-2">{page} / {data.pages}</span>
                      <button onClick={() => setPage((p) => Math.min(data.pages, p + 1))} disabled={page === data.pages}
                        className="btn-ghost py-1 px-2.5 text-xs gap-1 disabled:opacity-40">
                        Next <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ── Add User modal ───────────────────────────────────────────── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="card shadow-modal w-full max-w-lg animate-slide-up">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">Add user</h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Create a new user account</p>
              </div>
              <button onClick={() => setShowAdd(false)} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-5 space-y-4">
              {addMsg && <FeedbackMsg msg={addMsg} />}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Full name <span className="text-red-500">*</span></label>
                  <input value={addState.name} onChange={(e) => setAddState({ ...addState, name: e.target.value })}
                    placeholder="Jane Smith" className="input" autoFocus />
                </div>
                <div>
                  <label className="input-label">Email address <span className="text-red-500">*</span></label>
                  <input type="email" value={addState.email} onChange={(e) => setAddState({ ...addState, email: e.target.value })}
                    placeholder="jane@example.com" className="input" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Password <span className="text-red-500">*</span></label>
                  <PasswordInput value={addState.password} onChange={(e) => setAddState({ ...addState, password: e.target.value })}
                    placeholder="Min. 8 characters" autoComplete="new-password" />
                </div>
                <div>
                  <label className="input-label">Phone <span className="font-normal text-[var(--text-muted)]">(optional)</span></label>
                  <input type="tel" value={addState.phone} onChange={(e) => setAddState({ ...addState, phone: e.target.value })}
                    placeholder="+1 555 000 0000" className="input" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Role</label>
                  <select value={addState.role} onChange={(e) => setAddState({ ...addState, role: e.target.value as UserRole })}
                    className="input">
                    <option value="user">User</option>
                    <option value="superadmin">Superadmin</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Access</label>
                  <div className="flex items-center gap-2.5 h-[38px]">
                    <Toggle
                      checked={addState.is_active}
                      onChange={() => setAddState({ ...addState, is_active: !addState.is_active })}
                    />
                    <span className="text-sm text-[var(--text-secondary)]">
                      {addState.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-[var(--border)] bg-[var(--surface-raised)] rounded-b-2xl">
              <button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
              <button onClick={saveAdd} disabled={addLoading} className="btn-primary disabled:opacity-50">
                {addLoading ? 'Creating…' : 'Create user'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit User modal ──────────────────────────────────────────── */}
      {editState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="card shadow-modal w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Edit user</h2>
              <button onClick={() => setEditState(null)} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Identity chip */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-raised)]">
                <UserAvatar user={editState.user} size="lg" />
                <div className="min-w-0">
                  <div className="font-medium text-[var(--text-primary)] truncate">{editState.user.name || '—'}</div>
                  <div className="text-xs text-[var(--text-muted)] truncate">{editState.user.email}</div>
                  {editState.user.org && (
                    <div className="text-xs text-[var(--text-secondary)] flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3 h-3" /> {editState.user.org.name}
                    </div>
                  )}
                </div>
              </div>

              {editMsg && <FeedbackMsg msg={editMsg} />}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">System role</label>
                  <select value={editState.role}
                    onChange={(e) => setEditState({ ...editState, role: e.target.value as UserRole })}
                    className="input">
                    <option value="user">User</option>
                    <option value="superadmin">Superadmin</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Access</label>
                  <div className="flex items-center gap-2.5 h-[38px]">
                    <Toggle
                      checked={editState.is_active}
                      onChange={() => setEditState({ ...editState, is_active: !editState.is_active })}
                    />
                    <span className="text-sm text-[var(--text-secondary)]">
                      {editState.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {editState.user.org && (
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={editState.is_org_admin}
                    onChange={(e) => setEditState({ ...editState, is_org_admin: e.target.checked })}
                    className="w-4 h-4 rounded accent-brand-600" />
                  <span className="text-sm text-[var(--text-secondary)]">Organisation admin</span>
                </label>
              )}

              <div>
                <label className="input-label">
                  New password
                  <span className="ml-1 font-normal text-[var(--text-muted)]">(leave blank to keep)</span>
                </label>
                <PasswordInput value={editState.new_password}
                  onChange={(e) => setEditState({ ...editState, new_password: e.target.value })}
                  minLength={8} placeholder="Min. 8 characters" />
              </div>
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-[var(--border)] bg-[var(--surface-raised)] rounded-b-2xl">
              <button onClick={() => setEditState(null)} className="btn-secondary">Cancel</button>
              <button onClick={saveEdit} disabled={editLoading} className="btn-primary disabled:opacity-50">
                {editLoading ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
