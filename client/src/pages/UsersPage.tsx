import { useEffect, useState } from 'react';
import { Header } from '../components/Header';
import { Badge } from '../components/Badge';
import client from '../api/client';
import type { User } from '../types';

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    client.get<User[]>('/admin/users')
      .then((r) => setUsers(r.data))
      .catch(() => setError('Failed to load users'))
      .finally(() => setLoading(false));
  }, []);

  const toggleActive = async (user: User) => {
    try {
      const res = await client.put<User>(`/admin/users/${user._id}`, { is_active: !user.is_active });
      setUsers((prev) => prev.map((u) => (u._id === user._id ? res.data : u)));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    try {
      await client.delete(`/admin/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u._id !== userId));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <>
      <Header />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl">
          <div className="mb-6">
            <h1 className="text-lg font-semibold text-gray-900">Users</h1>
            <p className="text-sm text-gray-500 mt-0.5">All registered users (superadmin view).</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600 mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {users.map((user) => (
                <div key={user._id} className="flex items-center gap-4 px-5 py-3">
                  <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 flex-shrink-0">
                    {(user.name || user.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">{user.name || '—'}</div>
                    <div className="text-xs text-gray-400">{user.email}</div>
                  </div>
                  <Badge variant={user.role === 'superadmin' ? 'info' : 'neutral'}>{user.role}</Badge>
                  <Badge variant={user.is_active ? 'success' : 'error'}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleActive(user)}
                      className="text-xs text-gray-600 border border-gray-200 px-2.5 py-1 rounded-lg hover:bg-gray-50"
                    >
                      {user.is_active ? 'Deactivate' : 'Activate'}
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
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
