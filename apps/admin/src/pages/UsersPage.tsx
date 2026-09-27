import { FormEvent, useEffect, useState } from 'react';
import type {
  AdminUserListItem,
  ApiError,
  AppRole,
  AssignRoleResponse,
  BusOperator,
  CreateStaffAccountRequest,
  CreateStaffAccountResponse,
  StaffRole,
} from '@ticketportal-mono/models';
import { apiFetch } from '../lib/apiClient';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatusPill } from '../components/StatusPill';

// Matches role.model.ts's AppRole exactly — see that file for why there's no separate
// CounterStaff/FinanceStaff login role.
const ASSIGNABLE_ROLES: AppRole[] = ['Admin', 'Staff', 'Operator', 'Customer'];

// Matches enums.ts's StaffRole. This is the person's JOB, separate from the login Role above —
// see DTO/AdminDtos.cs -> CreateStaffAccountDto for the same distinction.
const JOB_ROLES: StaffRole[] = [
  'SuperAdmin',
  'Admin',
  'Manager',
  'Operator',
  'CounterStaff',
  'BusOwner',
  'Driver',
  'Supervisor',
  'Helper',
  'Finance',
];

const emptyStaffForm: CreateStaffAccountRequest = {
  fullName: '',
  userName: '',
  email: '',
  password: '',
  role: 'Staff',
  busOperatorId: null,
  employeeCode: '',
  jobRole: 'CounterStaff',
};

