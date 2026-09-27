import React, { useState, useEffect } from 'react';
import { api } from "@/lib/api";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

type TripStatus = 'Scheduled' | 'Boarding' | 'Departed' | 'Running' | 'Arrived' | 'Completed' | 'Delayed' | 'Cancelled';

interface OptionRow {
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
    status?: string;
}

const TRIP_STATUSES: TripStatus[] = ['Scheduled', 'Boarding', 'Departed', 'Running', 'Arrived', 'Completed', 'Delayed', 'Cancelled'];

const toLocalInputValue = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const TripsEdit: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    const [operators, setOperators] = useState<OptionRow[]>([]);
    const [routes, setRoutes] = useState<OptionRow[]>([]);
    const [terminals, setTerminals] = useState<OptionRow[]>([]);
    const [buses, setBuses] = useState<BusOption[]>([]);

    const [formData, setFormData] = useState({
        id: '',
        busOperatorId: '',
        busRouteId: '',
        busId: '',
        departureTerminalId: '',
        arrivalTerminalId: '',
        tripCode: '',
        departureTimeUtc: '',
        arrivalTimeUtc: '',
        baseFare: 0,
        currency: 'BDT',
        isWheelchairAccessible: false,
        status: 'Scheduled' as TripStatus,
        delayReason: '',
        coverImageUrl: '' as string | null,
        rowVersion: null as string | null,
    });

    const [seatRows, setSeatRows] = useState<SeatFareRow[]>([]);

    useEffect(() => {
        if (!id) return;
        (async () => {
            setLoading(true);
            try {
                const [opsRes, routesRes, terminalsRes, busesRes, tripRes] = await Promise.all([
                    api.get("api/BusOperators"),
                    api.get("api/BusRoutes"),
                    api.get("api/Terminals"),
                    api.get("api/Buses"),
                    api.get(`api/Trips/${id}`),
                ]);
                setOperators(opsRes.data || []);
                setRoutes(routesRes.data || []);
                setTerminals(terminalsRes.data || []);
                setBuses(busesRes.data || []);

                const data = tripRes.data;
                setFormData({
                    id: data.id,
                    busOperatorId: data.busOperatorId || '',
                    busRouteId: data.busRouteId || '',
                    busId: data.busId || '',
                    departureTerminalId: data.departureTerminalId || '',
                    arrivalTerminalId: data.arrivalTerminalId || '',
                    tripCode: data.tripCode || '',
                    departureTimeUtc: toLocalInputValue(data.departureTimeUtc),
                    arrivalTimeUtc: toLocalInputValue(data.arrivalTimeUtc),
                    baseFare: data.baseFare || 0,
                    currency: data.currency || 'BDT',
                    isWheelchairAccessible: !!data.isWheelchairAccessible,
                    status: data.status || 'Scheduled',
                    delayReason: data.delayReason || '',
                    coverImageUrl: data.coverImageUrl || null,
                    rowVersion: data.rowVersion || null,
                });

                const busForTrip = (busesRes.data || []).find((b: BusOption) => b.id === data.busId);
                const physicalSeats: PhysicalSeat[] = busForTrip?.seats || [];
                const existingByFare = new Map((data.tripSeats || []).map((s: any) => [s.seatId, s]));

                setSeatRows(physicalSeats.map(ps => {
                    const existing: any = existingByFare.get(ps.id);
                    return {
                        seatId: ps.id,
                        seatNumber: ps.seatNumber,
                        seatType: ps.seatType,
                        include: !!existing,
                        fare: existing ? existing.fare : data.baseFare || 0,
                        status: existing?.status,
                    };
                }));
            } catch (err: any) {
                console.error("Load trip error:", err);
                toast.error(err.response?.data?.message || "Failed to load trip");
                navigate('/admin/trips');
            } finally {
                setLoading(false);
            }
        })();
    }, [id, navigate]);

    const busesForOperator = buses.filter(b => !formData.busOperatorId || b.busOperatorId === formData.busOperatorId);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target as HTMLInputElement;
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
            return;
        }
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleBusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const busId = e.target.value;
        setFormData(prev => ({ ...prev, busId }));
        const bus = buses.find(b => b.id === busId);
        setSeatRows((bus?.seats || []).map(s => ({
            seatId: s.id,
            seatNumber: s.seatNumber,
            seatType: s.seatType,
            include: true,
            fare: formData.baseFare,
        })));
    };

    const toggleSeatInclude = (seatId: string) => {
        setSeatRows(prev => prev.map(s => s.seatId === seatId ? { ...s, include: !s.include } : s));
    };

    const setSeatFare = (seatId: string, fare: number) => {
        setSeatRows(prev => prev.map(s => s.seatId === seatId ? { ...s, fare } : s));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !id) return;

        setUploadingImage(true);
        try {
            const uploadData = new FormData();
            uploadData.append('file', file);
            const res = await api.post(`api/Trips/${id}/images`, uploadData);
            setFormData(prev => ({ ...prev, coverImageUrl: res.data.imageUrl }));
            toast.success("Trip image uploaded!");
        } catch (err: any) {
            console.error("Image upload error:", err);
            toast.error(err.response?.data?.message || "Failed to upload image");
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
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
        if (new Date(formData.arrivalTimeUtc) <= new Date(formData.departureTimeUtc)) {
            toast.error("Arrival time must be after Departure time!");
            return;
        }

        const selectedSeats = seatRows.filter(s => s.include);
        if (selectedSeats.length === 0) {
            toast.error("At least one Trip Seat is required!");
            return;
        }

        setSaving(true);
        try {
            const buildPayload = (versionToUse: any) => ({
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
                status: formData.status,
                delayReason: formData.delayReason?.trim() || null,
                tripSeats: selectedSeats.map(s => ({
                    seatId: s.seatId,
                    seatNumber: s.seatNumber,
                    fare: Number(s.fare),
                })),
                rowVersion: versionToUse || formData.rowVersion || null,
            });

            try {
                await api.put(`api/Trips/${id}`, buildPayload(formData.rowVersion));
                toast.success("Trip updated successfully!");
                navigate('/admin/trips');
            } catch (firstErr: any) {
                const isConflict = firstErr.response?.status === 409 || firstErr.response?.data?.message?.includes('changed');
                if (isConflict) {
                    console.warn("RowVersion conflict. Auto-fetching latest data...");
                    const freshRes = await api.get(`api/Trips/${id}`);
                    const latestVersion = freshRes.data?.rowVersion;
                    if (latestVersion) {
                        setFormData(prev => ({ ...prev, rowVersion: latestVersion }));
                        await api.put(`api/Trips/${id}`, buildPayload(latestVersion));
                        toast.success("Updated successfully with fresh version!");
                        navigate('/admin/trips');
                        return;
                    }
                }
                throw firstErr;
            }
        } catch (err: any) {
            console.error("Save trip error:", err);
            if (err.response?.data?.message?.includes('Held or Booked')) {
                toast.error("Cannot change seats — some seats on this trip are already Held or Booked.");
            } else {
                toast.error(err.response?.data?.message || err.response?.data?.title || "Failed to update trip");
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="container-fluid py-5 text-center min-vh-100 d-flex align-items-center justify-content-center">
                <div className="spinner-border text-primary mr-2" role="status"></div>
                <span className="text-muted font-italic">Loading trip details...</span>
            </div>
        );
    }

    return (
        <div className="container-fluid py-4 bg-light min-vh-100">
            <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 shadow-sm rounded border-left border-primary" style={{ borderLeftWidth: '5px' }}>
                <div>
                    <h5 className="mb-0 text-primary font-weight-bold">
                        <i className="fas fa-edit mr-2"></i> Update Trip
                    </h5>
                    <div className="d-flex align-items-center gap-2 mt-1">
                        <small className="text-muted">Trip ID: <code className="text-dark bg-light px-2 py-0.5 rounded">{id}</code></small>
                        {formData.rowVersion && (
                            <span className="badge badge-secondary ml-2" style={{ fontSize: '10px' }}>Concurrency Active</span>
                        )}
                    </div>
                </div>
                <button type="button" className="btn btn-outline-secondary px-4 shadow-sm" onClick={() => navigate('/admin/trips')}>
                    CANCEL
                </button>
            </div>

            <form onSubmit={handleSave}>
                <div className="row">
                    <div className="col-lg-6">
                        <div className="card shadow-sm border-0 mb-4">
                            <div className="card-body p-4">
                                <div className="row g-3">
                                    <div className="col-md-12">
                                        <label className="small font-weight-bold mb-1">Bus Operator *</label>
                                        <select name="busOperatorId" className="form-select" value={formData.busOperatorId} onChange={handleChange} required>
                                            {operators.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                                        </select>
                                    </div>

                                    <div className="col-md-12">
                                        <label className="small font-weight-bold mb-1">Bus Route *</label>
                                        <select name="busRouteId" className="form-select" value={formData.busRouteId} onChange={handleChange} required>
                                            {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                        </select>
                                    </div>

                                    <div className="col-md-12">
                                        <label className="small font-weight-bold mb-1">Bus *</label>
                                        <select name="busId" className="form-select" value={formData.busId} onChange={handleBusChange} required>
                                            {busesForOperator.map(b => (
                                                <option key={b.id} value={b.id}>{b.registrationNumber || b.coachNumber || b.id}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="col-md-6">
                                        <label className="small font-weight-bold mb-1">Departure Terminal *</label>
                                        <select name="departureTerminalId" className="form-select" value={formData.departureTerminalId} onChange={handleChange} required>
                                            {terminals.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="small font-weight-bold mb-1">Arrival Terminal *</label>
                                        <select name="arrivalTerminalId" className="form-select" value={formData.arrivalTerminalId} onChange={handleChange} required>
                                            {terminals.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    </div>

                                    <div className="col-md-12">
                                        <label className="small font-weight-bold mb-1">Trip Code *</label>
                                        <input name="tripCode" className="form-control" value={formData.tripCode} onChange={handleChange} maxLength={40} required />
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

                                    <div className="col-md-6">
                                        <label className="small font-weight-bold mb-1">Status *</label>
                                        <select name="status" className="form-select" value={formData.status} onChange={handleChange} required>
                                            {TRIP_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="small font-weight-bold mb-1">Delay Reason</label>
                                        <input name="delayReason" className="form-control" value={formData.delayReason} onChange={handleChange} maxLength={250} placeholder="Only relevant if Status is Delayed" />
                                    </div>

                                    <div className="col-md-12">
                                        <div className="form-check">
                                            <input type="checkbox" className="form-check-input" id="isWheelchairAccessible" name="isWheelchairAccessible" checked={formData.isWheelchairAccessible} onChange={handleChange} />
                                            <label className="form-check-label" htmlFor="isWheelchairAccessible">Wheelchair Accessible</label>
                                        </div>
                                    </div>

                                    <div className="col-md-12">
                                        <label className="small font-weight-bold mb-1">Cover Image</label>
                                        {formData.coverImageUrl && (
                                            <img src={formData.coverImageUrl} alt="Trip cover" className="img-fluid rounded mb-2 d-block" style={{ maxHeight: 150 }} />
                                        )}
                                        <input type="file" accept="image/*" className="form-control" onChange={handleImageUpload} disabled={uploadingImage} />
                                        {uploadingImage && <small className="text-muted">Uploading...</small>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-lg-6">
                        <div className="card shadow-sm border-0 mb-4">
                            <div className="card-header bg-white font-weight-bold">
                                <i className="fas fa-chair mr-2 text-primary"></i> Trip Seats ({seatRows.filter(s => s.include).length} selected)
                            </div>
                            <div className="card-body p-0" style={{ maxHeight: 500, overflowY: 'auto' }}>
                                {seatRows.length === 0 ? (
                                    <div className="text-center text-muted py-4">No physical seats found for this Bus.</div>
                                ) : (
                                    <table className="table table-sm mb-0">
                                        <thead className="thead-light">
                                            <tr>
                                                <th></th>
                                                <th>Seat No.</th>
                                                <th>Type</th>
                                                <th>Fare</th>
                                                <th>Status</th>
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
                                                    <td>{s.status || <span className="text-muted">New</span>}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                                <div className="p-2 small text-muted border-top">
                                    Changing seats is blocked once any seat on this trip is Held or Booked — release/cancel those first.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card shadow-sm border-0">
                    <div className="card-footer bg-white p-3 d-flex justify-content-end gap-2 border-top">
                        <button type="button" className="btn btn-outline-secondary px-4" onClick={() => navigate('/admin/trips')}>
                            Back
                        </button>
                        <button type="submit" className="btn btn-primary px-4 font-weight-bold" disabled={saving}>
                            {saving ? "Updating..." : "Update Trip"}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default TripsEdit;
