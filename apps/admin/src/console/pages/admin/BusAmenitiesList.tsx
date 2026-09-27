import React, { useState, useEffect } from 'react';
import { api } from "@/lib/api";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

export interface BusAmenity {
    id: string;
    name: string;
    iconUrl?: string | null;
    isActive: boolean;
    rowVersion?: string;
}

const BusAmenitiesList: React.FC = () => {
    const [amenities, setAmenities] = useState<BusAmenity[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

    const fetchAmenities = async () => {
        setLoading(true);
        try {
            const res = await api.get("api/BusAmenities");
            setAmenities(res.data || []);
        } catch (err: any) {
            console.error("Failed to load amenities:", err);
            toast.error("Failed to load bus amenities");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAmenities();
    }, []);

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;

        try {
            await api.delete(`api/BusAmenities/${id}`);
            toast.success(`"${name}" deleted successfully!`);
            setAmenities(prev => prev.filter(a => a.id !== id));
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to delete amenity");
        }
    };

    const filteredAmenities = amenities.filter(item => {
        const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase());

        if (filterStatus === 'active') return matchesSearch && item.isActive;
        if (filterStatus === 'inactive') return matchesSearch && !item.isActive;
        return matchesSearch;
    });

    return (
        <div className="container-fluid py-4 bg-light min-vh-100">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 shadow-sm rounded border-left border-primary" style={{ borderLeftWidth: '5px' }}>
                <div>
                    <h5 className="mb-1 text-primary font-weight-bold">
                        <i className="fas fa-concierge-bell mr-2"></i> Bus Amenities Management
                    </h5>
                    <small className="text-muted">
                        Configure passenger amenities such as WiFi, AC, Charging Ports, Blankets, and Refreshments
                    </small>
                </div>
                <div className="d-flex gap-2">
                    <button 
                        type="button" 
                        className="btn btn-outline-secondary px-3 shadow-sm"
                        onClick={fetchAmenities}
                        disabled={loading}
                    >
                        <i className="fas fa-sync-alt mr-1"></i> Refresh
                    </button>
                    <Link 
                        to="/admin/bus-amenities/create" 
                        className="btn btn-primary px-3 shadow-sm font-weight-bold"
                    >
                        <i className="fas fa-plus mr-1"></i> ADD NEW AMENITY
                    </Link>
                </div>
            </div>

            {/* Filter & Search */}
            <div className="card border-0 shadow-sm rounded-lg mb-4">
                <div className="card-body p-3">
                    <div className="row g-3 align-items-center">
                        <div className="col-md-8">
                            <div className="input-group">
                                <span className="input-group-text bg-white border-end-0">
                                    <i className="fas fa-search text-muted"></i>
                                </span>
                                <input 
                                    type="text" 
                                    className="form-control border-start-0" 
                                    placeholder="Search by amenity name (e.g. WiFi, AC)..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="col-md-4 d-flex justify-content-md-end gap-2">
                            <div className="btn-group shadow-sm" role="group">
                                <button 
                                    type="button" 
                                    className={`btn btn-sm ${filterStatus === 'all' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                    onClick={() => setFilterStatus('all')}
                                >
                                    All ({amenities.length})
                                </button>
                                <button 
                                    type="button" 
                                    className={`btn btn-sm ${filterStatus === 'active' ? 'btn-success' : 'btn-outline-secondary'}`}
                                    onClick={() => setFilterStatus('active')}
                                >
                                    Active ({amenities.filter(a => a.isActive).length})
                                </button>
                                <button 
                                    type="button" 
                                    className={`btn btn-sm ${filterStatus === 'inactive' ? 'btn-danger' : 'btn-outline-secondary'}`}
                                    onClick={() => setFilterStatus('inactive')}
                                >
                                    Inactive ({amenities.filter(a => !a.isActive).length})
                                </button>
                            </div>
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
                                <th className="px-4 py-3 border-0">Amenity Name</th>
                                <th className="border-0">Icon / Class</th>
                                <th className="border-0">Status</th>
                                <th className="text-center border-0 px-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-5">
                                        <div className="spinner-border text-primary mr-2" role="status"></div>
                                        <span className="text-muted font-italic">Loading amenities...</span>
                                    </td>
                                </tr>
                            ) : filteredAmenities.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="text-center py-5 text-muted">
                                        No amenities found.
                                    </td>
                                </tr>
                            ) : (
                                filteredAmenities.map(item => (
                                    <tr key={item.id}>
                                        <td className="px-4 py-3">
                                            <div className="d-flex align-items-center">
                                                <div 
                                                    className="rounded-circle d-flex align-items-center justify-content-center me-3 flex-shrink-0" 
                                                    style={{ width: '40px', height: '40px', backgroundColor: '#e0e7ff', color: '#4338ca' }}
                                                >
                                                    {item.iconUrl?.startsWith('http') ? (
                                                        <img src={item.iconUrl} alt={item.name} style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
                                                    ) : (
                                                        <i className={item.iconUrl || "fas fa-check"}></i>
                                                    )}
                                                </div>
                                                <span className="font-weight-bold text-dark">{item.name}</span>
                                            </div>
                                        </td>
                                        <td>
                                            {item.iconUrl ? (
                                                <code className="bg-light px-2 py-1 rounded text-primary small">
                                                    {item.iconUrl}
                                                </code>
                                            ) : (
                                                <span className="text-muted small">None</span>
                                            )}
                                        </td>
                                        <td>
                                            {item.isActive ? (
                                                <span className="badge bg-success px-2 py-1">ACTIVE</span>
                                            ) : (
                                                <span className="badge bg-secondary px-2 py-1">INACTIVE</span>
                                            )}
                                        </td>
                                        <td className="text-center px-4">
                                            <div className="d-flex justify-content-center gap-2">
                                                <Link 
                                                    to={`/admin/bus-amenities/edit/${item.id}`} 
                                                    className="btn btn-sm btn-outline-primary shadow-sm"
                                                    title="Edit Amenity"
                                                >
                                                    <i className="fas fa-edit"></i>
                                                </Link>
                                                <button 
                                                    type="button" 
                                                    className="btn btn-sm btn-outline-danger shadow-sm"
                                                    onClick={() => handleDelete(item.id, item.name)}
                                                    title="Delete Amenity"
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
                    Showing <strong>{filteredAmenities.length}</strong> of <strong>{amenities.length}</strong> amenities
                </div>
            </div>
        </div>
    );
};

export default BusAmenitiesList;