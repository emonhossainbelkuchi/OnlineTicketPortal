import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createSystemSetting } from "@/services/systemSettingService";

export default function SystemSettingCreate() {
  const navigate = useNavigate();
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!key.trim()) return setError("Key is required.");
    if (!value.trim()) return setError("Value is required.");

    setSaving(true);
    try {
      const created = await createSystemSetting({
        key: key.trim(),
        value: value.trim(),
        description: description.trim() || null,
      });
      navigate(`/admin/resource/SystemSettings/${created.id}`);
    } catch (e: any) {
      setError(e?.message ?? "Could not create setting.");
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
            <Link to="/admin/resource/SystemSettings">System Settings</Link>
          </li>
          <li className="breadcrumb-item active">New</li>
        </ol>
      </nav>

      <h4 className="mb-3">
        <i className="fa-solid fa-gears me-2 text-primary" />
        New System Setting
      </h4>

      {error && (
        <div className="alert alert-danger d-flex align-items-center">
          <i className="fa-solid fa-triangle-exclamation me-2" /> {error}
        </div>
      )}

      <div className="alert alert-secondary py-2">
        <i className="fa-solid fa-shield-halved me-2" />
        Admin-only — free-form platform-wide config, changes take effect wherever this key is read.
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <form onSubmit={handleSubmit} className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Key *</label>
              <input
                className="form-control font-monospace"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                maxLength={120}
                placeholder="e.g. Booking.HoldMinutes"
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label">Description</label>
              <input
                className="form-control"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={250}
              />
            </div>

            <div className="col-12">
              <label className="form-label">Value *</label>
              <textarea
                className="form-control font-monospace"
                rows={4}
                maxLength={2000}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
              />
            </div>

            <div className="col-12 d-flex gap-2 justify-content-end mt-2">
              <Link className="btn btn-outline-secondary" to="/admin/resource/SystemSettings">
                Cancel
              </Link>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                <i className={`fa-solid ${saving ? "fa-spinner fa-spin" : "fa-check"} me-2`} />
                Create Setting
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}