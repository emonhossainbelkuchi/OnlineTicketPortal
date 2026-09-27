import React, { useState, useEffect } from 'react';
import { api } from "@/lib/api";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

type TripStatus = 'Scheduled' | 'Boarding' | 'Departed' | 'Running' | 'Arrived' | 'Completed' | 'Delayed' | 'Cancelled';

interface TripSeatRow {
    id: string;
    seatId: string;
    seatNumber: string;
    seatType: string;
    fare: number;
    status: string;
}

interface TripRow {
    id: string;
    busOperatorId: string;
    busRouteId: string;
    busId: string;
    departureTerminalId: string;
    arrivalTerminalId: string;
    tripCode: string;
    departureTimeUtc: string;
    arrivalTimeUtc: string;
    baseFare: number;
    currency: string;
    status: TripStatus;
    delayReason?: string | null;
    isWheelchairAccessible: boolean;
    coverImageUrl?: string | null;
    tripSeats: TripSeatRow[];
    rowVersion?: string;
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

const TripsList: React.FC = () => {
    const navigate = useNavigate();
    const [trips, setTrips] = useState<TripRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const res = await api.get("api/Trips");
            setTrips(res.data || []);
        } catch (err: any) {
            console.error("Load trips error:", err);
            toast.error(err.response?.data?.message || "Failed to load trips");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const handleDelete = async (id: string) => {
        if (!window.confirm("Delete this trip? If it has bookings, it will be cancelled and hidden instead of removed.")) return;
        setDeletingId(id);
        try {
            const res = await api.delete(`api/Trips/${id}`);
            if (res.data?.softDeleted) {
                toast.success(res.data.message || "Trip cancelled (had existing bookings).");
            } else {
                toast.success("Trip deleted.");
            }
            setTrips(prev => prev.filter(t => t.id !== id));
        } catch (err: any) {
            console.error("Delete trip error:", err);
            toast.error(err.response?.data?.message || "Failed to delete trip");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="container-fluid py-4 bg-light min-vh-100">
            <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 shadow-sm rounded border-left border-primary" style={{ borderLeftWidth: '5px' }}>
                <div>
                    <h5 className="mb-0 text-primary font-weight-bold">
                        <i className="fas fa-route mr-2"></i> Trips
                    </h5>
                    <small className="text-muted">Scheduled journeys, seat maps and live status</small>
                </div>
                <button
                    type="button"
                    className="btn btn-primary px-4 shadow-sm"
                    onClick={() => navigate('/admin/trips/create')}
                >
                    <i className="fas fa-plus mr-1"></i> New Trip
                </button>
            </div>

            <div className="card shadow-sm border-0">
                <div className="card-body p-0">
                    {loading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-primary mr-2" role="status"></div>
                            <span className="text-muted font-italic">Loading trips...</span>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover mb-0 align-middle">
                                <thead className="thead-light">
                                    <tr>
                                        <th>Trip Code</th>
                                        <th>Departure (UTC)</th>
                                        <th>Arrival (UTC)</th>
                                        <th>Fare</th>
                                        <th>Seats</th>
                                        <th>Status</th>
                                        <th className="text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {trips.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="text-center text-muted py-4">
                                                No trips found.
                                            </td>
                                        </tr>
                                    )}
                                    {trips.map(t => {
                                        const available = t.tripSeats.filter(s => s.status === 'Available').length;
                                        return (
                                            <tr key={t.id}>
                                                <td className="font-weight-bold">{t.tripCode}</td>
                                                <td>{new Date(t.departureTimeUtc).toLocaleString()}</td>
                                                <td>{new Date(t.arrivalTimeUtc).toLocaleString()}</td>
                                                <td>{t.baseFare.toFixed(2)} {t.currency}</td>
                                                <td>{available} / {t.tripSeats.length}</td>
                                                <td>
                                                    <span className={`badge ${statusBadgeClass(t.status)}`}>{t.status}</span>
                                                    {t.status === 'Delayed' && t.delayReason && (
                                                        <div className="small text-muted">{t.delayReason}</div>
                                                    )}
                                                </td>
                                                <td className="text-right">
                                                    <Link to={`/admin/trips/${t.id}`} className="btn btn-sm btn-outline-info mr-1">
                                                        View
                                                    </Link>
                                                    <Link to={`/admin/trips/edit/${t.id}`} className="btn btn-sm btn-outline-warning mr-1">
                                                        Edit
                                                    </Link>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-danger"
                                                        disabled={deletingId === t.id}
                                                        onClick={() => handleDelete(t.id)}
                                                    >
                                                        {deletingId === t.id ? "..." : "Delete"}
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

export default TripsList;
