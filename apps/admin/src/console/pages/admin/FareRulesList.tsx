import React, { useState, useEffect } from 'react';
import { api } from "@/lib/api";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

interface FareRuleRow {
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
    rowVersion?: string;
}

interface OperatorLookup {
    id: string;
    name: string;
}

interface RouteLookup {
    id: string;
    name: string;
}

const FareRulesList: React.FC = () => {
    const navigate = useNavigate();
    const [rules, setRules] = useState<FareRuleRow[]>([]);
    const [operators, setOperators] = useState<Record<string, OperatorLookup>>({});
    const [routes, setRoutes] = useState<Record<string, RouteLookup>>({});
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const [rulesRes, opsRes, routesRes] = await Promise.all([
                api.get("api/FareRules"),
                api.get("api/BusOperators"),
                api.get("api/BusRoutes"),
            ]);

            setRules(rulesRes.data || []);

            const opMap: Record<string, OperatorLookup> = {};
            (opsRes.data || []).forEach((o: any) => { opMap[o.id] = o; });
            setOperators(opMap);

            const routeMap: Record<string, RouteLookup> = {};
            (routesRes.data || []).forEach((r: any) => { routeMap[r.id] = r; });
            setRoutes(routeMap);
        } catch (err: any) {
            console.error("Load fare rules error:", err);
            toast.error(err.response?.data?.message || "Failed to load fare rules");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const handleDelete = async (id: string) => {
        if (!window.confirm("Delete this fare rule? This cannot be undone from here.")) return;
        setDeletingId(id);
        try {
            await api.delete(`api/FareRules/${id}`);
            toast.success("Fare rule deleted.");
            setRules(prev => prev.filter(r => r.id !== id));
        } catch (err: any) {
            console.error("Delete fare rule error:", err);
            toast.error(err.response?.data?.message || "Failed to delete fare rule");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="container-fluid py-4 bg-light min-vh-100">
            <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 shadow-sm rounded border-left border-primary" style={{ borderLeftWidth: '5px' }}>
                <div>
                    <h5 className="mb-0 text-primary font-weight-bold">
                        <i className="fas fa-tags mr-2"></i> Fare Rules
                    </h5>
                    <small className="text-muted">Route/bus-type/seat-type pricing — platform defaults and per-operator overrides</small>
                </div>
                <button
                    type="button"
                    className="btn btn-primary px-4 shadow-sm"
                    onClick={() => navigate('/admin/fare-rules/create')}
                >
                    <i className="fas fa-plus mr-1"></i> New Fare Rule
                </button>
            </div>

            <div className="card shadow-sm border-0">
                <div className="card-body p-0">
                    {loading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-primary mr-2" role="status"></div>
                            <span className="text-muted font-italic">Loading fare rules...</span>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover mb-0 align-middle">
                                <thead className="thead-light">
                                    <tr>
                                        <th>Scope</th>
                                        <th>Route</th>
                                        <th>Bus Type</th>
                                        <th>Seat Type</th>
                                        <th>Fare</th>
                                        <th>Effective</th>
                                        <th>Active</th>
                                        <th className="text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rules.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="text-center text-muted py-4">
                                                No fare rules found.
                                            </td>
                                        </tr>
                                    )}
                                    {rules.map(r => {
                                        const operator = r.busOperatorId ? operators[r.busOperatorId] : null;
                                        const route = routes[r.busRouteId];
                                        return (
                                            <tr key={r.id}>
                                                <td>
                                                    {r.busOperatorId ? (
                                                        <span className="badge badge-info">
                                                            <i className="fas fa-building mr-1"></i>
                                                            {operator ? operator.name : 'Operator'}
                                                        </span>
                                                    ) : (
                                                        <span className="badge badge-dark">
                                                            <i className="fas fa-globe mr-1"></i> Platform Default
                                                        </span>
                                                    )}
                                                </td>
                                                <td>{route ? route.name : <span className="text-muted">Unknown</span>}</td>
                                                <td>{r.busType || <span className="text-muted">Any</span>}</td>
                                                <td>{r.seatType || <span className="text-muted">Any</span>}</td>
                                                <td className="font-weight-bold">{r.baseFare.toFixed(2)} {r.currency}</td>
                                                <td>
                                                    <div className="small">{new Date(r.effectiveFromUtc).toLocaleDateString()}</div>
                                                    <div className="small text-muted">
                                                        to {r.effectiveToUtc ? new Date(r.effectiveToUtc).toLocaleDateString() : '—'}
                                                    </div>
                                                </td>
                                                <td>
                                                    {r.isActive ? (
                                                        <span className="badge badge-success">Active</span>
                                                    ) : (
                                                        <span className="badge badge-secondary">Inactive</span>
                                                    )}
                                                </td>
                                                <td className="text-right">
                                                    <Link to={`/admin/fare-rules/${r.id}`} className="btn btn-sm btn-outline-info mr-1">
                                                        View
                                                    </Link>
                                                    <Link to={`/admin/fare-rules/edit/${r.id}`} className="btn btn-sm btn-outline-warning mr-1">
                                                        Edit
                                                    </Link>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline-danger"
                                                        disabled={deletingId === r.id}
                                                        onClick={() => handleDelete(r.id)}
                                                    >
                                                        {deletingId === r.id ? "..." : "Delete"}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FareRulesList;
