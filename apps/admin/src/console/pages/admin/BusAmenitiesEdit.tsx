import React, { useState, useEffect } from 'react';
import { api } from "@/lib/api";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

const COMMON_ICONS = [
    { id: 'wifi', name: 'WiFi', icon: 'fas fa-wifi' },
    { id: 'ac', name: 'Air Conditioner', icon: 'fas fa-snowflake' },
    { id: 'charging', name: 'Charging Port', icon: 'fas fa-plug' },
    { id: 'water', name: 'Water Bottle', icon: 'fas fa-wine-bottle' },
    { id: 'blanket', name: 'Blanket & Pillow', icon: 'fas fa-bed' },
    { id: 'tv', name: 'TV & Entertainment', icon: 'fas fa-tv' },
    { id: 'firstaid', name: 'First Aid Box', icon: 'fas fa-medkit' },
    { id: 'gps', name: 'GPS Tracking', icon: 'fas fa-map-marked-alt' },
    { id: 'snack', name: 'Snacks / Refreshment', icon: 'fas fa-cookie-bite' },
    { id: 'readinglight', name: 'Reading Light', icon: 'fas fa-lightbulb' },
    { id: 'toilet', name: 'Emergency Washroom', icon: 'fas fa-restroom' },
    { id: 'cctv', name: 'CCTV Surveillance', icon: 'fas fa-video' },
    { id: 'sound', name: 'Music System', icon: 'fas fa-music' },
    { id: 'recliner', name: 'Reclining Seats', icon: 'fas fa-chair' },
    { id: 'emergency', name: 'Emergency Exit', icon: 'fas fa-door-open' },
];

