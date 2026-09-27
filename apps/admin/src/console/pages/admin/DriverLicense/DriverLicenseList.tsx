import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  DriverLicenseResponseDto,
  LicenseType,
  LicenseTypeLabel,
  getAllDriverLicenses,
  deleteDriverLicense,
  DRIVER_LICENSE_UPDATED_EVENT,
} from '@/services/driverLicenseService';
import { useAuth } from '@/lib/auth';

const PAGE_SIZE = 8;
const EXPIRING_SOON_DAYS = 30;

type ExpiryStatus = 'valid' | 'expiring_soon' | 'expired';

function getExpiryStatus(expiryDate: string): ExpiryStatus {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const daysLeft = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (daysLeft < 0) return 'expired';
  if (daysLeft <= EXPIRING_SOON_DAYS) return 'expiring_soon';
  return 'valid';
}

const EXPIRY_BADGE: Record<ExpiryStatus, { cls: string; icon: string; label: string }> = {
  valid: { cls: 'text-bg-success-subtle text-success-emphasis border-success-subtle', icon: 'fa-circle-check', label: 'Valid' },
  expiring_soon: { cls: 'text-bg-warning-subtle text-warning-emphasis border-warning-subtle', icon: 'fa-triangle-exclamation', label: 'Expiring Soon' },
  expired: { cls: 'text-bg-danger-subtle text-danger-emphasis border-danger-subtle', icon: 'fa-circle-xmark', label: 'Expired' },
};

