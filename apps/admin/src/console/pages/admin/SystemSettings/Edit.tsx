import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getSystemSettingById,
  updateSystemSetting,
  type SystemSettingResponseDto,
} from "@/services/systemSettingService";

export default function SystemSettingEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [original, setOriginal] = useState<SystemSettingResponseDto | null>(null);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    getSystemSettingById(id)
      .then((s) => {
        if (!alive) return;
        if (!s) {
          setNotFound(true);
          return;
        }
        setOriginal(s);
        setKey(s.key);
        setValue(s.value);
        setDescription(s.description ?? "");
      })
      .catch((e: any) => alive && setError(e?.message ?? "Could not load setting."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !original) return;
    setError(null);

    if (!key.trim()) return setError("Key is required.");
    if (!value.trim()) return setError("Value is required.");

    setSaving(true);
    try {
      const updated = await updateSystemSetting(id, {
        key: key.trim(),
        value: value.trim(),
        description: description.trim() || null,
        rowVersion: original.rowVersion,
      });
      navigate(`/admin/resource/SystemSettings/${updated.id}`);
    } catch (e: any) {
      if (e?.status === 409 || e?.response?.status === 409) {
        setError("This setting was changed by another request. Please reload and try again.");
      } else {
        setError(e?.message ?? "Could not update setting.");
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
        <div className="alert alert-warning">System setting not found.</div>
        <Link className="btn btn-outline-secondary" to="/admin/resource/SystemSettings">
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
            <Link to="/admin/resource/SystemSettings">System Settings</Link>
          </li>
          <li className="breadcrumb-item active">Edit</li>
        </ol>
      </nav>

      <h4 className="mb-3">
        <i className="fa-solid fa-pen me-2 text-primary" />
        Edit System Setting
      </h4>

      {error && (
        <div className="alert alert-danger d-flex align-items-center">
          <i className="fa-solid fa-triangle-exclamation me-2" /> {error}
        </div>
      )}

      <div className="alert alert-secondary py-2">
        <i className="fa-solid fa-shield-halved me-2" />
        Admin-only — changing the Key here changes which callers pick this row up.
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
              <Link className="btn btn-outline-secondary" to={`/admin/resource/SystemSettings/${original.id}`}>
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