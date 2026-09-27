import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  PromoBannerResponseDto,
  getAllPromoBanners,
  deletePromoBanner,
  PROMO_BANNER_UPDATED_EVENT,
} from '@/services/promoBannerService';
import { useAuth } from '@/lib/auth';

const PAGE_SIZE = 8;

export const PromoBannerList: React.FC = () => {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('Admin');

  const [items, setItems] = useState<PromoBannerResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc'); // by DisplayOrder
  const [page, setPage] = useState(1);

  const [deleteCandidate, setDeleteCandidate] = useState<PromoBannerResponseDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await getAllPromoBanners();
      setItems(data);
    } catch (err: any) {
      setLoadError(err?.message || 'Failed to load promo banners from the API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const handleUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail as PromoBannerResponseDto[] | undefined;
      if (detail) setItems(detail);
      else load();
    };
    window.addEventListener(PROMO_BANNER_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(PROMO_BANNER_UPDATED_EVENT, handleUpdate);
  }, []);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let rows = items.filter((b) => {
      const matchesSearch =
        !q || b.imageUrl.toLowerCase().includes(q) || (b.linkUrl || '').toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === 'all' || (statusFilter === 'active' ? b.isActive : !b.isActive);
      return matchesSearch && matchesStatus;
    });

    rows = [...rows].sort((a, b) =>
      sortDir === 'asc' ? a.displayOrder - b.displayOrder : b.displayOrder - a.displayOrder
    );

    return rows;
  }, [items, searchQuery, statusFilter, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const pagedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, page]);

  useEffect(() => setPage(1), [searchQuery, statusFilter, sortDir]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const handleDeleteConfirm = async () => {
    if (!deleteCandidate) return;
    setDeleting(true);
    try {
      await deletePromoBanner(deleteCandidate.id);
      setItems((prev) => prev.filter((b) => b.id !== deleteCandidate.id));
      toast.success('Promo banner deleted.');
      setDeleteCandidate(null);
    } catch (err: any) {
      toast.error(err?.message || 'Could not delete promo banner.');
    } finally {
      setDeleting(false);
    }
  };

  const activeCount = items.filter((b) => b.isActive).length;

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 bg-white p-3 rounded-3 border shadow-sm mb-3">
        <div className="d-flex align-items-center gap-3">
          <div className="bg-success bg-opacity-10 text-success rounded-3 p-2">
            <i className="fa-solid fa-images fa-lg" />
          </div>
          <div>
            <div className="d-flex align-items-center gap-2">
              <h1 className="h5 fw-bold mb-0 text-dark">Promo Banners</h1>
              <span className="badge rounded-pill text-bg-primary-subtle text-primary-emphasis border border-primary-subtle">
                <i className="fa-solid fa-server me-1" /> Live API
              </span>
            </div>
            <p className="text-muted small mb-0">
              Storefront banners — reading is open to everyone signed in, defining banners is
              Admin-only. {activeCount} of {items.length} currently active.
            </p>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={load} title="Refresh from API">
            <i className="fa-solid fa-rotate" />
          </button>
          {isAdmin && (
            <Link to="/admin/promo-banners/create" className="btn btn-primary btn-sm">
              <i className="fa-solid fa-plus me-1" /> New Banner
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
          <div className="col-12 col-md-6">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-light">
                <i className="fa-solid fa-magnifying-glass" />
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Search by image URL or link URL..."
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
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="col-6 col-md-2">
            <button
              className="btn btn-outline-secondary btn-sm w-100"
              onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
            >
              <i className={`fa-solid ${sortDir === 'asc' ? 'fa-arrow-up-short-wide' : 'fa-arrow-down-wide-short'} me-1`} />
              Order
            </button>
          </div>
          <div className="col-12 col-md-2 text-md-end">
            <span className="text-muted small">
              <i className="fa-solid fa-filter me-1" />
              {filteredItems.length} of {items.length}
            </span>
          </div>
        </div>
      </div>

      {/* Grid of banner cards (image-first, since this is visual content) */}
      {loading ? (
        <div className="text-center py-5 text-muted">
          <i className="fa-solid fa-circle-notch fa-spin fa-lg mb-2 d-block" />
          Loading promo banners from API...
        </div>
      ) : pagedItems.length === 0 ? (
        <div className="bg-white rounded-3 border shadow-sm text-center py-5">
          <i className="fa-solid fa-images fa-2x text-muted mb-2 d-block" />
          <p className="fw-semibold mb-1">No promo banners found</p>
          <p className="text-muted small mb-2">
            {!isAdmin ? 'No banners match your filters right now.' : 'Try adjusting filters, or create a new banner.'}
          </p>
          {isAdmin && (
            <Link to="/admin/promo-banners/create" className="btn btn-sm btn-primary">
              <i className="fa-solid fa-plus me-1" /> Add First Banner
            </Link>
          )}
        </div>
      ) : (
        <div className="row g-3">
          {pagedItems.map((b) => (
            <div key={b.id} className="col-12 col-md-6 col-lg-4">
              <div className="bg-white rounded-3 border shadow-sm overflow-hidden h-100 d-flex flex-column">
                <div
                  className="bg-light d-flex align-items-center justify-content-center"
                  style={{ height: 140, overflow: 'hidden' }}
                >
                  {b.imageUrl ? (
                    <img
                      src={b.imageUrl}
                      alt="Promo banner"
                      className="w-100 h-100"
                      style={{ objectFit: 'cover' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <i className="fa-solid fa-image text-muted fa-2x" />
                  )}
                </div>
                <div className="p-3 flex-grow-1 d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span
                      className={`badge border ${
                        b.isActive
                          ? 'text-bg-success-subtle text-success-emphasis border-success-subtle'
                          : 'text-bg-secondary-subtle text-secondary-emphasis border-secondary-subtle'
                      }`}
                    >
                      <i className={`fa-solid ${b.isActive ? 'fa-circle-check' : 'fa-circle-xmark'} me-1`} />
                      {b.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className="badge text-bg-light border">
                      <i className="fa-solid fa-arrow-up-1-9 me-1" /> Order {b.displayOrder}
                    </span>
                  </div>
                  <div className="text-muted small text-truncate mb-1" title={b.imageUrl}>
                    <i className="fa-solid fa-link me-1" /> {b.imageUrl}
                  </div>
                  {b.linkUrl && (
                    <div className="text-muted small text-truncate mb-3" title={b.linkUrl}>
                      <i className="fa-solid fa-arrow-up-right-from-square me-1" /> {b.linkUrl}
                    </div>
                  )}
                  <div className="mt-auto d-flex gap-2">
                    <Link
                      to={`/admin/promo-banners/${b.id}`}
                      className="btn btn-sm btn-outline-secondary flex-grow-1"
                    >
                      <i className="fa-solid fa-eye me-1" /> View
                    </Link>
                    {isAdmin && (
                      <>
                        <Link
                          to={`/admin/promo-banners/edit/${b.id}`}
                          className="btn btn-sm btn-outline-primary"
                        >
                          <i className="fa-solid fa-pen" />
                        </Link>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => setDeleteCandidate(b)}
                        >
                          <i className="fa-solid fa-trash" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && filteredItems.length > 0 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
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

      {/* Delete Confirm Modal */}
      {deleteCandidate && (
        <div className="modal d-block" style={{ background: 'rgba(15,23,42,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fa-solid fa-triangle-exclamation text-danger me-2" />
                  Delete Promo Banner
                </h5>
                <button type="button" className="btn-close" onClick={() => setDeleteCandidate(null)} />
              </div>
              <div className="modal-body">
                <p className="mb-2">Delete this promo banner? This is a soft delete.</p>
                <div
                  className="bg-light rounded p-2 d-flex align-items-center justify-content-center"
                  style={{ height: 100, overflow: 'hidden' }}
                >
                  {deleteCandidate.imageUrl ? (
                    <img
                      src={deleteCandidate.imageUrl}
                      alt="Promo banner"
                      style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <i className="fa-solid fa-image text-muted" />
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setDeleteCandidate(null)}
                  disabled={deleting}
                >
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

export default PromoBannerList;
