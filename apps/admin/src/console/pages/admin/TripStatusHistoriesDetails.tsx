import React, { useState, useEffect } from 'react';
import { api } from "@/lib/api";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

interface HistoryDetail {
    id: string;
    tripId: string;
    changedByUserId?: string | null;
    status: string;
    changedAtUtc: string;
    remarks?: string | null;
    createdAtUtc?: string;
    updatedAtUtc?: string | null;
}

interface TripInfo {
    id: string;
    tripCode: string;
    departureTimeUtc: string;
    arrivalTimeUtc: string;
    status: string;
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

const TripStatusHistoriesDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [entry, setEntry] = useState<HistoryDetail | null>(null);
    const [trip, setTrip] = useState<TripInfo | null>(null);
    const [siblingHistory, setSiblingHistory] = useState<HistoryDetail[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        (async () => {
            setLoading(true);
            try {
                const res = await api.get(`api/TripStatusHistories/${id}`);
                const data = res.data;
                setEntry(data);

                const [tripRes, allHistoryRes] = await Promise.all([
                    api.get(`api/Trips/${data.tripId}`).catch(() => null),
                    api.get("api/TripStatusHistories").catch(() => null),
                ]);

                if (tripRes) setTrip(tripRes.data);
                if (allHistoryRes) {
                    const forThisTrip = (allHistoryRes.data || [])
                        .filter((h: HistoryDetail) => h.tripId === data.tripId)
                        .sort((a: HistoryDetail, b: HistoryDetail) =>
                            new Date(b.changedAtUtc).getTime() - new Date(a.changedAtUtc).getTime());
                    setSiblingHistory(forThisTrip);
                }
            } catch (err: any) {
                console.error("Load trip status history error:", err);
                toast.error(err.response?.data?.message || "Failed to load status history entry");
                navigate('/admin/trip-status-histories');
            } finally {
                setLoading(false);
            }
        })();
    }, [id, navigate]);

    if (loading) {
        return (
            <div className="container-fluid py-5 text-center min-vh-100 d-flex align-items-center justify-content-center">
                <div className="spinner-border text-primary mr-2" role="status"></div>
                <span className="text-muted font-italic">Loading status history entry...</span>
            </div>
        );
    }

    if (!entry) {
        return <div className="p-6">Status history entry not found.</div>;
    }

    return (
        <div className="container-fluid py-4 bg-light min-vh-100">
            <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 shadow-sm rounded border-left border-primary" style={{ borderLeftWidth: '5px' }}>
                <div>
                    <h5 className="mb-0 text-primary font-weight-bold">
                        <i className="fas fa-history mr-2"></i> Status Change Detail
                    </h5>
                    <small className="text-muted">Entry ID: <code>{entry.id}</code></small>
                </div>
                <div>
                    <span className="badge badge-light border px-3 py-2 mr-2">
                        <i className="fas fa-lock mr-1"></i> Read-only
                    </span>
                    <button className="btn btn-outline-secondary px-3" onClick={() => navigate('/admin/trip-status-histories')}>
                        Back to list
                    </button>
                </div>
            </div>

            <div className="row">
                <div className="col-lg-5">
                    <div className="card shadow-sm border-0 mb-4">
                        <div className="card-body text-center py-4">
                            <div className={`mb-3`} style={{ fontSize: '2.5rem' }}>
                                <i className={`fas ${statusIcon(entry.status)} text-primary`}></i>
                            </div>
                            <span className={`badge ${statusBadgeClass(entry.status)} px-3 py-2`} style={{ fontSize: '1rem' }}>
                                {entry.status}
                            </span>
                            <div className="text-muted mt-3">
                                {new Date(entry.changedAtUtc).toLocaleString()}
                            </div>
                        </div>
                        <div className="card-body border-top pt-3">
                            <table className="table table-sm mb-0">
                                <tbody>
                                    <tr><th>Trip</th><td>{trip ? trip.tripCode : <span className="text-muted">Unknown ({entry.tripId})</span>}</td></tr>
                                    <tr><th>Changed By User ID</th><td>{entry.changedByUserId ? <code>{entry.changedByUserId}</code> : <span className="text-muted">System / unknown</span>}</td></tr>
                                    <tr><th>Remarks</th><td>{entry.remarks || "—"}</td></tr>
                                    <tr><th>Recorded (UTC)</th><td>{entry.createdAtUtc || "—"}</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {trip && (
                        <div className="card shadow-sm border-0">
                            <div className="card-header bg-white font-weight-bold">
                                <i className="fas fa-route mr-2 text-primary"></i> Trip Context
                            </div>
                            <div className="card-body">
                                <table className="table table-sm mb-0">
                                    <tbody>
                                        <tr><th>Trip Code</th><td>{trip.tripCode}</td></tr>
                                        <tr><th>Current Status</th><td><span className={`badge ${statusBadgeClass(trip.status)}`}>{trip.status}</span></td></tr>
                                        <tr><th>Departure (UTC)</th><td>{new Date(trip.departureTimeUtc).toLocaleString()}</td></tr>
                                        <tr><th>Arrival (UTC)</th><td>{new Date(trip.arrivalTimeUtc).toLocaleString()}</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                <div className="col-lg-7">
                    <div className="card shadow-sm border-0">
                        <div className="card-header bg-white font-weight-bold">
                            <i className="fas fa-stream mr-2 text-primary"></i> Full Timeline for this Trip ({siblingHistory.length})
                        </div>
                        <div className="card-body">
                            {siblingHistory.length === 0 ? (
                                <div className="text-center text-muted py-4">No other history entries.</div>
                            ) : (
                                <ul className="list-unstyled mb-0" style={{ position: 'relative' }}>
                                    {siblingHistory.map((h, idx) => (
                                        <li key={h.id} className="d-flex mb-3 position-relative" style={{ paddingLeft: 8 }}>
                                            <div className="mr-3 text-center" style={{ minWidth: 32 }}>
                                                <div
                                                    className={`d-flex align-items-center justify-content-center rounded-circle ${h.id === entry.id ? 'bg-primary text-white' : 'bg-light text-muted border'}`}
                                                    style={{ width: 32, height: 32 }}
                                                >
                                                    <i className={`fas ${statusIcon(h.status)}`} style={{ fontSize: '0.75rem' }}></i>
                                                </div>
                                                {idx < siblingHistory.length - 1 && (
                                                    <div className="mx-auto" style={{ width: 2, height: 28, background: '#e0e0e0' }}></div>
                                                )}
                                            </div>
                                            <div className={`flex-grow-1 pb-2 ${h.id === entry.id ? 'font-weight-bold' : ''}`}>
                                                <div>
                                                    <span className={`badge ${statusBadgeClass(h.status)} mr-2`}>{h.status}</span>
                                                    {h.id === entry.id && <span className="badge badge-outline-primary border border-primary text-primary">Viewing</span>}
                                                </div>
                                                <div className="small text-muted">{new Date(h.changedAtUtc).toLocaleString()}</div>
                                                {h.remarks && <div className="small">{h.remarks}</div>}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TripStatusHistoriesDetails;
