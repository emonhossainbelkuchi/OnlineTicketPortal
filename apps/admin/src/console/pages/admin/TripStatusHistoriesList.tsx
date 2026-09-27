import React, { useState, useEffect } from 'react';
import { api } from "@/lib/api";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

interface HistoryRow {
    id: string;
    tripId: string;
    changedByUserId?: string | null;
    status: string;
    changedAtUtc: string;
    remarks?: string | null;
    createdAtUtc?: string;
}

interface TripLookup {
    id: string;
    tripCode: string;
    busOperatorId: string;
}

const statusBadgeClass = (status: string) => {
    switch (status) {
        case 'Scheduled': return 'badge-info';
        case 'Boarding': return 'badge-primary';
        case 'Departed':
        case 'Running': return 'badge-warning';
        case 'Arrived':
        case 'Completed': return 'badge-success';
        case 'Delayed': return 'badge-warning';
        case 'Cancelled': return 'badge-danger';
        default: return 'badge-secondary';
    }
};

const statusIcon = (status: string) => {
    switch (status) {
        case 'Scheduled': return 'fa-calendar-check';
        case 'Boarding': return 'fa-door-open';
        case 'Departed': return 'fa-bus';
        case 'Running': return 'fa-road';
        case 'Arrived': return 'fa-flag-checkered';
        case 'Completed': return 'fa-check-circle';
        case 'Delayed': return 'fa-clock';
        case 'Cancelled': return 'fa-times-circle';
        default: return 'fa-circle';
    }
};

const TripStatusHistoriesList: React.FC = () => {
    const [rows, setRows] = useState<HistoryRow[]>([]);
    const [trips, setTrips] = useState<Record<string, TripLookup>>({});
    const [loading, setLoading] = useState(true);
    const [tripFilter, setTripFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const [historyRes, tripsRes] = await Promise.all([
                    api.get("api/TripStatusHistories"),
                    api.get("api/Trips"),
                ]);

                setRows(historyRes.data || []);

                const tripMap: Record<string, TripLookup> = {};
                (tripsRes.data || []).forEach((t: any) => { tripMap[t.id] = t; });
                setTrips(tripMap);
            } catch (err: any) {
                console.error("Load trip status histories error:", err);
                toast.error(err.response?.data?.message || "Failed to load status history");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const uniqueStatuses = Array.from(new Set(rows.map(r => r.status))).sort();

    const filteredRows = rows.filter(r => {
        const trip = trips[r.tripId];
        const matchesTrip = !tripFilter || (trip?.tripCode || '').toLowerCase().includes(tripFilter.toLowerCase());
        const matchesStatus = !statusFilter || r.status === statusFilter;
        return matchesTrip && matchesStatus;
    });

    return (
        <div className="container-fluid py-4 bg-light min-vh-100">
            <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 shadow-sm rounded border-left border-primary" style={{ borderLeftWidth: '5px' }}>
                <div>
                    <h5 className="mb-0 text-primary font-weight-bold">
                        <i className="fas fa-history mr-2"></i> Trip Status History
                    </h5>
                    <small className="text-muted">Read-only audit trail of every status change made to a trip</small>
                </div>
                <span className="badge badge-light border px-3 py-2">
                    <i className="fas fa-lock mr-1"></i> Read-only
                </span>
            </div>

            <div className="card shadow-sm border-0 mb-3">
                <div className="card-body py-3">
                    <div className="row g-2 align-items-end">
                        <div className="col-md-5">
                            <label className="small font-weight-bold mb-1">Filter by Trip Code</label>
                            <div className="input-group">
                                <span className="input-group-text bg-white"><i className="fas fa-search text-muted"></i></span>
                                <input
                                    className="form-control"
                                    placeholder="e.g. DHK-CTG-0630"
                                    value={tripFilter}
                                    onChange={(e) => setTripFilter(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="col-md-4">
                            <label className="small font-weight-bold mb-1">Filter by Status</label>
                            <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                <option value="">All statuses</option>
                                {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="col-md-3 text-md-right">
                            <span className="text-muted small">{filteredRows.length} of {rows.length} entries</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card shadow-sm border-0">
                <div className="card-body p-0">
                    {loading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-primary mr-2" role="status"></div>
                            <span className="text-muted font-italic">Loading status history...</span>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover mb-0 align-middle">
                                <thead className="thead-light">
                                    <tr>
                                        <th>Trip</th>
                                        <th>Status</th>
                                        <th>Changed At (UTC)</th>
                                        <th>Remarks</th>
                                        <th className="text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRows.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="text-center text-muted py-4">
                                                No status history entries found.
                                            </td>
                                        </tr>
                                    )}
                                    {filteredRows.map(r => {
                                        const trip = trips[r.tripId];
                                        return (
                                            <tr key={r.id}>
                                                <td>
                                                    {trip ? (
                                                        <span className="font-weight-bold">{trip.tripCode}</span>
                                                    ) : (
                                                        <span className="text-muted">Unknown trip</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span className={`badge ${statusBadgeClass(r.status)}`}>
                                                        <i className={`fas ${statusIcon(r.status)} mr-1`}></i>
                                                        {r.status}
                                                    </span>
                                                </td>
                                                <td>{new Date(r.changedAtUtc).toLocaleString()}</td>
                                                <td className="text-muted">{r.remarks || "—"}</td>
                                                <td className="text-right">
                                                    <Link to={`/admin/trip-status-histories/${r.id}`} className="btn btn-sm btn-outline-info">
                                                        View
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TripStatusHistoriesList;
