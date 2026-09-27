import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getStaffAttendanceById,
  deleteStaffAttendance,
  type StaffAttendanceResponseDto,
} from "@/services/staffAttendanceService";

function statusBadge(status: string) {
  const map: Record<string, string> = {
    Present: "bg-success",
    Absent: "bg-danger",
    OnLeave: "bg-warning",
    HalfDay: "bg-info",
  };
  return <span className={`badge ${map[status] ?? "bg-secondary"}`}>{status}</span>;
}

export default function StaffAttendanceDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<StaffAttendanceResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    getStaffAttendanceById(id)
      .then((a) => {
        if (!alive) return;
        if (!a) setNotFound(true);
        else setItem(a);
      })
      .catch((e: any) => alive && setError(e?.message ?? "Could not load attendance record."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  async function handleDelete() {
    if (!id) return;
    if (!window.confirm("Delete this attendance record?")) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteStaffAttendance(id);
      navigate("/admin/resource/StaffAttendances");
    } catch (e: any) {
      setError(e?.message ?? "Could not delete attendance record.");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="container-fluid py-5 text-center text-muted">
        <i className="fa-solid fa-spinner fa-spin me-2" /> Loading...
      </div>
    );
  }

  if (notFound || !item) {
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
          <li className="breadcrumb-item active">Details</li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-start flex-wrap mb-3 gap-2">
        <h4 className="mb-0">
          <i className="fa-solid fa-calendar-check me-2 text-primary" />
          Attendance — {item.attendanceDate}
        </h4>
        <div className="d-flex gap-2">
          <Link className="btn btn-outline-primary" to={`/admin/resource/StaffAttendances/${item.id}/edit`}>
            <i className="fa-solid fa-pen me-2" /> Edit
          </Link>
          <button className="btn btn-outline-danger" disabled={deleting} onClick={handleDelete}>
            <i className={`fa-solid ${deleting ? "fa-spinner fa-spin" : "fa-trash"} me-2`} />
            Delete
          </button>
          <Link className="btn btn-outline-secondary" to="/admin/resource/StaffAttendances">
            Back
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3">
        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">Overview</div>
            <div className="card-body">
              <dl className="row mb-0">
                <dt className="col-5 text-muted">Staff Profile ID</dt>
                <dd className="col-7 text-end text-truncate" title={item.staffProfileId}>
                  {item.staffProfileId}
                </dd>

                <dt className="col-5 text-muted">Date</dt>
                <dd className="col-7 text-end">{item.attendanceDate}</dd>

                <dt className="col-5 text-muted">Status</dt>
                <dd className="col-7 text-end">{statusBadge(item.status)}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">Remarks &amp; Meta</div>
            <div className="card-body">
              <dl className="row mb-0">
                <dt className="col-12 text-muted">Remarks</dt>
                <dd className="col-12">{item.remarks ?? "—"}</dd>

                <dt className="col-6 text-muted">Last Updated</dt>
                <dd className="col-6 text-end">
                  {item.updatedAtUtc ? new Date(item.updatedAtUtc).toLocaleString() : "—"}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}