import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createEmergencyContact } from "@/services/emergencyContactService";

export default function EmergencyContactCreate() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relation, setRelation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError("Name is required.");
    if (!phone.trim()) return setError("Phone is required.");

    setSaving(true);
    try {
      const created = await createEmergencyContact({
        name: name.trim(),
        phone: phone.trim(),
        relation: relation.trim() || null,
      });
      navigate(`/admin/resource/EmergencyContacts/${created.id}`);
    } catch (e: any) {
      setError(e?.message ?? "Could not create emergency contact.");
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
            <Link to="/admin/resource/EmergencyContacts">Emergency Contacts</Link>
          </li>
          <li className="breadcrumb-item active">New</li>
        </ol>
      </nav>

      <h4 className="mb-3">
        <i className="fa-solid fa-address-book me-2 text-primary" />
        New Emergency Contact
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
                placeholder="e.g. Father, Spouse"
                maxLength={60}
              />
            </div>

            <div className="col-12 d-flex gap-2 justify-content-end mt-2">
              <Link className="btn btn-outline-secondary" to="/admin/resource/EmergencyContacts">
                Cancel
              </Link>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                <i className={`fa-solid ${saving ? "fa-spinner fa-spin" : "fa-check"} me-2`} />
                Create Contact
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}