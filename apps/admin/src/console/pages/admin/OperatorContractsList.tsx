import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useOperatorContracts } from '@/hooks/useOperatorContracts';
import { deleteOperatorContract, extractErrorMessage } from '@/services/operatorContractService';
import { GatewayFeeBearerLabel } from '@/types/operatorContract.types';

const OperatorContractsList: React.FC = () => {
    const navigate = useNavigate();
    const {
        items,
        allCount,
        filteredCount,
        stats,
        operatorOptions,
        loading,
        error,
        lastSyncedAt,
        refresh,
        search,
        setSearch,
        operatorFilter,
        setOperatorFilter,
        statusFilter,
        setStatusFilter,
        page,
        setPage,
        totalPages,
    } = useOperatorContracts();

    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleDelete = async (id: string, contractNo: string) => {
        if (!window.confirm(`Are you sure you want to delete contract "${contractNo}"?`)) return;
        setDeletingId(id);
        try {
            await deleteOperatorContract(id);
            toast.success('Operator contract deleted successfully!');
        } catch (err) {
            toast.error(extractErrorMessage(err));
        } finally {
            setDeletingId(null);
        }
    };

    const isExpiringSoon = (effectiveTo?: string | null) => {
        if (!effectiveTo) return false;
        const daysLeft = (new Date(effectiveTo).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        return daysLeft >= 0 && daysLeft <= 30;
    };
    const isExpired = (effectiveTo?: string | null) => {
        if (!effectiveTo) return false;
        return new Date(effectiveTo).getTime() < Date.now();
    };

    const feeBadgeClass = (bearer: number) => {
        switch (bearer) {
            case 1: return 'bg-primary-subtle text-primary'; // Platform
            case 3: return 'bg-info-subtle text-info'; // Customer
            default: return 'bg-secondary-subtle text-secondary'; // Operator
        }
    };

    return (
        <div className="container-fluid py-4 bg-light min-vh-100">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 shadow-sm rounded border-left border-primary" style={{ borderLeftWidth: '5px' }}>
                <div>
                    <h5 className="mb-1 text-primary font-weight-bold">
                        <i className="fas fa-file-contract mr-2"></i> Operator Contracts
                    </h5>
                    <small className="text-muted font-monospace">api/OperatorContracts</small>
                </div>
                <div className="d-flex align-items-center gap-3">
                    <div className="d-flex align-items-center gap-1 small text-muted">
                        <span className="live-dot"></span>
                        <span>
                            Live{lastSyncedAt ? ` · synced ${lastSyncedAt.toLocaleTimeString()}` : ''}
                        </span>
                    </div>
                    <button
                        type="button"
                        className="btn btn-outline-secondary px-3 shadow-sm"
                        onClick={refresh}
                        disabled={loading}
                    >
                        <i className={`fas fa-sync-alt mr-1 ${loading ? 'fa-spin' : ''}`}></i> Refresh
                    </button>
                    <Link
                        to="/admin/operator-contracts/create"
                        className="btn btn-primary px-3 shadow-sm font-weight-bold"
                    >
                        <i className="fas fa-plus mr-1"></i> New Contract
                    </Link>
                </div>
            </div>

            <style>{`
                .live-dot {
                    display: inline-block;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background-color: #28a745;
                    box-shadow: 0 0 0 rgba(40, 167, 69, 0.6);
                    animation: live-pulse 2s infinite;
                }
                @keyframes live-pulse {
                    0% { box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.6); }
                    70% { box-shadow: 0 0 0 6px rgba(40, 167, 69, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(40, 167, 69, 0); }
                }
            `}</style>

            {/* Summary Cards */}
            <div className="row g-3 mb-4">
                <div className="col-md-3">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-body d-flex align-items-center gap-3">
                            <div className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center" style={{ width: 46, height: 46 }}>
                                <i className="fas fa-file-signature fa-lg"></i>
                            </div>
                            <div>
                                <div className="h5 mb-0 font-weight-bold">{stats.total}</div>
                                <div className="small text-muted">Total Contracts</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-body d-flex align-items-center gap-3">
                            <div className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center" style={{ width: 46, height: 46 }}>
                                <i className="fas fa-check-circle fa-lg"></i>
                            </div>
                            <div>
                                <div className="h5 mb-0 font-weight-bold">{stats.active}</div>
                                <div className="small text-muted">Active Contracts</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-body d-flex align-items-center gap-3">
                            <div className="rounded-circle bg-warning-subtle text-warning d-flex align-items-center justify-content-center" style={{ width: 46, height: 46 }}>
                                <i className="fas fa-hourglass-half fa-lg"></i>
                            </div>
                            <div>
                                <div className="h5 mb-0 font-weight-bold">{stats.expiringSoon}</div>
                                <div className="small text-muted">Expiring in 30 days</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-body d-flex align-items-center gap-3">
                            <div className="rounded-circle bg-info-subtle text-info d-flex align-items-center justify-content-center" style={{ width: 46, height: 46 }}>
                                <i className="fas fa-building fa-lg"></i>
                            </div>
                            <div>
                                <div className="h5 mb-0 font-weight-bold">{stats.distinctOperators}</div>
                                <div className="small text-muted">Operators Covered</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="card border-0 shadow-sm rounded-lg mb-3">
                <div className="card-body p-3">
                    <div className="row g-3 align-items-center">
                        <div className="col-md-5">
                            <div className="input-group">
                                <span className="input-group-text bg-white border-end-0">
                                    <i className="fas fa-search text-muted"></i>
                                </span>
                                <input
                                    type="text"
                                    className="form-control border-start-0"
                                    placeholder="Search by contract no, operator, fee bearer, notes..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="col-md-4">
                            <select
                                className="form-select form-select-sm"
                                value={operatorFilter}
                                onChange={(e) => setOperatorFilter(e.target.value)}
                            >
                                <option value="all">All Operators ({operatorOptions.length})</option>
                                {operatorOptions.map(([id, name]) => (
                                    <option key={id} value={id}>{name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-3 d-flex justify-content-md-end">
                            <select
                                className="form-select form-select-sm w-auto"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                            >
                                <option value="all">All Statuses</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger d-flex justify-content-between align-items-center">
                    <span><i className="fas fa-exclamation-circle mr-2"></i>{error}</span>
                    <button className="btn btn-sm btn-outline-danger" onClick={refresh}>Retry</button>
                </div>
            )}

            {/* Table */}
            <div className="card border-0 shadow-sm rounded-lg">
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead className="bg-light">
                            <tr className="text-uppercase small text-muted">
                                <th className="ps-3">Contract No</th>
                                <th>Bus Operator</th>
                                <th>Effective From</th>
                                <th>Effective To</th>
                                <th>Settlement Interval</th>
                                <th>Gateway Fee Bearer</th>
                                <th>Status</th>
                                <th className="text-end pe-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && items.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-5">
                                        <div className="spinner-border text-primary mr-2" role="status"></div>
                                        <span className="text-muted font-italic">Loading operator contracts...</span>
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-5 text-muted">
                                        <i className="fas fa-file-contract fa-2x mb-2 d-block opacity-25"></i>
                                        No operator contracts found. Click "New Contract" to add one.
                                    </td>
                                </tr>
                            ) : (
                                items.map((c) => (
                                    <tr key={c.id}>
                                        <td className="ps-3">
                                            <span className="font-weight-bold text-dark font-monospace">{c.contractNo}</span>
                                        </td>
                                        <td>
                                            <i className="fas fa-building mr-1 text-muted"></i>{c.busOperatorName}
                                        </td>
                                        <td>{new Date(c.effectiveFrom).toLocaleDateString()}</td>
                                        <td>
                                            {c.effectiveTo ? (
                                                <span className={isExpired(c.effectiveTo) ? 'text-danger font-weight-bold' : isExpiringSoon(c.effectiveTo) ? 'text-warning font-weight-bold' : ''}>
                                                    {new Date(c.effectiveTo).toLocaleDateString()}
                                                </span>
                                            ) : <span className="text-muted">—</span>}
                                        </td>
                                        <td>{c.settlementIntervalDays} day{c.settlementIntervalDays === 1 ? '' : 's'}</td>
                                        <td>
                                            <span className={`badge ${feeBadgeClass(c.gatewayFeeBearer)}`}>
                                                {GatewayFeeBearerLabel[c.gatewayFeeBearer]}
                                            </span>
                                        </td>
                                        <td>
                                            {c.isActive ? (
                                                <span className="badge bg-success">Active</span>
                                            ) : (
                                                <span className="badge bg-secondary">Inactive</span>
                                            )}
                                        </td>
                                        <td className="text-end pe-3">
                                            <div className="btn-group btn-group-sm">
                                                <button
                                                    className="btn btn-outline-info"
                                                    title="View details"
                                                    onClick={() => navigate(`/admin/operator-contracts/${c.id}`)}
                                                >
                                                    <i className="fas fa-eye"></i>
                                                </button>
                                                <button
                                                    className="btn btn-outline-primary"
                                                    title="Edit"
                                                    onClick={() => navigate(`/admin/operator-contracts/edit/${c.id}`)}
                                                >
                                                    <i className="fas fa-edit"></i>
                                                </button>
                                                <button
                                                    className="btn btn-outline-danger"
                                                    title="Delete"
                                                    disabled={deletingId === c.id}
                                                    onClick={() => handleDelete(c.id, c.contractNo)}
                                                >
                                                    {deletingId === c.id ? (
                                                        <span className="spinner-border spinner-border-sm"></span>
                                                    ) : (
                                                        <i className="fas fa-trash-alt"></i>
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {!loading && filteredCount > 0 && (
                    <div className="card-footer bg-white d-flex justify-content-between align-items-center py-2">
                        <small className="text-muted">
                            Showing {(page - 1) * 10 + 1}-{Math.min(page * 10, filteredCount)} of {filteredCount}
                            {filteredCount !== allCount && ` (filtered from ${allCount})`}
                        </small>
                        <div className="btn-group btn-group-sm">
                            <button className="btn btn-outline-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                                <i className="fas fa-chevron-left"></i>
                            </button>
                            <span className="btn btn-light disabled">Page {page} of {totalPages}</span>
                            <button className="btn btn-outline-secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                                <i className="fas fa-chevron-right"></i>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OperatorContractsList;
