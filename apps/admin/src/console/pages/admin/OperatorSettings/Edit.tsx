import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import operatorSettingService from "@/services/operatorSettingService";
import { useOperatorSetting, useBusOperatorOptions } from "@/hooks/useOperatorSettings";

export default function OperatorSettingEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { item: original, loading, notFound, error: loadError } = useOperatorSetting(id, { live: false });
  const { operators, loading: loadingOperators } = useBusOperatorOptions();

  const [busOperatorId, setBusOperatorId] = useState("");
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!original) return;
    setBusOperatorId(original.busOperatorId);
    setKey(original.key);
    setValue(original.value);
    setDescription(original.description ?? "");
  }, [original]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !original) return;
    setError(null);

    if (!busOperatorId) return setError("Bus Operator is required.");
    if (!key.trim()) return setError("Key is required.");
    if (!value.trim()) return setError("Value is required.");

    setSaving(true);
    try {
      const updated = await operatorSettingService.update(id, {
        busOperatorId,
        key: key.trim(),
        value: value.trim(),
        description: description.trim() || null,
        rowVersion: original.rowVersion,
      });
      navigate(`/admin/resource/OperatorSettings/${updated.id}`);
    } catch (e: any) {
      if (e?.response?.status === 409) {
        setError("This setting was changed by another request. Please reload and try again.");
      } else {
        setError(e?.response?.data?.message ?? e?.message ?? "Could not update setting.");
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
        <div className="alert alert-warning">{loadError ?? "Operator setting not found."}</div>
        <Link className="btn btn-outline-secondary" to="/admin/resource/OperatorSettings">Back to list</Link>
      </div>
    );
  }

  return (
    <div className="container-fluid py-3">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb mb-2">
          <li className="breadcrumb-item"><Link to="/admin">Admin</Link></li>
          <li className="breadcrumb-item"><Link to="/admin/resource/OperatorSettings">Operator Settings</Link></li>
          <li className="breadcrumb-item active">Edit</li>
        </ol>
      </nav>

      <h4 className="mb-3">
        <i className="fa-solid fa-pen me-2 text-primary" />
        Edit Operator Setting
      </h4>

      {error && (
        <div className="alert alert-danger d-flex align-items-center">
          <i className="fa-solid fa-triangle-exclamation me-2" /> {error}
        </div>
      )}

      <div className="alert alert-secondary py-2">
        <i className="fa-solid fa-shield-halved me-2" />
        Admin-only — changing Key/Operator here changes which caller reads this row.
      </div>

      <div className="card shadow-sm">
        <div className="card-body">
          <form onSubmit={handleSubmit} className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Bus Operator *</label>
              <select
                className="form-select"
                value={busOperatorId}
                onChange={(e) => setBusOperatorId(e.target.value)}
                disabled={loadingOperators}
                required
              >
                <option value="">{loadingOperators ? "Loading..." : "Select operator..."}</option>
                {operators.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>

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

            <div className="col-12">
              <label className="form-label">Value *</label>
              <textarea
                className="form-control font-monospace"
                rows={4}
                maxLength={1000}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
              />
            </div>

            <div className="col-12">
              <label className="form-label">Description</label>
              <input
                className="form-control"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={250}
              />
            </div>

            <div className="col-12 d-flex gap-2 justify-content-end mt-2">
              <Link className="btn btn-outline-secondary" to={`/admin/resource/OperatorSettings/${original.id}`}>Cancel</Link>
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
