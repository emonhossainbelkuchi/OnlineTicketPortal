import React, { useState, useEffect } from 'react';
import { api } from "@/lib/api";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

export interface OperatorBranch {
    id: string;
    busOperatorId: string;
    branchName: string;
    address: string;
    phone: string;
    city: string;
    district: string;
    createdAtUtc?: string;
    rowVersion?: string;
}

export interface BusOperatorOption {
    id: string;
    name: string;
}

const OperatorBranchList: React.FC = () => {
    const [branches, setBranches] = useState<OperatorBranch[]>([]);
    const [operators, setOperators] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOperatorFilter, setSelectedOperatorFilter] = useState<string>('all');

    const loadData = async () => {
        setLoading(true);
        try {
            // ১. অপারেটর্স লোড করা (ম্যাপিং এর জন্য)
            try {
                const opRes = await api.get("api/BusOperators");
                const opMap: Record<string, string> = {};
                (opRes.data || []).forEach((op: BusOperatorOption) => {
                    opMap[op.id] = op.name;
                });
                setOperators(opMap);
            } catch (e) {
                console.warn("Could not load operators map", e);
            }

            // ২. ব্রাঞ্চেস লোড করা
            const res = await api.get("api/OperatorBranches");
            setBranches(res.data || []);
        } catch (err: any) {
            console.error("Failed to load branches:", err);
            toast.error("Failed to load operator branches");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Are you sure you want to delete branch "${name}"?`)) return;

        try {
            await api.delete(`api/OperatorBranches/${id}`);
            toast.success(`"${name}" deleted successfully!`);
            setBranches(prev => prev.filter(b => b.id !== id));
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to delete branch");
        }
    };

    const filteredBranches = branches.filter(b => {
        const matchesSearch = 
            b.branchName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.district?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (operators[b.busOperatorId] || '').toLowerCase().includes(searchTerm.toLowerCase());

        const matchesOperator = selectedOperatorFilter === 'all' || b.busOperatorId === selectedOperatorFilter;

        return matchesSearch && matchesOperator;
    });

    return (
        <div className="container-fluid py-4 bg-light min-vh-100">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 shadow-sm rounded border-left border-primary" style={{ borderLeftWidth: '5px' }}>
                <div>
                    <h5 className="mb-1 text-primary font-weight-bold">
                        <i className="fas fa-building mr-2"></i> Operator Branches Management
                    </h5>
                    <small className="text-muted">
                        Manage city counters, regional booking offices, and terminal branches for bus operators
                    </small>
                </div>
                <div className="d-flex gap-2">
                    <button 
                        type="button" 
                        className="btn btn-outline-secondary px-3 shadow-sm"
                        onClick={loadData}
                        disabled={loading}
                    >
                        <i className="fas fa-sync-alt mr-1"></i> Refresh
                    </button>
                    <Link 
                        to="/admin/operator-branches/create" 
                        className="btn btn-primary px-3 shadow-sm font-weight-bold"
                    >
                        <i className="fas fa-plus mr-1"></i> ADD NEW BRANCH
                    </Link>
                </div>
            </div>

            {/* Filter & Search Bar */}
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
                                    placeholder="Search by branch name, operator, phone, city, or district..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="col-md-5 d-flex justify-content-md-end gap-2">
                            <select 
                                className="form-select form-select-sm"
                                value={selectedOperatorFilter}
                                onChange={(e) => setSelectedOperatorFilter(e.target.value)}
                            >
                                <option value="all">All Operators ({branches.length})</option>
                                {Object.entries(operators).map(([opId, opName]) => (
                                    <option key={opId} value={opId}>{opName}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="card border-0 shadow-sm rounded-lg overflow-hidden">
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead className="bg-light text-muted small font-weight-bold text-uppercase">
                            <tr>
                                <th className="px-4 py-3 border-0">Branch Name & Operator</th>
                                <th className="border-0">Contact Phone</th>
                                <th className="border-0">Location & Address</th>
                                <th className="border-0">City & District</th>
                                <th className="text-center border-0 px-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-5">
                                        <div className="spinner-border text-primary mr-2" role="status"></div>
                                        <span className="text-muted font-italic">Loading branches...</span>
                                    </td>
                                </tr>
                            ) : filteredBranches.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-5 text-muted">
                                        No operator branches found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredBranches.map(branch => (
                                    <tr key={branch.id}>
                                        <td className="px-4 py-3">
                                            <div className="d-flex align-items-center">
                                                <div 
                                                    className="rounded-circle d-flex align-items-center justify-content-center me-3 flex-shrink-0" 
                                                    style={{ width: '42px', height: '42px', backgroundColor: '#ecfdf5', color: '#059669' }}
                                                >
                                                    <i className="fas fa-map-marker-alt"></i>
                                                </div>
                                                <div>
                                                    <div className="font-weight-bold text-dark">{branch.branchName}</div>
                                                    <small className="text-muted">
                                                        <i className="fas fa-bus mr-1"></i>
                                                        {operators[branch.busOperatorId] || 'Operator'}
                                                    </small>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="small font-weight-bold text-primary">
                                                <i className="fas fa-phone-alt mr-1"></i> {branch.phone}
                                            </div>
                                        </td>
                                        <td>
                                            <small className="text-dark d-block text-truncate" style={{ maxWidth: '280px' }}>
                                                {branch.address}
                                            </small>
                                        </td>
                                        <td>
                                            <span className="badge bg-light text-dark border px-2 py-1">
                                                {branch.city}, {branch.district}
                                            </span>
                                        </td>
                                        <td className="text-center px-4">
                                            <div className="d-flex justify-content-center gap-2">
                                                <Link 
                                                    to={`/admin/operator-branches/edit/${branch.id}`} 
                                                    className="btn btn-sm btn-outline-primary shadow-sm"
                                                    title="Edit Branch"
                                                >
                                                    <i className="fas fa-edit"></i>
                                                </Link>
                                                <button 
                                                    type="button" 
                                                    className="btn btn-sm btn-outline-danger shadow-sm"
                                                    onClick={() => handleDelete(branch.id, branch.branchName)}
                                                    title="Delete Branch"
                                                >
                                                    <i className="fas fa-trash-alt"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="card-footer bg-white border-0 py-3 text-muted small">
                    Showing <strong>{filteredBranches.length}</strong> of <strong>{branches.length}</strong> branches
                </div>
            </div>
        </div>
    );
};

export default OperatorBranchList;