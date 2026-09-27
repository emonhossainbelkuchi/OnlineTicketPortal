import React, { useState, useEffect } from 'react';
import { api } from "@/lib/api";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

interface TripSeatRow {
    id: string;
    seatId: string;
    seatNumber: string;
    seatType: string;
    fare: number;
    status: string;
}

interface TripDetail {
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
    status: string;
    delayReason?: string | null;
    isWheelchairAccessible: boolean;
    coverImageUrl?: string | null;
    tripSeats: TripSeatRow[];
    createdAtUtc?: string;
    updatedAtUtc?: string | null;
    rowVersion?: string;
}

const seatBadgeClass = (status: string) => {
    switch (status) {
        case 'Available': return 'badge-success';
        case 'Held': return 'badge-warning';
        case 'Booked': return 'badge-primary';
        case 'Blocked': return 'badge-secondary';
        case 'Cancelled': return 'badge-danger';
        default: return 'badge-light';
    }
};

const TripsDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [trip, setTrip] = useState<TripDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        (async () => {
            setLoading(true);
            try {
                const res = await api.get(`api/Trips/${id}`);
                setTrip(res.data);
            } catch (err: any) {
                console.error("Load trip error:", err);
                toast.error(err.response?.data?.message || "Failed to load trip");
                navigate('/admin/trips');
            } finally {
                setLoading(false);
            }
        })();
    }, [id, navigate]);

    if (loading) {
        return (
            <div className="container-fluid py-5 text-center min-vh-100 d-flex align-items-center justify-content-center">
                <div className="spinner-border text-primary mr-2" role="status"></div>
                <span className="text-muted font-italic">Loading trip...</span>
            </div>
        );
    }

    if (!trip) {
        return <div className="p-6">Trip not found.</div>;
    }

    return (
        <div className="container-fluid py-4 bg-light min-vh-100">
            <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 shadow-sm rounded border-left border-primary" style={{ borderLeftWidth: '5px' }}>
                <div>
                    <h5 className="mb-0 text-primary font-weight-bold">
                        <i className="fas fa-route mr-2"></i> Trip: {trip.tripCode}
                    </h5>
                    <small className="text-muted">Trip ID: <code>{trip.id}</code></small>
                </div>
                <div>
                    <button className="btn btn-warning px-3 mr-2" onClick={() => navigate(`/admin/trips/edit/${trip.id}`)}>
                        <i className="fas fa-edit mr-1"></i> Edit
                    </button>
                    <button className="btn btn-outline-secondary px-3" onClick={() => navigate('/admin/trips')}>
                        Back to list
                    </button>
                </div>
            </div>

            <div className="row">
                <div className="col-lg-5">
                    <div className="card shadow-sm border-0 mb-4">
                        <div className="card-body">
                            {trip.coverImageUrl && (
                                <img src={trip.coverImageUrl} alt="Trip cover" className="img-fluid rounded mb-3" />
                            )}
                            <table className="table table-sm mb-0">
                                <tbody>
                                    <tr><th>Bus Operator ID</th><td>{trip.busOperatorId}</td></tr>
                                    <tr><th>Bus Route ID</th><td>{trip.busRouteId}</td></tr>
                                    <tr><th>Bus ID</th><td>{trip.busId}</td></tr>
                                    <tr><th>Departure Terminal ID</th><td>{trip.departureTerminalId}</td></tr>
                                    <tr><th>Arrival Terminal ID</th><td>{trip.arrivalTerminalId}</td></tr>
                                    <tr><th>Departure (UTC)</th><td>{new Date(trip.departureTimeUtc).toLocaleString()}</td></tr>
                                    <tr><th>Arrival (UTC)</th><td>{new Date(trip.arrivalTimeUtc).toLocaleString()}</td></tr>
                                    <tr><th>Base Fare</th><td>{trip.baseFare.toFixed(2)} {trip.currency}</td></tr>
                                    <tr><th>Wheelchair Accessible</th><td>{trip.isWheelchairAccessible ? "Yes" : "No"}</td></tr>
                                    <tr><th>Status</th><td>{trip.status}</td></tr>
                                    <tr><th>Delay Reason</th><td>{trip.delayReason || "—"}</td></tr>
                                    <tr><th>Created (UTC)</th><td>{trip.createdAtUtc || "—"}</td></tr>
                                    <tr><th>Updated (UTC)</th><td>{trip.updatedAtUtc || "—"}</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="col-lg-7">
                    <div className="card shadow-sm border-0">
                        <div className="card-header bg-white font-weight-bold">
                            <i className="fas fa-chair mr-2 text-primary"></i> Trip Seats ({trip.tripSeats.length})
                        </div>
                        <div className="card-body p-0">
                            <div className="table-responsive">
                                <table className="table table-sm mb-0">
                                    <thead className="thead-light">
                                        <tr>
                                            <th>Seat No.</th>
                                            <th>Type</th>
                                            <th>Fare</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {trip.tripSeats.map(s => (
                                            <tr key={s.id}>
                                                <td>{s.seatNumber}</td>
                                                <td>{s.seatType}</td>
                                                <td>{s.fare.toFixed(2)}</td>
                                                <td><span className={`badge ${seatBadgeClass(s.status)}`}>{s.status}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TripsDetails;
