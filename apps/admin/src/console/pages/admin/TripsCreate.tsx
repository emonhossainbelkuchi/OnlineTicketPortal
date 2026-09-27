import React, { useState, useEffect } from 'react';
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

interface OptionRow {
    id: string;
    name: string;
}

interface BusRouteOption {
    id: string;
    name: string;
}

interface PhysicalSeat {
    id: string;
    seatNumber: string;
    seatType: string;
}

interface BusOption {
    id: string;
    busOperatorId: string;
    registrationNumber?: string;
    coachNumber?: string;
    seats: PhysicalSeat[];
}

interface SeatFareRow {
    seatId: string;
    seatNumber: string;
    seatType: string;
    include: boolean;
    fare: number;
}

const toUtcInputValue = (d: Date) => {
    // yyyy-MM-ddTHH:mm for <input type="datetime-local">, values are then sent as UTC ISO strings
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const TripsCreate: React.FC = () => {
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);

    const [operators, setOperators] = useState<OptionRow[]>([]);
    const [routes, setRoutes] = useState<BusRouteOption[]>([]);
    const [terminals, setTerminals] = useState<OptionRow[]>([]);
    const [buses, setBuses] = useState<BusOption[]>([]);
    const [loadingLookups, setLoadingLookups] = useState(true);

    const [formData, setFormData] = useState({
        busOperatorId: '',
        busRouteId: '',
        busId: '',
        departureTerminalId: '',
        arrivalTerminalId: '',
        tripCode: '',
        departureTimeUtc: toUtcInputValue(new Date(Date.now() + 60 * 60 * 1000)),
        arrivalTimeUtc: toUtcInputValue(new Date(Date.now() + 5 * 60 * 60 * 1000)),
        baseFare: 500,
        currency: 'BDT',
        isWheelchairAccessible: false,
    });

    const [seatRows, setSeatRows] = useState<SeatFareRow[]>([]);

    useEffect(() => {
        (async () => {
            setLoadingLookups(true);
            try {
                const [opsRes, routesRes, terminalsRes, busesRes] = await Promise.all([
                    api.get("api/BusOperators"),
                    api.get("api/BusRoutes"),
                    api.get("api/Terminals"),
                    api.get("api/Buses"),
                ]);
                setOperators(opsRes.data || []);
                setRoutes(routesRes.data || []);
                setTerminals(terminalsRes.data || []);
                setBuses(busesRes.data || []);
            } catch (err: any) {
                console.error("Load lookups error:", err);
                toast.error("Failed to load operators/routes/terminals/buses");
            } finally {
                setLoadingLookups(false);
            }
        })();
    }, []);

    // Filter buses to the selected operator, since a Trip's Bus must belong to its BusOperator.
    const busesForOperator = buses.filter(b => !formData.busOperatorId || b.busOperatorId === formData.busOperatorId);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target as HTMLInputElement;
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
            return;
        }
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleOperatorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const busOperatorId = e.target.value;
        setFormData(prev => ({ ...prev, busOperatorId, busId: '' }));
        setSeatRows([]);
    };

    const handleBusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const busId = e.target.value;
        setFormData(prev => ({ ...prev, busId }));
        const bus = buses.find(b => b.id === busId);
        if (bus) {
            setSeatRows((bus.seats || []).map(s => ({
                seatId: s.id,
                seatNumber: s.seatNumber,
                seatType: s.seatType,
                include: true,
                fare: formData.baseFare,
            })));
        } else {
            setSeatRows([]);
        }
    };

    const toggleSeatInclude = (seatId: string) => {
        setSeatRows(prev => prev.map(s => s.seatId === seatId ? { ...s, include: !s.include } : s));
    };

    const setSeatFare = (seatId: string, fare: number) => {
        setSeatRows(prev => prev.map(s => s.seatId === seatId ? { ...s, fare } : s));
    };

    const applyFareToAll = () => {
        setSeatRows(prev => prev.map(s => ({ ...s, fare: formData.baseFare })));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.busOperatorId || !formData.busRouteId || !formData.busId) {
            toast.error("Bus Operator, Bus Route and Bus are all required!");
            return;
        }
        if (!formData.departureTerminalId || !formData.arrivalTerminalId) {
            toast.error("Departure and Arrival Terminal are required!");
            return;
        }
        if (formData.departureTerminalId === formData.arrivalTerminalId) {
            toast.error("Departure and Arrival Terminal cannot be the same!");
            return;
        }
        if (!formData.tripCode.trim()) {
            toast.error("Trip Code is required!");
            return;
        }
        if (new Date(formData.arrivalTimeUtc) <= new Date(formData.departureTimeUtc)) {
            toast.error("Arrival time must be after Departure time!");
            return;
        }

        const selectedSeats = seatRows.filter(s => s.include);
        if (selectedSeats.length === 0) {
            toast.error("At least one Trip Seat is required!");
            return;
        }

        setSubmitting(true);
        try {
            // Matches TripCreateDto exactly.
            await api.post("api/Trips", {
                busOperatorId: formData.busOperatorId,
                busRouteId: formData.busRouteId,
                busId: formData.busId,
                departureTerminalId: formData.departureTerminalId,
                arrivalTerminalId: formData.arrivalTerminalId,
                tripCode: formData.tripCode.trim(),
                departureTimeUtc: new Date(formData.departureTimeUtc).toISOString(),
                arrivalTimeUtc: new Date(formData.arrivalTimeUtc).toISOString(),
                baseFare: Number(formData.baseFare),
                currency: formData.currency.trim().toUpperCase(),
                isWheelchairAccessible: formData.isWheelchairAccessible,
                tripSeats: selectedSeats.map(s => ({
                    seatId: s.seatId,
                    seatNumber: s.seatNumber,
                    fare: Number(s.fare),
                })),
            });

            toast.success("Trip created successfully!");
            navigate('/admin/trips');
        } catch (err: any) {
            console.error("Create trip error:", err);
            toast.error(err.response?.data?.message || err.response?.data?.title || "Failed to create trip");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="container-fluid py-4 bg-light min-vh-100">
            <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 shadow-sm rounded border-left border-primary" style={{ borderLeftWidth: '5px' }}>
                <div>
                    <h5 className="mb-0 text-primary font-weight-bold">
                        <i className="fas fa-plus-circle mr-2"></i> Schedule New Trip
                    </h5>
                    <small className="text-muted">Assign a Bus to a route and open its seats for sale</small>
                </div>
                <button type="button" className="btn btn-outline-secondary px-4 shadow-sm" onClick={() => navigate('/admin/trips')}>
                    BACK TO LIST
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="row">
                    <div className="col-lg-6">
                        <div className="card shadow-sm border-0 mb-4">
                            <div className="card-body p-4">
                                <div className="row g-3">
                                    <div className="col-md-12">
                                        <label className="small font-weight-bold mb-1">Bus Operator *</label>
                                        <select name="busOperatorId" className="form-select" value={formData.busOperatorId} onChange={handleOperatorChange} disabled={loadingLookups} required>
                                            <option value="">{loadingLookups ? "Loading…" : "Select operator"}</option>
                                            {operators.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                                        </select>
                                    </div>

                                    <div className="col-md-12">
                                        <label className="small font-weight-bold mb-1">Bus Route (platform route) *</label>
                                        <select name="busRouteId" className="form-select" value={formData.busRouteId} onChange={handleChange} disabled={loadingLookups} required>
                                            <option value="">{loadingLookups ? "Loading…" : "Select route"}</option>
                                            {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                        </select>
                                    </div>

                                    <div className="col-md-12">
                                        <label className="small font-weight-bold mb-1">Bus *</label>
                                        <select name="busId" className="form-select" value={formData.busId} onChange={handleBusChange} disabled={loadingLookups || !formData.busOperatorId} required>
                                            <option value="">{!formData.busOperatorId ? "Select operator first" : "Select bus"}</option>
                                            {busesForOperator.map(b => (
                                                <option key={b.id} value={b.id}>
                                                    {b.registrationNumber || b.coachNumber || b.id}
                                                </option>
                                            ))}
                                        </select>
                                        {formData.busOperatorId && busesForOperator.length === 0 && !loadingLookups && (
                                            <small className="text-muted">No buses found for this operator.</small>
                                        )}
                                    </div>

                                    <div className="col-md-6">
                                        <label className="small font-weight-bold mb-1">Departure Terminal *</label>
                                        <select name="departureTerminalId" className="form-select" value={formData.departureTerminalId} onChange={handleChange} disabled={loadingLookups} required>
                                            <option value="">Select terminal</option>
                                            {terminals.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="small font-weight-bold mb-1">Arrival Terminal *</label>
                                        <select name="arrivalTerminalId" className="form-select" value={formData.arrivalTerminalId} onChange={handleChange} disabled={loadingLookups} required>
                                            <option value="">Select terminal</option>
                                            {terminals.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    </div>

                                    <div className="col-md-12">
                                        <label className="small font-weight-bold mb-1">Trip Code *</label>
                                        <input name="tripCode" className="form-control" placeholder="e.g. DHK-CTG-0630" value={formData.tripCode} onChange={handleChange} maxLength={40} required />
                                    </div>

                                    <div className="col-md-6">
                                        <label className="small font-weight-bold mb-1">Departure (local, sent as UTC) *</label>
                                        <input type="datetime-local" name="departureTimeUtc" className="form-control" value={formData.departureTimeUtc} onChange={handleChange} required />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="small font-weight-bold mb-1">Arrival (local, sent as UTC) *</label>
                                        <input type="datetime-local" name="arrivalTimeUtc" className="form-control" value={formData.arrivalTimeUtc} onChange={handleChange} required />
                                    </div>

                                    <div className="col-md-6">
                                        <label className="small font-weight-bold mb-1">Base Fare *</label>
                                        <input type="number" min={0} step="0.01" name="baseFare" className="form-control" value={formData.baseFare} onChange={handleChange} required />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="small font-weight-bold mb-1">Currency *</label>
                                        <input name="currency" className="form-control text-uppercase" maxLength={3} value={formData.currency} onChange={handleChange} required />
                                    </div>

                                    <div className="col-md-12">
                                        <div className="form-check">
                                            <input type="checkbox" className="form-check-input" id="isWheelchairAccessible" name="isWheelchairAccessible" checked={formData.isWheelchairAccessible} onChange={handleChange} />
                                            <label className="form-check-label" htmlFor="isWheelchairAccessible">Wheelchair Accessible</label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-lg-6">
                        <div className="card shadow-sm border-0 mb-4">
                            <div className="card-header bg-white d-flex justify-content-between align-items-center">
                                <span className="font-weight-bold"><i className="fas fa-chair mr-2 text-primary"></i> Trip Seats ({seatRows.filter(s => s.include).length} selected)</span>
                                <button type="button" className="btn btn-sm btn-outline-primary" onClick={applyFareToAll} disabled={seatRows.length === 0}>
                                    Apply Base Fare to All
                                </button>
                            </div>
                            <div className="card-body p-0" style={{ maxHeight: 500, overflowY: 'auto' }}>
                                {seatRows.length === 0 ? (
                                    <div className="text-center text-muted py-4">Select a Bus to load its physical seats.</div>
                                ) : (
                                    <table className="table table-sm mb-0">
                                        <thead className="thead-light">
                                            <tr>
                                                <th></th>
                                                <th>Seat No.</th>
                                                <th>Type</th>
                                                <th>Fare</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {seatRows.map(s => (
                                                <tr key={s.seatId}>
                                                    <td>
                                                        <input type="checkbox" checked={s.include} onChange={() => toggleSeatInclude(s.seatId)} />
                                                    </td>
                                                    <td>{s.seatNumber}</td>
                                                    <td>{s.seatType}</td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            step="0.01"
                                                            className="form-control form-control-sm"
                                                            style={{ width: 100 }}
                                                            value={s.fare}
                                                            disabled={!s.include}
                                                            onChange={(e) => setSeatFare(s.seatId, parseFloat(e.target.value) || 0)}
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card shadow-sm border-0">
                    <div className="card-footer bg-white p-3 d-flex justify-content-end gap-2 border-top">
                        <button type="button" className="btn btn-outline-secondary px-4" onClick={() => navigate('/admin/trips')}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary px-4 font-weight-bold" disabled={submitting}>
                            {submitting ? "Creating Trip..." : "Save Trip"}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default TripsCreate;