// Backend: AdminController -> GET /users, POST /users/{userId}/roles, POST /staff.
export function UsersPage() {
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [operators, setOperators] = useState<BusOperator[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [roleDrafts, setRoleDrafts] = useState<Record<string, AppRole>>({});
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [rowMessage, setRowMessage] = useState<{ userId: string; text: string; isError: boolean } | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [staffForm, setStaffForm] = useState<CreateStaffAccountRequest>(emptyStaffForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    setLoadError(null);
    try {
      const [userList, operatorList] = await Promise.all([
        apiFetch<AdminUserListItem[]>('admin/users'),
        apiFetch<BusOperator[]>('busoperators'),
      ]);
      setUsers(userList);
      setOperators(operatorList);
      setRoleDrafts(Object.fromEntries(userList.map((u) => [u.id, u.roles[0] ?? 'Customer'])));
    } catch (err) {
      setLoadError((err as ApiError).message ?? 'Could not load users.');
    } finally {
      setLoading(false);
    }
  }

  async function saveRole(userId: string) {
    const role = roleDrafts[userId];
    if (!role) return;
    setSavingUserId(userId);
    setRowMessage(null);
    try {
      const result = await apiFetch<AssignRoleResponse>(`admin/users/${userId}/roles`, {
        method: 'POST',
        body: { role },
      });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, roles: result.roles } : u)));
      setRowMessage({ userId, text: 'Role updated.', isError: false });
    } catch (err) {
      setRowMessage({ userId, text: (err as ApiError).message ?? 'Could not update role.', isError: true });
    } finally {
      setSavingUserId(null);
    }
  }

  async function handleCreateStaff(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    setCreateError(null);
    setCreateSuccess(null);
    try {
      const payload: CreateStaffAccountRequest = {
        ...staffForm,
        busOperatorId: staffForm.busOperatorId || null,
      };
      const result = await apiFetch<CreateStaffAccountResponse>('admin/staff', {
        method: 'POST',
        body: payload,
      });
      setCreateSuccess(`Account "${result.userName}" created with role ${result.role}.`);
      setStaffForm(emptyStaffForm);
      await loadAll();
    } catch (err) {
      setCreateError((err as ApiError).message ?? 'Could not create the account.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Users &amp; Roles</h2>
          <p className="tp-muted">
            Every login account on the platform, its current role(s), and which BusOperator its
            StaffProfile is tied to (if any).
          </p>
        </div>
        <Button onClick={() => setShowCreateForm((v) => !v)}>
          {showCreateForm ? 'Cancel' : 'Create Staff Account'}
        </Button>
      </div>

      {showCreateForm && (
        <Card className="form-card">
          <h3>Create Staff Account</h3>
          <p className="tp-muted">
            Creates the login and its StaffProfile together. Use "Customer" self-signup
            (/api/account/register) for customers — this is only for Staff, Operator, and Admin
            accounts.
          </p>
          <form onSubmit={handleCreateStaff} className="form-grid">
            <label className="field">
              Full name
              <input
                value={staffForm.fullName}
                onChange={(e) => setStaffForm({ ...staffForm, fullName: e.target.value })}
                required
              />
            </label>
            <label className="field">
              Username
              <input
                value={staffForm.userName}
                onChange={(e) => setStaffForm({ ...staffForm, userName: e.target.value })}
                required
              />
            </label>
            <label className="field">
              Email
              <input
                type="email"
                value={staffForm.email}
                onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                required
              />
            </label>
            <label className="field">
              Password
              <input
                type="password"
                value={staffForm.password}
                onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                required
              />
            </label>
            <label className="field">
              Login role
              <select
                value={staffForm.role}
                onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value as CreateStaffAccountRequest['role'] })}
              >
                <option value="Staff">Staff</option>
                <option value="Operator">Operator</option>
                <option value="Admin">Admin</option>
              </select>
            </label>
            <label className="field">
              Bus operator (optional — leave blank for platform-wide staff)
              <select
                value={staffForm.busOperatorId ?? ''}
                onChange={(e) => setStaffForm({ ...staffForm, busOperatorId: e.target.value || null })}
              >
                <option value="">— Platform-wide —</option>
                {operators.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Employee code
              <input
                value={staffForm.employeeCode}
                onChange={(e) => setStaffForm({ ...staffForm, employeeCode: e.target.value })}
                required
              />
            </label>
            <label className="field">
              Job role
              <select
                value={staffForm.jobRole}
                onChange={(e) => setStaffForm({ ...staffForm, jobRole: e.target.value as StaffRole })}
              >
                {JOB_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>

            {createError && <p className="error">{createError}</p>}
            {createSuccess && <p className="success">{createSuccess}</p>}

            <Button type="submit" disabled={creating}>
              {creating ? 'Creating…' : 'Create Account'}
            </Button>
          </form>
        </Card>
      )}

      <Card>
        {loading ? (
          <p className="tp-muted">Loading users…</p>
        ) : loadError ? (
          <p className="error">{loadError}</p>
        ) : users.length === 0 ? (
          <p className="tp-muted">No users found.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Status</th>
                <th>Operator</th>
                <th>Role</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const operatorName = user.busOperatorId
                  ? operators.find((o) => o.id === user.busOperatorId)?.name ?? user.busOperatorId
                  : '—';
                return (
                  <tr key={user.id}>
                    <td>
                      <div className="data-table__primary">{user.fullName || user.userName}</div>
                      <div className="tp-muted data-table__secondary">@{user.userName}</div>
                    </td>
                    <td>{user.email ?? '—'}</td>
                    <td>
                      <StatusPill status={user.isActive ? 'Active' : 'Cancelled'} />
                    </td>
                    <td>{operatorName}</td>
                    <td>
                      <div className="role-cell">
                        <select
                          value={roleDrafts[user.id] ?? user.roles[0] ?? 'Customer'}
                          onChange={(e) =>
                            setRoleDrafts({ ...roleDrafts, [user.id]: e.target.value as AppRole })
                          }
                        >
                          {ASSIGNABLE_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={
                            savingUserId === user.id ||
                            (roleDrafts[user.id] ?? user.roles[0]) === (user.roles[0] ?? 'Customer')
                          }
                          onClick={() => saveRole(user.id)}
                        >
                          {savingUserId === user.id ? 'Saving…' : 'Update'}
                        </Button>
                      </div>
                      {rowMessage?.userId === user.id && (
                        <div className={rowMessage.isError ? 'error' : 'success'}>{rowMessage.text}</div>
                      )}
                    </td>
                    <td className="tp-muted">{new Date(user.createdAtUtc).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
