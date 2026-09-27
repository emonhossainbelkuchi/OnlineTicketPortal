import React, { useState, useEffect } from 'react';
import { api } from "@/lib/api";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

interface OperatorOption {
    id: string;
    name: string;
}

const OperatorBranchEdit: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [operators, setOperators] = useState<OperatorOption[]>([]);

    const [formData, setFormData] = useState({
        id: '',
        busOperatorId: '',
        branchName: '',
        address: '',
        phone: '',
        city: '',
        district: '',
        rowVersion: null as string | null
    });

    useEffect(() => {
        const loadBranchAndOperators = async () => {
            if (!id) return;
            setLoading(true);
            try {
                // ১. অপারেটর্স লোড
                try {
                    const opRes = await api.get("api/BusOperators");
                    setOperators(opRes.data || []);
                } catch (e) {
                    console.warn("Operators could not be loaded", e);
                }

                // ২. ব্রাঞ্চ ডেটা লোড
                const res = await api.get(`api/OperatorBranches/${id}`);
                const data = res.data;

                setFormData({
                    id: data.id || id,
                    busOperatorId: data.busOperatorId || '',
                    branchName: data.branchName || '',
                    address: data.address || '',
                    phone: data.phone || '',
                    city: data.city || '',
                    district: data.district || '',
                    rowVersion: data.rowVersion || data.version || null
                });
            } catch (err: any) {
                console.error("Load branch error:", err);
                toast.error("Failed to load branch details");
                navigate('/admin/operator-branches');
            } finally {
                setLoading(false);
            }
        };

        loadBranchAndOperators();
    }, [id, navigate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.branchName.trim() || !formData.address.trim() || !formData.phone.trim()) {
            toast.error("Please fill in all required fields!");
            return;
        }

        setSaving(true);
        try {
            const buildPayload = (versionToUse: any) => ({
                busOperatorId: formData.busOperatorId,
                branchName: formData.branchName.trim(),
                address: formData.address.trim(),
                phone: formData.phone.trim(),
                city: formData.city.trim(),
                district: formData.district.trim(),
                rowVersion: versionToUse || formData.rowVersion || null
            });

            try {
                // ১ম চেষ্টা: বর্তমান RowVersion দিয়ে
                await api.put(`api/OperatorBranches/${id}`, buildPayload(formData.rowVersion));
                toast.success("Operator Branch updated successfully!");
                navigate('/admin/operator-branches');
            } catch (firstErr: any) {
                // কনকারেন্সি কনফ্লিক্ট হলে অটো-রিট্রাই
                const isConflict = firstErr.response?.status === 409 || firstErr.response?.data?.message?.includes('changed');
                if (isConflict) {
                    console.warn("RowVersion conflict. Auto-fetching latest data...");
                    const freshRes = await api.get(`api/OperatorBranches/${id}`);
                    const latestVersion = freshRes.data?.rowVersion;

                    if (latestVersion) {
                        setFormData(prev => ({ ...prev, rowVersion: latestVersion }));
                        await api.put(`api/OperatorBranches/${id}`, buildPayload(latestVersion));
                        toast.success("Updated successfully with fresh version!");
                        navigate('/admin/operator-branches');
                        return;
                    }
                }
                throw firstErr;
            }

        } catch (err: any) {
            console.error("Save error:", err);
            toast.error(err.response?.data?.message || err.response?.data?.title || "Failed to update branch");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="container-fluid py-5 text-center min-vh-100 d-flex align-items-center justify-content-center">
                <div className="spinner-border text-primary mr-2" role="status"></div>
                <span className="text-muted font-italic">Loading branch details...</span>
            </div>
        );
    }

    return (
        <div className="container-fluid py-4 bg-light min-vh-100">
            {/* Top Bar */}
            <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 shadow-sm rounded border-left border-primary" style={{ borderLeftWidth: '5px' }}>
                <div>
                    <h5 className="mb-0 text-primary font-weight-bold">
                        <i className="fas fa-edit mr-2"></i> Update Operator Branch
                    </h5>
                    <div className="d-flex align-items-center gap-2 mt-1">
                        <small className="text-muted">Branch ID: <code className="text-dark bg-light px-2 py-0.5 rounded">{id}</code></small>
                        {formData.rowVersion && (
                            <span className="badge badge-secondary ml-2" style={{ fontSize: '10px' }}>
                                Concurrency Active
                            </span>
                        )}
                    </div>
                </div>
                <button 
                    type="button" 
                    className="btn btn-outline-secondary px-4 shadow-sm"
                    onClick={() => navigate('/admin/operator-branches')}
                >
                    CANCEL
                </button>
            </div>

            <div className="row justify-content-center">
                <div className="col-lg-8">
                    <form onSubmit={handleSave} className="card shadow-sm border-0 rounded-lg">
                        <div className="card-body p-4">
                            <div className="row g-3">
                                {/* Operator Select */}
                                <div className="col-md-12">
                                    <label className="small font-weight-bold mb-1">Bus Operator</label>
                                    <select 
                                        name="busOperatorId" 
                                        className="form-select"
                                        value={formData.busOperatorId}
                                        onChange={handleChange}
                                        required
                                    >
                                        {operators.map(op => (
                                            <option key={op.id} value={op.id}>{op.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Branch Name */}
                                <div className="col-md-7">
                                    <label className="small font-weight-bold mb-1">Branch / Counter Name *</label>
                                    <input 
                                        name="branchName" 
                                        className="form-control font-weight-bold" 
                                        value={formData.branchName} 
                                        onChange={handleChange} 
                                        maxLength={120}
                                        required 
                                    />
                                </div>

                                {/* Phone */}
                                <div className="col-md-5">
                                    <label className="small font-weight-bold mb-1">Contact Phone *</label>
                                    <input 
                                        name="phone" 
                                        className="form-control" 
                                        value={formData.phone} 
                                        onChange={handleChange} 
                                        maxLength={30}
                                        required 
                                    />
                                </div>

                                {/* Address */}
                                <div className="col-md-12">
                                    <label className="small font-weight-bold mb-1">Full Physical Address *</label>
                                    <textarea 
                                        name="address" 
                                        rows={2} 
                                        className="form-control" 
                                        value={formData.address} 
                                        onChange={handleChange} 
                                        maxLength={250}
                                        required 
                                    />
                                </div>

                                {/* City */}
                                <div className="col-md-6">
                                    <label className="small font-weight-bold mb-1">City *</label>
                                    <input 
                                        name="city" 
                                        className="form-control" 
                                        value={formData.city} 
                                        onChange={handleChange} 
                                        maxLength={80}
                                        required 
                                    />
                                </div>

                                {/* District */}
                                <div className="col-md-6">
                                    <label className="small font-weight-bold mb-1">District *</label>
                                    <input 
                                        name="district" 
                                        className="form-control" 
                                        value={formData.district} 
                                        onChange={handleChange} 
                                        maxLength={80}
                                        required 
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="card-footer bg-white p-3 d-flex justify-content-end gap-2 border-top">
                            <button 
                                type="button" 
                                className="btn btn-outline-secondary px-4" 
                                onClick={() => navigate('/admin/operator-branches')}
                            >
                                Back
                            </button>
                            <button 
                                type="submit" 
                                className="btn btn-primary px-4 font-weight-bold" 
                                disabled={saving}
                            >
                                {saving ? "Updating..." : "Update Branch"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default OperatorBranchEdit;