import React, { useState, useEffect } from 'react';
import { api } from "@/lib/api";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { BusType } from "@/config/enums.generated";
import { syncBusesFromApiOrList } from "@/services/busFleetService";

export interface SeatResponseDto {
    id: string;
    seatNumber: string;
    rowNumber: number;
    columnNumber: number;
    deckLevel: number;
    seatType: string;
    isWindow: boolean;
    extraFare?: number | null;
    isActive: boolean;
}

export interface BusResponseDto {
    id: string;
    busOperatorId: string;
    busCategoryId?: string | null;
    registrationNumber: string;
    coachNumber: string;
    brand?: string | null;
    model?: string | null;
    registrationDate?: string | null;
    busType: BusType;
    totalSeats: number;
    hasWifi: boolean;
    hasToilet: boolean;
    isActive: boolean;
    primaryImageUrl?: string | null;
    seats: SeatResponseDto[];
    rowVersion: string;
}

interface BusOperator {
    id: string;
    name: string;
}

interface BusCategory {
    id: string;
    name: string;
}

const BusesList: React.FC = () => {
    const [buses, setBuses] = useState<BusResponseDto[]>([]);
    const [operators, setOperators] = useState<Record<string, string>>({});
    const [categories, setCategories] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [operatorFilter, setOperatorFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Operators for name mapping
            const opMap: Record<string, string> = {};
            try {
                const opRes = await api.get("api/BusOperators");
                (opRes.data || []).forEach((op: BusOperator) => {
                    opMap[op.id] = op.name;
                });
                setOperators(opMap);
            } catch (e) {
                console.warn("Could not load operators map:", e);
            }

            // 2. Fetch Bus Categories for name mapping
            const catMap: Record<string, string> = {};
            try {
                const catRes = await api.get("api/BusCategories");
                (catRes.data || []).forEach((cat: BusCategory) => {
                    catMap[cat.id] = cat.name;
                });
                setCategories(catMap);
            } catch (e) {
                console.warn("Could not load categories map:", e);
            }

            // 3. Fetch Buses (Includes Seats & Images from backend)
            const res = await api.get("api/Buses");
            const busData = res.data || [];
            setBuses(busData);

            // ★ আপনার আগের কোনো ডেটা কাটা যাবে না, শুধু ড্রপডাউনে ইনস্ট্যান্ট দেখানোর জন্য এই লাইনটি সিঙ্ক করবে:
            syncBusesFromApiOrList(busData, opMap, catMap);

        } catch (err: any) {
            console.error("Failed to load buses:", err);
            toast.error("Failed to load buses list");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleDelete = async (id: string, coachNumber: string, regNumber: string) => {
        if (!window.confirm(`Are you sure you want to delete or deactivate bus ${coachNumber} (${regNumber})?`)) return;

        try {
            const res = await api.delete(`api/Buses/${id}`);
            if (res.data?.softDeleted) {
                toast.success(res.data.message || "Bus has been deactivated because trips exist.");
                setBuses(prev => prev.map(b => b.id === id ? { ...b, isActive: false } : b));
            } else {
                toast.success(`Bus ${coachNumber} deleted successfully!`);
                setBuses(prev => prev.filter(b => b.id !== id));
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.response?.data || "Failed to delete bus");
        }
    };

    const filteredBuses = buses.filter(b => {
        const matchesSearch = 
            b.coachNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.registrationNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (operators[b.busOperatorId] || '').toLowerCase().includes(searchTerm.toLowerCase());

        const matchesOperator = operatorFilter === 'all' || b.busOperatorId === operatorFilter;
        const matchesType = typeFilter === 'all' || b.busType === typeFilter;

        return matchesSearch && matchesOperator && matchesType;
    });

    const operatorKeys = Object.keys(operators);
    const isMultiOperator = operatorKeys.length > 1;

    return (
        <div className="container-fluid py-4 bg-light min-vh-100">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 shadow-sm rounded border-left border-primary" style={{ borderLeftWidth: '5px' }}>
                <div>
                    <h5 className="mb-1 text-primary font-weight-bold">
                        <i className="fas fa-bus-alt mr-2"></i> Fleet Management (Buses & Seats)
                    </h5>
                    <small className="text-muted">
                        Manage physical bus coaches, seat layouts, configurations, and operator vehicle fleet
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
                        to="/admin/buses/create" 
                        className="btn btn-primary px-3 shadow-sm font-weight-bold"
                    >
                        <i className="fas fa-plus mr-1"></i> ADD NEW BUS
                    </Link>
                </div>
            </div>

            {/* Search & Filters */}
            <div className="card border-0 shadow-sm rounded-lg mb-4">
                <div className="card-body p-3">
                    <div className="row g-3 align-items-center">
                        <div className="col-md-5">
                            <div className="input-group">
                                <span className="input-group-text bg-white border-end-0">
                                    <i className="fas fa-search text-muted"></i>
                                </span>
                                <input 
                                    type="text" 
                                    className="form-control border-start-0" 
                                    placeholder="Search by coach no, reg no, brand, model..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        {isMultiOperator && (
                            <div className="col-md-4">
                                <select 
                                    className="form-select form-select-sm"
                                    value={operatorFilter}
                                    onChange={(e) => setOperatorFilter(e.target.value)}
                                >
                                    <option value="all">All Operators ({buses.length})</option>
                                    {Object.entries(operators).map(([id, name]) => (
                                        <option key={id} value={id}>{name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className={isMultiOperator ? "col-md-3" : "col-md-7 d-flex justify-content-end"}>
                            <select 
                                className="form-select form-select-sm w-auto"
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                            >
                                <option value="all">All Bus Types</option>
                                <option value="Ac">AC</option>
                                <option value="NonAc">Non-AC</option>
                                <option value="Sleeper">Sleeper</option>
                                <option value="DoubleDecker">Double Decker</option>
                                <option value="LuxurySleeper">Luxury Sleeper</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bus Cards Grid */}
            <div className="row g-4">
                {loading ? (
                    <div className="col-12 text-center py-5">
                        <div className="spinner-border text-primary mr-2" role="status"></div>
                        <span className="text-muted font-italic">Loading bus fleet...</span>
                    </div>
                ) : filteredBuses.length === 0 ? (
                    <div className="col-12 text-center py-5 text-muted bg-white rounded shadow-sm">
                        No buses found matching your criteria. Click "ADD NEW BUS" to register one.
                    </div>
                ) : (
                    filteredBuses.map(bus => (
                        <div key={bus.id} className="col-lg-4 col-md-6">
                            <div className="card h-100 border-0 shadow-sm rounded-lg overflow-hidden position-relative">
                                <div className="position-relative bg-light d-flex align-items-center justify-content-center" style={{ height: '170px' }}>
                                    {bus.primaryImageUrl ? (
                                        <img 
                                            src={bus.primaryImageUrl} 
                                            alt={bus.coachNumber} 
                                            className="w-100 h-100 object-fit-cover" 
                                        />
                                    ) : (
                                        <div className="text-center text-muted">
                                            <i className="fas fa-bus fa-3x mb-2 text-primary opacity-50"></i>
                                            <div className="small font-weight-bold">No Photo Uploaded</div>
                                        </div>
                                    )}
                                    <div className="position-absolute top-0 end-0 m-2">
                                        <span className={`badge ${bus.isActive ? 'bg-success' : 'bg-secondary'} shadow-sm px-2 py-1`}>
                                            {bus.isActive ? 'ACTIVE' : 'INACTIVE'}
                                        </span>
                                    </div>
                                    <div className="position-absolute bottom-0 start-0 m-2">
                                        <span className="badge bg-dark bg-opacity-75 text-white px-2 py-1">
                                            {bus.busType}
                                        </span>
                                    </div>
                                </div>
                                <div className="card-body p-3">
                                    <div className="d-flex justify-content-between align-items-start mb-1">
                                        <h6 className="font-weight-bold text-dark mb-0">{bus.coachNumber}</h6>
                                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                                            {bus.totalSeats} Seats
                                        </span>
                                    </div>
                                    <div className="small text-muted mb-2">
                                        <i className="fas fa-id-card mr-1"></i> Reg: <span className="font-monospace text-dark font-weight-bold">{bus.registrationNumber}</span>
                                    </div>

                                    <div className="small text-secondary mb-2">
                                        <div><i className="fas fa-building mr-1"></i> <strong>{operators[bus.busOperatorId] || 'Operator'}</strong></div>
                                        {bus.busCategoryId && categories[bus.busCategoryId] && (
                                            <div><i className="fas fa-tags mr-1"></i> {categories[bus.busCategoryId]}</div>
                                        )}
                                        {(bus.brand || bus.model) && (
                                            <div><i className="fas fa-truck-moving mr-1"></i> {bus.brand} {bus.model}</div>
                                        )}
                                    </div>

                                    <div className="d-flex gap-2 py-1 border-top border-bottom my-2 text-muted small">
                                        <span className={`badge ${bus.hasWifi ? 'bg-info-subtle text-info' : 'bg-light text-muted'}`}>
                                            <i className="fas fa-wifi mr-1"></i> WiFi: {bus.hasWifi ? 'Yes' : 'No'}
                                        </span>
                                        <span className={`badge ${bus.hasToilet ? 'bg-info-subtle text-info' : 'bg-light text-muted'}`}>
                                            <i className="fas fa-restroom mr-1"></i> Toilet: {bus.hasToilet ? 'Yes' : 'No'}
                                        </span>
                                        <span className="badge bg-light text-muted ms-auto">
                                            Layout: {bus.seats?.length || 0} configured
                                        </span>
                                    </div>
                                </div>
                                <div className="card-footer bg-white p-3 border-top d-flex justify-content-between align-items-center">
                                    <Link 
                                        to={`/admin/buses/edit/${bus.id}`} 
                                        className="btn btn-sm btn-outline-primary px-3 shadow-sm font-weight-bold"
                                    >
                                        <i className="fas fa-edit mr-1"></i> Edit Bus & Seats
                                    </Link>
                                    <button 
                                        type="button" 
                                        className="btn btn-sm btn-outline-danger px-3 shadow-sm"
                                        onClick={() => handleDelete(bus.id, bus.coachNumber, bus.registrationNumber)}
                                    >
                                        <i className="fas fa-trash-alt mr-1"></i> Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default BusesList;