export const DriverLicenseList: React.FC = () => {
  const { hasRole } = useAuth();
  // Backend gates writes at Staff/Operator/Admin — a plain Customer's GetAll already comes
  // back empty, but keep the create/edit/delete buttons behind the same check for consistency.
  const canManage = hasRole('Admin', 'Staff', 'Operator');

  const [items, setItems] = useState<DriverLicenseResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<LicenseType | 'all'>('all');
  const [expiryFilter, setExpiryFilter] = useState<ExpiryStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'expiryDate' | 'licenseNumber' | 'issueDate'>('expiryDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  const [deleteCandidate, setDeleteCandidate] = useState<DriverLicenseResponseDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await getAllDriverLicenses();
      setItems(data);
    } catch (err: any) {
      setLoadError(err?.message || 'Failed to load driver licenses from the API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const handleUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail as DriverLicenseResponseDto[] | undefined;
      if (detail) setItems(detail);
      else load();
    };
    window.addEventListener(DRIVER_LICENSE_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(DRIVER_LICENSE_UPDATED_EVENT, handleUpdate);
  }, []);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let rows = items.filter((d) => {
      const matchesSearch = !q || d.licenseNumber.toLowerCase().includes(q);
      const matchesType = typeFilter === 'all' || d.type === typeFilter;
      const matchesExpiry = expiryFilter === 'all' || getExpiryStatus(d.expiryDate) === expiryFilter;
      return matchesSearch && matchesType && matchesExpiry;
    });

    rows = [...rows].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      const va = a[sortBy];
      const vb = b[sortBy];
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });

    return rows;
  }, [items, searchQuery, typeFilter, expiryFilter, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const pagedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, page]);

  useEffect(() => setPage(1), [searchQuery, typeFilter, expiryFilter, sortBy, sortDir]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const handleDeleteConfirm = async () => {
    if (!deleteCandidate) return;
    setDeleting(true);
    try {
      await deleteDriverLicense(deleteCandidate.id);
      setItems((prev) => prev.filter((d) => d.id !== deleteCandidate.id));
      toast.success('Driver license deleted.');
      setDeleteCandidate(null);
    } catch (err: any) {
      toast.error(err?.message || 'Could not delete driver license.');
    } finally {
      setDeleting(false);
    }
  };

  const expiringSoonCount = items.filter((d) => getExpiryStatus(d.expiryDate) === 'expiring_soon').length;
  const expiredCount = items.filter((d) => getExpiryStatus(d.expiryDate) === 'expired').length;

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 bg-white p-3 rounded-3 border shadow-sm mb-3">
        <div className="d-flex align-items-center gap-3">
          <div className="bg-success bg-opacity-10 text-success rounded-3 p-2">
            <i className="fa-solid fa-id-card fa-lg" />
          </div>
          <div>
            <div className="d-flex align-items-center gap-2">
              <h1 className="h5 fw-bold mb-0 text-dark">Driver Licenses</h1>
              <span className="badge rounded-pill text-bg-primary-subtle text-primary-emphasis border border-primary-subtle">
                <i className="fa-solid fa-server me-1" /> Live API
              </span>
            </div>
            <p className="text-muted small mb-0">
              Scoped to your own operator's drivers.{' '}
              {expiredCount > 0 && (
                <span className="text-danger fw-semibold">{expiredCount} expired.</span>
              )}{' '}
              {expiringSoonCount > 0 && (
                <span className="text-warning-emphasis fw-semibold">{expiringSoonCount} expiring soon.</span>
              )}
            </p>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={load} title="Refresh from API">
            <i className="fa-solid fa-rotate" />
          </button>
          {canManage && (
            <Link to="/admin/driver-licenses/create" className="btn btn-primary btn-sm">
              <i className="fa-solid fa-plus me-1" /> New License
            </Link>
          )}
        </div>
      </div>

      {loadError && (
        <div className="alert alert-danger py-2 small d-flex justify-content-between align-items-center">
          <span>
            <i className="fa-solid fa-circle-exclamation me-1" /> {loadError}
          </span>
          <button className="btn btn-sm btn-outline-danger" onClick={load}>
            <i className="fa-solid fa-rotate me-1" /> Retry
          </button>
        </div>
      )}

      {/* Search / Filters */}
      <div className="bg-white p-3 rounded-3 border shadow-sm mb-3">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-4">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light">
                <i className="fa-solid fa-magnifying-glass" />
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Search license number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="btn btn-outline-secondary" type="button" onClick={() => setSearchQuery('')}>
                  <i className="fa-solid fa-xmark" />
                </button>
              )}
            </div>
          </div>
          <div className="col-6 col-md-2">
            <select
              className="form-select form-select-sm"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value === 'all' ? 'all' : (Number(e.target.value) as LicenseType))}
            >
              <option value="all">All Types</option>
              <option value={LicenseType.Light}>{LicenseTypeLabel[LicenseType.Light]}</option>
              <option value={LicenseType.Heavy}>{LicenseTypeLabel[LicenseType.Heavy]}</option>
              <option value={LicenseType.Commercial}>{LicenseTypeLabel[LicenseType.Commercial]}</option>
            </select>
          </div>
          <div className="col-6 col-md-2">
            <select
              className="form-select form-select-sm"
              value={expiryFilter}
              onChange={(e) => setExpiryFilter(e.target.value as ExpiryStatus | 'all')}
            >
              <option value="all">All Statuses</option>
              <option value="valid">Valid</option>
              <option value="expiring_soon">Expiring Soon</option>
              <option value="expired">Expired</option>
            </select>
          </div>
          <div className="col-6 col-md-2">
            <select
              className="form-select form-select-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            >
              <option value="expiryDate">Sort: Expiry</option>
              <option value="issueDate">Sort: Issued</option>
              <option value="licenseNumber">Sort: Number</option>
            </select>
          </div>
          <div className="col-3 col-md-1">
            <button
              className="btn btn-outline-secondary btn-sm w-100"
              onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
            >
              <i className={`fa-solid ${sortDir === 'asc' ? 'fa-arrow-up' : 'fa-arrow-down'}`} />
            </button>
          </div>
          <div className="col-3 col-md-1 text-md-end">
            <span className="text-muted small">
              {filteredItems.length}/{items.length}
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3 border shadow-sm overflow-hidden">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 small">
            <thead className="table-light">
              <tr>
                <th>License Number</th>
                <th>Type</th>
                <th>Issued</th>
                <th>Expires</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-muted">
                    <i className="fa-solid fa-circle-notch fa-spin fa-lg mb-2 d-block" />
                    Loading driver licenses from API...
                  </td>
                </tr>
              ) : pagedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-5">
                    <i className="fa-solid fa-id-card fa-2x text-muted mb-2 d-block" />
                    <p className="fw-semibold mb-1">No driver licenses found</p>
                    <p className="text-muted small mb-2">
                      {!canManage
                        ? 'No licenses match your filters right now.'
                        : 'Try adjusting filters, or add a new license.'}
                    </p>
                    {canManage && (
                      <Link to="/admin/driver-licenses/create" className="btn btn-sm btn-primary">
                        <i className="fa-solid fa-plus me-1" /> Add First License
                      </Link>
                    )}
                  </td>
                </tr>
              ) : (
                pagedItems.map((d) => {
                  const status = getExpiryStatus(d.expiryDate);
                  const badge = EXPIRY_BADGE[status];
                  return (
                    <tr key={d.id}>
                      <td>
                        <span className="badge text-bg-light border font-monospace fs-6">{d.licenseNumber}</span>
                      </td>
                      <td>{LicenseTypeLabel[d.type]}</td>
                      <td className="text-muted">{new Date(d.issueDate).toLocaleDateString()}</td>
                      <td className="text-muted">{new Date(d.expiryDate).toLocaleDateString()}</td>
                      <td>
                        <span className={`badge border ${badge.cls}`}>
                          <i className={`fa-solid ${badge.icon} me-1`} /> {badge.label}
                        </span>
                      </td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          <Link to={`/admin/driver-licenses/${d.id}`} className="btn btn-outline-secondary" title="View Details">
                            <i className="fa-solid fa-eye" />
                          </Link>
                          {canManage && (
                            <>
                              <Link to={`/admin/driver-licenses/edit/${d.id}`} className="btn btn-outline-primary" title="Edit">
                                <i className="fa-solid fa-pen" />
                              </Link>
                              <button
                                type="button"
                                className="btn btn-outline-danger"
                                title="Delete"
                                onClick={() => setDeleteCandidate(d)}
                              >
                                <i className="fa-solid fa-trash" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && filteredItems.length > 0 && (
          <div className="d-flex justify-content-between align-items-center px-3 py-2 border-top">
            <span className="text-muted small">
              Page {page} of {totalPages}
            </span>
            <nav>
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    <i className="fa-solid fa-chevron-left" />
                  </button>
                </li>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce<number[]>((acc, p) => {
                    if (acc.length && p - acc[acc.length - 1] > 1) acc.push(-1);
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, idx) =>
                    p === -1 ? (
                      <li key={`ellipsis-${idx}`} className="page-item disabled">
                        <span className="page-link">…</span>
                      </li>
                    ) : (
                      <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                        <button className="page-link" onClick={() => setPage(p)}>
                          {p}
                        </button>
                      </li>
                    )
                  )}
                <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                    <i className="fa-solid fa-chevron-right" />
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>

      {/* Delete Confirm Modal */}
      {deleteCandidate && (
        <div className="modal d-block" style={{ background: 'rgba(15,23,42,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fa-solid fa-triangle-exclamation text-danger me-2" />
                  Delete Driver License
                </h5>
                <button type="button" className="btn-close" onClick={() => setDeleteCandidate(null)} />
              </div>
              <div className="modal-body">
                <p className="mb-0">
                  Delete license <strong>{deleteCandidate.licenseNumber}</strong>? This is a soft delete.
                </p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setDeleteCandidate(null)} disabled={deleting}>
                  Cancel
                </button>
                <button type="button" className="btn btn-danger btn-sm" onClick={handleDeleteConfirm} disabled={deleting}>
                  {deleting ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin me-1" /> Deleting...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-trash me-1" /> Confirm Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverLicenseList;
