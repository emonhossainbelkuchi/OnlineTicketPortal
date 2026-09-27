import React, { useState, useEffect } from 'react';
import { api, OperatorRoute } from "@/lib/api";
import { useNavigate, useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";

// ব্যাকএন্ড API Base URL (আপনার ব্যাকএন্ড পোর্ট অনুযায়ী)
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || "http://localhost:5000";

export const resolveImageUrl = (url?: string | null) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
        return url;
    }
    const cleanBase = API_BASE_URL.replace(/\/$/, '');
    const cleanPath = url.replace(/^\//, '');
    return `${cleanBase}/${cleanPath}`;
};

const BusOperatorsEdit = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [busRoutes, setBusRoutes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [imgError, setImgError] = useState(false);

    // Form data structure
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
        foundedYear: 0,
        registeredOnUtc: '',
        inventoryMode: 'PlatformManaged',
        isActive: true,
        operatorRoutes: [] as OperatorRoute[],
        rowVersion: null as string | null
    });

    useEffect(() => {
        const loadData = async () => {
            if (!id) {
                toast.error("Operator ID is missing");
                navigate('/admin/resource/BusOperators');
                return;
            }

            setLoading(true);
            try {
                // ১. গ্লোবাল রুটস ফেচ
                try {
                    const routesRes = await api.get("api/BusRoutes");
                    setBusRoutes(routesRes.data || []);
                } catch (e) {
                    console.warn("Routes could not be loaded:", e);
                }

                // ২. অপারেটর ডিটেইলস ফেচ
                const opRes = await api.get(`api/BusOperators/${id}`);
                const data = opRes.data;

                if (data.registeredOnUtc) {
                    data.registeredOnUtc = data.registeredOnUtc.split('T')[0];
                }

                const currentVersion = data.rowVersion || data.version || data.concurrencyToken || null;
                const currentLogo = data.logoUrl || data.imageUrl || data.logo || null;

                setFormData({
                    ...data,
                    id: data.id || id,
                    rowVersion: currentVersion,
                    operatorRoutes: data.operatorRoutes || []
                });
                setLogoUrl(currentLogo);
                setImgError(false);
            } catch (err: any) {
                toast.error("Failed to load operator details");
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [id, navigate]);

    // ইনপুট হ্যান্ডলার
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

    // রুটস যোগ করা
    const addRoute = () => {
        const newRoute: OperatorRoute = {
            id: null,
            busOperatorId: id,
            busRouteId: busRoutes.length > 0 ? busRoutes[0].id : "",
            operatorRouteCode: '',
            displayName: '',
            inventoryModeOverride: formData.inventoryMode || 'PlatformManaged',
            isActive: true,
            rowVersion: null
        };
        setFormData(prev => ({
            ...prev,
            operatorRoutes: [...prev.operatorRoutes, newRoute]
        }));
    };

    const handleRouteUpdate = (index: number, field: string, value: any) => {
        const updatedRoutes = [...formData.operatorRoutes];
        updatedRoutes[index] = { ...updatedRoutes[index], [field]: value };
        setFormData(prev => ({ ...prev, operatorRoutes: updatedRoutes }));
    };

    const removeRoute = (index: number) => {
        const updatedRoutes = formData.operatorRoutes.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, operatorRoutes: updatedRoutes }));
    };

    // ASP.NET Core এরর পার্সিং
    const extractErrorMessage = (err: any): string => {
        if (!err) return "Unknown server error occurred.";
        const data = err.response?.data;
        if (!data) return err.message || "Network error. Please check backend connection.";
        if (typeof data === 'string') return data;
        if (data.message) return data.message;
        
        if (data.errors && typeof data.errors === 'object') {
            const messages: string[] = [];
            for (const key of Object.keys(data.errors)) {
                const val = data.errors[key];
                if (Array.isArray(val)) {
                    messages.push(`${key}: ${val.join(', ')}`);
                } else if (typeof val === 'string') {
                    messages.push(`${key}: ${val}`);
                }
            }
            if (messages.length > 0) return messages.join(' | ');
        }
        
        if (data.title) {
            return data.detail ? `${data.title} - ${data.detail}` : data.title;
        }
        if (data.detail) return data.detail;
        return JSON.stringify(data);
    };

    // সেভ এবং আপডেট হ্যান্ডলার
    const handleSave = async () => {
        if (!formData.name?.trim() || !formData.contactPhone?.trim() || !formData.addressLine?.trim()) {
            toast.error("Please fill all required fields: Name, Phone, and Address (*)");
            return;
        }

        setSaving(true);
        try {
            const buildPayload = (versionToUse: any) => ({
                id: id,
                name: formData.name.trim(),
                legalName: formData.legalName?.trim() || null,
                registrationNumber: formData.registrationNumber?.trim() || null,
                contactPhone: formData.contactPhone.trim(),
                email: formData.email?.trim() || null,
                addressLine: formData.addressLine.trim(),
                city: formData.city.trim(),
                district: formData.district.trim(),
                country: formData.country || 'Bangladesh',
                foundedYear: Number(formData.foundedYear) || 0,
                registeredOnUtc: formData.registeredOnUtc ? 
                    (formData.registeredOnUtc.includes('T') ? formData.registeredOnUtc : new Date(formData.registeredOnUtc).toISOString()) 
                    : new Date().toISOString(),
                inventoryMode: formData.inventoryMode || 'PlatformManaged',
                isActive: Boolean(formData.isActive),
                rowVersion: versionToUse || formData.rowVersion || null,
                operatorRoutes: (formData.operatorRoutes || []).map((r: any) => ({
                    id: r.id || null,
                    busOperatorId: id,
                    busRouteId: r.busRouteId,
                    operatorRouteCode: r.operatorRouteCode?.trim() || '',
                    displayName: r.displayName?.trim() || '',
                    inventoryModeOverride: r.inventoryModeOverride || formData.inventoryMode || 'PlatformManaged',
                    isActive: r.isActive !== false,
                    rowVersion: r.rowVersion || null
                }))
            });

            try {
                // ১ম চেষ্টা
                await api.put(`api/BusOperators/${id}`, buildPayload(formData.rowVersion));
                toast.success("Bus Operator updated successfully!");
                navigate('/admin/resource/BusOperators');
            } catch (firstErr: any) {
                const msg = firstErr.response?.data?.message || JSON.stringify(firstErr.response?.data || '');
                const isConcurrency = firstErr.response?.status === 409 || msg.toLowerCase().includes('concurrency') || msg.toLowerCase().includes('changed');

                if (isConcurrency) {
                    console.warn("RowVersion mismatch detected. Auto-fetching latest version...");
                    const freshRes = await api.get(`api/BusOperators/${id}`);
                    const latestVersion = freshRes.data?.rowVersion;

                    if (latestVersion) {
                        setFormData(prev => ({ ...prev, rowVersion: latestVersion }));
                        // ২য় চেষ্টা
                        await api.put(`api/BusOperators/${id}`, buildPayload(latestVersion));
                        toast.success("Updated successfully with fresh version!");
                        navigate('/admin/resource/BusOperators');
                        return;
                    }
                }
                throw firstErr;
            }

        } catch (err: any) {
            console.error("Save Error Details:", err.response || err);
            const errorMsg = extractErrorMessage(err);
            toast.error(errorMsg);
        } finally {
            setSaving(false);
        }
    };

    // লোগো আপলোড হ্যান্ডলার
    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !id) return;

        const uploadData = new FormData();
        uploadData.append("file", file);

        setUploading(true);
        try {
            const res = await api.post(`api/BusOperators/${id}/images`, uploadData);
            const returnedUrl = res.data?.imageUrl || res.data?.logoUrl || res.data?.url || res.data;
            
            // তাৎক্ষণিক UI আপডেট
            setLogoUrl(returnedUrl);
            setImgError(false);

            // ছবি আপলোডের ফলে ডেটাবেজের RowVersion পরিবর্তন হয়ে যায়, তাই লেটেস্ট RowVersion রিফ্রেশ করে নেওয়া হচ্ছে
            const refreshRes = await api.get(`api/BusOperators/${id}`);
            if (refreshRes.data?.rowVersion) {
                setFormData(prev => ({ ...prev, rowVersion: refreshRes.data.rowVersion }));
            }
            if (refreshRes.data?.logoUrl) {
                setLogoUrl(refreshRes.data.logoUrl);
            }

            toast.success("Logo uploaded and updated successfully!");
        } catch (err: any) {
            const msg = err.response?.data?.message || "Upload failed";
            toast.error(msg);
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <div className="container-fluid py-5 text-center min-vh-100 d-flex align-items-center justify-content-center">
                <div className="spinner-border text-primary mr-2" role="status"></div>
                <span className="text-muted font-italic">Loading operator data...</span>
            </div>
        );
    }

    return (
        <div className="container-fluid py-4 bg-light min-vh-100">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 shadow-sm rounded border-left border-primary" style={{ borderLeftWidth: '5px' }}>
                <div>
                    <h5 className="mb-0 text-primary font-weight-bold">
                        <i className="fas fa-edit mr-2"></i> Update Operator Profile
                    </h5>
                    <div className="d-flex align-items-center gap-2 mt-1">
                        <small className="text-muted">Editing ID: <code className="text-dark bg-light px-2 py-0.5 rounded">{id}</code></small>
                        {formData.rowVersion && (
                            <span className="badge badge-secondary ml-2" style={{ fontSize: '10px' }}>
                                Version: {String(formData.rowVersion).substring(0, 10)}...
                            </span>
                        )}
                    </div>
                </div>
                <div className="d-flex gap-2">
                    <button 
                        type="button" 
                        className="btn btn-outline-secondary px-4 shadow-sm" 
                        onClick={() => navigate('/admin/resource/BusOperators')}
                        disabled={saving}
                    >
                        CANCEL
                    </button>
                    <button 
                        type="button" 
                        className="btn btn-primary px-4 shadow-sm font-weight-bold" 
                        onClick={handleSave} 
                        disabled={saving}
                    >
                        {saving ? (
                            <>
                                <span className="spinner-border spinner-border-sm mr-1"></span>
                                SAVING...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-save mr-1"></i> UPDATE CHANGES
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className="row g-4">
                {/* Left Column: Form Details */}
                <div className="col-lg-8">
                    {/* Basic Info */}
                    <div className="card shadow-sm border-0 rounded-lg mb-4">
                        <div className="card-header bg-white py-3 font-weight-bold small text-muted text-uppercase">
                            <i className="fas fa-building text-info mr-2"></i> Company Information
                        </div>
                        <div className="card-body p-4">
                            <div className="row g-3">
                                <div className="col-md-8">
                                    <label className="small font-weight-bold mb-1">Operator Name *</label>
                                    <input 
                                        name="name" 
                                        className="form-control" 
                                        value={formData.name || ''} 
                                        onChange={handleChange} 
                                        placeholder="e.g. Green Line Paribahan" 
                                        required 
                                    />
                                </div>
                                <div className="col-md-4">
                                    <label className="small font-weight-bold mb-1">Founded Year</label>
                                    <input 
                                        name="foundedYear" 
                                        type="number" 
                                        className="form-control" 
                                        value={formData.foundedYear || ''} 
                                        onChange={handleChange} 
                                        placeholder="YYYY" 
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="small font-weight-bold mb-1">Legal Entity Name</label>
                                    <input 
                                        name="legalName" 
                                        className="form-control" 
                                        value={formData.legalName || ''} 
                                        onChange={handleChange} 
                                        placeholder="Registered corporate name" 
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="small font-weight-bold mb-1">Registration / Trade Number</label>
                                    <input 
                                        name="registrationNumber" 
                                        className="form-control" 
                                        value={formData.registrationNumber || ''} 
                                        onChange={handleChange} 
                                        placeholder="Govt Trade License No." 
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="small font-weight-bold mb-1">On-boarded Date (UTC)</label>
                                    <input 
                                        name="registeredOnUtc" 
                                        type="date" 
                                        className="form-control" 
                                        value={formData.registeredOnUtc || ''} 
                                        onChange={handleChange} 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Info */}
                    <div className="card shadow-sm border-0 rounded-lg mb-4">
                        <div className="card-header bg-white py-3 font-weight-bold small text-muted text-uppercase">
                            <i className="fas fa-map-marker-alt text-danger mr-2"></i> Contact & Communication
                        </div>
                        <div className="card-body p-4">
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <label className="small font-weight-bold mb-1">Phone Number *</label>
                                    <input 
                                        name="contactPhone" 
                                        className="form-control font-weight-bold text-primary" 
                                        value={formData.contactPhone || ''} 
                                        onChange={handleChange} 
                                        placeholder="+880 1711-xxxxxx" 
                                        required 
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="small font-weight-bold mb-1">Email Address</label>
                                    <input 
                                        name="email" 
                                        type="email" 
                                        className="form-control" 
                                        value={formData.email || ''} 
                                        onChange={handleChange} 
                                        placeholder="support@domain.com" 
                                    />
                                </div>
                                <div className="col-12">
                                    <label className="small font-weight-bold mb-1">Full Address Line *</label>
                                    <textarea 
                                        name="addressLine" 
                                        className="form-control" 
                                        rows={2} 
                                        value={formData.addressLine || ''} 
                                        onChange={handleChange} 
                                        placeholder="Office address, road, block..." 
                                        required
                                    ></textarea>
                                </div>
                                <div className="col-md-4">
                                    <label className="small font-weight-bold mb-1">City *</label>
                                    <input 
                                        name="city" 
                                        className="form-control" 
                                        value={formData.city || ''} 
                                        onChange={handleChange} 
                                        placeholder="e.g. Dhaka" 
                                        required 
                                    />
                                </div>
                                <div className="col-md-4">
                                    <label className="small font-weight-bold mb-1">District *</label>
                                    <input 
                                        name="district" 
                                        className="form-control" 
                                        value={formData.district || ''} 
                                        onChange={handleChange} 
                                        placeholder="e.g. Dhaka" 
                                        required 
                                    />
                                </div>
                                <div className="col-md-4">
                                    <label className="small font-weight-bold mb-1">Country</label>
                                    <input value="Bangladesh" disabled className="form-control bg-light" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Assigned Routes */}
                    <div className="card shadow-sm border-0 rounded-lg">
                        <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
                            <h6 className="mb-0 small font-weight-bold text-muted text-uppercase">
                                <i className="fas fa-route text-success mr-2"></i> Assigned Operator Routes ({formData.operatorRoutes.length})
                            </h6>
                            <button type="button" className="btn btn-sm btn-outline-success rounded-pill px-3 font-weight-bold" onClick={addRoute}>
                                <i className="fas fa-plus mr-1"></i> Add Route
                            </button>
                        </div>
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="bg-light small font-weight-bold text-muted">
                                    <tr>
                                        <th className="px-4 py-2 border-0">Unified Route</th>
                                        <th className="border-0">Operator Code</th>
                                        <th className="border-0">Display Name</th>
                                        <th className="text-center border-0">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {formData.operatorRoutes.map((route: any, i: number) => (
                                        <tr key={i}>
                                            <td className="px-4 py-2">
                                                <select 
                                                    className="form-control form-control-sm" 
                                                    value={route.busRouteId || ''} 
                                                    onChange={(e) => handleRouteUpdate(i, 'busRouteId', e.target.value)}
                                                >
                                                    {busRoutes.map((br: any) => (
                                                        <option key={br.id} value={br.id}>{br.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td>
                                                <input 
                                                    className="form-control form-control-sm" 
                                                    value={route.operatorRouteCode || ''} 
                                                    onChange={(e) => handleRouteUpdate(i, 'operatorRouteCode', e.target.value)} 
                                                    placeholder="Route code" 
                                                />
                                            </td>
                                            <td>
                                                <input 
                                                    className="form-control form-control-sm" 
                                                    value={route.displayName || ''} 
                                                    onChange={(e) => handleRouteUpdate(i, 'displayName', e.target.value)} 
                                                    placeholder="Display label" 
                                                />
                                            </td>
                                            <td className="text-center">
                                                <button type="button" className="btn btn-sm text-danger" onClick={() => removeRoute(i)}>
                                                    <i className="fas fa-trash-alt"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {formData.operatorRoutes.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="text-center py-4 text-muted small font-italic">
                                                No routes configured for this operator.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Column: Logo & System Settings */}
                <div className="col-lg-4">
                    {/* Logo Box */}
                    <div className="card shadow-sm border-0 rounded-lg mb-4 text-center p-4">
                        <label className="small font-weight-bold text-muted mb-3 d-block text-uppercase">Company Logo</label>
                        <div 
                            className="mx-auto rounded border-dashed bg-light d-flex align-items-center justify-content-center mb-3 shadow-inner overflow-hidden position-relative" 
                            style={{ width: '160px', height: '160px', border: '2px dashed #cbd5e1' }}
                        >
                            {logoUrl && !imgError ? (
                                <img 
                                    src={resolveImageUrl(logoUrl) || ''} 
                                    className="w-100 h-100 object-fit-cover rounded" 
                                    alt="Operator logo" 
                                    onError={() => setImgError(true)}
                                />
                            ) : (
                                <div className="d-flex flex-column align-items-center justify-content-center text-muted">
                                    <i className="fas fa-image fa-3x opacity-25 mb-1"></i>
                                    <span style={{ fontSize: '11px' }}>No Logo Found</span>
                                </div>
                            )}
                        </div>
                        <input 
                            type="file" 
                            id="logoUploadInput" 
                            hidden 
                            accept="image/*" 
                            onChange={handlePhotoUpload} 
                            disabled={uploading} 
                        />
                        <button 
                            type="button" 
                            className="btn btn-sm btn-outline-primary px-4 rounded-pill font-weight-bold" 
                            disabled={uploading} 
                            onClick={() => document.getElementById('logoUploadInput')?.click()}
                        >
                            {uploading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm mr-1"></span> Uploading...
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-cloud-upload-alt mr-1"></i> Change Logo
                                </>
                            )}
                        </button>
                        <small className="text-muted d-block mt-2" style={{ fontSize: '11px' }}>Accepts PNG, JPG or WEBP (Max 2MB)</small>
                    </div>

                    {/* System Settings */}
                    <div className="card shadow-sm border-0 rounded-lg p-4">
                        <label className="small font-weight-bold text-muted text-uppercase mb-3">System Settings</label>
                        <div className="mb-3">
                            <label className="small font-weight-bold text-muted mb-1 d-block">Global Inventory Mode</label>
                            <select 
                                name="inventoryMode" 
                                className="form-control bg-light" 
                                value={formData.inventoryMode || 'PlatformManaged'} 
                                onChange={handleChange}
                            >
                                <option value="PlatformManaged">Platform Managed</option>
                                <option value="ExternalApiManaged">External API Managed</option>
                                <option value="Hybrid">Hybrid Mode</option>
                            </select>
                        </div>
                        <div className="form-check form-switch border p-3 rounded bg-white shadow-sm d-flex align-items-center justify-content-between">
                            <label className="form-check-label small font-weight-bold text-dark mb-0" htmlFor="actv">Publicly Active</label>
                            <input 
                                type="checkbox" 
                                className="form-check-input ms-0 mt-0" 
                                id="actv" 
                                name="isActive" 
                                checked={Boolean(formData.isActive)} 
                                onChange={handleChange} 
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BusOperatorsEdit;
