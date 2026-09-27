import React, { useState, useEffect } from 'react';
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

interface OperatorOption {
    id: string;
    name: string;
}

const COMMON_CITIES = ['Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna', 'Barisal', 'Rangpur', 'Mymensingh', "Cox's Bazar", 'Cumilla'];

const OperatorBranchCreate: React.FC = () => {
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const [operators, setOperators] = useState<OperatorOption[]>([]);
    const [loadingOperators, setLoadingOperators] = useState(true);

    const [formData, setFormData] = useState({
        busOperatorId: '',
        branchName: '',
        address: '',
        phone: '',
        city: 'Dhaka',
        district: 'Dhaka'
    });

    useEffect(() => {
        const fetchOperators = async () => {
            try {
                const res = await api.get("api/BusOperators");
                const list = res.data || [];
                setOperators(list);
                if (list.length > 0) {
                    setFormData(prev => ({ ...prev, busOperatorId: list[0].id }));
                }
            } catch (err) {
                console.error("Failed to load operators:", err);
                toast.error("Failed to load operator list");
            } finally {
                setLoadingOperators(false);
            }
        };

        fetchOperators();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.branchName.trim() || !formData.address.trim() || !formData.phone.trim() || !formData.city.trim()) {
            toast.error("Please fill in all required fields!");
            return;
        }

        if (!formData.busOperatorId) {
            toast.error("Please select a Bus Operator!");
            return;
        }

        setSubmitting(true);
        try {
            // C# OperatorBranchCreateDto এর ফিল্ডসমূহের সাথে হুবহু মিল রেখে কল করা
            await api.post("api/OperatorBranches", {
                busOperatorId: formData.busOperatorId,
                branchName: formData.branchName.trim(),
                address: formData.address.trim(),
                phone: formData.phone.trim(),
                city: formData.city.trim(),
                district: (formData.district || formData.city).trim()
            });

            toast.success("Operator Branch created successfully!");
            navigate('/admin/operator-branches');
        } catch (err: any) {
            console.error("Create branch error:", err);
            toast.error(err.response?.data?.message || err.response?.data?.title || "Failed to create branch");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="container-fluid py-4 bg-light min-vh-100">
            <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 shadow-sm rounded border-left border-primary" style={{ borderLeftWidth: '5px' }}>
                <div>
                    <h5 className="mb-0 text-primary font-weight-bold">
                        <i className="fas fa-plus-circle mr-2"></i> Register New Operator Branch
                    </h5>
                    <small className="text-muted">Create a regional ticket counter or station branch for an operator</small>
                </div>
                <button 
                    type="button" 
                    className="btn btn-outline-secondary px-4 shadow-sm"
                    onClick={() => navigate('/admin/operator-branches')}
                >
                    BACK TO LIST
                </button>
            </div>

            <div className="row justify-content-center">
                <div className="col-lg-8">
                    <form onSubmit={handleSubmit} className="card shadow-sm border-0 rounded-lg">
                        <div className="card-body p-4">
                            <div className="row g-3">
                                {/* Operator Select */}
                                <div className="col-md-12">
                                    <label className="small font-weight-bold mb-1">Bus Operator *</label>
                                    <select 
                                        name="busOperatorId" 
                                        className="form-select"
                                        value={formData.busOperatorId}
                                        onChange={handleChange}
                                        disabled={loadingOperators}
                                        required
                                    >
                                        {operators.map(op => (
                                            <option key={op.id} value={op.id}>{op.name}</option>
                                        ))}
                                    </select>
                                    <small className="text-muted">Select the operator company this branch belongs to</small>
                                </div>

                                {/* Branch Name */}
                                <div className="col-md-7">
                                    <label className="small font-weight-bold mb-1">Branch / Counter Name *</label>
                                    <input 
                                        name="branchName" 
                                        className="form-control" 
                                        placeholder="e.g. Sayedabad Central Counter" 
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
                                        placeholder="e.g. +880 1711-xxxxxx" 
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
                                        placeholder="Counter number, building, road name, terminal..." 
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
                                        placeholder="e.g. Dhaka" 
                                        value={formData.city} 
                                        onChange={handleChange} 
                                        maxLength={80}
                                        required 
                                    />
                                    <div className="mt-1 d-flex flex-wrap gap-1">
                                        {COMMON_CITIES.slice(0, 5).map(c => (
                                            <button 
                                                key={c}
                                                type="button" 
                                                className="btn btn-xs btn-outline-secondary py-0 px-2"
                                                style={{ fontSize: '11px' }}
                                                onClick={() => setFormData(prev => ({ ...prev, city: c, district: c }))}
                                            >
                                                {c}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* District */}
                                <div className="col-md-6">
                                    <label className="small font-weight-bold mb-1">District *</label>
                                    <input 
                                        name="district" 
                                        className="form-control" 
                                        placeholder="e.g. Dhaka" 
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
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                className="btn btn-primary px-4 font-weight-bold" 
                                disabled={submitting}
                            >
                                {submitting ? "Creating Branch..." : "Save Branch"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default OperatorBranchCreate;