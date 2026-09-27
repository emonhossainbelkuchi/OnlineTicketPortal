import React, { useState, useEffect } from 'react';
import { api, OperatorRoute } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const BusOperatorsCreatePage = () => {
    const navigate = useNavigate();

    const [busRoutes, setBusRoutes] = useState<any[]>([]);
    const [submitting, setSubmitting] = useState(false);

    // DTO State Structure for creating a new Operator
    const [formData, setFormData] = useState({
        name: '',
        legalName: '',
        registrationNumber: '',
        contactPhone: '',
        email: '',
        addressLine: '',
        city: '',
        district: '',
        country: 'Bangladesh',
        foundedYear: new Date().getFullYear(),
        registeredOnUtc: new Date().toISOString().split('T')[0], // yyyy-MM-dd
        inventoryMode: 'PlatformManaged',
        isActive: true,
        operatorRoutes: [] as OperatorRoute[],
        rowVersion: null as string | null
    });

    // Load available global BusRoutes for route assignment dropdown
    useEffect(() => {
        const loadRoutes = async () => {
            try {
                const routesRes = await api.get("api/BusRoutes");
                setBusRoutes(routesRes.data || []);
            } catch (err) {
                toast.error("Failed to load routes list");
            }
        };
        loadRoutes();
    }, []);

    // Form input handler
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const target = e.target;
        const name = target.name;
        let finalValue: any;

        if (target instanceof HTMLInputElement && target.type === 'checkbox') {
            finalValue = target.checked;
        } else if (name === 'foundedYear') {
            finalValue = parseInt(target.value) || 0;
        } else {
            finalValue = target.value;
        }

        setFormData(prev => ({ ...prev, [name]: finalValue }));
    };

    // Operator Routes management
    const addRoute = () => {
        const newRoute: OperatorRoute = {
            id: null,
            busRouteId: busRoutes.length > 0 ? busRoutes[0].id : "",
            operatorRouteCode: '',
            displayName: '',
            inventoryModeOverride: 'PlatformManaged',
            isActive: true,
            rowVersion: null
        };
        setFormData(prev => ({ ...prev, operatorRoutes: [...prev.operatorRoutes, newRoute] }));
    };

    const handleRouteUpdate = (index: number, field: keyof OperatorRoute, value: any) => {
        const updatedRoutes = [...formData.operatorRoutes];
        updatedRoutes[index] = {
            ...updatedRoutes[index],
            [field]: value
        };
        setFormData(prev => ({ ...prev, operatorRoutes: updatedRoutes }));
    };

    const removeRoute = (index: number) => {
        const updatedRoutes = formData.operatorRoutes.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, operatorRoutes: updatedRoutes }));
    };

    // Save and Onboard Operator (CREATE ONLY)
    const handleSave = async () => {
        if (!formData.name?.trim()) {
            toast.error("Operator Name is required");
            return;
        }
        if (!formData.contactPhone?.trim()) {
            toast.error("Contact Phone Number is required");
            return;
        }
        if (!formData.addressLine?.trim()) {
            toast.error("Address Line is required");
            return;
        }
        if (!formData.city?.trim()) {
            toast.error("City is required");
            return;
        }
        if (!formData.district?.trim()) {
            toast.error("District is required");
            return;
        }

        setSubmitting(true);
        try {
            await api.post("api/BusOperators", formData);
            toast.success("Bus Operator onboarded successfully!");
            navigate('/admin/bus-operators');
        } catch (err: any) {
            const errorMsg = err.response?.data?.message || "Operation failed. Check if all fields are correct.";
            toast.error(errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="container-fluid py-4 bg-light min-vh-100">
            {/* Sticky Header */}
            <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 shadow-sm rounded border-left border-primary" style={{ borderLeftWidth: '5px' }}>
                <div>
                    <h5 className="mb-0 text-primary font-weight-bold">
                        <i className="fas fa-plus-circle mr-2"></i> Onboard New Bus Operator
                    </h5>
                    <small className="text-muted">Register a new transportation partner to the national network</small>
                </div>
                <div className="d-flex gap-2">
                    <button 
                        type="button" 
                        className="btn btn-outline-secondary px-4 shadow-sm" 
                        onClick={() => navigate('/admin/bus-operators')}
                        disabled={submitting}
                    >
                        CANCEL
                    </button>
                    <button 
                        type="button" 
                        className="btn btn-primary px-4 shadow-sm font-weight-bold" 
                        onClick={handleSave}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <>
                                <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                                SAVING...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-save mr-1"></i> CREATE OPERATOR
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className="row g-4">
                <div className="col-lg-8">
                    {/* Card: Basic Information */}
                    <div className="card shadow-sm border-0 rounded-lg mb-4">
                        <div className="card-header bg-white py-3 font-weight-bold small text-muted text-uppercase tracking-wider border-bottom">
                            <i className="fas fa-building text-info mr-2"></i> Company Information
                        </div>
                        <div className="card-body p-4">
                            <div className="row g-3">
                                <div className="col-md-8">
                                    <label className="small font-weight-bold mb-1">Operator Name <span className="text-danger">*</span></label>
                                    <input 
                                        name="name" 
                                        className="form-control shadow-none" 
                                        value={formData.name} 
                                        onChange={handleChange} 
                                        placeholder="e.g. Hanif Paribahan, Shohagh, Green Line" 
                                        required
                                    />
                                </div>
                                <div className="col-md-4">
                                    <label className="small font-weight-bold mb-1">Founded Year</label>
                                    <input 
                                        name="foundedYear" 
                                        type="number" 
                                        className="form-control shadow-none" 
                                        value={formData.foundedYear || ''} 
                                        onChange={handleChange} 
                                        placeholder="e.g. 1995"
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="small font-weight-bold mb-1">Legal Entity Name</label>
                                    <input 
                                        name="legalName" 
                                        className="form-control shadow-none" 
                                        value={formData.legalName} 
                                        onChange={handleChange} 
                                        placeholder="e.g. Hanif Enterprise Ltd."
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="small font-weight-bold mb-1">Registration / Trade License No.</label>
                                    <input 
                                        name="registrationNumber" 
                                        className="form-control shadow-none" 
                                        value={formData.registrationNumber} 
                                        onChange={handleChange} 
                                        placeholder="e.g. TRAD/DH/2023/8492"
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="small font-weight-bold mb-1">On-boarded Date (UTC)</label>
                                    <input 
                                        name="registeredOnUtc" 
                                        type="date" 
                                        className="form-control shadow-none" 
                                        value={formData.registeredOnUtc} 
                                        onChange={handleChange} 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card: Contact Details */}
                    <div className="card shadow-sm border-0 rounded-lg mb-4">
                        <div className="card-header bg-white py-3 font-weight-bold small text-muted text-uppercase tracking-wider border-bottom">
                            <i className="fas fa-map-marker-alt text-danger mr-2"></i> Contact & Communication
                        </div>
                        <div className="card-body p-4">
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <label className="small font-weight-bold mb-1">Phone Number <span className="text-danger">*</span></label>
                                    <input 
                                        name="contactPhone" 
                                        className="form-control font-weight-bold text-primary shadow-none" 
                                        value={formData.contactPhone} 
                                        onChange={handleChange} 
                                        placeholder="e.g. +880 1713-000000"
                                        required
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="small font-weight-bold mb-1">Email Address</label>
                                    <input 
                                        name="email" 
                                        type="email" 
                                        className="form-control shadow-none" 
                                        value={formData.email} 
                                        onChange={handleChange} 
                                        placeholder="e.g. info@operator.com"
                                    />
                                </div>
                                <div className="col-12">
                                    <label className="small font-weight-bold mb-1">Full Address Line <span className="text-danger">*</span></label>
                                    <textarea 
                                        name="addressLine" 
                                        className="form-control shadow-none" 
                                        rows={2} 
                                        value={formData.addressLine} 
                                        onChange={handleChange}
                                        placeholder="Terminal address, Road name, Station building..."
                                        required
                                    ></textarea>
                                </div>
                                <div className="col-md-4">
                                    <label className="small font-weight-bold mb-1">City <span className="text-danger">*</span></label>
                                    <input 
                                        name="city" 
                                        className="form-control shadow-none" 
                                        value={formData.city} 
                                        onChange={handleChange} 
                                        placeholder="e.g. Dhaka"
                                    />
                                </div>
                                <div className="col-md-4">
                                    <label className="small font-weight-bold mb-1">District <span className="text-danger">*</span></label>
                                    <input 
                                        name="district" 
                                        className="form-control shadow-none" 
                                        value={formData.district} 
                                        onChange={handleChange} 
                                        placeholder="e.g. Dhaka, Chittagong"
                                    />
                                </div>
                                <div className="col-md-4">
                                    <label className="small font-weight-bold mb-1">Country</label>
                                    <input value="Bangladesh" disabled className="form-control bg-light" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Master-Detail: Operator Routes Table */}
                    <div className="card shadow-sm border-0 rounded-lg">
                        <div className="card-header bg-white d-flex justify-content-between align-items-center py-3 border-bottom">
                            <div>
                                <h6 className="mb-0 small font-weight-bold text-muted text-uppercase tracking-wider">
                                    <i className="fas fa-route text-success mr-2"></i> Initial Network Routes
                                </h6>
                                <small className="text-muted">Optionally map route codes to unified system routes during creation</small>
                            </div>
                            <button type="button" className="btn btn-sm btn-outline-success rounded-pill px-3 shadow-sm" onClick={addRoute}>
                                <i className="fas fa-plus-circle mr-1"></i> Add Route
                            </button>
                        </div>
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="bg-light small font-weight-bold text-muted">
                                    <tr>
                                        <th className="px-4 py-2 border-0">Unified Route</th>
                                        <th className="border-0">Operator Code</th>
                                        <th className="border-0">Display Name / Service Name</th>
                                        <th className="text-center border-0" style={{ width: '80px' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {formData.operatorRoutes.map((route, i) => (
                                        <tr key={i}>
                                            <td className="px-4 py-2">
                                                <select 
                                                    className="form-select form-select-sm" 
                                                    value={route.busRouteId} 
                                                    onChange={(e) => handleRouteUpdate(i, 'busRouteId', e.target.value)}
                                                >
                                                    {busRoutes.map(br => (
                                                        <option key={br.id} value={br.id}>{br.name} ({br.code || 'ROUTE'})</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td>
                                                <input 
                                                    className="form-control form-control-sm" 
                                                    placeholder="e.g. OP-CTG-01" 
                                                    value={route.operatorRouteCode} 
                                                    onChange={(e) => handleRouteUpdate(i, 'operatorRouteCode', e.target.value)} 
                                                />
                                            </td>
                                            <td>
                                                <input 
                                                    className="form-control form-control-sm" 
                                                    placeholder="e.g. Executive AC Service" 
                                                    value={route.displayName} 
                                                    onChange={(e) => handleRouteUpdate(i, 'displayName', e.target.value)} 
                                                />
                                            </td>
                                            <td className="text-center">
                                                <button 
                                                    type="button" 
                                                    className="btn btn-sm text-danger p-1" 
                                                    title="Remove Route"
                                                    onClick={() => removeRoute(i)}
                                                >
                                                    <i className="fas fa-trash-alt"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {formData.operatorRoutes.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="text-center py-4 text-muted fst-italic small">
                                                No routes assigned yet. Click 'Add Route' to configure network corridors for this operator.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className="col-lg-4">
                    {/* Logo Upload Card for Create */}
                    <div className="card shadow-sm border-0 rounded-lg mb-4 text-center p-4">
                        <label className="small font-weight-bold text-muted mb-3 d-block text-uppercase tracking-wider">Company Logo</label>
                        <div 
                            className="mx-auto rounded border-dashed bg-light d-flex flex-column align-items-center justify-content-center mb-3 shadow-inner" 
                            style={{ width: '150px', height: '150px', border: '2px dashed #cbd5e1' }}
                        >
                            <i className="fas fa-bus-alt fa-3x text-muted opacity-50 mb-2"></i>
                            <span className="small text-muted fst-italic px-2 text-center" style={{ fontSize: '11px' }}>Logo pending</span>
                        </div>
                        
                        <button className="btn btn-sm btn-outline-secondary px-4 rounded-pill font-weight-bold" disabled>
                            <i className="fas fa-cloud-upload-alt mr-2"></i> Upload Logo
                        </button>
                        <p className="text-danger small mt-2 mb-0 fst-italic" style={{ fontSize: '12px' }}>
                            <i className="fas fa-info-circle mr-1"></i> Save operator first to enable official logo upload.
                        </p>
                    </div>

                    {/* System Configuration Card */}
                    <div className="card shadow-sm border-0 rounded-lg p-3 mb-4">
                        <label className="small font-weight-bold text-muted text-uppercase mb-3">System Settings</label>
                        <div className="mb-3">
                            <label className="small font-weight-bold text-muted mb-1 d-block">Global Inventory Mode</label>
                            <select 
                                name="inventoryMode" 
                                className="form-select border-primary bg-light" 
                                value={formData.inventoryMode} 
                                onChange={handleChange}
                            >
                                <option value="PlatformManaged">Platform Managed (Direct Seats)</option>
                                <option value="ExternalApiManaged">External API Managed (GDS / B2B)</option>
                                <option value="Hybrid">Hybrid Mode (Dual Sync)</option>
                            </select>
                        </div>
                        <div className="form-check form-switch border p-3 rounded bg-white shadow-sm border-info d-flex align-items-center justify-content-between">
                            <label className="form-check-label small font-weight-bold text-dark mb-0 cursor-pointer" htmlFor="actv">
                                Publicly Active on Platform
                            </label>
                            <input 
                                type="checkbox" 
                                className="form-check-input ms-0 mt-0" 
                                id="actv" 
                                name="isActive" 
                                checked={formData.isActive} 
                                onChange={handleChange} 
                                role="switch"
                            />
                        </div>
                    </div>

                    {/* Help / Instruction */}
                    <div className="alert alert-info border-0 shadow-sm p-3 small">
                        <h6 className="font-weight-bold"><i className="fas fa-shield-alt mr-1"></i> Registration Guidelines</h6>
                        <p className="mb-1 opacity-90 leading-snug">
                            Ensure the primary contact phone is a verified corporate hotline.
                        </p>
                        <p className="mb-0 opacity-90 leading-snug">
                            Once created, you will be redirected to the operator directory where you can manage schedules, fares, and upload official logos.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BusOperatorsCreatePage;
