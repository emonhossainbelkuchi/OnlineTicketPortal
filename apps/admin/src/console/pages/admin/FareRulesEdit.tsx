import React, { useState, useEffect } from 'react';
import { api } from "@/lib/api";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

const BUS_TYPES = ['NonAc', 'Ac', 'Sleeper', 'DoubleDecker', 'BusinessClass', 'Economy', 'Luxury'];
const SEAT_TYPES = ['Regular', 'Window', 'Aisle', 'Middle', 'Sleeper', 'Business'];

interface OptionRow {
    id: string;
    name: string;
}

const toLocalInputValue = (iso?: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const FareRulesEdit: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [operators, setOperators] = useState<OptionRow[]>([]);
    const [routes, setRoutes] = useState<OptionRow[]>([]);

    const [formData, setFormData] = useState({
        busOperatorId: '',
        busRouteId: '',
        busType: '',
        seatType: '',
        baseFare: 0,
        currency: 'BDT',
        effectiveFromUtc: '',
        effectiveToUtc: '',
        isActive: true,
        rowVersion: null as string | null,
    });

    useEffect(() => {
        if (!id) return;
        (async () => {
            setLoading(true);
            try {
                const [opsRes, routesRes, ruleRes] = await Promise.all([
                    api.get("api/BusOperators"),
                    api.get("api/BusRoutes"),
                    api.get(`api/FareRules/${id}`),
                ]);
                setOperators(opsRes.data || []);
                setRoutes(routesRes.data || []);

                const data = ruleRes.data;
                setFormData({
                    busOperatorId: data.busOperatorId || '',
                    busRouteId: data.busRouteId || '',
                    busType: data.busType || '',
                    seatType: data.seatType || '',
                    baseFare: data.baseFare || 0,
                    currency: data.currency || 'BDT',
                    effectiveFromUtc: toLocalInputValue(data.effectiveFromUtc),
                    effectiveToUtc: toLocalInputValue(data.effectiveToUtc),
                    isActive: !!data.isActive,
                    rowVersion: data.rowVersion || null,
                });
            } catch (err: any) {
                console.error("Load fare rule error:", err);
                toast.error(err.response?.data?.message || "Failed to load fare rule");
                navigate('/admin/fare-rules');
            } finally {
                setLoading(false);
            }
        })();
    }, [id, navigate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target as HTMLInputElement;
        if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
            return;
        }
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e: React.FormEvent) => {
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

        setSaving(true);
        try {
            const buildPayload = (versionToUse: any) => ({
                busOperatorId: formData.busOperatorId || null,
                busRouteId: formData.busRouteId,
                busType: formData.busType || null,
                seatType: formData.seatType || null,
                baseFare: Number(formData.baseFare),
                currency: formData.currency.trim().toUpperCase(),
                effectiveFromUtc: new Date(formData.effectiveFromUtc).toISOString(),
                effectiveToUtc: formData.effectiveToUtc ? new Date(formData.effectiveToUtc).toISOString() : null,
                isActive: formData.isActive,
                rowVersion: versionToUse || formData.rowVersion || null,
            });

            try {
                await api.put(`api/FareRules/${id}`, buildPayload(formData.rowVersion));
                toast.success("Fare rule updated successfully!");
                navigate('/admin/fare-rules');
            } catch (firstErr: any) {
                const isConflict = firstErr.response?.status === 409 || firstErr.response?.data?.message?.includes('changed');
                if (isConflict) {
                    console.warn("RowVersion conflict. Auto-fetching latest data...");
                    const freshRes = await api.get(`api/FareRules/${id}`);
                    const latestVersion = freshRes.data?.rowVersion;
                    if (latestVersion) {
                        setFormData(prev => ({ ...prev, rowVersion: latestVersion }));
                        await api.put(`api/FareRules/${id}`, buildPayload(latestVersion));
                        toast.success("Updated successfully with fresh version!");
                        navigate('/admin/fare-rules');
                        return;
                    }
                }
                throw firstErr;
            }
        } catch (err: any) {
            console.error("Save fare rule error:", err);
            toast.error(err.response?.data?.message || err.response?.data?.title || "Failed to update fare rule");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="container-fluid py-5 text-center min-vh-100 d-flex align-items-center justify-content-center">
                <div className="spinner-border text-primary mr-2" role="status"></div>
                <span className="text-muted font-italic">Loading fare rule...</span>
            </div>
        );
    }

    return (
        <div className="container-fluid py-4 bg-light min-vh-100">
            <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 shadow-sm rounded border-left border-primary" style={{ borderLeftWidth: '5px' }}>
                <div>
                    <h5 className="mb-0 text-primary font-weight-bold">
                        <i className="fas fa-edit mr-2"></i> Update Fare Rule
                    </h5>
                    <div className="d-flex align-items-center gap-2 mt-1">
                        <small className="text-muted">Rule ID: <code className="text-dark bg-light px-2 py-0.5 rounded">{id}</code></small>
                        {formData.rowVersion && (
                            <span className="badge badge-secondary ml-2" style={{ fontSize: '10px' }}>Concurrency Active</span>
                        )}
                    </div>
                </div>
                <button type="button" className="btn btn-outline-secondary px-4 shadow-sm" onClick={() => navigate('/admin/fare-rules')}>
                    CANCEL
                </button>
            </div>

            <div className="row justify-content-center">
                <div className="col-lg-8">
                    <form onSubmit={handleSave} className="card shadow-sm border-0 rounded-lg">
                        <div className="card-body p-4">
                            <div className="row g-3">
                                <div className="col-md-12">
                                    <label className="small font-weight-bold mb-1">Bus Operator</label>
                                    <select name="busOperatorId" className="form-select" value={formData.busOperatorId} onChange={handleChange}>
                                        <option value="">Platform Default (applies to all operators without their own override)</option>
                                        {operators.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                                    </select>
                                    {!formData.busOperatorId && (
                                        <small className="text-muted"><i className="fas fa-globe mr-1"></i> This is currently a platform-wide default rule.</small>
                                    )}
                                </div>

                                <div className="col-md-12">
                                    <label className="small font-weight-bold mb-1">Bus Route *</label>
                                    <select name="busRouteId" className="form-select" value={formData.busRouteId} onChange={handleChange} required>
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
                                Back
                            </button>
                            <button type="submit" className="btn btn-primary px-4 font-weight-bold" disabled={saving}>
                                {saving ? "Updating..." : "Update Fare Rule"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default FareRulesEdit;
