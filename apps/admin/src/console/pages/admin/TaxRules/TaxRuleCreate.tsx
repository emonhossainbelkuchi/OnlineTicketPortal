import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { taxRuleService } from "@/services/taxRuleService";

export default function TaxRuleCreate() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [percentage, setPercentage] = useState<number>(0);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});
    try {
      await taxRuleService.create({ name: name.trim(), percentage, isActive });
      navigate("/admin/resource/TaxRules");
    } catch (e: any) {
      if (e?.status === 400 && e?.raw?.errors) {
        setFieldErrors(e.raw.errors);
      } else {
        setError(e?.message ?? "Could not create tax rule.");
      }
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
            <Link to="/admin/resource/TaxRules">Tax Rules</Link>
          </li>
          <li className="breadcrumb-item active">Create</li>
        </ol>
      </nav>

      <h4 className="mb-3">
        <i className="fa-solid fa-plus me-2 text-primary" />
        New Tax Rule
      </h4>

      <div className="card shadow-sm" style={{ maxWidth: 560 }}>
        <div className="card-body">
          {error && <div className="alert alert-danger">{error}</div>}
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label className="form-label">Name</label>
              <input
                className={`form-control ${fieldErrors.Name ? "is-invalid" : ""}`}
                value={name}
                maxLength={120}
                required
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. VAT 15%"
              />
              {fieldErrors.Name && <div className="invalid-feedback">{fieldErrors.Name[0]}</div>}
            </div>

            <div className="mb-3">
              <label className="form-label">Percentage</label>
              <div className="input-group">
                <input
                  type="number"
                  className={`form-control ${fieldErrors.Percentage ? "is-invalid" : ""}`}
                  value={percentage}
                  min={0}
                  max={100}
                  step={0.01}
                  required
                  onChange={(e) => setPercentage(Number(e.target.value))}
                />
                <span className="input-group-text">%</span>
                {fieldErrors.Percentage && (
                  <div className="invalid-feedback">{fieldErrors.Percentage[0]}</div>
                )}
              </div>
            </div>

            <div className="form-check form-switch mb-4">
              <input
                className="form-check-input"
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="isActive">
                Active
              </label>
            </div>

            <div className="d-flex gap-2">
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? (
                  <i className="fa-solid fa-spinner fa-spin me-1" />
                ) : (
                  <i className="fa-solid fa-check me-1" />
                )}
                Save
              </button>
              <Link className="btn btn-outline-secondary" to="/admin/resource/TaxRules">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
