import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createStaffAttendance } from "@/services/staffAttendanceService";
import type { AttendanceStatus } from "@/services/staffAttendanceService";

export default function StaffAttendanceCreate() {
  const navigate = useNavigate();
  const [staffProfileId, setStaffProfileId] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<AttendanceStatus>("Present");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!staffProfileId.trim()) return setError("Staff Profile ID is required.");

    setSaving(true);
    try {
      const created = await createStaffAttendance({
        staffProfileId: staffProfileId.trim(),
        attendanceDate,
        status,
        remarks: remarks.trim() || null,
      });
      navigate(`/admin/resource/StaffAttendances/${created.id}`);
    } catch (e: any) {
      setError(e?.message ?? "Could not create attendance record.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container-fluid py-3">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb mb-2">
          <li className="breadcrumb-item">
            <Link to="/admin">Admin</Link>
          </li>
          <li className="breadcrumb-item">
            <Link to="/admin/resource/StaffAttendances">Staff Attendances</Link>
          </li>
          <li className="breadcrumb-item active">New</li>
        </ol>
      </nav>

      <h4 className="mb-3">
        <i className="fa-solid fa-calendar-check me-2 text-primary" />
        New Attendance Record
      </h4>

      {error && (
        <div className="alert alert-danger d-flex align-items-center">
          <i className="fa-solid fa-triangle-exclamation me-2" /> {error}
        </div>
      )}

      <div className="alert alert-secondary py-2">
        <i className="fa-solid fa-info-circle me-2" />
        Staff Profile must belong to your own operator scope — verified server-side.
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <form onSubmit={handleSubmit} className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Staff Profile ID *</label>
              <input
                className="form-control"
                value={staffProfileId}
                onChange={(e) => setStaffProfileId(e.target.value)}
                placeholder="GUID"
                required
              />
            </div>

            <div className="col-md-3">
              <label className="form-label">Date *</label>
              <input
                type="date"
                className="form-control"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                required
              />
            </div>

            <div className="col-md-3">
              <label className="form-label">Status *</label>
              <select
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
              >
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="OnLeave">On Leave</option>
                <option value="HalfDay">Half Day</option>
              </select>
            </div>

            <div className="col-12">
              <label className="form-label">Remarks</label>
              <textarea
                className="form-control"
                rows={2}
                maxLength={250}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>

            <div className="col-12 d-flex gap-2 justify-content-end mt-2">
              <Link className="btn btn-outline-secondary" to="/admin/resource/StaffAttendances">
                Cancel
              </Link>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                <i className={`fa-solid ${saving ? "fa-spinner fa-spin" : "fa-check"} me-2`} />
                Create Record
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}