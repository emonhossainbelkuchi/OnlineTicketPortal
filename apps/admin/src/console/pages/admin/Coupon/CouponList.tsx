import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CouponResponseDto, getAllCoupons, deleteCoupon, COUPON_UPDATED_EVENT } from '@/services/couponService';
import { useAuth } from '@/lib/auth';

const PAGE_SIZE = 8;

type LifecycleStatus = 'active' | 'upcoming' | 'expired' | 'exhausted' | 'inactive';

const getLifecycleStatus = (c: CouponResponseDto): LifecycleStatus => {
  if (!c.isActive) return 'inactive';
  const now = new Date();
  if (new Date(c.validFromUtc) > now) return 'upcoming';
  if (new Date(c.validToUtc) < now) return 'expired';
  if (c.usageLimit != null && c.usedCount >= c.usageLimit) return 'exhausted';
  return 'active';
};

const STATUS_BADGE: Record<LifecycleStatus, { cls: string; icon: string; label: string }> = {
  active: { cls: 'text-bg-success-subtle text-success-emphasis border-success-subtle', icon: 'fa-circle-check', label: 'Active' },
  upcoming: { cls: 'text-bg-info-subtle text-info-emphasis border-info-subtle', icon: 'fa-clock', label: 'Upcoming' },
  expired: { cls: 'text-bg-secondary-subtle text-secondary-emphasis border-secondary-subtle', icon: 'fa-calendar-xmark', label: 'Expired' },
  exhausted: { cls: 'text-bg-warning-subtle text-warning-emphasis border-warning-subtle', icon: 'fa-ban', label: 'Exhausted' },
  inactive: { cls: 'text-bg-secondary-subtle text-secondary-emphasis border-secondary-subtle', icon: 'fa-circle-xmark', label: 'Inactive' },
};

