import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getEmergencyContactById,
  deleteEmergencyContact,
  type EmergencyContactResponseDto,
} from "@/services/emergencyContactService";

export default function EmergencyContactDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<EmergencyContactResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    getEmergencyContactById(id)
      .then((c) => {
        if (!alive) return;
        if (!c) setNotFound(true);
        else setItem(c);
      })
      .catch((e: any) => alive && setError(e?.message ?? "Could not load emergency contact."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  async function handleDelete() {
    if (!id || !item) return;
    if (!window.confirm(`Delete emergency contact "${item.name}"?`)) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteEmergencyContact(id);
      navigate("/admin/resource/EmergencyContacts");
    } catch (e: any) {
      setError(e?.message ?? "Could not delete emergency contact.");
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
        <div className="alert alert-warning">Emergency contact not found.</div>
        <Link className="btn btn-outline-secondary" to="/admin/resource/EmergencyContacts">
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
            <Link to="/admin/resource/EmergencyContacts">Emergency Contacts</Link>
          </li>
          <li className="breadcrumb-item active">Details</li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-start flex-wrap mb-3 gap-2">
        <h4 className="mb-0">
          <i className="fa-solid fa-address-book me-2 text-primary" />
          {item.name}
        </h4>
        <div className="d-flex gap-2">
          <Link className="btn btn-outline-primary" to={`/admin/resource/EmergencyContacts/${item.id}/edit`}>
            <i className="fa-solid fa-pen me-2" /> Edit
          </Link>
          <button className="btn btn-outline-danger" disabled={deleting} onClick={handleDelete}>
            <i className={`fa-solid ${deleting ? "fa-spinner fa-spin" : "fa-trash"} me-2`} />
            Delete
          </button>
          <Link className="btn btn-outline-secondary" to="/admin/resource/EmergencyContacts">
            Back
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row g-3">
        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">Contact Info</div>
            <div className="card-body">
              <dl className="row mb-0">
                <dt className="col-5 text-muted">Name</dt>
                <dd className="col-7 text-end">{item.name}</dd>

                <dt className="col-5 text-muted">Phone</dt>
                <dd className="col-7 text-end">{item.phone}</dd>

                <dt className="col-5 text-muted">Relation</dt>
                <dd className="col-7 text-end">{item.relation ?? "—"}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white fw-semibold">Meta</div>
            <div className="card-body">
              <dl className="row mb-0">
                <dt className="col-5 text-muted">Customer Profile ID</dt>
                <dd className="col-7 text-end text-truncate" title={item.customerProfileId}>
                  {item.customerProfileId}
                </dd>

                <dt className="col-5 text-muted">Created</dt>
                <dd className="col-7 text-end">{new Date(item.createdAtUtc).toLocaleString()}</dd>

                <dt className="col-5 text-muted">Last Updated</dt>
                <dd className="col-7 text-end">
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