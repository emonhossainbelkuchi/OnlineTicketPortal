import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useOperatorContract } from '@/hooks/useOperatorContracts';
import { updateOperatorContract, extractErrorMessage } from '@/services/operatorContractService';
import { GatewayFeeBearer, GatewayFeeBearerLabel } from '@/types/operatorContract.types';

interface BusOperatorOption {
    id: string;
    name: string;
}

const OperatorContractsEdit: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { item, loading, error, notFound } = useOperatorContract(id);

    const [submitting, setSubmitting] = useState(false);
    const [operatorsLoading, setOperatorsLoading] = useState(true);
    const [operators, setOperators] = useState<BusOperatorOption[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [rowVersion, setRowVersion] = useState<string>('');
    const [hydrated, setHydrated] = useState(false);

    const [formData, setFormData] = useState({
        busOperatorId: '',
        contractNo: '',
        effectiveFrom: '',
        effectiveTo: '',
        settlementIntervalDays: '7',
        gatewayFeeBearer: GatewayFeeBearer.Operator,
        isActive: true,
        notes: '',
    });

    useEffect(() => {
        (async () => {
            setOperatorsLoading(true);
            try {
                const res = await api.get('api/BusOperators');
                setOperators((res.data || []).map((o: any) => ({ id: o.id, name: o.name })));
            } catch (e) {
                console.warn('Could not load bus operators:', e);
            } finally {
                setOperatorsLoading(false);
            }
        })();
    }, []);

    // Populate the form once when the record first arrives — after that, the
    // background poll refreshes `item` but must NOT clobber unsaved edits.
    useEffect(() => {
        if (!item || hydrated) return;
        setFormData({
            busOperatorId: item.busOperatorId || '',
            contractNo: item.contractNo || '',
            effectiveFrom: item.effectiveFrom || '',
            effectiveTo: item.effectiveTo || '',
            settlementIntervalDays: String(item.settlementIntervalDays ?? 7),
            gatewayFeeBearer: item.gatewayFeeBearer,
            isActive: item.isActive,
            notes: item.notes || '',
        });
        setRowVersion(item.rowVersion || '');
        setHydrated(true);
    }, [item, hydrated]);

    useEffect(() => {
        if (notFound) {
            toast.error('Operator contract not found.');
            navigate('/admin/operator-contracts');
        }
    }, [notFound, navigate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
        if (errors[name]) setErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
    };

    const validate = () => {
        const next: Record<string, string> = {};
        if (!formData.busOperatorId) next.busOperatorId = 'Please select a bus operator.';
        if (!formData.contractNo.trim()) next.contractNo = 'Contract No is required.';
        else if (formData.contractNo.trim().length > 60) next.contractNo = 'Contract No cannot exceed 60 characters.';
        if (!formData.effectiveFrom) next.effectiveFrom = 'Effective From date is required.';
        if (formData.effectiveTo && formData.effectiveFrom && formData.effectiveTo < formData.effectiveFrom) {
            next.effectiveTo = 'Effective To cannot be before Effective From.';
        }
        const interval = Number(formData.settlementIntervalDays);
        if (!formData.settlementIntervalDays || interval < 1) next.settlementIntervalDays = 'Settlement interval must be at least 1 day.';
        if (formData.notes && formData.notes.length > 500) next.notes = 'Notes cannot exceed 500 characters.';
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;
        if (!validate()) {
            toast.error('Please fix the highlighted fields.');
            return;
        }
        setSubmitting(true);
        try {
            await updateOperatorContract(id, {
                busOperatorId: formData.busOperatorId,
                contractNo: formData.contractNo.trim(),
                effectiveFrom: formData.effectiveFrom,
                effectiveTo: formData.effectiveTo || null,
                settlementIntervalDays: Number(formData.settlementIntervalDays),
                gatewayFeeBearer: Number(formData.gatewayFeeBearer) as GatewayFeeBearer,
                isActive: formData.isActive,
                notes: formData.notes.trim() || null,
                rowVersion,
            });
            toast.success('Operator contract updated successfully!');
            navigate('/admin/operator-contracts');
        } catch (err: any) {
            console.error('Update operator contract error:', err);
            if (err?.response?.status === 409 || err?.status === 409) {
                toast.error('This contract was changed by another user. Please refresh and try again.');
            } else {
                toast.error(extractErrorMessage(err));
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (loading || !hydrated) {
        return (
            <div className="container-fluid py-5 text-center min-vh-100 d-flex align-items-center justify-content-center">
                <div className="spinner-border text-primary mr-2" role="status"></div>
                <span className="text-muted font-italic">Loading operator contract...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container-fluid py-5">
                <div className="alert alert-danger">{error}</div>
            </div>
        );
    }

    return (
        <div className="container-fluid py-4 bg-light min-vh-100">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 shadow-sm rounded border-left border-warning" style={{ borderLeftWidth: '5px' }}>
                <div>
                    <h5 className="mb-0 text-warning font-weight-bold">
                        <i className="fas fa-edit mr-2"></i> Edit Operator Contract
                    </h5>
                    <small className="text-muted font-monospace">ID: {id}</small>
                </div>
                <button
                    type="button"
                    className="btn btn-outline-secondary px-4 shadow-sm"
                    onClick={() => navigate('/admin/operator-contracts')}
                >
                    <i className="fas fa-arrow-left mr-1"></i> Back to list
                </button>
            </div>

            <div className="row justify-content-center">
                <div className="col-lg-9">
                    <form onSubmit={handleSubmit}>
                        <div className="card border-0 shadow-sm">
                            <div className="card-header bg-white border-bottom">
                                <strong><i className="fas fa-building mr-2 text-primary"></i>Operator & Contract</strong>
                            </div>
                            <div className="card-body">
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="small font-weight-bold mb-1">Bus Operator *</label>
                                        <select
                                            name="busOperatorId"
                                            className={`form-select ${errors.busOperatorId ? 'is-invalid' : ''}`}
                                            value={formData.busOperatorId}
                                            onChange={handleChange}
                                            disabled={operatorsLoading}
                                        >
                                            <option value="">{operatorsLoading ? 'Loading operators...' : 'Select a bus operator'}</option>
                                            {operators.map(o => (
                                                <option key={o.id} value={o.id}>{o.name}</option>
                                            ))}
                                        </select>
                                        {errors.busOperatorId && <div className="invalid-feedback">{errors.busOperatorId}</div>}
                                    </div>
                                    <div className="col-md-6">
                                        <label className="small font-weight-bold mb-1">Contract No *</label>
                                        <input
                                            name="contractNo"
                                            className={`form-control ${errors.contractNo ? 'is-invalid' : ''}`}
                                            maxLength={60}
                                            value={formData.contractNo}
                                            onChange={handleChange}
                                        />
                                        {errors.contractNo && <div className="invalid-feedback">{errors.contractNo}</div>}
                                    </div>

                                    <div className="col-md-6">
                                        <label className="small font-weight-bold mb-1">Effective From *</label>
                                        <input
                                            type="date"
                                            name="effectiveFrom"
                                            className={`form-control ${errors.effectiveFrom ? 'is-invalid' : ''}`}
                                            value={formData.effectiveFrom}
                                            onChange={handleChange}
                                        />
                                        {errors.effectiveFrom && <div className="invalid-feedback">{errors.effectiveFrom}</div>}
                                    </div>
                                    <div className="col-md-6">
                                        <label className="small font-weight-bold mb-1">Effective To</label>
                                        <input
                                            type="date"
                                            name="effectiveTo"
                                            className={`form-control ${errors.effectiveTo ? 'is-invalid' : ''}`}
                                            value={formData.effectiveTo}
                                            onChange={handleChange}
                                        />
                                        {errors.effectiveTo && <div className="invalid-feedback">{errors.effectiveTo}</div>}
                                        <small className="text-muted">Leave blank for an open-ended contract</small>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card border-0 shadow-sm mt-3">
                            <div className="card-header bg-white border-bottom">
                                <strong><i className="fas fa-hand-holding-usd mr-2 text-primary"></i>Settlement Terms</strong>
                            </div>
                            <div className="card-body">
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="small font-weight-bold mb-1">Settlement Interval (days) *</label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-white"><i className="fas fa-calendar-day text-muted"></i></span>
                                            <input
                                                type="number"
                                                min={1}
                                                name="settlementIntervalDays"
                                                className={`form-control ${errors.settlementIntervalDays ? 'is-invalid' : ''}`}
                                                value={formData.settlementIntervalDays}
                                                onChange={handleChange}
                                            />
                                            {errors.settlementIntervalDays && <div className="invalid-feedback">{errors.settlementIntervalDays}</div>}
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="small font-weight-bold mb-1">Gateway Fee Bearer *</label>
                                        <select
                                            name="gatewayFeeBearer"
                                            className="form-select"
                                            value={formData.gatewayFeeBearer}
                                            onChange={handleChange}
                                        >
                                            {Object.entries(GatewayFeeBearerLabel).map(([value, label]) => (
                                                <option key={value} value={value}>{label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-md-12">
                                        <label className="small font-weight-bold mb-1">Notes</label>
                                        <textarea
                                            name="notes"
                                            className={`form-control ${errors.notes ? 'is-invalid' : ''}`}
                                            maxLength={500}
                                            rows={3}
                                            value={formData.notes}
                                            onChange={handleChange}
                                        />
                                        <div className="d-flex justify-content-between">
                                            {errors.notes ? <div className="invalid-feedback d-block">{errors.notes}</div> : <span></span>}
                                            <small className="text-muted">{formData.notes.length}/500</small>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="small font-weight-bold mb-1">Status</label>
                                        <div className="form-check form-switch border p-2 rounded bg-light">
                                            <input
                                                type="checkbox"
                                                className="form-check-input ms-0 me-2"
                                                id="isActiveCheck"
                                                name="isActive"
                                                checked={formData.isActive}
                                                onChange={handleChange}
                                            />
                                            <label className="form-check-label small font-weight-bold text-dark" htmlFor="isActiveCheck">
                                                Active contract
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="card-footer bg-white p-3 d-flex justify-content-end gap-2 border-top">
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary px-4"
                                    onClick={() => navigate('/admin/operator-contracts')}
                                    disabled={submitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-warning px-4 font-weight-bold"
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm mr-1"></span> Saving...
                                        </>
                                    ) : (
                                        <><i className="fas fa-save mr-1"></i> Update Contract</>
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

export default OperatorContractsEdit;
