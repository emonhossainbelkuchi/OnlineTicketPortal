import React, { useState, useEffect, useMemo } from 'react';
import { api } from "@/lib/api";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export interface BusMaintenanceLogDto {
    id: string;
    busId: string;
    maintenanceDateUtc: string;
    odometerKm?: number | null;
    title: string;
    description?: string | null;
    cost: number;
    nextDueDateUtc?: string | null;
    performedBy?: string | null;
    createdAtUtc?: string;
    updatedAtUtc?: string | null;
    rowVersion: string;
}

interface BusInfo {
    id: string;
    coachNumber: string;
    registrationNumber: string;
}

const PAGE_SIZE = 10;

const BusMaintenanceLogsList: React.FC = () => {
    const navigate = useNavigate();
    const [logs, setLogs] = useState<BusMaintenanceLogDto[]>([]);
    const [buses, setBuses] = useState<Record<string, BusInfo>>({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [busFilter, setBusFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Fetch buses for name/registration lookup (so BusId shows human labels)
            const busMap: Record<string, BusInfo> = {};
            try {
                const busRes = await api.get("api/Buses");
                (busRes.data || []).forEach((b: any) => {
                    busMap[b.id] = { id: b.id, coachNumber: b.coachNumber, registrationNumber: b.registrationNumber };
                });
            } catch (e) {
                console.warn("Could not load buses map:", e);
            }
            setBuses(busMap);

            // 2. Fetch maintenance logs — real API, real SQL data, no local/mock source.
            const res = await api.get("api/BusMaintenanceLogs");
            setLogs(Array.isArray(res.data) ? res.data : []);
        } catch (err: any) {
            console.error("Failed to load maintenance logs:", err);
            toast.error(err.response?.data?.message || "Failed to load bus maintenance logs");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleDelete = async (id: string, title: string) => {
        if (!window.confirm(`Are you sure you want to delete maintenance log "${title}"?`)) return;
        setDeletingId(id);
        try {
            await api.delete(`api/BusMaintenanceLogs/${id}`);
            toast.success("Maintenance log deleted successfully!");
            setLogs(prev => prev.filter(l => l.id !== id));
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.response?.data || "Failed to delete maintenance log");
        } finally {
            setDeletingId(null);
        }
    };

    const busLabel = (busId: string) => {
        const b = buses[busId];
        return b ? `${b.coachNumber} (${b.registrationNumber})` : busId;
    };

    const filteredLogs = useMemo(() => {
        return logs.filter(l => {
            const bus = buses[l.busId];
            const haystack = [
                l.title,
                l.description || '',
                l.performedBy || '',
                bus?.coachNumber || '',
                bus?.registrationNumber || '',
            ].join(' ').toLowerCase();

            const matchesSearch = haystack.includes(searchTerm.toLowerCase());
            const matchesBus = busFilter === 'all' || l.busId === busFilter;
            return matchesSearch && matchesBus;
        }).sort((a, b) => new Date(b.maintenanceDateUtc).getTime() - new Date(a.maintenanceDateUtc).getTime());
    }, [logs, buses, searchTerm, busFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
    const pagedLogs = filteredLogs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    useEffect(() => { setPage(1); }, [searchTerm, busFilter]);

    const busKeys = Object.keys(buses);
    const isDueSoon = (nextDueDateUtc?: string | null) => {
        if (!nextDueDateUtc) return false;
        const daysLeft = (new Date(nextDueDateUtc).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        return daysLeft <= 30;
    };
    const isOverdue = (nextDueDateUtc?: string | null) => {
        if (!nextDueDateUtc) return false;
        return new Date(nextDueDateUtc).getTime() < Date.now();
    };

    const totalCost = filteredLogs.reduce((sum, l) => sum + (l.cost || 0), 0);

    return (
        <div className="container-fluid py-4 bg-light min-vh-100">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 shadow-sm rounded border-left border-primary" style={{ borderLeftWidth: '5px' }}>
                <div>
                    <h5 className="mb-1 text-primary font-weight-bold">
                        <i className="fas fa-tools mr-2"></i> Bus Maintenance Logs
                    </h5>
                    <small className="text-muted font-monospace">api/BusMaintenanceLogs</small>
                </div>
                <div className="d-flex gap-2">
                    <button
                        type="button"
                        className="btn btn-outline-secondary px-3 shadow-sm"
                        onClick={loadData}
                        disabled={loading}
                    >
                        <i className={`fas fa-sync-alt mr-1 ${loading ? 'fa-spin' : ''}`}></i> Refresh
                    </button>
                    <Link
                        to="/admin/bus-maintenance-logs/create"
                        className="btn btn-primary px-3 shadow-sm font-weight-bold"
                    >
                        <i className="fas fa-plus mr-1"></i> New Maintenance Log
                    </Link>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="row g-3 mb-4">
                <div className="col-md-4">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-body d-flex align-items-center gap-3">
                            <div className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center" style={{ width: 46, height: 46 }}>
                                <i className="fas fa-list fa-lg"></i>
                            </div>
                            <div>
                                <div className="h5 mb-0 font-weight-bold">{filteredLogs.length}</div>
                                <div className="small text-muted">Total Log Entries</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-body d-flex align-items-center gap-3">
                            <div className="rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center" style={{ width: 46, height: 46 }}>
                                <i className="fas fa-coins fa-lg"></i>
                            </div>
                            <div>
                                <div className="h5 mb-0 font-weight-bold">{totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                <div className="small text-muted">Total Maintenance Cost</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-body d-flex align-items-center gap-3">
                            <div className="rounded-circle bg-warning-subtle text-warning d-flex align-items-center justify-content-center" style={{ width: 46, height: 46 }}>
                                <i className="fas fa-exclamation-triangle fa-lg"></i>
                            </div>
                            <div>
                                <div className="h5 mb-0 font-weight-bold">{filteredLogs.filter(l => isDueSoon(l.nextDueDateUtc) || isOverdue(l.nextDueDateUtc)).length}</div>
                                <div className="small text-muted">Due Soon / Overdue</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="card border-0 shadow-sm rounded-lg mb-3">
                <div className="card-body p-3">
                    <div className="row g-3 align-items-center">
                        <div className="col-md-6">
                            <div className="input-group">
                                <span className="input-group-text bg-white border-end-0">
                                    <i className="fas fa-search text-muted"></i>
                                </span>
                                <input
                                    type="text"
                                    className="form-control border-start-0"
                                    placeholder="Search by title, description, bus, performed by..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="col-md-6 d-flex justify-content-md-end">
                            <select
                                className="form-select form-select-sm w-auto"
                                value={busFilter}
                                onChange={(e) => setBusFilter(e.target.value)}
                            >
                                <option value="all">All Buses ({busKeys.length})</option>
                                {busKeys.map(id => (
                                    <option key={id} value={id}>{busLabel(id)}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="card border-0 shadow-sm rounded-lg">
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead className="bg-light">
                            <tr className="text-uppercase small text-muted">
                                <th className="ps-3">Bus</th>
                                <th>Maintenance Date</th>
                                <th>Odometer (km)</th>
                                <th>Title</th>
                                <th>Description</th>
                                <th>Cost</th>
                                <th>Next Due</th>
                                <th>Performed By</th>
                                <th className="text-end pe-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="text-center py-5">
                                        <div className="spinner-border text-primary mr-2" role="status"></div>
                                        <span className="text-muted font-italic">Loading maintenance logs...</span>
                                    </td>
                                </tr>
                            ) : pagedLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="text-center py-5 text-muted">
                                        <i className="fas fa-tools fa-2x mb-2 d-block opacity-25"></i>
                                        No maintenance logs found. Click "New Maintenance Log" to add one.
                                    </td>
                                </tr>
                            ) : (
                                pagedLogs.map(log => (
                                    <tr key={log.id}>
                                        <td className="ps-3">
                                            <span className="font-weight-bold text-dark">{buses[log.busId]?.coachNumber || '—'}</span>
                                            <div className="small text-muted font-monospace">{buses[log.busId]?.registrationNumber || log.busId}</div>
                                        </td>
                                        <td>{new Date(log.maintenanceDateUtc).toLocaleString()}</td>
                                        <td>{log.odometerKm != null ? log.odometerKm.toLocaleString() : '—'}</td>
                                        <td className="font-weight-bold">{log.title}</td>
                                        <td className="text-truncate" style={{ maxWidth: 220 }} title={log.description || ''}>
                                            {log.description || <span className="text-muted">—</span>}
                                        </td>
                                        <td>{log.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td>
                                            {log.nextDueDateUtc ? (
                                                <span className={`badge ${isOverdue(log.nextDueDateUtc) ? 'bg-danger' : isDueSoon(log.nextDueDateUtc) ? 'bg-warning text-dark' : 'bg-light text-dark border'}`}>
                                                    {new Date(log.nextDueDateUtc).toLocaleDateString()}
                                                </span>
                                            ) : <span className="text-muted">—</span>}
                                        </td>
                                        <td>{log.performedBy || <span className="text-muted">—</span>}</td>
                                        <td className="text-end pe-3">
                                            <div className="btn-group btn-group-sm">
                                                <button
                                                    className="btn btn-outline-info"
                                                    title="View details"
                                                    onClick={() => navigate(`/admin/bus-maintenance-logs/${log.id}`)}
                                                >
                                                    <i className="fas fa-eye"></i>
                                                </button>
                                                <button
                                                    className="btn btn-outline-primary"
                                                    title="Edit"
                                                    onClick={() => navigate(`/admin/bus-maintenance-logs/edit/${log.id}`)}
                                                >
                                                    <i className="fas fa-edit"></i>
                                                </button>
                                                <button
                                                    className="btn btn-outline-danger"
                                                    title="Delete"
                                                    disabled={deletingId === log.id}
                                                    onClick={() => handleDelete(log.id, log.title)}
                                                >
                                                    {deletingId === log.id ? (
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
                {!loading && filteredLogs.length > 0 && (
                    <div className="card-footer bg-white d-flex justify-content-between align-items-center py-2">
                        <small className="text-muted">
                            Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filteredLogs.length)} of {filteredLogs.length}
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

export default BusMaintenanceLogsList;
