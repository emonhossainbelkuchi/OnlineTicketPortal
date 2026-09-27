import React, { useState, useEffect } from 'react';
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const BUS_TYPES = ['NonAc', 'Ac', 'Sleeper', 'DoubleDecker', 'BusinessClass', 'Economy', 'Luxury'];
const SEAT_TYPES = ['Regular', 'Window', 'Aisle', 'Middle', 'Sleeper', 'Business'];

interface OptionRow {
    id: string;
    name: string;
}

const toLocalInputValue = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const FareRulesCreate: React.FC = () => {
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const [loadingLookups, setLoadingLookups] = useState(true);

    // If the caller is scoped operator staff, the backend ignores/derives BusOperatorId anyway
    // and this picker is meaningless for them — but showing it does no harm since it's simply
    // overridden server-side. Only unscoped Admin/Staff can actually leave it blank/platform-wide.
    const [operators, setOperators] = useState<OptionRow[]>([]);
    const [routes, setRoutes] = useState<OptionRow[]>([]);

    const [formData, setFormData] = useState({
        busOperatorId: '', // '' => platform default (null), otherwise a specific operator
        busRouteId: '',
        busType: '', // '' => Any (null)
        seatType: '', // '' => Any (null)
        baseFare: 0,
        currency: 'BDT',
        effectiveFromUtc: toLocalInputValue(new Date()),
        effectiveToUtc: '',
        isActive: true,
    });

    useEffect(() => {
        (async () => {
            setLoadingLookups(true);
            try {
                const [opsRes, routesRes] = await Promise.all([
                    api.get("api/BusOperators"),
                    api.get("api/BusRoutes"),
                ]);
                setOperators(opsRes.data || []);
                setRoutes(routesRes.data || []);
            } catch (err: any) {
                console.error("Load lookups error:", err);
                toast.error("Failed to load operators/routes list");
            } finally {
                setLoadingLookups(false);
            }
        })();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target as HTMLInputElement;
        if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
            return;
        }
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.busRouteId) {
            toast.error("Bus Route is required!");
            return;
        }
        if (formData.baseFare < 0) {
            toast.error("Base Fare cannot be negative!");
            return;
        }
        if (formData.currency.trim().length !== 3) {
            toast.error("Currency must be a 3-letter code!");
            return;
        }
        if (formData.effectiveToUtc && new Date(formData.effectiveToUtc) < new Date(formData.effectiveFromUtc)) {
            toast.error("Effective To cannot be before Effective From!");
            return;
        }

        setSubmitting(true);
        try {
            // Matches FareRuleCreateDto exactly. Empty selects become null (platform-default /
            // any-type), matching the nullable Guid?/BusType?/SeatType? fields on the backend.
            await api.post("api/FareRules", {
                busOperatorId: formData.busOperatorId || null,
                busRouteId: formData.busRouteId,
                busType: formData.busType || null,
                seatType: formData.seatType || null,
                baseFare: Number(formData.baseFare),
                currency: formData.currency.trim().toUpperCase(),
                effectiveFromUtc: new Date(formData.effectiveFromUtc).toISOString(),
                effectiveToUtc: formData.effectiveToUtc ? new Date(formData.effectiveToUtc).toISOString() : null,
                isActive: formData.isActive,
            });

            toast.success("Fare rule created successfully!");
            navigate('/admin/fare-rules');
        } catch (err: any) {
            console.error("Create fare rule error:", err);
            toast.error(err.response?.data?.message || err.response?.data?.title || "Failed to create fare rule");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="container-fluid py-4 bg-light min-vh-100">
            <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 shadow-sm rounded border-left border-primary" style={{ borderLeftWidth: '5px' }}>
                <div>
                    <h5 className="mb-0 text-primary font-weight-bold">
                        <i className="fas fa-plus-circle mr-2"></i> Create Fare Rule
                    </h5>
                    <small className="text-muted">Set a base price for a route, optionally narrowed by bus/seat type</small>
                </div>
                <button type="button" className="btn btn-outline-secondary px-4 shadow-sm" onClick={() => navigate('/admin/fare-rules')}>
                    BACK TO LIST
                </button>
            </div>

            <div className="row justify-content-center">
                <div className="col-lg-8">
                    <form onSubmit={handleSubmit} className="card shadow-sm border-0 rounded-lg">
                        <div className="card-body p-4">
                            <div className="row g-3">
                                <div className="col-md-12">
                                    <label className="small font-weight-bold mb-1">Bus Operator</label>
                                    <select name="busOperatorId" className="form-select" value={formData.busOperatorId} onChange={handleChange} disabled={loadingLookups}>
                                        <option value="">
                                            <i className="fas fa-globe"></i> Platform Default (applies to all operators without their own override)
                                        </option>
                                        {operators.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                                    </select>
                                    <small className="text-muted">
                                        Leave as "Platform Default" for a global fallback price. If you're logged in as an operator's own staff, this is automatically pinned to your operator.
                                    </small>
                                </div>

                                <div className="col-md-12">
                                    <label className="small font-weight-bold mb-1">Bus Route *</label>
                                    <select name="busRouteId" className="form-select" value={formData.busRouteId} onChange={handleChange} disabled={loadingLookups} required>
                                        <option value="">{loadingLookups ? "Loading…" : "Select route"}</option>
                                        {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                </div>

                                <div className="col-md-6">
                                    <label className="small font-weight-bold mb-1">Bus Type</label>
                                    <select name="busType" className="form-select" value={formData.busType} onChange={handleChange}>
                                        <option value="">Any</option>
                                        {BUS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="col-md-6">
                                    <label className="small font-weight-bold mb-1">Seat Type</label>
                                    <select name="seatType" className="form-select" value={formData.seatType} onChange={handleChange}>
                                        <option value="">Any</option>
                                        {SEAT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
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
                                    <label className="small font-weight-bold mb-1">Effective From *</label>
                                    <input type="datetime-local" name="effectiveFromUtc" className="form-control" value={formData.effectiveFromUtc} onChange={handleChange} required />
                                </div>
                                <div className="col-md-6">
                                    <label className="small font-weight-bold mb-1">Effective To <span className="text-muted">(optional)</span></label>
                                    <input type="datetime-local" name="effectiveToUtc" className="form-control" value={formData.effectiveToUtc} onChange={handleChange} />
                                </div>

                                <div className="col-md-12">
                                    <div className="form-check">
                                        <input type="checkbox" className="form-check-input" id="isActive" name="isActive" checked={formData.isActive} onChange={handleChange} />
                                        <label className="form-check-label" htmlFor="isActive">Active</label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card-footer bg-white p-3 d-flex justify-content-end gap-2 border-top">
                            <button type="button" className="btn btn-outline-secondary px-4" onClick={() => navigate('/admin/fare-rules')}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary px-4 font-weight-bold" disabled={submitting}>
                                {submitting ? "Creating..." : "Save Fare Rule"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default FareRulesCreate;
