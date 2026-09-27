import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { taxRuleService } from "@/services/taxRuleService";
import type { TaxRule } from "@/types/taxRule";

export default function TaxRuleEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [rule, setRule] = useState<TaxRule | null>(null);

  const [name, setName] = useState("");
  const [percentage, setPercentage] = useState<number>(0);
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!id) return;
    let alive = true;
    taxRuleService
      .getById(id)
      .then((r) => {
        if (!alive) return;
        setRule(r);
        setName(r.name);
        setPercentage(r.percentage);
        setIsActive(r.isActive);
      })
      .catch((e: any) => {
        if (e?.status === 404) setNotFound(true);
        else setError(e?.message ?? "Could not load tax rule.");
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  async function reloadLatest() {
    if (!id) return;
    const latest = await taxRuleService.getById(id);
    setRule(latest);
    setName(latest.name);
    setPercentage(latest.percentage);
    setIsActive(latest.isActive);
    setConflict(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !rule) return;
    setSaving(true);
    setError(null);
    setConflict(false);
    setFieldErrors({});
    try {
      await taxRuleService.update(id, {
        name: name.trim(),
        percentage,
        isActive,
        rowVersion: rule.rowVersion,
      });
      navigate("/admin/resource/TaxRules");
    } catch (e: any) {
      if (e?.status === 409) {
        setConflict(true);
      } else if (e?.status === 400 && e?.raw?.errors) {
        setFieldErrors(e.raw.errors);
      } else {
        setError(e?.message ?? "Could not save tax rule.");
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

  if (notFound || !rule) {
    return (
      <div className="container-fluid py-3">
        <div className="alert alert-warning">Tax rule not found.</div>
        <Link className="btn btn-outline-secondary" to="/admin/resource/TaxRules">
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
            <Link to="/admin/resource/TaxRules">Tax Rules</Link>
          </li>
          <li className="breadcrumb-item active">Edit</li>
        </ol>
      </nav>

      <h4 className="mb-3">
        <i className="fa-solid fa-pen me-2 text-primary" />
        Edit Tax Rule
      </h4>

      <div className="card shadow-sm" style={{ maxWidth: 560 }}>
        <div className="card-body">
          {error && <div className="alert alert-danger">{error}</div>}
          {conflict && (
            <div className="alert alert-warning d-flex justify-content-between align-items-center">
              <span>
                <i className="fa-solid fa-triangle-exclamation me-2" />
                This tax rule was changed by another request.
              </span>
              <button className="btn btn-sm btn-outline-dark" onClick={reloadLatest} type="button">
                Reload latest
              </button>
            </div>
          )}
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label className="form-label">Name</label>
              <input
                className={`form-control ${fieldErrors.Name ? "is-invalid" : ""}`}
                value={name}
                maxLength={120}
                required
                onChange={(e) => setName(e.target.value)}
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
                Save Changes
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
