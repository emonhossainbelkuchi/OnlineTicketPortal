import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { taxRuleService } from "@/services/taxRuleService";
import type { TaxRule } from "@/types/taxRule";

export default function TaxRuleDetails() {
  const { id } = useParams<{ id: string }>();
  const [rule, setRule] = useState<TaxRule | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    taxRuleService
      .getById(id)
      .then((r) => alive && setRule(r))
      .catch((e: any) => {
        if (e?.status === 404) setNotFound(true);
        else setError(e?.message ?? "Could not load tax rule.");
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

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
          <li className="breadcrumb-item active">Details</li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-start mb-3">
        <h4 className="mb-0">
          <i className="fa-solid fa-percent me-2 text-primary" />
          {rule.name}
        </h4>
        <div className="d-flex gap-2">
          <Link className="btn btn-outline-primary" to={`/admin/resource/TaxRules/${rule.id}/edit`}>
            <i className="fa-solid fa-pen me-1" /> Edit
          </Link>
          <Link className="btn btn-outline-secondary" to="/admin/resource/TaxRules">
            Back
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card shadow-sm" style={{ maxWidth: 560 }}>
        <div className="card-body">
          <dl className="row mb-0">
            <dt className="col-4 text-muted">Name</dt>
            <dd className="col-8">{rule.name}</dd>

            <dt className="col-4 text-muted">Percentage</dt>
            <dd className="col-8">{rule.percentage}%</dd>

            <dt className="col-4 text-muted">Status</dt>
            <dd className="col-8">
              {rule.isActive ? (
                <span className="badge bg-success">Active</span>
              ) : (
                <span className="badge bg-secondary">Inactive</span>
              )}
            </dd>

            <dt className="col-4 text-muted">Created</dt>
            <dd className="col-8">{new Date(rule.createdAtUtc).toLocaleString()}</dd>

            <dt className="col-4 text-muted">Last Updated</dt>
            <dd className="col-8">
              {rule.updatedAtUtc ? new Date(rule.updatedAtUtc).toLocaleString() : "—"}
            </dd>
          </dl>
        </div>
      </div>
    </div>
  );
}
