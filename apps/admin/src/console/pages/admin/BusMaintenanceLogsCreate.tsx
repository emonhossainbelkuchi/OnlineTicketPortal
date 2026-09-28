import React, { useState, useEffect } from 'react';
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

interface BusOption {
    id: string;
    coachNumber: string;
    registrationNumber: string;
}

function toLocalInputValue(d: Date) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const BusMaintenanceLogsCreate: React.FC = () => {
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const [busesLoading, setBusesLoading] = useState(true);
    const [buses, setBuses] = useState<BusOption[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [formData, setFormData] = useState({
        busId: '',
        maintenanceDateUtc: toLocalInputValue(new Date()),
        odometerKm: '',
        title: '',
        description: '',
        cost: '',
        nextDueDateUtc: '',
        performedBy: '',
    });

    useEffect(() => {
        (async () => {
            setBusesLoading(true);
            try {
                const res = await api.get("api/Buses");
                const list = (res.data || []).map((b: any) => ({
                    id: b.id,
                    coachNumber: b.coachNumber,
                    registrationNumber: b.registrationNumber,
                }));
                setBuses(list);
            } catch (e) {
                console.warn("Could not load buses:", e);
                toast.error("Failed to load buses for selection");
            } finally {
                setBusesLoading(false);
            }
        })();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
    };

    const validate = () => {
        const next: Record<string, string> = {};
        if (!formData.busId) next.busId = "Please select a bus.";
        if (!formData.maintenanceDateUtc) next.maintenanceDateUtc = "Maintenance date is required.";
        if (!formData.title.trim()) next.title = "Title is required.";
        else if (formData.title.trim().length > 120) next.title = "Title cannot exceed 120 characters.";
        if (formData.description && formData.description.length > 1000) next.description = "Description cannot exceed 1000 characters.";
        if (formData.cost === '' || Number(formData.cost) < 0) next.cost = "Cost must be zero or a positive number.";
        if (formData.odometerKm !== '' && Number(formData.odometerKm) < 0) next.odometerKm = "Odometer cannot be negative.";
        if (formData.performedBy && formData.performedBy.length > 120) next.performedBy = "Performed By cannot exceed 120 characters.";
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) {
            toast.error("Please fix the highlighted fields.");
            return;
        }
        setSubmitting(true);
        try {
            const payload = {
                busId: formData.busId,
                maintenanceDateUtc: new Date(formData.maintenanceDateUtc).toISOString(),
                odometerKm: formData.odometerKm !== '' ? Number(formData.odometerKm) : null,
                title: formData.title.trim(),
                description: formData.description.trim() || null,
                cost: Number(formData.cost),
                nextDueDateUtc: formData.nextDueDateUtc ? new Date(formData.nextDueDateUtc).toISOString() : null,
                performedBy: formData.performedBy.trim() || null,
            };

            await api.post("api/BusMaintenanceLogs", payload);
            toast.success("Maintenance log created successfully!");
            navigate('/admin/bus-maintenance-logs');
        } catch (err: any) {
            console.error("Create maintenance log error:", err);
            toast.error(err.response?.data?.message || "Failed to create maintenance log");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="container-fluid py-4 bg-light min-vh-100">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 shadow-sm rounded border-left border-primary" style={{ borderLeftWidth: '5px' }}>
                <div>
                    <h5 className="mb-0 text-primary font-weight-bold">
                        <i className="fas fa-plus-circle mr-2"></i> New Bus Maintenance Log
                    </h5>
                    <small className="text-muted">Record a service, repair, or inspection performed on a bus</small>
                </div>
                <button
                    type="button"
                    className="btn btn-outline-secondary px-4 shadow-sm"
                    onClick={() => navigate('/admin/bus-maintenance-logs')}
                >
                    <i className="fas fa-arrow-left mr-1"></i> Back to list
                </button>
            </div>

            <div className="row justify-content-center">
                <div className="col-lg-9">
                    <form onSubmit={handleSubmit}>
                        <div className="card border-0 shadow-sm">
                            <div className="card-header bg-white border-bottom">
                                <strong><i className="fas fa-bus mr-2 text-primary"></i>Bus & Schedule</strong>
                            </div>
                            <div className="card-body">
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="small font-weight-bold mb-1">Bus *</label>
                                        <select
                                            name="busId"
                                            className={`form-select ${errors.busId ? 'is-invalid' : ''}`}
                                            value={formData.busId}
                                            onChange={handleChange}
                                            disabled={busesLoading}
                                        >
                                            <option value="">{busesLoading ? 'Loading buses...' : 'Select a bus'}</option>
                                            {buses.map(b => (
                                                <option key={b.id} value={b.id}>{b.coachNumber} — {b.registrationNumber}</option>
                                            ))}
                                        </select>
                                        {errors.busId && <div className="invalid-feedback">{errors.busId}</div>}
                                    </div>
                                    <div className="col-md-6">
                                        <label className="small font-weight-bold mb-1">Maintenance Date & Time *</label>
                                        <input
                                            type="datetime-local"
                                            name="maintenanceDateUtc"
                                            className={`form-control ${errors.maintenanceDateUtc ? 'is-invalid' : ''}`}
                                            value={formData.maintenanceDateUtc}
                                            onChange={handleChange}
                                        />
                                        {errors.maintenanceDateUtc && <div className="invalid-feedback">{errors.maintenanceDateUtc}</div>}
                                    </div>

                                    <div className="col-md-6">
                                        <label className="small font-weight-bold mb-1">Odometer (km)</label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-white"><i className="fas fa-tachometer-alt text-muted"></i></span>
                                            <input
                                                type="number"
                                                min={0}
                                                name="odometerKm"
                                                className={`form-control ${errors.odometerKm ? 'is-invalid' : ''}`}
                                                placeholder="e.g. 95000"
                                                value={formData.odometerKm}
                                                onChange={handleChange}
                                            />
                                            {errors.odometerKm && <div className="invalid-feedback">{errors.odometerKm}</div>}
                                        </div>
                                    </div>

                                    <div className="col-md-6">
                                        <label className="small font-weight-bold mb-1">Next Due Date</label>
                                        <input
                                            type="datetime-local"
                                            name="nextDueDateUtc"
                                            className="form-control"
                                            value={formData.nextDueDateUtc}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card border-0 shadow-sm mt-3">
                            <div className="card-header bg-white border-bottom">
                                <strong><i className="fas fa-clipboard-list mr-2 text-primary"></i>Work Details</strong>
                            </div>
                            <div className="card-body">
                                <div className="row g-3">
                                    <div className="col-md-12">
                                        <label className="small font-weight-bold mb-1">Title *</label>
                                        <input
                                            name="title"
                                            className={`form-control ${errors.title ? 'is-invalid' : ''}`}
                                            placeholder="e.g. Routine Service"
                                            maxLength={120}
                                            value={formData.title}
                                            onChange={handleChange}
                                        />
                                        {errors.title && <div className="invalid-feedback">{errors.title}</div>}
                                    </div>
                                    <div className="col-md-12">
                                        <label className="small font-weight-bold mb-1">Description</label>
                                        <textarea
                                            name="description"
                                            className={`form-control ${errors.description ? 'is-invalid' : ''}`}
                                            placeholder="e.g. Engine oil change, brake pad inspection..."
                                            maxLength={1000}
                                            rows={3}
                                            value={formData.description}
                                            onChange={handleChange}
                                        />
                                        <div className="d-flex justify-content-between">
                                            {errors.description ? <div className="invalid-feedback d-block">{errors.description}</div> : <span></span>}
                                            <small className="text-muted">{formData.description.length}/1000</small>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="small font-weight-bold mb-1">Cost *</label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-white"><i className="fas fa-coins text-muted"></i></span>
                                            <input
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                name="cost"
                                                className={`form-control ${errors.cost ? 'is-invalid' : ''}`}
                                                placeholder="e.g. 12500"
                                                value={formData.cost}
                                                onChange={handleChange}
                                            />
                                            {errors.cost && <div className="invalid-feedback">{errors.cost}</div>}
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="small font-weight-bold mb-1">Performed By</label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-white"><i className="fas fa-user-cog text-muted"></i></span>
                                            <input
                                                name="performedBy"
                                                className={`form-control ${errors.performedBy ? 'is-invalid' : ''}`}
                                                placeholder="e.g. Central Workshop"
                                                maxLength={120}
                                                value={formData.performedBy}
                                                onChange={handleChange}
                                            />
                                            {errors.performedBy && <div className="invalid-feedback">{errors.performedBy}</div>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="card-footer bg-white p-3 d-flex justify-content-end gap-2 border-top">
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary px-4"
                                    onClick={() => navigate('/admin/bus-maintenance-logs')}
                                    disabled={submitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary px-4 font-weight-bold"
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm mr-1"></span> Saving...
                                        </>
                                    ) : (
                                        <><i className="fas fa-save mr-1"></i> Save Maintenance Log</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default BusMaintenanceLogsCreate;
