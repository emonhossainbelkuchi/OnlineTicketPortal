import React, { useState, useEffect } from 'react';
import { api } from "@/lib/api";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

interface FareRuleDetail {
    id: string;
    busOperatorId?: string | null;
    busRouteId: string;
    busType?: string | null;
    seatType?: string | null;
    baseFare: number;
    currency: string;
    effectiveFromUtc: string;
    effectiveToUtc?: string | null;
    isActive: boolean;
    createdAtUtc?: string;
    updatedAtUtc?: string | null;
    rowVersion?: string;
}

interface OperatorInfo {
    id: string;
    name: string;
}

interface RouteInfo {
    id: string;
    name: string;
}

const FareRulesDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [rule, setRule] = useState<FareRuleDetail | null>(null);
    const [operator, setOperator] = useState<OperatorInfo | null>(null);
    const [route, setRoute] = useState<RouteInfo | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        (async () => {
            setLoading(true);
            try {
                const res = await api.get(`api/FareRules/${id}`);
                const data = res.data;
                setRule(data);

                const [opRes, routeRes] = await Promise.all([
                    data.busOperatorId ? api.get(`api/BusOperators/${data.busOperatorId}`).catch(() => null) : Promise.resolve(null),
                    api.get(`api/BusRoutes/${data.busRouteId}`).catch(() => null),
                ]);

                if (opRes) setOperator(opRes.data);
                if (routeRes) setRoute(routeRes.data);
            } catch (err: any) {
                console.error("Load fare rule error:", err);
                toast.error(err.response?.data?.message || "Failed to load fare rule");
                navigate('/admin/fare-rules');
            } finally {
                setLoading(false);
            }
        })();
    }, [id, navigate]);

    if (loading) {
        return (
            <div className="container-fluid py-5 text-center min-vh-100 d-flex align-items-center justify-content-center">
                <div className="spinner-border text-primary mr-2" role="status"></div>
                <span className="text-muted font-italic">Loading fare rule...</span>
            </div>
        );
    }

    if (!rule) {
        return <div className="p-6">Fare rule not found.</div>;
    }

    return (
        <div className="container-fluid py-4 bg-light min-vh-100">
            <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 shadow-sm rounded border-left border-primary" style={{ borderLeftWidth: '5px' }}>
                <div>
                    <h5 className="mb-0 text-primary font-weight-bold">
                        <i className="fas fa-tag mr-2"></i> Fare Rule
                    </h5>
                    <small className="text-muted">Rule ID: <code>{rule.id}</code></small>
                </div>
                <div>
                    <button className="btn btn-warning px-3 mr-2" onClick={() => navigate(`/admin/fare-rules/edit/${rule.id}`)}>
                        <i className="fas fa-edit mr-1"></i> Edit
                    </button>
                    <button className="btn btn-outline-secondary px-3" onClick={() => navigate('/admin/fare-rules')}>
                        Back to list
                    </button>
                </div>
            </div>

            <div className="row">
                <div className="col-lg-4">
                    <div className="card shadow-sm border-0 mb-4 text-center">
                        <div className="card-body py-4">
                            {rule.busOperatorId ? (
                                <span className="badge badge-info px-3 py-2 mb-2" style={{ fontSize: '0.9rem' }}>
                                    <i className="fas fa-building mr-1"></i> Operator-Specific
                                </span>
                            ) : (
                                <span className="badge badge-dark px-3 py-2 mb-2" style={{ fontSize: '0.9rem' }}>
                                    <i className="fas fa-globe mr-1"></i> Platform Default
                                </span>
                            )}
                            <h3 className="font-weight-bold text-primary mt-2 mb-0">
                                {rule.baseFare.toFixed(2)} {rule.currency}
                            </h3>
                            <div className="text-muted small">Base Fare</div>
                            <div className="mt-3">
                                {rule.isActive ? (
                                    <span className="badge badge-success">Active</span>
                                ) : (
                                    <span className="badge badge-secondary">Inactive</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-lg-8">
                    <div className="card shadow-sm border-0">
                        <div className="card-body">
                            <table className="table table-sm mb-0">
                                <tbody>
                                    <tr>
                                        <th>Bus Operator</th>
                                        <td>{operator ? operator.name : <span className="text-muted">Platform-wide (no specific operator)</span>}</td>
                                    </tr>
                                    <tr>
                                        <th>Bus Route</th>
                                        <td>{route ? route.name : <span className="text-muted">{rule.busRouteId}</span>}</td>
                                    </tr>
                                    <tr><th>Bus Type</th><td>{rule.busType || <span className="text-muted">Any</span>}</td></tr>
                                    <tr><th>Seat Type</th><td>{rule.seatType || <span className="text-muted">Any</span>}</td></tr>
                                    <tr><th>Effective From</th><td>{new Date(rule.effectiveFromUtc).toLocaleString()}</td></tr>
                                    <tr><th>Effective To</th><td>{rule.effectiveToUtc ? new Date(rule.effectiveToUtc).toLocaleString() : "—"}</td></tr>
                                    <tr><th>Created (UTC)</th><td>{rule.createdAtUtc || "—"}</td></tr>
                                    <tr><th>Updated (UTC)</th><td>{rule.updatedAtUtc || "—"}</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FareRulesDetails;
