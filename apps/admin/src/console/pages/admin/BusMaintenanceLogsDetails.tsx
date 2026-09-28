import React, { useState, useEffect } from 'react';
import { api } from "@/lib/api";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

interface LogDetail {
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
}

interface BusInfo {
    id: string;
    coachNumber: string;
    registrationNumber: string;
    brand?: string | null;
    model?: string | null;
}

const BusMaintenanceLogsDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [log, setLog] = useState<LogDetail | null>(null);
    const [bus, setBus] = useState<BusInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (!id) return;
        (async () => {
            setLoading(true);
            try {
                const res = await api.get(`api/BusMaintenanceLogs/${id}`);
                const data = res.data;
                setLog(data);

                if (data.busId) {
                    try {
                        const busRes = await api.get(`api/Buses/${data.busId}`);
                        setBus(busRes.data);
                    } catch {
                        setBus(null);
                    }
                }
            } catch (err: any) {
                console.error("Load maintenance log error:", err);
                toast.error(err.response?.data?.message || "Failed to load maintenance log");
                navigate('/admin/bus-maintenance-logs');
            } finally {
                setLoading(false);
            }
        })();
    }, [id, navigate]);

    const handleDelete = async () => {
        if (!log || !window.confirm(`Delete maintenance log "${log.title}"? This cannot be undone.`)) return;
        setDeleting(true);
        try {
            await api.delete(`api/BusMaintenanceLogs/${log.id}`);
            toast.success("Maintenance log deleted successfully!");
            navigate('/admin/bus-maintenance-logs');
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to delete maintenance log");
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="container-fluid py-5 text-center min-vh-100 d-flex align-items-center justify-content-center">
                <div className="spinner-border text-primary mr-2" role="status"></div>
                <span className="text-muted font-italic">Loading maintenance log...</span>
            </div>
        );
    }

    if (!log) {
        return <div className="p-6">Maintenance log not found.</div>;
    }

    const isOverdue = log.nextDueDateUtc ? new Date(log.nextDueDateUtc).getTime() < Date.now() : false;
    const isDueSoon = log.nextDueDateUtc
        ? (new Date(log.nextDueDateUtc).getTime() - Date.now()) / (1000 * 60 * 60 * 24) <= 30 && !isOverdue
        : false;

    return (
        <div className="container-fluid py-4 bg-light min-vh-100">
            <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 shadow-sm rounded border-left border-primary" style={{ borderLeftWidth: '5px' }}>
                <div>
                    <h5 className="mb-0 text-primary font-weight-bold">
                        <i className="fas fa-tools mr-2"></i> {log.title}
                    </h5>
                    <small className="text-muted font-monospace">Log ID: {log.id}</small>
                </div>
                <div className="d-flex gap-2">
                    <button className="btn btn-warning px-3" onClick={() => navigate(`/admin/bus-maintenance-logs/edit/${log.id}`)}>
                        <i className="fas fa-edit mr-1"></i> Edit
                    </button>
                    <button className="btn btn-outline-danger px-3" disabled={deleting} onClick={handleDelete}>
                        {deleting ? <span className="spinner-border spinner-border-sm mr-1"></span> : <i className="fas fa-trash-alt mr-1"></i>} Delete
                    </button>
                    <button className="btn btn-outline-secondary px-3" onClick={() => navigate('/admin/bus-maintenance-logs')}>
                        Back to list
                    </button>
                </div>
            </div>

            <div className="row">
                <div className="col-lg-4">
                    <div className="card shadow-sm border-0 mb-4 text-center">
                        <div className="card-body py-4">
                            <div className="rounded-circle bg-primary-subtle text-primary d-inline-flex align-items-center justify-content-center mb-3" style={{ width: 64, height: 64 }}>
                                <i className="fas fa-bus fa-2x"></i>
                            </div>
                            <h4 className="font-weight-bold text-dark mb-0">{bus?.coachNumber || '—'}</h4>
                            <div className="text-muted small font-monospace">{bus?.registrationNumber || log.busId}</div>
                            {(bus?.brand || bus?.model) && (
                                <div className="text-muted small mt-1">{bus?.brand} {bus?.model}</div>
                            )}
                            <hr />
                            <h3 className="font-weight-bold text-success mb-0">
                                {log.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </h3>
                            <div className="text-muted small">Maintenance Cost</div>
                            <div className="mt-3">
                                {log.nextDueDateUtc ? (
                                    <span className={`badge ${isOverdue ? 'bg-danger' : isDueSoon ? 'bg-warning text-dark' : 'bg-success'}`}>
                                        {isOverdue ? 'Overdue' : isDueSoon ? 'Due Soon' : 'On Schedule'}
                                    </span>
                                ) : (
                                    <span className="badge bg-secondary">No Next Due Date</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-lg-8">
                    <div className="card shadow-sm border-0">
                        <div className="card-header bg-white border-bottom">
                            <strong><i className="fas fa-info-circle mr-2 text-primary"></i>Details</strong>
                        </div>
                        <div className="card-body">
                            <table className="table table-sm mb-0">
                                <tbody>
                                    <tr><th style={{ width: '40%' }}>Maintenance Date</th><td>{new Date(log.maintenanceDateUtc).toLocaleString()}</td></tr>
                                    <tr><th>Odometer</th><td>{log.odometerKm != null ? `${log.odometerKm.toLocaleString()} km` : <span className="text-muted">—</span>}</td></tr>
                                    <tr><th>Next Due Date</th><td>{log.nextDueDateUtc ? new Date(log.nextDueDateUtc).toLocaleString() : <span className="text-muted">—</span>}</td></tr>
                                    <tr><th>Performed By</th><td>{log.performedBy || <span className="text-muted">—</span>}</td></tr>
                                    <tr>
                                        <th>Description</th>
                                        <td style={{ whiteSpace: 'pre-wrap' }}>{log.description || <span className="text-muted">—</span>}</td>
                                    </tr>
                                    <tr><th>Created (UTC)</th><td>{log.createdAtUtc ? new Date(log.createdAtUtc).toLocaleString() : "—"}</td></tr>
                                    <tr><th>Updated (UTC)</th><td>{log.updatedAtUtc ? new Date(log.updatedAtUtc).toLocaleString() : "—"}</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BusMaintenanceLogsDetails;
