import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { faPlus, faSyncAlt, faEye, faPen, faTrash, faSearch } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import useCommissionRules, { GroupByField } from '@/hooks/useCommissionRules';
import commissionRuleService from '@/services/commissionRuleService';
import { CommissionRule, CommissionTypeLabel, SaleChannelLabel } from '@/types/commissionRule.types';

export default function CommissionRulesList() {
  const navigate = useNavigate();
  const {
    grouped,
    paged,
    filtered,
    loading,
    error,
    refresh,
    search,
    setSearch,
    groupBy,
    setGroupBy,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    totalCount,
  } = useCommissionRules();

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (row: CommissionRule) => {
    if (!window.confirm('Delete this commission rule? This cannot be undone from here.')) return;
    setDeletingId(row.id);
    try {
      await commissionRuleService.remove(row.id);
      await refresh();
    } catch (e: any) {
      alert(e?.response?.data?.message ?? 'Delete failed.');
    } finally {
      setDeletingId(null);
    }
  };

  const renderRow = (row: CommissionRule) => (
    <tr key={row.id}>
      <td className="text-truncate" style={{ maxWidth: 140 }} title={row.busOperatorId}>
        {row.busOperatorId}
      </td>
      <td>{SaleChannelLabel[row.saleChannel]}</td>
      <td>{CommissionTypeLabel[row.commissionType]}</td>
      <td>
        {row.commissionValue}
        {row.commissionType === 0 ? '%' : ''}
      </td>
      <td>{row.effectiveFrom}</td>
      <td>{row.effectiveTo ?? <span className="text-muted">—</span>}</td>
      <td>
        <span className={`badge ${row.isActive ? 'bg-success' : 'bg-secondary'}`}>
          {row.isActive ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="text-end">
        <div className="btn-group btn-group-sm">
          <Link className="btn btn-outline-secondary" to={`/admin/resource/CommissionRules/${row.id}`} title="Details">
            <FontAwesomeIcon icon={faEye} />
          </Link>
          <Link className="btn btn-outline-primary" to={`/admin/resource/CommissionRules/${row.id}/edit`} title="Edit">
            <FontAwesomeIcon icon={faPen} />
          </Link>
          <button
            className="btn btn-outline-danger"
            title="Delete"
            disabled={deletingId === row.id}
            onClick={() => handleDelete(row)}
          >
            <FontAwesomeIcon icon={deletingId === row.id ? faSyncAlt : faTrash} spin={deletingId === row.id} />
          </button>
        </div>
      </td>
    </tr>
  );

  const groupKeys = Object.keys(grouped);
  const isGrouped = groupBy !== 'none';

  return (
    <div className="container-fluid py-3">
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-3 gap-2">
        <h4 className="mb-0">Commission Rules</h4>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={() => refresh()} disabled={loading}>
            <FontAwesomeIcon icon={faSyncAlt} spin={loading} className="me-1" />
            Refresh
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/admin/resource/CommissionRules/create')}>
            <FontAwesomeIcon icon={faPlus} className="me-1" />
            New Rule
          </button>
        </div>
      </div>

      <div className="row g-2 mb-3">
        <div className="col-md-6">
          <div className="input-group">
            <span className="input-group-text">
              <FontAwesomeIcon icon={faSearch} />
            </span>
            <input
              className="form-control"
              placeholder="Search operator, channel, type, value, dates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="col-md-3">
          <select
            className="form-select"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupByField)}
          >
            <option value="none">No grouping</option>
            <option value="busOperatorId">Group by Operator</option>
            <option value="saleChannel">Group by Sale Channel</option>
            <option value="commissionType">Group by Commission Type</option>
            <option value="isActive">Group by Status</option>
          </select>
        </div>
        <div className="col-md-3">
          <select
            className="form-select"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead className="table-light">
            <tr>
              <th>Operator</th>
              <th>Sale Channel</th>
              <th>Type</th>
              <th>Value</th>
              <th>From</th>
              <th>To</th>
              <th>Status</th>
              <th className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-4">
                  <FontAwesomeIcon icon={faSyncAlt} spin className="me-2" />
                  Loading...
                </td>
              </tr>
            ) : isGrouped ? (
              groupKeys.map((key) => (
                <>
                  <tr key={`g-${key}`} className="table-secondary">
                    <td colSpan={8}>
                      <strong>{key}</strong>{' '}
                      <span className="text-muted">({grouped[key].length})</span>
                    </td>
                  </tr>
                  {grouped[key].map(renderRow)}
                </>
              ))
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-muted py-4">
                  No commission rules found.
                </td>
              </tr>
            ) : (
              paged.map(renderRow)
            )}
          </tbody>
        </table>
      </div>

      {!isGrouped && !loading && totalCount > 0 && (
        <div className="d-flex align-items-center justify-content-between">
          <small className="text-muted">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount}
          </small>
          <nav>
            <ul className="pagination pagination-sm mb-0">
              <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setPage(page - 1)}>
                  Prev
                </button>
              </li>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
                  <button className="page-link" onClick={() => setPage(p)}>
                    {p}
                  </button>
                </li>
              ))}
              <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setPage(page + 1)}>
                  Next
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}

      {isGrouped && (
        <small className="text-muted">
          {filtered.length} result(s) across {groupKeys.length} group(s). Pagination off while grouped.
        </small>
      )}
    </div>
  );
}
