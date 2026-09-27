import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { currencyService } from "@/services/currencyService";
import type { Currency } from "@/types/currency";

export default function CurrencyDetails() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<Currency | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    currencyService
      .getById(id)
      .then((c) => alive && setItem(c))
      .catch((e: any) => {
        if (e?.status === 404) setNotFound(true);
        else setError(e?.message ?? "Could not load currency.");
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

  if (notFound || !item) {
    return (
      <div className="container-fluid py-3">
        <div className="alert alert-warning">Currency not found.</div>
        <Link className="btn btn-outline-secondary" to="/admin/resource/Currencies">
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
            <Link to="/admin/resource/Currencies">Currencies</Link>
          </li>
          <li className="breadcrumb-item active">Details</li>
        </ol>
      </nav>

      <div className="d-flex justify-content-between align-items-start mb-3">
        <h4 className="mb-0">
          <i className="fa-solid fa-coins me-2 text-primary" />
          {item.code} ({item.symbol})
        </h4>
        <div className="d-flex gap-2">
          <Link className="btn btn-outline-primary" to={`/admin/resource/Currencies/${item.id}/edit`}>
            <i className="fa-solid fa-pen me-1" /> Edit
          </Link>
          <Link className="btn btn-outline-secondary" to="/admin/resource/Currencies">
            Back
          </Link>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card shadow-sm" style={{ maxWidth: 560 }}>
        <div className="card-body">
          <dl className="row mb-0">
            <dt className="col-4 text-muted">Code</dt>
            <dd className="col-8">{item.code}</dd>

            <dt className="col-4 text-muted">Symbol</dt>
            <dd className="col-8">{item.symbol}</dd>

            <dt className="col-4 text-muted">Exchange Rate to Base</dt>
            <dd className="col-8">{item.exchangeRateToBase}</dd>

            <dt className="col-4 text-muted">Base Currency</dt>
            <dd className="col-8">
              {item.isBaseCurrency ? (
                <span className="badge bg-primary">Yes</span>
              ) : (
                <span className="text-muted">No</span>
              )}
            </dd>

            <dt className="col-4 text-muted">Status</dt>
            <dd className="col-8">
              {item.isActive ? (
                <span className="badge bg-success">Active</span>
              ) : (
                <span className="badge bg-secondary">Inactive</span>
              )}
            </dd>

            <dt className="col-4 text-muted">Created</dt>
            <dd className="col-8">{new Date(item.createdAtUtc).toLocaleString()}</dd>

            <dt className="col-4 text-muted">Last Updated</dt>
            <dd className="col-8">
              {item.updatedAtUtc ? new Date(item.updatedAtUtc).toLocaleString() : "—"}
            </dd>
          </dl>
        </div>
      </div>
    </div>
  );
}
