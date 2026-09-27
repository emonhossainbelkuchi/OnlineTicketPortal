import React, { useState, useEffect } from 'react';
import { api } from "@/lib/api";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

interface TripCrewRow {
    id: string;
    tripId: string;
    staffProfileId: string;
    role: string;
    assignedAtUtc: string;
    createdAtUtc?: string;
    updatedAtUtc?: string | null;
    rowVersion?: string;
}

interface TripLookup {
    id: string;
    tripCode: string;
    departureTimeUtc: string;
    arrivalTimeUtc: string;
}

interface StaffLookup {
    id: string;
    employeeCode: string;
    role: string;
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

const TripCrewsList: React.FC = () => {
    const navigate = useNavigate();
    const [crews, setCrews] = useState<TripCrewRow[]>([]);
    const [trips, setTrips] = useState<Record<string, TripLookup>>({});
    const [staff, setStaff] = useState<Record<string, StaffLookup>>({});
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const [crewRes, tripsRes, staffRes] = await Promise.all([
                api.get("api/TripCrews"),
                api.get("api/Trips"),
                api.get("api/StaffProfiles"),
            ]);

            setCrews(crewRes.data || []);

            const tripMap: Record<string, TripLookup> = {};
            (tripsRes.data || []).forEach((t: any) => { tripMap[t.id] = t; });
            setTrips(tripMap);

            const staffMap: Record<string, StaffLookup> = {};
            (staffRes.data || []).forEach((s: any) => { staffMap[s.id] = s; });
            setStaff(staffMap);
        } catch (err: any) {
            console.error("Load trip crews error:", err);
            toast.error(err.response?.data?.message || "Failed to load trip crews");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const handleDelete = async (id: string) => {
        if (!window.confirm("Remove this crew assignment?")) return;
        setDeletingId(id);
        try {
            await api.delete(`api/TripCrews/${id}`);
            toast.success("Crew assignment removed.");
            setCrews(prev => prev.filter(c => c.id !== id));
        } catch (err: any) {
            console.error("Delete trip crew error:", err);
            toast.error(err.response?.data?.message || "Failed to remove assignment");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="container-fluid py-4 bg-light min-vh-100">
            <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 shadow-sm rounded border-left border-primary" style={{ borderLeftWidth: '5px' }}>
                <div>
                    <h5 className="mb-0 text-primary font-weight-bold">
                        <i className="fas fa-users mr-2"></i> Trip Crews
                    </h5>
                    <small className="text-muted">Drivers, supervisors and helpers assigned to trips</small>
                </div>
                <button
                    type="button"
                    className="btn btn-primary px-4 shadow-sm"
                    onClick={() => navigate('/admin/trip-crews/create')}
                >
                    <i className="fas fa-plus mr-1"></i> Assign Crew
                </button>
            </div>

            <div className="card shadow-sm border-0">
                <div className="card-body p-0">
                    {loading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-primary mr-2" role="status"></div>
                            <span className="text-muted font-italic">Loading trip crews...</span>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover mb-0 align-middle">
                                <thead className="thead-light">
                                    <tr>
                                        <th>Trip</th>
                                        <th>Staff</th>
                                        <th>Role</th>
                                        <th>Assigned At (UTC)</th>
                                        <th className="text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {crews.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="text-center text-muted py-4">
                                                No crew assignments found.
                                            </td>
                                        </tr>
                                    )}
                                    {crews.map(c => {
                                        const trip = trips[c.tripId];
                                        const staffMember = staff[c.staffProfileId];
                                        return (
                                            <tr key={c.id}>
                                                <td>
                                                    {trip ? (
                                                        <>
                                                            <div className="font-weight-bold">{trip.tripCode}</div>
                                                            <div className="small text-muted">
                                                                {new Date(trip.departureTimeUtc).toLocaleString()}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <span className="text-muted">Unknown trip</span>
                                                    )}
                                                </td>
                                                <td>
                                                    {staffMember ? (
                                                        <>
                                                            <div className="font-weight-bold">{staffMember.employeeCode}</div>
                                                            <div className="small text-muted">{staffMember.role}</div>
                                                        </>
                                                    ) : (
                                                        <span className="text-muted">Unknown staff</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span className={`badge ${roleBadgeClass(c.role)}`}>{c.role}</span>
                                                </td>
                                                <td>{new Date(c.assignedAtUtc).toLocaleString()}</td>
                                                <td className="text-right">
                                                    <Link to={`/admin/trip-crews/${c.id}`} className="btn btn-sm btn-outline-info mr-1">
                                                        View
                                                    </Link>
                                                    <Link to={`/admin/trip-crews/edit/${c.id}`} className="btn btn-sm btn-outline-warning mr-1">
                                                        Edit
                                                    </Link>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-danger"
                                                        disabled={deletingId === c.id}
                                                        onClick={() => handleDelete(c.id)}
                                                    >
                                                        {deletingId === c.id ? "..." : "Remove"}
                                                    </button>
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

export default TripCrewsList;
