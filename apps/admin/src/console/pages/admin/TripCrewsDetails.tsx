import React, { useState, useEffect } from 'react';
import { api } from "@/lib/api";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

interface TripCrewDetail {
    id: string;
    tripId: string;
    staffProfileId: string;
    role: string;
    assignedAtUtc: string;
    createdAtUtc?: string;
    updatedAtUtc?: string | null;
    rowVersion?: string;
}

interface TripInfo {
    id: string;
    tripCode: string;
    departureTimeUtc: string;
    arrivalTimeUtc: string;
    busOperatorId: string;
    status: string;
}

interface StaffInfo {
    id: string;
    employeeCode: string;
    role: string;
    busOperatorId?: string | null;
}

const roleBadgeClass = (role: string) => {
    switch (role) {
        case 'Driver': return 'badge-primary';
        case 'AssistantDriver': return 'badge-info';
        case 'Supervisor': return 'badge-success';
        case 'Helper': return 'badge-secondary';
        default: return 'badge-light';
    }
};

const TripCrewsDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [crew, setCrew] = useState<TripCrewDetail | null>(null);
    const [trip, setTrip] = useState<TripInfo | null>(null);
    const [staff, setStaff] = useState<StaffInfo | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        (async () => {
            setLoading(true);
            try {
                const crewRes = await api.get(`api/TripCrews/${id}`);
                const data = crewRes.data;
                setCrew(data);

                const [tripRes, staffRes] = await Promise.all([
                    api.get(`api/Trips/${data.tripId}`).catch(() => null),
                    api.get(`api/StaffProfiles/${data.staffProfileId}`).catch(() => null),
                ]);
                if (tripRes) setTrip(tripRes.data);
                if (staffRes) setStaff(staffRes.data);
            } catch (err: any) {
                console.error("Load trip crew error:", err);
                toast.error(err.response?.data?.message || "Failed to load crew assignment");
                navigate('/admin/trip-crews');
            } finally {
                setLoading(false);
            }
        })();
    }, [id, navigate]);

    if (loading) {
        return (
            <div className="container-fluid py-5 text-center min-vh-100 d-flex align-items-center justify-content-center">
                <div className="spinner-border text-primary mr-2" role="status"></div>
                <span className="text-muted font-italic">Loading crew assignment...</span>
            </div>
        );
    }

    if (!crew) {
        return <div className="p-6">Crew assignment not found.</div>;
    }

    return (
        <div className="container-fluid py-4 bg-light min-vh-100">
            <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 shadow-sm rounded border-left border-primary" style={{ borderLeftWidth: '5px' }}>
                <div>
                    <h5 className="mb-0 text-primary font-weight-bold">
                        <i className="fas fa-user-tag mr-2"></i> Crew Assignment
                    </h5>
                    <small className="text-muted">Assignment ID: <code>{crew.id}</code></small>
                </div>
                <div>
                    <button className="btn btn-warning px-3 mr-2" onClick={() => navigate(`/admin/trip-crews/edit/${crew.id}`)}>
                        <i className="fas fa-edit mr-1"></i> Edit
                    </button>
                    <button className="btn btn-outline-secondary px-3" onClick={() => navigate('/admin/trip-crews')}>
                        Back to list
                    </button>
                </div>
            </div>

            <div className="row">
                <div className="col-lg-6">
                    <div className="card shadow-sm border-0 mb-4">
                        <div className="card-header bg-white font-weight-bold">
                            <i className="fas fa-route mr-2 text-primary"></i> Trip
                        </div>
                        <div className="card-body">
                            {trip ? (
                                <table className="table table-sm mb-0">
                                    <tbody>
                                        <tr><th>Trip Code</th><td>{trip.tripCode}</td></tr>
                                        <tr><th>Departure (UTC)</th><td>{new Date(trip.departureTimeUtc).toLocaleString()}</td></tr>
                                        <tr><th>Arrival (UTC)</th><td>{new Date(trip.arrivalTimeUtc).toLocaleString()}</td></tr>
                                        <tr><th>Status</th><td>{trip.status}</td></tr>
                                        <tr><th>Trip ID</th><td><code>{trip.id}</code></td></tr>
                                    </tbody>
                                </table>
                            ) : (
                                <span className="text-muted">Trip details unavailable (Trip ID: {crew.tripId})</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="col-lg-6">
                    <div className="card shadow-sm border-0 mb-4">
                        <div className="card-header bg-white font-weight-bold">
                            <i className="fas fa-id-badge mr-2 text-primary"></i> Staff
                        </div>
                        <div className="card-body">
                            {staff ? (
                                <table className="table table-sm mb-0">
                                    <tbody>
                                        <tr><th>Employee Code</th><td>{staff.employeeCode}</td></tr>
                                        <tr><th>Staff Role</th><td>{staff.role}</td></tr>
                                        <tr><th>Staff ID</th><td><code>{staff.id}</code></td></tr>
                                    </tbody>
                                </table>
                            ) : (
                                <span className="text-muted">Staff details unavailable (Staff ID: {crew.staffProfileId})</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="card shadow-sm border-0">
                <div className="card-header bg-white font-weight-bold">
                    <i className="fas fa-info-circle mr-2 text-primary"></i> Assignment Details
                </div>
                <div className="card-body">
                    <table className="table table-sm mb-0">
                        <tbody>
                            <tr><th>Crew Role</th><td><span className={`badge ${roleBadgeClass(crew.role)}`}>{crew.role}</span></td></tr>
                            <tr><th>Assigned At (UTC)</th><td>{new Date(crew.assignedAtUtc).toLocaleString()}</td></tr>
                            <tr><th>Created (UTC)</th><td>{crew.createdAtUtc || "—"}</td></tr>
                            <tr><th>Updated (UTC)</th><td>{crew.updatedAtUtc || "—"}</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TripCrewsDetails;