const BusAmenitiesEdit: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        id: '',
        name: '',
        iconUrl: '',
        isActive: true,
        rowVersion: null as string | null
    });

    // একাধিক ফিচার ট্যাগ সিলেক্ট করার স্টেট
    const [selectedFeatureTags, setSelectedFeatureTags] = useState<string[]>([]);

    useEffect(() => {
        const fetchAmenity = async () => {
            if (!id) return;
            setLoading(true);
            try {
                const res = await api.get(`api/BusAmenities/${id}`);
                const data = res.data;
                setFormData({
                    id: data.id || id,
                    name: data.name || '',
                    iconUrl: data.iconUrl || '',
                    isActive: Boolean(data.isActive),
                    rowVersion: data.rowVersion || data.version || null
                });

                // বর্তমান নামের সাথে মিলে এমন প্রিসেটগুলো সিলেক্ট রাখা
                if (data.name) {
                    const tags = COMMON_ICONS.filter(ci => 
                        data.name.toLowerCase().includes(ci.name.toLowerCase())
                    ).map(ci => ci.name);
                    setSelectedFeatureTags(tags.length > 0 ? tags : [data.name]);
                }
            } catch (err: any) {
                console.error("Load error:", err);
                toast.error("Failed to load amenity details");
                navigate('/admin/bus-amenities');
            } finally {
                setLoading(false);
            }
        };

        fetchAmenity();
    }, [id, navigate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    // একাধিক প্রিসেট টগল হ্যান্ডলার
    const handleTagToggle = (item: typeof COMMON_ICONS[0]) => {
        let updatedTags: string[];
        if (selectedFeatureTags.includes(item.name)) {
            updatedTags = selectedFeatureTags.filter(t => t !== item.name);
        } else {
            updatedTags = [...selectedFeatureTags, item.name];
        }
        setSelectedFeatureTags(updatedTags);

        if (updatedTags.length > 0) {
            setFormData(prev => ({
                ...prev,
                name: updatedTags.join(' + '),
                iconUrl: item.icon
            }));
        }
    };

    // সেভ হ্যান্ডলার (RowVersion সহ)
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            toast.error("Amenity Name is required!");
            return;
        }

        setSaving(true);
        try {
            const buildPayload = (versionToUse: any) => ({
                name: formData.name.trim(),
                iconUrl: formData.iconUrl?.trim() || null,
                isActive: Boolean(formData.isActive),
                rowVersion: versionToUse || formData.rowVersion || null
            });

            try {
                // ১ম চেষ্টা: বর্তমান RowVersion দিয়ে
                await api.put(`api/BusAmenities/${id}`, buildPayload(formData.rowVersion));
                toast.success("Bus Amenity updated successfully!");
                navigate('/admin/bus-amenities');
            } catch (firstErr: any) {
                // কনকারেন্সি কনফ্লিক্ট হলে লেটেস্ট RowVersion এনে আবার পাঠানো
                const isConflict = firstErr.response?.status === 409 || firstErr.response?.data?.message?.includes('changed');
                if (isConflict) {
                    console.warn("RowVersion conflict. Auto-fetching latest data...");
                    const freshRes = await api.get(`api/BusAmenities/${id}`);
                    const latestVersion = freshRes.data?.rowVersion;

                    if (latestVersion) {
                        setFormData(prev => ({ ...prev, rowVersion: latestVersion }));
                        await api.put(`api/BusAmenities/${id}`, buildPayload(latestVersion));
                        toast.success("Updated successfully with latest version!");
                        navigate('/admin/bus-amenities');
                        return;
                    }
                }
                throw firstErr;
            }

        } catch (err: any) {
            console.error("Save error:", err);
            toast.error(err.response?.data?.message || err.response?.data?.title || "Failed to update amenity");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="container-fluid py-5 text-center min-vh-100 d-flex align-items-center justify-content-center">
                <div className="spinner-border text-primary mr-2" role="status"></div>
                <span className="text-muted font-italic">Loading amenity details...</span>
            </div>
        );
    }

    return (
        <div className="container-fluid py-4 bg-light min-vh-100">
            {/* Top Bar */}
            <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 shadow-sm rounded border-left border-primary" style={{ borderLeftWidth: '5px' }}>
                <div>
                    <h5 className="mb-0 text-primary font-weight-bold">
                        <i className="fas fa-edit mr-2"></i> Edit Bus Amenity
                    </h5>
                    <div className="d-flex align-items-center gap-2 mt-1">
                        <small className="text-muted">ID: <code className="text-dark bg-light px-2 py-0.5 rounded">{id}</code></small>
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
                    onClick={() => navigate('/admin/bus-amenities')}
                >
                    CANCEL
                </button>
            </div>

            <div className="row justify-content-center">
                <div className="col-lg-9">
                    <form onSubmit={handleSave} className="card shadow-sm border-0 rounded-lg">
                        <div className="card-body p-4">
                            {/* Multiple Select Badges */}
                            <div className="mb-4">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <label className="small font-weight-bold text-uppercase text-muted mb-0">
                                        Select & Combine Features (Multiple Selection Allowed)
                                    </label>
                                    <small className="text-muted">Click to toggle or combine into this amenity</small>
                                </div>
                                <div className="d-flex flex-wrap gap-2 p-3 bg-light rounded border">
                                    {COMMON_ICONS.map((item) => {
                                        const isSelected = selectedFeatureTags.includes(item.name);
                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => handleTagToggle(item)}
                                                className={`btn btn-sm px-3 py-1 rounded-pill font-weight-bold transition ${
                                                    isSelected 
                                                        ? 'btn-primary shadow-sm' 
                                                        : 'btn-outline-secondary bg-white'
                                                }`}
                                                style={{ fontSize: '12px' }}
                                            >
                                                <i className={`${item.icon} mr-1`}></i>
                                                {item.name}
                                                {isSelected && <i className="fas fa-check ml-2"></i>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="row g-3">
                                <div className="col-md-12">
                                    <label className="small font-weight-bold mb-1">Amenity Name *</label>
                                    <input 
                                        name="name" 
                                        className="form-control" 
                                        value={formData.name} 
                                        onChange={handleChange} 
                                        maxLength={80}
                                        required 
                                    />
                                    <small className="text-muted">You can edit the combined name freely (max 80 chars)</small>
                                </div>

                                <div className="col-md-12">
                                    <label className="small font-weight-bold mb-1">Icon (FontAwesome Class or Image URL)</label>
                                    <div className="input-group">
                                        <span className="input-group-text bg-white">
                                            <i className={formData.iconUrl || 'fas fa-tag'}></i>
                                        </span>
                                        <input 
                                            name="iconUrl" 
                                            className="form-control" 
                                            placeholder="e.g. fas fa-wifi or https://..." 
                                            value={formData.iconUrl} 
                                            onChange={handleChange} 
                                        />
                                    </div>
                                </div>

                                <div className="col-md-6">
                                    <label className="small font-weight-bold mb-1">Status</label>
                                    <div className="form-check form-switch border p-2 rounded bg-light">
                                        <input 
                                            type="checkbox" 
                                            className="form-check-input ms-0 me-2" 
                                            id="isActiveEditCheck" 
                                            name="isActive" 
                                            checked={formData.isActive} 
                                            onChange={handleChange} 
                                        />
                                        <label className="form-check-label small font-weight-bold text-dark" htmlFor="isActiveEditCheck">
                                            Active for bus assignment
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="card-footer bg-white p-3 d-flex justify-content-end gap-2 border-top">
                            <button 
                                type="button" 
                                className="btn btn-outline-secondary px-4" 
                                onClick={() => navigate('/admin/bus-amenities')}
                            >
                                Back
                            </button>
                            <button 
                                type="submit" 
                                className="btn btn-primary px-4 font-weight-bold" 
                                disabled={saving}
                            >
                                {saving ? "Saving Changes..." : "Update Amenity"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default BusAmenitiesEdit;