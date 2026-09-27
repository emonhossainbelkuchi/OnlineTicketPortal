import { useState } from "react"
import toast from "react-hot-toast"
import { api, ApiError } from "@/lib/api"

// Maps 1:1 to AdminController: POST /api/admin/staff (CreateStaffAccountDto) and
// POST /api/admin/users/{userId}/roles (AssignRoleDto). No invented endpoints.
const ROLES = ["Admin", "Staff", "Operator", "Customer"]
const STAFF_JOB_ROLES = ["SuperAdmin","Admin","Manager","Operator","CounterStaff","BusOwner","Driver","Supervisor","Helper","Finance"]

export default function AdminUsersPage() {
  const [staffForm, setStaffForm] = useState({ fullName: "", userName: "", email: "", password: "", role: "Staff", busOperatorId: "", employeeCode: "", jobRole: "CounterStaff" })
  const [staffSubmitting, setStaffSubmitting] = useState(false)

  const [roleForm, setRoleForm] = useState({ userId: "", role: "Staff" })
  const [roleSubmitting, setRoleSubmitting] = useState(false)

  function setStaff(k: string, v: string) { setStaffForm((s) => ({ ...s, [k]: v })) }

  async function submitStaff(e: React.FormEvent) {
    e.preventDefault()
    setStaffSubmitting(true)
    try {
      await api.post("/api/admin/staff", {
        ...staffForm,
        busOperatorId: staffForm.busOperatorId || null,
      })
      toast.success("Staff account created")
      setStaffForm({ fullName: "", userName: "", email: "", password: "", role: "Staff", busOperatorId: "", employeeCode: "", jobRole: "CounterStaff" })
    } catch (err) {
      toast.error((err as ApiError).message)
    } finally {
      setStaffSubmitting(false)
    }
  }

  async function submitRole(e: React.FormEvent) {
    e.preventDefault()
    setRoleSubmitting(true)
    try {
      await api.post(`/api/admin/users/${roleForm.userId}/roles`, { role: roleForm.role })
      toast.success("Role assigned")
    } catch (err) {
      toast.error((err as ApiError).message)
    } finally {
      setRoleSubmitting(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="card p-5">
        <h2 className="text-lg font-semibold text-gray-900">Create Staff / Operator Account</h2>
        <p className="mt-1 text-sm text-gray-500">POST /api/admin/staff</p>
        <form onSubmit={submitStaff} className="mt-4 space-y-3">
          <div><label className="label">Full name</label><input className="input" required value={staffForm.fullName} onChange={(e) => setStaff("fullName", e.target.value)} /></div>
          <div><label className="label">Username</label><input className="input" required value={staffForm.userName} onChange={(e) => setStaff("userName", e.target.value)} /></div>
          <div><label className="label">Email</label><input type="email" className="input" required value={staffForm.email} onChange={(e) => setStaff("email", e.target.value)} /></div>
          <div><label className="label">Password</label><input type="password" className="input" required value={staffForm.password} onChange={(e) => setStaff("password", e.target.value)} /></div>
          <div><label className="label">Login Role</label>
            <select className="input" value={staffForm.role} onChange={(e) => setStaff("role", e.target.value)}>
              {ROLES.filter(r => r !== "Customer").map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div><label className="label">Bus Operator Id (optional — leave blank for platform staff)</label><input className="input" value={staffForm.busOperatorId} onChange={(e) => setStaff("busOperatorId", e.target.value)} /></div>
          <div><label className="label">Employee Code</label><input className="input" required value={staffForm.employeeCode} onChange={(e) => setStaff("employeeCode", e.target.value)} /></div>
          <div><label className="label">Job Role</label>
            <select className="input" value={staffForm.jobRole} onChange={(e) => setStaff("jobRole", e.target.value)}>
              {STAFF_JOB_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <button className="btn-primary" disabled={staffSubmitting}>{staffSubmitting ? "Creating..." : "Create account"}</button>
        </form>
      </div>

      <div className="card p-5">
        <h2 className="text-lg font-semibold text-gray-900">Assign / Change Role</h2>
        <p className="mt-1 text-sm text-gray-500">POST /api/admin/users/{"{userId}"}/roles</p>
        <form onSubmit={submitRole} className="mt-4 space-y-3">
          <div><label className="label">User Id</label><input className="input" required value={roleForm.userId} onChange={(e) => setRoleForm(s => ({...s, userId: e.target.value}))} /></div>
          <div><label className="label">Role</label>
            <select className="input" value={roleForm.role} onChange={(e) => setRoleForm(s => ({...s, role: e.target.value}))}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <button className="btn-primary" disabled={roleSubmitting}>{roleSubmitting ? "Assigning..." : "Assign role"}</button>
        </form>
        <p className="mt-3 text-xs text-gray-400">Note: the API single-role vs multi-role behavior is enforced server-side — this form only calls the endpoint with the role you choose.</p>
      </div>
    </div>
  )
}
