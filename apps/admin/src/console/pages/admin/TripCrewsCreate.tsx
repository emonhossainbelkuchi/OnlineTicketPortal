import React, { useState, useEffect } from 'react';
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
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

const toLocalInputValue = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const TripCrewsCreate: React.FC = () => {
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const [loadingLookups, setLoadingLookups] = useState(true);

    const [trips, setTrips] = useState<TripOption[]>([]);
    const [staffList, setStaffList] = useState<StaffOption[]>([]);

    const [formData, setFormData] = useState({
        tripId: '',
        staffProfileId: '',
        role: 'Driver' as CrewRole,
        assignedAtUtc: toLocalInputValue(new Date()),
    });

    useEffect(() => {
        (async () => {
            setLoadingLookups(true);
            try {
                const [tripsRes, staffRes] = await Promise.all([
                    api.get("api/Trips"),
                    api.get("api/StaffProfiles"),
                ]);
                setTrips(tripsRes.data || []);
                setStaffList(staffRes.data || []);
            } catch (err: any) {
                console.error("Load lookups error:", err);
                toast.error("Failed to load trips/staff list");
            } finally {
                setLoadingLookups(false);
            }
        })();
    }, []);

    const selectedTrip = trips.find(t => t.id === formData.tripId);

    // Staff assignable to this trip: platform staff (no BusOperatorId) or the SAME operator as
    // the selected Trip — mirrors ValidateAssignmentAsync on the backend, so the dropdown never
    // even offers a choice the API would reject.
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.tripId) {
            toast.error("Please select a Trip!");
            return;
        }
        if (!formData.staffProfileId) {
            toast.error("Please select a Staff member!");
            return;
        }

        setSubmitting(true);
        try {
            // Matches TripCrewCreateDto exactly.
            await api.post("api/TripCrews", {
                tripId: formData.tripId,
                staffProfileId: formData.staffProfileId,
                role: formData.role,
                assignedAtUtc: new Date(formData.assignedAtUtc).toISOString(),
            });

            toast.success("Crew assigned to trip successfully!");
            navigate('/admin/trip-crews');
        } catch (err: any) {
            console.error("Create trip crew error:", err);
            const message = err.response?.data?.message;
            if (err.response?.status === 409) {
                toast.error(message || "This staff member is already assigned to an overlapping trip.");
            } else {
                toast.error(message || err.response?.data?.title || "Failed to assign crew");
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="container-fluid py-4 bg-light min-vh-100">
            <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 shadow-sm rounded border-left border-primary" style={{ borderLeftWidth: '5px' }}>
                <div>
                    <h5 className="mb-0 text-primary font-weight-bold">
                        <i className="fas fa-user-plus mr-2"></i> Assign Trip Crew
                    </h5>
                    <small className="text-muted">Assign a driver, supervisor or helper to a scheduled trip</small>
                </div>
                <button type="button" className="btn btn-outline-secondary px-4 shadow-sm" onClick={() => navigate('/admin/trip-crews')}>
                    BACK TO LIST
                </button>
            </div>

            <div className="row justify-content-center">
                <div className="col-lg-8">
                    <form onSubmit={handleSubmit} className="card shadow-sm border-0 rounded-lg">
                        <div className="card-body p-4">
                            <div className="row g-3">
                                <div className="col-md-12">
                                    <label className="small font-weight-bold mb-1">Trip *</label>
                                    <select
                                        name="tripId"
                                        className="form-select"
                                        value={formData.tripId}
                                        onChange={handleTripChange}
                                        disabled={loadingLookups}
                                        required
                                    >
                                        <option value="">{loadingLookups ? "Loading…" : "Select trip"}</option>
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
                                    <select
                                        name="staffProfileId"
                                        className="form-select"
                                        value={formData.staffProfileId}
                                        onChange={handleChange}
                                        disabled={loadingLookups || !formData.tripId}
                                        required
                                    >
                                        <option value="">{!formData.tripId ? "Select a trip first" : "Select staff member"}</option>
                                        {eligibleStaff.map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.employeeCode} ({s.role})
                                            </option>
                                        ))}
                                    </select>
                                    {formData.tripId && eligibleStaff.length === 0 && !loadingLookups && (
                                        <small className="text-muted">No eligible staff found for this trip's operator.</small>
                                    )}
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
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary px-4 font-weight-bold" disabled={submitting}>
                                {submitting ? "Assigning..." : "Save Assignment"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default TripCrewsCreate;
