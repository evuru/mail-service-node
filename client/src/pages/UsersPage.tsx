import { useEffect, useState, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight, X, Shield, Building2 } from 'lucide-react';
import { Header } from '../components/Header';
import { Badge } from '../components/Badge';
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

const LIMIT = 20;

function Avatar({ user }: { user: AdminUser }) {
  if (user.profile_image_base64) {
    return (
      <img
        src={user.profile_image_base64}
        alt={user.name || user.email}
        className="w-9 h-9 rounded-full object-cover flex-shrink-0"
      />
    );
  }
  return (
    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600 flex-shrink-0">
      {(user.name || user.email).charAt(0).toUpperCase()}
    </div>
  );
}

export function UsersPage() {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'' | UserRole>('');
  const [page, setPage] = useState(1);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
        ...(search.trim() && { search: search.trim() }),
        ...(roleFilter && { role: roleFilter }),
      });
      const res = await client.get<UsersResponse>(`/admin/users?${params}`);
      setData(res.data);
    } catch {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => { void fetchUsers(); }, [fetchUsers]);

  // Debounce search: reset to page 1 on change
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(id);
  }, [searchInput]);

  const openEdit = (user: AdminUser) => {
    setEditState({
      user,
      role: user.role,
      is_active: user.is_active,
      is_org_admin: user.is_org_admin ?? false,
      new_password: '',
    });
    setEditError('');
  };

  const saveEdit = async () => {
    if (!editState) return;
    setEditLoading(true);
    setEditError('');
    try {
      const payload: Record<string, unknown> = {
        role: editState.role,
        is_active: editState.is_active,
        is_org_admin: editState.is_org_admin,
      };
      if (editState.new_password) payload.new_password = editState.new_password;
      await client.put(`/admin/users/${editState.user._id}`, payload);
      setEditState(null);
      void fetchUsers();
    } catch (err) {
      setEditError((err as Error).message);
    } finally {
      setEditLoading(false);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    try {
      await client.delete(`/admin/users/${userId}`);
      void fetchUsers();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <>
      <Header />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl">
          <div className="mb-6">
            <h1 className="text-lg font-semibold text-gray-900">Users</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {data ? `${data.total} user${data.total !== 1 ? 's' : ''} registered` : 'All registered users'}
            </p>
          </div>

          {/* Filters */}
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search name or email…"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value as '' | UserRole); setPage(1); }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All roles</option>
              <option value="superadmin">Superadmin</option>
              <option value="user">User</option>
            </select>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600 mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : data && data.users.length === 0 ? (
            <p className="text-sm text-gray-400">No users found.</p>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">User</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Organisation</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Role</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data?.users.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar user={user} />
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 truncate">{user.name || '—'}</div>
                            <div className="text-xs text-gray-400 truncate">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {user.org ? (
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span className="text-sm">{user.org.name}</span>
                            {user.is_org_admin && (
                              <span title="Org admin"><Shield className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" /></span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">No org</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={user.role === 'superadmin' ? 'info' : 'neutral'}>{user.role}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={user.is_active ? 'success' : 'error'}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => openEdit(user)}
                            className="text-xs text-gray-600 border border-gray-200 px-2.5 py-1 rounded-lg hover:bg-gray-50"
                          >
                            Edit
                          </button>
                          {user.role !== 'superadmin' && (
                            <button
                              onClick={() => deleteUser(user._id)}
                              className="text-xs text-red-600 border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-50"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {data && data.pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                Page {data.page} of {data.pages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                  disabled={page === data.pages}
                  className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Edit User Modal */}
      {editState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Edit user</h2>
              <button onClick={() => setEditState(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* User info */}
              <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
                <Avatar user={editState.user} />
                <div>
                  <div className="font-medium text-gray-900">{editState.user.name || '—'}</div>
                  <div className="text-xs text-gray-400">{editState.user.email}</div>
                  {editState.user.org && (
                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3 h-3" />
                      {editState.user.org.name}
                    </div>
                  )}
                </div>
              </div>

              {editError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">
                  {editError}
                </div>
              )}

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">System role</label>
                <select
                  value={editState.role}
                  onChange={(e) => setEditState({ ...editState, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="user">User</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              </div>

              {/* Status + org admin */}
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editState.is_active}
                    onChange={(e) => setEditState({ ...editState, is_active: e.target.checked })}
                    className="w-4 h-4 rounded accent-blue-600"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editState.is_org_admin}
                    onChange={(e) => setEditState({ ...editState, is_org_admin: e.target.checked })}
                    className="w-4 h-4 rounded accent-blue-600"
                  />
                  <span className="text-sm text-gray-700">Org admin</span>
                </label>
              </div>

              {/* New password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New password <span className="text-gray-400 font-normal">(leave blank to keep)</span>
                </label>
                <input
                  type="password"
                  value={editState.new_password}
                  onChange={(e) => setEditState({ ...editState, new_password: e.target.value })}
                  minLength={8}
                  placeholder="Min 8 characters"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
              <button
                onClick={() => setEditState(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={editLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {editLoading ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
