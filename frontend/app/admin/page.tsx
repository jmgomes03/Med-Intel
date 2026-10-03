"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

type User = {
  id: number;
  username: string;
  full_name: string;
  role: "staff" | "admin";
  is_active: boolean;
  created_at: string;
};

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"staff" | "admin">("staff");

  const [message, setMessage] = useState("");

  async function loadUsers() {
    try {
      setError("");

      const data = await apiFetch("/admin/users");
      setUsers(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load users."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function createUser(event: React.FormEvent) {
    event.preventDefault();

    try {
      setError("");
      setMessage("");

      await apiFetch("/admin/users", {
        method: "POST",
        body: JSON.stringify({
          username,
          full_name: fullName,
          password,
          role,
        }),
      });

      setUsername("");
      setFullName("");
      setPassword("");
      setRole("staff");

      setMessage("User created successfully.");

      await loadUsers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create user."
      );
    }
  }

  async function toggleUser(user: User) {
    try {
      setError("");
      setMessage("");

      await apiFetch(`/admin/users/${user.username}`, {
        method: "PATCH",
        body: JSON.stringify({
          is_active: !user.is_active,
        }),
      });

      await loadUsers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update user."
      );
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        Loading administration...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-sm font-medium uppercase tracking-wider text-blue-400">
            Administration
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            System Administration
          </h1>

          <p className="mt-2 text-slate-400">
            Manage Med-Intel users and operational access.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 rounded-xl border border-emerald-900 bg-emerald-950/30 p-4 text-emerald-300">
            {message}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
          {/* Create user */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">
              Create User
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Add a staff or administrator account.
            </p>

            <form
              onSubmit={createUser}
              className="mt-6 space-y-4"
            >
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Username
                </label>

                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Full Name
                </label>

                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Temporary Password
                </label>

                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Role
                </label>

                <select
                  value={role}
                  onChange={(e) =>
                    setRole(e.target.value as "staff" | "admin")
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-blue-500"
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium transition hover:bg-blue-500"
              >
                Create User
              </button>
            </form>
          </section>

          {/* Users */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold">
                User Accounts
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Review account status and access roles.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-sm text-slate-400">
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-slate-800/70"
                    >
                      <td className="px-4 py-4">
                        <div className="font-medium">
                          {user.full_name}
                        </div>

                        <div className="text-sm text-slate-500">
                          @{user.username}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs">
                          {user.role}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={
                            user.is_active
                              ? "text-emerald-400"
                              : "text-red-400"
                          }
                        >
                          {user.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <button
                          onClick={() => toggleUser(user)}
                          className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800"
                        >
                          {user.is_active
                            ? "Deactivate"
                            : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}