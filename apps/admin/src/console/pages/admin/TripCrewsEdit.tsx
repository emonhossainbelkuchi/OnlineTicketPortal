import React, { useState, useEffect } from 'react';
import { api } from "@/lib/api";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

type CrewRole = 'Driver' | 'AssistantDriver' | 'Supervisor' | 'Helper';
const CREW_ROLES: CrewRole[] = ['Driver', 'AssistantDriver', 'Supervisor', 'Helper'];

interface TripOption {
    id: string;
    tripCode: string;
    departureTimeUtc: string;
    arrivalTimeUtc: string;
    busOperatorId: string;
}

interface StaffOption {
    id: string;
    employeeCode: string;
    role: string;
    busOperatorId?: string | null;
}

const toLocalInputValue = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const TripCrewsEdit: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [trips, setTrips] = useState<TripOption[]>([]);
    const [staffList, setStaffList] = useState<StaffOption[]>([]);

    const [formData, setFormData] = useState({
        id: '',
        tripId: '',
        staffProfileId: '',
        role: 'Driver' as CrewRole,
        assignedAtUtc: '',
        rowVersion: null as string | null,
    });

    useEffect(() => {
        if (!id) return;
        (async () => {
            setLoading(true);
            try {
                const [tripsRes, staffRes, crewRes] = await Promise.all([
                    api.get("api/Trips"),
                    api.get("api/StaffProfiles"),
                    api.get(`api/TripCrews/${id}`),
                ]);
                setTrips(tripsRes.data || []);
                setStaffList(staffRes.data || []);

                const data = crewRes.data;
                setFormData({
                    id: data.id,
                    tripId: data.tripId || '',
                    staffProfileId: data.staffProfileId || '',
                    role: data.role || 'Driver',
                    assignedAtUtc: toLocalInputValue(data.assignedAtUtc),
                    rowVersion: data.rowVersion || null,
                });
            } catch (err: any) {
                console.error("Load trip crew error:", err);
                toast.error(err.response?.data?.message || "Failed to load crew assignment");
                navigate('/admin/trip-crews');
            } finally {
                setLoading(false);
            }
        })();
    }, [id, navigate]);

    const selectedTrip = trips.find(t => t.id === formData.tripId);

    const eligibleStaff = staffList.filter(s => {
        if (!selectedTrip) return true;
        if (!s.busOperatorId) return true;
        return s.busOperatorId === selectedTrip.busOperatorId;
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleTripChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, tripId: e.target.value, staffProfileId: '' }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.tripId) {
            toast.error("Please select a Trip!");
            return;
        }
        if (!formData.staffProfileId) {
            toast.error("Please select a Staff member!");
            return;
        }

        setSaving(true);
        try {
            const buildPayload = (versionToUse: any) => ({
                tripId: formData.tripId,
                staffProfileId: formData.staffProfileId,
                role: formData.role,
                assignedAtUtc: new Date(formData.assignedAtUtc).toISOString(),
                rowVersion: versionToUse || formData.rowVersion || null,
            });

            try {
                await api.put(`api/TripCrews/${id}`, buildPayload(formData.rowVersion));
                toast.success("Crew assignment updated successfully!");
                navigate('/admin/trip-crews');
            } catch (firstErr: any) {
                const isStaleVersion = firstErr.response?.status === 409
                    && firstErr.response?.data?.message?.includes('changed by another request');

                if (isStaleVersion) {
                    console.warn("RowVersion conflict. Auto-fetching latest data...");
                    const freshRes = await api.get(`api/TripCrews/${id}`);
                    const latestVersion = freshRes.data?.rowVersion;
                    if (latestVersion) {
                        setFormData(prev => ({ ...prev, rowVersion: latestVersion }));
                        await api.put(`api/TripCrews/${id}`, buildPayload(latestVersion));
                        toast.success("Updated successfully with fresh version!");
                        navigate('/admin/trip-crews');
                        return;
                    }
                }
                throw firstErr;
            }
        } catch (err: any) {
            console.error("Save trip crew error:", err);
            const message = err.response?.data?.message;
            if (err.response?.status === 409) {
                toast.error(message || "This staff member is already assigned to an overlapping trip.");
            } else {
                toast.error(message || err.response?.data?.title || "Failed to update assignment");
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="container-fluid py-5 text-center min-vh-100 d-flex align-items-center justify-content-center">
                <div className="spinner-border text-primary mr-2" role="status"></div>
                <span className="text-muted font-italic">Loading crew assignment...</span>
            </div>
        );
    }

    return (
        <div className="container-fluid py-4 bg-light min-vh-100">
            <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 shadow-sm rounded border-left border-primary" style={{ borderLeftWidth: '5px' }}>
                <div>
                    <h5 className="mb-0 text-primary font-weight-bold">
                        <i className="fas fa-edit mr-2"></i> Update Crew Assignment
                    </h5>
                    <div className="d-flex align-items-center gap-2 mt-1">
                        <small className="text-muted">Assignment ID: <code className="text-dark bg-light px-2 py-0.5 rounded">{id}</code></small>
                        {formData.rowVersion && (
                            <span className="badge badge-secondary ml-2" style={{ fontSize: '10px' }}>Concurrency Active</span>
                        )}
                    </div>
                </div>
                <button type="button" className="btn btn-outline-secondary px-4 shadow-sm" onClick={() => navigate('/admin/trip-crews')}>
                    CANCEL
                </button>
            </div>

            <div className="row justify-content-center">
                <div className="col-lg-8">
                    <form onSubmit={handleSave} className="card shadow-sm border-0 rounded-lg">
                        <div className="card-body p-4">
                            <div className="row g-3">
                                <div className="col-md-12">
                                    <label className="small font-weight-bold mb-1">Trip *</label>
                                    <select name="tripId" className="form-select" value={formData.tripId} onChange={handleTripChange} required>
                                        {trips.map(t => (
                                            <option key={t.id} value={t.id}>
                                                {t.tripCode} — {new Date(t.departureTimeUtc).toLocaleString()}
                                            </option>
                                        ))}
                                    </select>
                                    {selectedTrip && (
                                        <small className="text-muted">
                                            Departs {new Date(selectedTrip.departureTimeUtc).toLocaleString()} · Arrives {new Date(selectedTrip.arrivalTimeUtc).toLocaleString()}
                                        </small>
                                    )}
                                </div>

                                <div className="col-md-12">
                                    <label className="small font-weight-bold mb-1">Staff Member *</label>
                                    <select name="staffProfileId" className="form-select" value={formData.staffProfileId} onChange={handleChange} required>
                                        {eligibleStaff.map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.employeeCode} ({s.role})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-md-6">
                                    <label className="small font-weight-bold mb-1">Crew Role *</label>
                                    <select name="role" className="form-select" value={formData.role} onChange={handleChange} required>
                                        {CREW_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>

                                <div className="col-md-6">
                                    <label className="small font-weight-bold mb-1">Assigned At *</label>
                                    <input
                                        type="datetime-local"
                                        name="assignedAtUtc"
                                        className="form-control"
                                        value={formData.assignedAtUtc}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="card-footer bg-white p-3 d-flex justify-content-end gap-2 border-top">
                            <button type="button" className="btn btn-outline-secondary px-4" onClick={() => navigate('/admin/trip-crews')}>
                                Back
                            </button>
                            <button type="submit" className="btn btn-primary px-4 font-weight-bold" disabled={saving}>
                                {saving ? "Updating..." : "Update Assignment"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default TripCrewsEdit;
