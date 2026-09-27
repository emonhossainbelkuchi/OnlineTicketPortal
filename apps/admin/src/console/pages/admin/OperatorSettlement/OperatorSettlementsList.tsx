import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faSyncAlt,
  faEye,
  faSearch,
  faSortUp,
  faSortDown,
  faSort,
  faExchangeAlt,
} from '@fortawesome/free-solid-svg-icons';
import useOperatorSettlements, { GroupByField, SortField } from '@/hooks/useOperatorSettlements';
import {
  OperatorSettlement,
  SettlementStatus,
  SettlementStatusLabel,
  SettlementStatusBadgeClass,
  SettlementDirectionLabel,
} from '@/types/operatorSettlement.types';

export default function OperatorSettlementsList() {
  const navigate = useNavigate();
  const {
    grouped,
    paged,
    filtered,
    loading,
    error,
    refresh,
    lastSyncedAt,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    groupBy,
    setGroupBy,
    sortField,
    sortDir,
    toggleSort,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    totalCount,
    stats,
  } = useOperatorSettlements();

  const sortIcon = (field: SortField) => {
    if (sortField !== field) return faSort;
    return sortDir === 'asc' ? faSortUp : faSortDown;
  };

  const SortableTh = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th role="button" onClick={() => toggleSort(field)} className="user-select-none">
      {children} <FontAwesomeIcon icon={sortIcon(field)} className="text-muted small ms-1" />
    </th>
  );

  const renderRow = (row: OperatorSettlement) => (
    <tr key={row.id}>
      <td>{row.settlementNo}</td>
      <td className="text-truncate" style={{ maxWidth: 160 }} title={row.busOperatorId}>
        {row.busOperatorId}
      </td>
      <td>
        {row.fromDate} → {row.toDate}
      </td>
      <td>
        <FontAwesomeIcon icon={faExchangeAlt} className="text-muted me-1" />
        {SettlementDirectionLabel[row.direction]}
      </td>
      <td className="text-end">{row.netAmount.toLocaleString()} BDT</td>
      <td>
        <span className={`badge ${SettlementStatusBadgeClass[row.status]}`}>
          {SettlementStatusLabel[row.status]}
        </span>
      </td>
      <td>{new Date(row.createdAtUtc).toLocaleString()}</td>
      <td className="text-end">
        <Link
          className="btn btn-outline-secondary btn-sm"
          to={`/admin/resource/OperatorSettlement/${row.id}`}
          title="Details"
        >
          <FontAwesomeIcon icon={faEye} />
        </Link>
      </td>
    </tr>
  );

  const groupKeys = Object.keys(grouped);
  const isGrouped = groupBy !== 'none';

  return (
    <div className="container-fluid py-3">
      <nav aria-label="breadcrumb" className="mb-1">
        <ol className="breadcrumb small">
          <li className="breadcrumb-item">Admin</li>
          <li className="breadcrumb-item active">Operator Settlements</li>
        </ol>
      </nav>

      <div className="d-flex flex-wrap align-items-center justify-content-between mb-2 gap-2">
        <div>
          <h4 className="mb-0">
            <FontAwesomeIcon icon={faExchangeAlt} className="text-primary me-2" />
            Operator Settlements
          </h4>
          <div className="d-flex align-items-center gap-2 mt-1">
            <span className="badge bg-success-subtle text-success border border-success">
              <span className="d-inline-block rounded-circle bg-success me-1" style={{ width: 6, height: 6 }} />
              Live
            </span>
            <small className="text-muted">
              api/OperatorSettlements
              {lastSyncedAt ? ` — last synced ${lastSyncedAt.toLocaleTimeString()}` : ''}
            </small>
          </div>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={() => refresh()} disabled={loading}>
            <FontAwesomeIcon icon={faSyncAlt} spin={loading} className="me-1" />
            Refresh
          </button>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/admin/resource/OperatorSettlement/create')}
          >
            <FontAwesomeIcon icon={faPlus} className="me-1" />
            Generate Settlement
          </button>
        </div>
      </div>

      <div className="row g-3 my-2">
        <div className="col-6 col-md-3">
          <div className="card text-white bg-primary shadow-sm">
            <div className="card-body py-2">
              <div className="text-uppercase small opacity-75">Total Settlements</div>
              <div className="fs-4 fw-bold">{stats.total}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card text-white bg-secondary shadow-sm">
            <div className="card-body py-2">
              <div className="text-uppercase small opacity-75">Draft</div>
              <div className="fs-4 fw-bold">{stats.draft}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card text-dark shadow-sm" style={{ backgroundColor: '#0dcaf0' }}>
            <div className="card-body py-2">
              <div className="text-uppercase small opacity-75">Approved</div>
              <div className="fs-4 fw-bold">{stats.approved}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card text-white bg-success shadow-sm">
            <div className="card-body py-2">
              <div className="text-uppercase small opacity-75">Paid (Net)</div>
              <div className="fs-4 fw-bold">BDT {stats.paidNet.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-2 mb-3">
        <div className="col-md-5">
          <div className="input-group">
            <span className="input-group-text">
              <FontAwesomeIcon icon={faSearch} />
            </span>
            <input
              className="form-control"
              placeholder="Search by Settlement No or Bus Operator ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="col-md-2">
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value === 'all' ? 'all' : (Number(e.target.value) as SettlementStatus))
            }
          >
            <option value="all">All Statuses</option>
            <option value={SettlementStatus.Draft}>Draft</option>
            <option value={SettlementStatus.Approved}>Approved</option>
            <option value={SettlementStatus.Paid}>Paid</option>
            <option value={SettlementStatus.Cancelled}>Cancelled</option>
          </select>
        </div>
        <div className="col-md-3">
          <select
            className="form-select"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupByField)}
          >
            <option value="none">No grouping</option>
            <option value="busOperatorId">Group by Operator</option>
            <option value="status">Group by Status</option>
            <option value="direction">Group by Direction</option>
          </select>
        </div>
        <div className="col-md-2">
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
              <SortableTh field="settlementNo">Settlement No</SortableTh>
              <SortableTh field="busOperatorId">Bus Operator ID</SortableTh>
              <th>Period</th>
              <th>Direction</th>
              <SortableTh field="netAmount">Net Amount</SortableTh>
              <SortableTh field="status">Status</SortableTh>
              <SortableTh field="createdAtUtc">Created</SortableTh>
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
                      <strong>{key}</strong> <span className="text-muted">({grouped[key].length})</span>
                    </td>
                  </tr>
                  {grouped[key].map(renderRow)}
                </>
              ))
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-muted py-4">
                  No settlements found.
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
