import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ComplaintResponseDto, getAllComplaints, deleteComplaint, COMPLAINT_UPDATED_EVENT } from '@/services/complaintService';
import { getCurrentUserRole } from '@/services/fareRuleService';

const PAGE_SIZE = 8;

const STATUS_STYLE: Record<string, { cls: string; icon: string }> = {
  Open: { cls: 'text-bg-danger-subtle text-danger-emphasis border-danger-subtle', icon: 'fa-circle-exclamation' },
  InProgress: { cls: 'text-bg-warning-subtle text-warning-emphasis border-warning-subtle', icon: 'fa-clock' },
  Resolved: { cls: 'text-bg-success-subtle text-success-emphasis border-success-subtle', icon: 'fa-circle-check' },
  Closed: { cls: 'text-bg-secondary-subtle text-secondary-emphasis border-secondary-subtle', icon: 'fa-box-archive' },
};

export const ComplaintList: React.FC = () => {
  const role = getCurrentUserRole();
  const isStaff = role === 'Admin' || role === 'Staff' || role === 'Operator';

  const [items, setItems] = useState<ComplaintResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const [deleteCandidate, setDeleteCandidate] = useState<ComplaintResponseDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await getAllComplaints();
      setItems(data);
    } catch (err: any) {
      setLoadError(err?.message || 'Failed to load complaints from the API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const handleUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail as ComplaintResponseDto[] | undefined;
      if (detail) setItems(detail);
      else load();
    };
    window.addEventListener(COMPLAINT_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(COMPLAINT_UPDATED_EVENT, handleUpdate);
  }, []);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((c) => {
      const matchesSearch = !q || c.subject.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [items, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const pagedItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, page]);

  useEffect(() => setPage(1), [searchQuery, statusFilter]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const handleDeleteConfirm = async () => {
    if (!deleteCandidate) return;
    setDeleting(true);
    try {
      await deleteComplaint(deleteCandidate.id);
      setItems((prev) => prev.filter((c) => c.id !== deleteCandidate.id));
      toast.success('Complaint deleted.');
      setDeleteCandidate(null);
    } catch (err: any) {
      toast.error(err?.message || 'Could not delete complaint.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 bg-white p-3 rounded-3 border shadow-sm mb-3">
        <div className="d-flex align-items-center gap-3">
          <div className="bg-danger bg-opacity-10 text-danger rounded-3 p-2">
            <i className="fa-solid fa-triangle-exclamation fa-lg" />
          </div>
          <div>
            <div className="d-flex align-items-center gap-2">
              <h1 className="h5 fw-bold mb-0 text-dark">Complaints</h1>
              <span className="badge rounded-pill text-bg-primary-subtle text-primary-emphasis border border-primary-subtle">
                <i className="fa-solid fa-server me-1" /> Live API
              </span>
            </div>
            <p className="text-muted small mb-0">
              Customers see only their own complaints; Admin/Staff/Operator see everyone's and can resolve them.
            </p>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={load} title="Refresh from API">
            <i className="fa-solid fa-rotate" />
          </button>
          <Link to="/admin/complaints/create" className="btn btn-primary btn-sm">
            <i className="fa-solid fa-plus me-1" /> New Complaint
          </Link>
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
                placeholder="Search subject or description..."
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
            <select className="form-select form-select-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="Open">Open</option>
              <option value="InProgress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
          <div className="col-12 col-md-3 text-md-end">
            <span className="text-muted small">
              <i className="fa-solid fa-filter me-1" />
              {filteredItems.length} of {items.length} complaints
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
                <th>Subject</th>
                <th>Booking</th>
                <th>Status</th>
                <th>Filed</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-5 text-muted">
                    <i className="fa-solid fa-circle-notch fa-spin fa-lg mb-2 d-block" />
                    Loading complaints from API...
                  </td>
                </tr>
              ) : pagedItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-5">
                    <i className="fa-solid fa-triangle-exclamation fa-2x text-muted mb-2 d-block" />
                    <p className="fw-semibold mb-1">No complaints found</p>
                    <p className="text-muted small mb-2">Try adjusting filters, or file a new complaint.</p>
                    <Link to="/admin/complaints/create" className="btn btn-sm btn-primary">
                      <i className="fa-solid fa-plus me-1" /> File First Complaint
                    </Link>
                  </td>
                </tr>
              ) : (
                pagedItems.map((c) => {
                  const style = STATUS_STYLE[c.status] || { cls: 'text-bg-light', icon: 'fa-circle' };
                  return (
                    <tr key={c.id}>
                      <td>
                        <div className="fw-semibold">{c.subject}</div>
                        <div className="text-muted small text-truncate" style={{ maxWidth: 280 }} title={c.description}>
                          {c.description}
                        </div>
                      </td>
                      <td>
                        {c.bookingId ? (
                          <span className="font-monospace small">{c.bookingId.slice(0, 8)}…</span>
                        ) : (
                          <span className="text-muted fst-italic small">—</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge border ${style.cls}`}>
                          <i className={`fa-solid ${style.icon} me-1`} /> {c.status}
                        </span>
                      </td>
                      <td className="text-muted small">{new Date(c.createdAtUtc).toLocaleDateString()}</td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          <Link to={`/admin/complaints/${c.id}`} className="btn btn-outline-secondary" title="View Details">
                            <i className="fa-solid fa-eye" />
                          </Link>
                          <Link to={`/admin/complaints/edit/${c.id}`} className="btn btn-outline-primary" title="Edit">
                            <i className="fa-solid fa-pen" />
                          </Link>
                          {isStaff && (
                            <button
                              type="button"
                              className="btn btn-outline-danger"
                              title="Delete"
                              onClick={() => setDeleteCandidate(c)}
                            >
                              <i className="fa-solid fa-trash" />
                            </button>
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
                  Delete Complaint
                </h5>
                <button type="button" className="btn-close" onClick={() => setDeleteCandidate(null)} />
              </div>
              <div className="modal-body">
                <p className="mb-0">
                  Delete complaint <strong>{deleteCandidate.subject}</strong>? This is a soft delete.
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

export default ComplaintList;
