import React, { useState, useEffect } from 'react';
import { api, BusOperator } from "@/lib/api";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

// আপনার ব্যাকএন্ডের Base URL (Visual Studio পোর্ট অনুযায়ী কনফিগারযোগ্য)
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:5000";

export const resolveImageUrl = (url?: string | null) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
        return url;
    }
    const cleanBase = API_BASE_URL.replace(/\/$/, '');
    const cleanPath = url.replace(/^\/?(wwwroot\/)?/, '');
    return `${cleanBase}/${cleanPath}`;
};

const BusOperatorsPage: React.FC = () => {
    const [operators, setOperators] = useState<BusOperator[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

    const fetchOperators = async () => {
        setLoading(true);
        try {
            const res = await api.get("api/BusOperators");
            setOperators(res.data || []);
        } catch (err: any) {
            console.error("Failed to fetch operators:", err);
            toast.error("Failed to load bus operators");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOperators();
    }, []);

    const handleDelete = async (id: string, name: string) => {
        const confirmed = window.confirm(`Are you sure you want to delete "${name}"?`);
        if (!confirmed) return;

        try {
            await api.delete(`api/BusOperators/${id}`);
            toast.success("Bus Operator deleted successfully");
            setOperators(prev => prev.filter(op => op.id !== id));
        } catch (err: any) {
            console.error("Delete error:", err);
            toast.error(err.response?.data?.message || "Failed to delete operator");
        }
    };

    // সার্চ এবং স্ট্যাটাস ফিল্টারিং
    const filteredOperators = operators.filter(op => {
        const matchesSearch = 
            op.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            op.contactPhone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            op.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            op.legalName?.toLowerCase().includes(searchTerm.toLowerCase());

        if (filterStatus === 'active') return matchesSearch && op.isActive;
        if (filterStatus === 'inactive') return matchesSearch && !op.isActive;
        return matchesSearch;
    });

    const activeCount = operators.filter(o => o.isActive).length;
    const inactiveCount = operators.filter(o => !o.isActive).length;

    return (
        <div className="container-fluid py-4 bg-light min-vh-100">
            {/* Header Banner */}
            <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 shadow-sm rounded border-left border-primary" style={{ borderLeftWidth: '5px' }}>
                <div>
                    <h5 className="mb-1 text-primary font-weight-bold">
                        <i className="fas fa-bus mr-2"></i> Bus Operator Management
                    </h5>
                    <small className="text-muted">
                        View, onboard, and manage all transport companies and their service networks
                    </small>
                </div>
                <div className="d-flex gap-2">
                    <button 
                        type="button" 
                        className="btn btn-outline-secondary px-3 shadow-sm"
                        onClick={fetchOperators}
                        disabled={loading}
                    >
                        <i className="fas fa-sync-alt mr-1"></i> Refresh
                    </button>
                    <Link 
                        to="/admin/bus-operators/create" 
                        className="btn btn-primary px-3 shadow-sm font-weight-bold"
                    >
                        <i className="fas fa-plus mr-1"></i> REGISTER NEW OPERATOR
                    </Link>
                </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="card border-0 shadow-sm rounded-lg mb-4">
                <div className="card-body p-3">
                    <div className="row g-3 align-items-center">
                        <div className="col-md-7">
                            <div className="input-group">
                                <span className="input-group-text bg-white border-end-0">
                                    <i className="fas fa-search text-muted"></i>
                                </span>
                                <input 
                                    type="text" 
                                    className="form-control border-start-0" 
                                    placeholder="Search by company name, contact phone, or city..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="col-md-5 d-flex justify-content-md-end gap-2">
                            <div className="btn-group shadow-sm" role="group">
                                <button 
                                    type="button" 
                                    className={`btn btn-sm ${filterStatus === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                    onClick={() => setFilterStatus('all')}
                                >
                                    All ({operators.length})
                                </button>
                                <button 
                                    type="button" 
                                    className={`btn btn-sm ${filterStatus === 'active' ? 'btn-success' : 'btn-outline-secondary'}`}
                                    onClick={() => setFilterStatus('active')}
                                >
                                    Active ({activeCount})
                                </button>
                                <button 
                                    type="button" 
                                    className={`btn btn-sm ${filterStatus === 'inactive' ? 'btn-danger' : 'btn-outline-secondary'}`}
                                    onClick={() => setFilterStatus('inactive')}
                                >
                                    Inactive ({inactiveCount})
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Operators Table */}
            <div className="card border-0 shadow-sm rounded-lg overflow-hidden">
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead className="bg-light text-muted small font-weight-bold text-uppercase">
                            <tr>
                                <th className="px-4 py-3 border-0">Operator & Company</th>
                                <th className="border-0">Contact & Support</th>
                                <th className="border-0">Operating Base</th>
                                <th className="border-0">Routes</th>
                                <th className="border-0">System Info</th>
                                <th className="text-center border-0 px-4">Management</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-5">
                                        <div className="spinner-border text-primary mr-2" role="status"></div>
                                        <span className="text-muted font-italic">Loading operators...</span>
                                    </td>
                                </tr>
                            ) : filteredOperators.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-5 text-muted">
                                        <i className="fas fa-search fa-2x mb-2 text-muted opacity-50 d-block"></i>
                                        No bus operators found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredOperators.map((op) => {
                                    const logo = resolveImageUrl(op.logoUrl);
                                    const initials = op.name ? op.name.substring(0, 2).toUpperCase() : 'BO';

                                    return (
                                        <tr key={op.id}>
                                            <td className="px-4 py-3">
                                                <div className="d-flex align-items-center">
                                                    {/* Company Logo / Fallback */}
                                                    <div 
                                                        className="rounded bg-light border d-flex align-items-center justify-content-center me-3 flex-shrink-0 overflow-hidden" 
                                                        style={{ width: '48px', height: '48px' }}
                                                    >
                                                        {logo ? (
                                                            <img 
                                                                src={logo} 
                                                                alt={op.name}
                                                                className="w-100 h-100"
                                                                style={{ objectFit: 'cover' }}
                                                                onError={(e) => {
                                                                    // Image failed to load, show initials
                                                                    (e.target as HTMLElement).style.display = 'none';
                                                                }}
                                                            />
                                                        ) : (
                                                            <span className="font-weight-bold text-secondary small">
                                                                {initials}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-weight-bold text-dark">{op.name}</div>
                                                        <small className="text-muted d-block">
                                                            {op.legalName || 'N/A'} {op.foundedYear ? `• Est. ${op.foundedYear}` : ''}
                                                        </small>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="small font-weight-bold text-dark">
                                                    <i className="fas fa-phone-alt text-primary mr-1"></i> {op.contactPhone || 'N/A'}
                                                </div>
                                                <div className="small text-muted">
                                                    <i className="fas fa-envelope text-info mr-1"></i> {op.email || 'N/A'}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="small text-dark font-weight-bold">
                                                    <i className="fas fa-map-marker-alt text-danger mr-1"></i> {op.addressLine}
                                                </div>
                                                <small className="text-muted">
                                                    {[op.city, op.district, op.country].filter(Boolean).join(', ')}
                                                </small>
                                            </td>
                                            <td>
                                                <span className="badge bg-light text-dark border px-2 py-1">
                                                    <i className="fas fa-route text-success mr-1"></i> {op.operatorRoutes?.length || 0} Routes
                                                </span>
                                            </td>
                                            <td>
                                                <div>
                                                    {op.isActive ? (
                                                        <span className="badge bg-success px-2 py-1">ACTIVE</span>
                                                    ) : (
                                                        <span className="badge bg-secondary px-2 py-1">INACTIVE</span>
                                                    )}
                                                </div>
                                                <small className="text-muted font-monospace" style={{ fontSize: '10px' }}>
                                                    {op.inventoryMode || 'Platform'}
                                                </small>
                                            </td>
                                            <td className="text-center px-4">
                                                <div className="d-flex justify-content-center gap-2">
                                                    <Link 
                                                        to={`/admin/bus-operators/edit/${op.id}`} 
                                                        className="btn btn-sm btn-outline-primary shadow-sm"
                                                        title="Edit Operator"
                                                    >
                                                        <i className="fas fa-edit"></i>
                                                    </Link>
                                                    <button 
                                                        type="button" 
                                                        className="btn btn-sm btn-outline-danger shadow-sm"
                                                        onClick={() => handleDelete(op.id, op.name)}
                                                        title="Delete Operator"
                                                    >
                                                        <i className="fas fa-trash-alt"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Count */}
                <div className="card-footer bg-white border-0 py-3 d-flex justify-content-between align-items-center text-muted small">
                    <span>
                        SHOWING <strong>{filteredOperators.length}</strong> OF <strong>{operators.length}</strong> OPERATORS
                    </span>
                    <span>
                        <i className="fas fa-shield-alt text-success mr-1"></i> System Concurrency Active
                    </span>
                </div>
            </div>
        </div>
    );
};

export default BusOperatorsPage;
