import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';

export interface BusCategoryUpdateDto {
    name: string;
    description?: string;
    isActive: boolean;
    rowVersion: string;
}

const BusCategoriesEdit: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        id: '',
        name: '',
        description: '',
        isActive: true,
        rowVersion: '' as string,
    });

    useEffect(() => {
        const loadCategory = async () => {
            if (!id) return;
            setLoading(true);
            try {
                const res = await api.get(`api/BusCategories/${id}`);
                const data = res.data;
                setFormData({
                    id: data.id || id,
                    name: data.name || '',
                    description: data.description || '',
                    isActive: Boolean(data.isActive),
                    rowVersion: data.rowVersion || '',
                });
            } catch (err: any) {
                console.error('Failed to load category:', err);
                toast.error('Failed to load category details');
                navigate('/admin/bus-categories');
            } finally {
                setLoading(false);
            }
        };

        loadCategory();
    }, [id, navigate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error('Category Name is required!');
            return;
        }

        setSaving(true);
        try {
            const buildPayload = (versionToken: string) => ({
                name: formData.name.trim(),
                description: formData.description?.trim() || null,
                isActive: Boolean(formData.isActive),
                rowVersion: versionToken || formData.rowVersion,
            });

            try {
                // 1st attempt: PUT with current RowVersion
                await api.put(`api/BusCategories/${id}`, buildPayload(formData.rowVersion));
                toast.success('Category updated successfully!');
                navigate('/admin/bus-categories');
            } catch (firstErr: any) {
                // Handle 409 Concurrency Conflict
                const isConflict = firstErr.response?.status === 409 || firstErr.response?.data?.message?.includes('changed');
                if (isConflict) {
                    console.warn('RowVersion conflict. Auto-reloading latest token...');
                    const freshRes = await api.get(`api/BusCategories/${id}`);
                    const latestToken = freshRes.data?.rowVersion;
                    if (latestToken) {
                        setFormData(prev => ({ ...prev, rowVersion: latestToken }));
                        await api.put(`api/BusCategories/${id}`, buildPayload(latestToken));
                        toast.success('Updated successfully with fresh version!');
                        navigate('/admin/bus-categories');
                        return;
                    }
                }
                throw firstErr;
            }
        } catch (err: any) {
            console.error('Update category error:', err);
            const msg = err.response?.data?.message || err.response?.data?.details || 'Failed to update category';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="container-fluid py-5 text-center min-vh-100 d-flex align-items-center justify-content-center">
                <div className="spinner-border text-primary mr-2" role="status"></div>
                <span className="text-muted font-italic">Loading category details...</span>
            </div>
        );
    }

    return (
        <div className="container-fluid py-4 bg-light min-vh-100">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 shadow-sm rounded border-left border-primary" style={{ borderLeftWidth: '5px' }}>
                <div>
                    <h5 className="mb-0 text-primary font-weight-bold">
                        <i className="fas fa-edit mr-2"></i> Edit Bus Category
                    </h5>
                    <small className="text-muted">Category: <strong>{formData.name}</strong> | ID: <code>{id}</code></small>
                </div>
                <button 
                    type="button" 
                    className="btn btn-outline-secondary px-4 shadow-sm"
                    onClick={() => navigate('/admin/bus-categories')}
                >
                    CANCEL
                </button>
            </div>

            {/* Form */}
            <div className="row justify-content-center">
                <div className="col-lg-8">
                    <div className="card shadow-sm border-0 rounded-lg">
                        <div className="card-header bg-white py-3 border-bottom font-weight-bold text-dark">
                            <i className="fas fa-info-circle mr-2 text-primary"></i> Edit Category Details
                        </div>
                        <div className="card-body p-4">
                            <form onSubmit={handleSave}>
                                <div className="mb-3">
                                    <label className="form-label font-weight-bold small">Category Name *</label>
                                    <input 
                                        type="text" 
                                        name="name" 
                                        className="form-control font-weight-bold" 
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
                                        maxLength={250}
                                        value={formData.description} 
                                        onChange={handleChange} 
                                    />
                                </div>

                                <div className="form-check form-switch mb-4">
                                    <input type="checkbox" className="form-check-input" id="editActive" name="isActive" checked={formData.isActive} onChange={handleChange} />
                                    <label className="form-check-label font-weight-bold small text-success" htmlFor="editActive">Active</label>
                                </div>

                                <div className="d-flex justify-content-end gap-2">
                                    <button type="button" className="btn btn-outline-secondary px-4" onClick={() => navigate('/admin/bus-categories')}>Back</button>
                                    <button type="submit" className="btn btn-primary px-4 font-weight-bold" disabled={saving}>{saving ? 'Updating...' : 'Update Category'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default BusCategoriesEdit;