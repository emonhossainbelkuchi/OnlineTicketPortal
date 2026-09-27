import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getStaffAttendanceById,
  updateStaffAttendance,
  type StaffAttendanceResponseDto,
  type AttendanceStatus,
} from "@/services/staffAttendanceService";

export default function StaffAttendanceEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [original, setOriginal] = useState<StaffAttendanceResponseDto | null>(null);
  const [attendanceDate, setAttendanceDate] = useState("");
  const [status, setStatus] = useState<AttendanceStatus>("Present");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    getStaffAttendanceById(id)
      .then((a) => {
        if (!alive) return;
        if (!a) {
          setNotFound(true);
          return;
        }
        setOriginal(a);
        setAttendanceDate(a.attendanceDate);
        setStatus(a.status);
        setRemarks(a.remarks ?? "");
      })
      .catch((e: any) => alive && setError(e?.message ?? "Could not load attendance record."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !original) return;
    setError(null);

    setSaving(true);
    try {
      const updated = await updateStaffAttendance(id, {
        attendanceDate,
        status,
        remarks: remarks.trim() || null,
        rowVersion: original.rowVersion,
      });
      navigate(`/admin/resource/StaffAttendances/${updated.id}`);
    } catch (e: any) {
      if (e?.status === 409 || e?.response?.status === 409) {
        setError("This record was changed by another request. Please reload and try again.");
      } else {
        setError(e?.message ?? "Could not update attendance record.");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center text-muted">
        <i className="fa-solid fa-spinner fa-spin me-2" /> Loading...
      </div>
    );
  }

  if (notFound || !original) {
    return (
      <div className="container-fluid py-3">
        <div className="alert alert-warning">Attendance record not found.</div>
        <Link className="btn btn-outline-secondary" to="/admin/resource/StaffAttendances">
          Back to list
        </Link>
      </div>
    );
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
          <li className="breadcrumb-item active">Edit</li>
        </ol>
      </nav>

      <h4 className="mb-3">
        <i className="fa-solid fa-pen me-2 text-primary" />
        Edit Attendance Record
      </h4>

      {error && (
        <div className="alert alert-danger d-flex align-items-center">
          <i className="fa-solid fa-triangle-exclamation me-2" /> {error}
        </div>
      )}

      <div className="alert alert-secondary py-2">
        <i className="fa-solid fa-info-circle me-2" />
        Staff Profile can't be reassigned here — a different employee's record is a new record.
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <form onSubmit={handleSubmit} className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Staff Profile ID</label>
              <input className="form-control" value={original.staffProfileId} disabled />
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
              <Link className="btn btn-outline-secondary" to={`/admin/resource/StaffAttendances/${original.id}`}>
                Cancel
              </Link>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                <i className={`fa-solid ${saving ? "fa-spinner fa-spin" : "fa-check"} me-2`} />
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}