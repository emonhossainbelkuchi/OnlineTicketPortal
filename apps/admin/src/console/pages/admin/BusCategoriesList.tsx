import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export interface BusCategoryResponseDto {
    id: string;
    name: string;
    description?: string | null;
    isActive: boolean;
    createdAtUtc: string;
    updatedAtUtc?: string | null;
    rowVersion: string;
}

const BusCategoriesList: React.FC = () => {
    const [categories, setCategories] = useState<BusCategoryResponseDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

    const loadCategories = async () => {
        setLoading(true);
        try {
            const res = await api.get('api/BusCategories');
            setCategories(res.data || []);
        } catch (err: any) {
            console.error('Failed to load bus categories:', err);
            toast.error(err.response?.data?.message || 'Failed to load bus categories');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCategories();
    }, []);

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Are you sure you want to delete or deactivate category "${name}"?`)) return;

        try {
            await api.delete(`api/BusCategories/${id}`);
            toast.success(`Category "${name}" deleted successfully!`);
            setCategories(prev => prev.filter(item => item.id !== id));
        } catch (err: any) {
            const msg = err.response?.data?.message || err.response?.data || 'Failed to delete category';
            toast.error(msg);
        }
    };

    const filteredCategories = categories.filter(c => {
        const matchesSearch = 
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesStatus = 
            statusFilter === 'all' ? true :
            statusFilter === 'active' ? c.isActive : !c.isActive;

        return matchesSearch && matchesStatus;
    });

    return (
        <div className="container-fluid py-4 bg-light min-vh-100">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 shadow-sm rounded border-left border-primary" style={{ borderLeftWidth: '5px' }}>
                <div>
                    <h5 className="mb-1 text-primary font-weight-bold">
                        <i className="fas fa-tags mr-2"></i> Bus Categories
                    </h5>
                    <small className="text-muted">
                        Manage bus fleet classifications (e.g., Business Class, Economy, Sleeper Coach, VIP Express)
                    </small>
                </div>
                <div className="d-flex gap-2">
                    <button 
                        type="button" 
                        className="btn btn-outline-secondary px-3 shadow-sm"
                        onClick={loadCategories}
                        disabled={loading}
                    >
                        <i className="fas fa-sync-alt mr-1"></i> Refresh
                    </button>
                    <Link 
                        to="/admin/bus-categories/create" 
                        className="btn btn-primary px-3 shadow-sm font-weight-bold"
                    >
                        <i className="fas fa-plus mr-1"></i> ADD NEW CATEGORY
                    </Link>
                </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="card border-0 shadow-sm rounded-lg mb-4">
                <div className="card-body p-3">
                    <div className="row g-3 align-items-center">
                        <div className="col-md-6">
                            <div className="input-group">
                                <span className="input-group-text bg-white border-end-0">
                                    <i className="fas fa-search text-muted"></i>
                                </span>
                                <input 
                                    type="text" 
                                    className="form-control border-start-0" 
                                    placeholder="Search category by name or description..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="col-md-6 d-flex justify-content-end">
                            <select 
                                className="form-select form-select-sm w-auto"
                                value={statusFilter}
                                onChange={(e: any) => setStatusFilter(e.target.value)}
                            >
                                <option value="all">All Status ({categories.length})</option>
                                <option value="active">Active Only</option>
                                <option value="inactive">Inactive Only</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table View */}
            <div className="card border-0 shadow-sm rounded-lg overflow-hidden">
                <div className="card-body p-0">
                    {loading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-primary mr-2" role="status"></div>
                            <span className="text-muted font-italic">Loading categories...</span>
                        </div>
                    ) : filteredCategories.length === 0 ? (
                        <div className="text-center py-5 text-muted">
                            No bus categories found. Click "ADD NEW CATEGORY" to create one.
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="bg-light text-muted small text-uppercase">
                                    <tr>
                                        <th className="px-4 py-3">Category Name</th>
                                        <th className="py-3">Description</th>
                                        <th className="py-3 text-center">Status</th>
                                        <th className="py-3 text-center">Created At</th>
                                        <th className="px-4 py-3 text-end">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCategories.map(cat => (
                                        <tr key={cat.id}>
                                            <td className="px-4 font-weight-bold text-dark">
                                                <i className="fas fa-tag text-primary mr-2"></i> {cat.name}
                                            </td>
                                            <td className="text-muted small">
                                                {cat.description || <span className="font-italic text-black-50">No description provided</span>}
                                            </td>
                                            <td className="text-center">
                                                <span className={`badge px-2 py-1 ${cat.isActive ? 'bg-success' : 'bg-secondary'}`}>
                                                    {cat.isActive ? 'ACTIVE' : 'INACTIVE'}
                                                </span>
                                            </td>
                                            <td className="text-center text-muted small">
                                                {new Date(cat.createdAtUtc).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 text-end">
                                                <Link to={`/admin/bus-categories/edit/${cat.id}`} className="btn btn-sm btn-outline-primary me-2">
                                                    <i className="fas fa-edit mr-1"></i> Edit
                                                </Link>
                                                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(cat.id, cat.name)}>
                                                    <i className="fas fa-trash-alt mr-1"></i> Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BusCategoriesList;