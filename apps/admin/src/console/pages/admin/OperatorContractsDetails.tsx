import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useOperatorContract } from '@/hooks/useOperatorContracts';
import { deleteOperatorContract, extractErrorMessage } from '@/services/operatorContractService';
import { GatewayFeeBearerLabel } from '@/types/operatorContract.types';

interface BusOperatorInfo {
    id: string;
    name: string;
}

const OperatorContractsDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { item: contract, loading, error, notFound } = useOperatorContract(id);
    const [operator, setOperator] = useState<BusOperatorInfo | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (!contract?.busOperatorId) return;
        (async () => {
            try {
                const res = await api.get(`api/BusOperators/${contract.busOperatorId}`);
                setOperator(res.data);
            } catch {
                setOperator(null);
            }
        })();
    }, [contract?.busOperatorId]);

    useEffect(() => {
        if (notFound) {
            toast.error('Operator contract not found.');
            navigate('/admin/operator-contracts');
        }
    }, [notFound, navigate]);

    const handleDelete = async () => {
        if (!contract || !window.confirm(`Delete contract "${contract.contractNo}"? This cannot be undone.`)) return;
        setDeleting(true);
        try {
            await deleteOperatorContract(contract.id);
            toast.success('Operator contract deleted successfully!');
            navigate('/admin/operator-contracts');
        } catch (err) {
            toast.error(extractErrorMessage(err));
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
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

    if (!contract) {
        return <div className="p-6">Operator contract not found.</div>;
    }

    const isExpired = contract.effectiveTo ? new Date(contract.effectiveTo).getTime() < Date.now() : false;
    const isExpiringSoon = contract.effectiveTo
        ? (new Date(contract.effectiveTo).getTime() - Date.now()) / (1000 * 60 * 60 * 24) <= 30 && !isExpired
        : false;

    return (
        <div className="container-fluid py-4 bg-light min-vh-100">
            <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 shadow-sm rounded border-left border-primary" style={{ borderLeftWidth: '5px' }}>
                <div>
                    <h5 className="mb-0 text-primary font-weight-bold">
                        <i className="fas fa-file-contract mr-2"></i> {contract.contractNo}
                    </h5>
                    <small className="text-muted font-monospace">Contract ID: {contract.id}</small>
                </div>
                <div className="d-flex gap-2">
                    <button className="btn btn-warning px-3" onClick={() => navigate(`/admin/operator-contracts/edit/${contract.id}`)}>
                        <i className="fas fa-edit mr-1"></i> Edit
                    </button>
                    <button className="btn btn-outline-danger px-3" disabled={deleting} onClick={handleDelete}>
                        {deleting ? <span className="spinner-border spinner-border-sm mr-1"></span> : <i className="fas fa-trash-alt mr-1"></i>} Delete
                    </button>
                    <button className="btn btn-outline-secondary px-3" onClick={() => navigate('/admin/operator-contracts')}>
                        Back to list
                    </button>
                </div>
            </div>

            <div className="row">
                <div className="col-lg-4">
                    <div className="card shadow-sm border-0 mb-4 text-center">
                        <div className="card-body py-4">
                            <div className="rounded-circle bg-primary-subtle text-primary d-inline-flex align-items-center justify-content-center mb-3" style={{ width: 64, height: 64 }}>
                                <i className="fas fa-building fa-2x"></i>
                            </div>
                            <h4 className="font-weight-bold text-dark mb-0">{operator?.name || '—'}</h4>
                            <div className="text-muted small font-monospace">{contract.busOperatorId}</div>
                            <hr />
                            <h3 className="font-weight-bold text-primary mb-0">
                                {contract.settlementIntervalDays} day{contract.settlementIntervalDays === 1 ? '' : 's'}
                            </h3>
                            <div className="text-muted small">Settlement Interval</div>
                            <div className="mt-3 d-flex justify-content-center gap-2">
                                {contract.isActive ? (
                                    <span className="badge bg-success">Active</span>
                                ) : (
                                    <span className="badge bg-secondary">Inactive</span>
                                )}
                                {contract.effectiveTo && (
                                    <span className={`badge ${isExpired ? 'bg-danger' : isExpiringSoon ? 'bg-warning text-dark' : 'bg-light text-dark border'}`}>
                                        {isExpired ? 'Expired' : isExpiringSoon ? 'Expiring Soon' : 'In Term'}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-lg-8">
                    <div className="card shadow-sm border-0">
                        <div className="card-header bg-white border-bottom">
                            <strong><i className="fas fa-info-circle mr-2 text-primary"></i>Details</strong>
                        </div>
                        <div className="card-body">
                            <table className="table table-sm mb-0">
                                <tbody>
                                    <tr><th style={{ width: '40%' }}>Effective From</th><td>{new Date(contract.effectiveFrom).toLocaleDateString()}</td></tr>
                                    <tr><th>Effective To</th><td>{contract.effectiveTo ? new Date(contract.effectiveTo).toLocaleDateString() : <span className="text-muted">Open-ended</span>}</td></tr>
                                    <tr><th>Gateway Fee Bearer</th><td>{GatewayFeeBearerLabel[contract.gatewayFeeBearer]}</td></tr>
                                    <tr>
                                        <th>Notes</th>
                                        <td style={{ whiteSpace: 'pre-wrap' }}>{contract.notes || <span className="text-muted">—</span>}</td>
                                    </tr>
                                    <tr><th>Created (UTC)</th><td>{contract.createdAtUtc ? new Date(contract.createdAtUtc).toLocaleString() : '—'}</td></tr>
                                    <tr><th>Updated (UTC)</th><td>{contract.updatedAtUtc ? new Date(contract.updatedAtUtc).toLocaleString() : '—'}</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OperatorContractsDetails;
