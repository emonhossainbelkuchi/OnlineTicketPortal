import React, { useState } from 'react';
import { api } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export interface BusCategoryCreateDto {
    name: string;
    description?: string;
    isActive: boolean;
}

const BusCategoriesCreate: React.FC = () => {
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState<BusCategoryCreateDto>({
        name: '',
        description: '',
        isActive: true,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error('Category Name is required!');
            return;
        }

        setSubmitting(true);
        try {
            // Matches C# BusCategoryCreateDto: Name, Description, IsActive
            const payload = {
                name: formData.name.trim(),
                description: formData.description?.trim() || null,
                isActive: Boolean(formData.isActive),
            };

            await api.post('api/BusCategories', payload);
            toast.success('Bus Category created successfully!');
            navigate('/admin/bus-categories');
        } catch (err: any) {
            console.error('Create category error:', err);
            const msg = err.response?.data?.message || err.response?.data?.title || 'Failed to create category';
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="container-fluid py-4 bg-light min-vh-100">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 shadow-sm rounded border-left border-primary" style={{ borderLeftWidth: '5px' }}>
                <div>
                    <h5 className="mb-0 text-primary font-weight-bold">
                        <i className="fas fa-plus-circle mr-2"></i> Add New Bus Category
                    </h5>
                    <small className="text-muted">Define a fleet category (e.g. Sleeper Coach, AC Chair Coach, VIP Suite)</small>
                </div>
                <button 
                    type="button" 
                    className="btn btn-outline-secondary px-4 shadow-sm"
                    onClick={() => navigate('/admin/bus-categories')}
                >
                    BACK TO LIST
                </button>
            </div>

            {/* Form */}
            <div className="row justify-content-center">
                <div className="col-lg-8">
                    <div className="card shadow-sm border-0 rounded-lg">
                        <div className="card-header bg-white py-3 border-bottom font-weight-bold text-dark">
                            <i className="fas fa-info-circle mr-2 text-primary"></i> Category Information
                        </div>
                        <div className="card-body p-4">
                            <form onSubmit={handleSubmit}>
                                <div className="mb-3">
                                    <label className="form-label font-weight-bold small">Category Name *</label>
                                    <input 
                                        type="text" 
                                        name="name" 
                                        className="form-control" 
                                        placeholder="e.g. VIP Business Class, Sleeper Coach, Economy" 
                                        maxLength={80}
                                        value={formData.name} 
                                        onChange={handleChange} 
                                        required 
                                    />
                                </div>

                                <div className="mb-3">
                                    <label className="form-label font-weight-bold small">Description (Optional)</label>
                                    <textarea 
                                        name="description" 
                                        className="form-control" 
                                        rows={3} 
                                        placeholder="Short details about the amenities and luxury level of this category..." 
                                        maxLength={250}
                                        value={formData.description} 
                                        onChange={handleChange} 
                                    />
                                </div>

                                <div className="form-check form-switch mb-4">
                                    <input 
                                        type="checkbox" 
                                        className="form-check-input" 
                                        id="activeSwitch" 
                                        name="isActive" 
                                        checked={formData.isActive} 
                                        onChange={handleChange} 
                                    />
                                    <label className="form-check-label font-weight-bold small text-success" htmlFor="activeSwitch">
                                        Active (Visible when creating/editing buses)
                                    </label>
                                </div>

                                <div className="d-flex justify-content-end gap-2">
                                    <button type="button" className="btn btn-outline-secondary px-4" onClick={() => navigate('/admin/bus-categories')}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary px-4 font-weight-bold" disabled={submitting}>
                                        {submitting ? 'Saving...' : 'Save Category'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default BusCategoriesCreate;