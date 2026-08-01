import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

export default function AdminPanel() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/admin/users");
      setUsers(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load team users.");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleRole(userId, currentRole) {
    const newRole = currentRole === "admin" ? "member" : "admin";
    setUpdatingId(userId);
    setError("");
    try {
      const res = await api.put(`/admin/users/${userId}/role`, { role: newRole });
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, role: res.data.role } : u))
      );
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update role.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="admin-page">
      <div className="dashboard-header">
        <div>
          <h1>Admin Control Panel</h1>
          <div className="dashboard-sub">Manage team members, permissions, and task assignments</div>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="loading-state">Loading user directory…</div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Tasks</th>
                <th>Joined Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u._id === currentUser._id;
                return (
                  <tr key={u._id}>
                    <td style={{ fontWeight: 600 }}>
                      {u.name} {isSelf && <span style={{ color: "var(--ink-dim)", fontWeight: 400 }}>(You)</span>}
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`role-badge ${u.role}`}>{u.role}</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{u.taskCount}</td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="btn"
                        disabled={isSelf || updatingId === u._id}
                        onClick={() => handleToggleRole(u._id, u.role)}
                        style={{ fontSize: "12px", padding: "4px 10px" }}
                        title={isSelf ? "You cannot change your own role" : `Switch role to ${u.role === "admin" ? "member" : "admin"}`}
                      >
                        {updatingId === u._id
                          ? "Updating…"
                          : `Make ${u.role === "admin" ? "Member" : "Admin"}`}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