export const CouponList: React.FC = () => {
  // Was: getCurrentUserRole() from '@/services/fareRuleService' (doesn't exist there).
  // AuthProvider already exposes exactly this via hasRole(), so use that instead.
  const { hasRole } = useAuth();
  const isAdmin = hasRole('Admin');

  const [items, setItems] = useState<CouponResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const [deleteCandidate, setDeleteCandidate] = useState<CouponResponseDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await getAllCoupons();
      setItems(data);
    } catch (err: any) {
      setLoadError(err?.message || 'Failed to load coupons from the API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const handleUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail as CouponResponseDto[] | undefined;
      if (detail) setItems(detail);
      else load();
    };
    window.addEventListener(COUPON_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(COUPON_UPDATED_EVENT, handleUpdate);
  }, []);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((c) => {
      const matchesSearch =
        !q || c.code.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q);
      const matchesType = typeFilter === 'all' || c.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || getLifecycleStatus(c) === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [items, searchQuery, typeFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const pagedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, page]);

  useEffect(() => setPage(1), [searchQuery, typeFilter, statusFilter]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const handleDeleteConfirm = async () => {
    if (!deleteCandidate) return;
    setDeleting(true);
    try {
      await deleteCoupon(deleteCandidate.id);
      setItems((prev) => prev.filter((c) => c.id !== deleteCandidate.id));
      toast.success('Coupon deleted.');
      setDeleteCandidate(null);
    } catch (err: any) {
      toast.error(err?.message || 'Could not delete coupon.');
    } finally {
      setDeleting(false);
    }
  };

  const discountLabel = (c: CouponResponseDto) =>
    c.type === 'Percentage'
      ? `${c.discountPercentage ?? 0}%${c.maxDiscountAmount ? ` (cap ${c.maxDiscountAmount})` : ''}`
      : `${c.discountAmount ?? 0} flat`;

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 bg-white p-3 rounded-3 border shadow-sm mb-3">
        <div className="d-flex align-items-center gap-3">
          <div className="bg-success bg-opacity-10 text-success rounded-3 p-2">
            <i className="fa-solid fa-ticket fa-lg" />
          </div>
          <div>
            <div className="d-flex align-items-center gap-2">
              <h1 className="h5 fw-bold mb-0 text-dark">Coupons</h1>
              <span className="badge rounded-pill text-bg-primary-subtle text-primary-emphasis border border-primary-subtle">
                <i className="fa-solid fa-server me-1" /> Live API
              </span>
            </div>
            <p className="text-muted small mb-0">
              Discount codes for checkout — reading is open to everyone signed in, defining rules is Admin-only.
            </p>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={load} title="Refresh from API">
            <i className="fa-solid fa-rotate" />
          </button>
          {isAdmin && (
            <Link to="/admin/coupons/create" className="btn btn-primary btn-sm">
              <i className="fa-solid fa-plus me-1" /> New Coupon
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
          <div className="col-12 col-md-5">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light">
                <i className="fa-solid fa-magnifying-glass" />
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Search code or description..."
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
          <div className="col-6 col-md-3">
            <select className="form-select form-select-sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">All Types</option>
              <option value="FixedAmount">Fixed Amount</option>
              <option value="Percentage">Percentage</option>
            </select>
          </div>
          <div className="col-6 col-md-2">
            <select className="form-select form-select-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="upcoming">Upcoming</option>
              <option value="expired">Expired</option>
              <option value="exhausted">Exhausted</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="col-12 col-md-2 text-md-end">
            <span className="text-muted small">
              <i className="fa-solid fa-filter me-1" />
              {filteredItems.length} of {items.length} coupons
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
                <th>Code</th>
                <th>Discount</th>
                <th>Validity</th>
                <th>Usage</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-muted">
                    <i className="fa-solid fa-circle-notch fa-spin fa-lg mb-2 d-block" />
                    Loading coupons from API...
                  </td>
                </tr>
              ) : pagedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-5">
                    <i className="fa-solid fa-ticket fa-2x text-muted mb-2 d-block" />
                    <p className="fw-semibold mb-1">No coupons found</p>
                    <p className="text-muted small mb-2">
                      {!isAdmin ? 'No coupons match your filters right now.' : 'Try adjusting filters, or create a new coupon.'}
                    </p>
                    {isAdmin && (
                      <Link to="/admin/coupons/create" className="btn btn-sm btn-primary">
                        <i className="fa-solid fa-plus me-1" /> Add First Coupon
                      </Link>
                    )}
                  </td>
                </tr>
              ) : (
                pagedItems.map((c) => {
                  const status = getLifecycleStatus(c);
                  const badge = STATUS_BADGE[status];
                  const usagePct = c.usageLimit ? Math.min(100, Math.round((c.usedCount / c.usageLimit) * 100)) : null;
                  return (
                    <tr key={c.id}>
                      <td>
                        <span className="badge text-bg-light border font-monospace fs-6">{c.code}</span>
                        {c.description && (
                          <div className="text-muted small text-truncate mt-1" style={{ maxWidth: 220 }} title={c.description}>
                            {c.description}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="fw-semibold">{discountLabel(c)}</span>
                        {c.minBookingAmount ? (
                          <div className="text-muted small">min. booking {c.minBookingAmount}</div>
                        ) : null}
                      </td>
                      <td className="text-muted">
                        <div>{new Date(c.validFromUtc).toLocaleDateString()}</div>
                        <div className="small">to {new Date(c.validToUtc).toLocaleDateString()}</div>
                      </td>
                      <td style={{ minWidth: 140 }}>
                        {c.usageLimit != null ? (
                          <>
                            <div className="small text-muted mb-1">
                              {c.usedCount} / {c.usageLimit}
                              {c.perUserLimit ? ` · max ${c.perUserLimit}/user` : ''}
                            </div>
                            <div className="progress" style={{ height: 6 }}>
                              <div
                                className={`progress-bar ${usagePct === 100 ? 'bg-warning' : 'bg-success'}`}
                                style={{ width: `${usagePct}%` }}
                              />
                            </div>
                          </>
                        ) : (
                          <span className="text-muted small">
                            {c.usedCount} used · unlimited{c.perUserLimit ? ` · max ${c.perUserLimit}/user` : ''}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`badge border ${badge.cls}`}>
                          <i className={`fa-solid ${badge.icon} me-1`} /> {badge.label}
                        </span>
                      </td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          <Link to={`/admin/coupons/${c.id}`} className="btn btn-outline-secondary" title="View Details">
                            <i className="fa-solid fa-eye" />
                          </Link>
                          {isAdmin && (
                            <>
                              <Link to={`/admin/coupons/edit/${c.id}`} className="btn btn-outline-primary" title="Edit">
                                <i className="fa-solid fa-pen" />
                              </Link>
                              <button
                                type="button"
                                className="btn btn-outline-danger"
                                title="Delete"
                                onClick={() => setDeleteCandidate(c)}
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
                  Delete Coupon
                </h5>
                <button type="button" className="btn-close" onClick={() => setDeleteCandidate(null)} />
              </div>
              <div className="modal-body">
                <p className="mb-0">
                  Delete coupon <strong>{deleteCandidate.code}</strong>? It has been used{' '}
                  {deleteCandidate.usedCount} time(s). This is a soft delete.
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

export default CouponList;