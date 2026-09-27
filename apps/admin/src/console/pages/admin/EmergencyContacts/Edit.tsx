import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getEmergencyContactById,
  updateEmergencyContact,
  type EmergencyContactResponseDto,
} from "@/services/emergencyContactService";

export default function EmergencyContactEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [original, setOriginal] = useState<EmergencyContactResponseDto | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relation, setRelation] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    getEmergencyContactById(id)
      .then((c) => {
        if (!alive) return;
        if (!c) {
          setNotFound(true);
          return;
        }
        setOriginal(c);
        setName(c.name);
        setPhone(c.phone);
        setRelation(c.relation ?? "");
      })
      .catch((e: any) => alive && setError(e?.message ?? "Could not load emergency contact."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !original) return;
    setError(null);

    if (!name.trim()) return setError("Name is required.");
    if (!phone.trim()) return setError("Phone is required.");

    setSaving(true);
    try {
      const updated = await updateEmergencyContact(id, {
        name: name.trim(),
        phone: phone.trim(),
        relation: relation.trim() || null,
        rowVersion: original.rowVersion,
      });
      navigate(`/admin/resource/EmergencyContacts/${updated.id}`);
    } catch (e: any) {
      if (e?.status === 409 || e?.response?.status === 409) {
        setError("This contact was changed by another request. Please reload and try again.");
      } else {
        setError(e?.message ?? "Could not update emergency contact.");
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
          <li className="breadcrumb-item active">Edit</li>
        </ol>
      </nav>

      <h4 className="mb-3">
        <i className="fa-solid fa-pen me-2 text-primary" />
        Edit Emergency Contact
      </h4>

      {error && (
        <div className="alert alert-danger d-flex align-items-center">
          <i className="fa-solid fa-triangle-exclamation me-2" /> {error}
        </div>
      )}

      <div className="card shadow-sm">
        <div className="card-body">
          <form onSubmit={handleSubmit} className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Name *</label>
              <input
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Phone *</label>
              <input
                className="form-control"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={30}
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Relation</label>
              <input
                className="form-control"
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
                maxLength={60}
              />
            </div>

            <div className="col-12 d-flex gap-2 justify-content-end mt-2">
              <Link className="btn btn-outline-secondary" to={`/admin/resource/EmergencyContacts/${original.id}`}>
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