import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { currencyService } from "@/services/currencyService";
import type { Currency } from "@/types/currency";

export default function CurrencyEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [item, setItem] = useState<Currency | null>(null);

  const [code, setCode] = useState("");
  const [symbol, setSymbol] = useState("");
  const [exchangeRateToBase, setExchangeRateToBase] = useState<number>(1);
  const [isBaseCurrency, setIsBaseCurrency] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!id) return;
    let alive = true;
    currencyService
      .getById(id)
      .then((c) => {
        if (!alive) return;
        setItem(c);
        setCode(c.code);
        setSymbol(c.symbol);
        setExchangeRateToBase(c.exchangeRateToBase);
        setIsBaseCurrency(c.isBaseCurrency);
        setIsActive(c.isActive);
      })
      .catch((e: any) => {
        if (e?.status === 404) setNotFound(true);
        else setError(e?.message ?? "Could not load currency.");
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  async function reloadLatest() {
    if (!id) return;
    const latest = await currencyService.getById(id);
    setItem(latest);
    setCode(latest.code);
    setSymbol(latest.symbol);
    setExchangeRateToBase(latest.exchangeRateToBase);
    setIsBaseCurrency(latest.isBaseCurrency);
    setIsActive(latest.isActive);
    setConflict(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !item) return;
    setSaving(true);
    setError(null);
    setConflict(false);
    setFieldErrors({});
    try {
      await currencyService.update(id, {
        code: code.trim().toUpperCase(),
        symbol: symbol.trim(),
        exchangeRateToBase,
        isBaseCurrency,
        isActive,
        rowVersion: item.rowVersion,
      });
      navigate("/admin/resource/Currencies");
    } catch (e: any) {
      if (e?.status === 409) {
        setConflict(true);
      } else if (e?.status === 400 && e?.raw?.errors) {
        setFieldErrors(e.raw.errors);
      } else {
        setError(e?.message ?? "Could not save currency.");
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
          <li className="breadcrumb-item active">Edit</li>
        </ol>
      </nav>

      <h4 className="mb-3">
        <i className="fa-solid fa-pen me-2 text-primary" />
        Edit Currency
      </h4>

      <div className="card shadow-sm" style={{ maxWidth: 560 }}>
        <div className="card-body">
          {error && <div className="alert alert-danger">{error}</div>}
          {conflict && (
            <div className="alert alert-warning d-flex justify-content-between align-items-center">
              <span>
                <i className="fa-solid fa-triangle-exclamation me-2" />
                This currency was changed by another request.
              </span>
              <button className="btn btn-sm btn-outline-dark" onClick={reloadLatest} type="button">
                Reload latest
              </button>
            </div>
          )}
          <form onSubmit={handleSubmit} noValidate>
            <div className="row g-3 mb-3">
              <div className="col-6">
                <label className="form-label">Code (3 letters)</label>
                <input
                  className={`form-control text-uppercase ${fieldErrors.Code ? "is-invalid" : ""}`}
                  value={code}
                  maxLength={3}
                  required
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                />
                {fieldErrors.Code && <div className="invalid-feedback">{fieldErrors.Code[0]}</div>}
              </div>
              <div className="col-6">
                <label className="form-label">Symbol</label>
                <input
                  className={`form-control ${fieldErrors.Symbol ? "is-invalid" : ""}`}
                  value={symbol}
                  maxLength={10}
                  required
                  onChange={(e) => setSymbol(e.target.value)}
                />
                {fieldErrors.Symbol && <div className="invalid-feedback">{fieldErrors.Symbol[0]}</div>}
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">Exchange Rate to Base</label>
              <input
                type="number"
                className={`form-control ${fieldErrors.ExchangeRateToBase ? "is-invalid" : ""}`}
                value={exchangeRateToBase}
                min={0.000001}
                step={0.000001}
                required
                onChange={(e) => setExchangeRateToBase(Number(e.target.value))}
              />
              {fieldErrors.ExchangeRateToBase && (
                <div className="invalid-feedback">{fieldErrors.ExchangeRateToBase[0]}</div>
              )}
            </div>

            <div className="form-check form-switch mb-2">
              <input
                className="form-check-input"
                type="checkbox"
                id="isBaseCurrency"
                checked={isBaseCurrency}
                onChange={(e) => setIsBaseCurrency(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="isBaseCurrency">
                Base Currency
              </label>
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
              <Link className="btn btn-outline-secondary" to="/admin/resource/Currencies">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
