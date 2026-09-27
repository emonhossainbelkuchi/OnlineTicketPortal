import React, { useState } from 'react';
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
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

const BusAmenitiesCreate: React.FC = () => {
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);

    // সিঙ্গেল ফর্ম স্টেট
    const [formData, setFormData] = useState({
        name: '',
        iconUrl: 'fas fa-wifi',
        isActive: true
    });

    // মাল্টিপল সিলেক্ট করার স্টেট
    const [selectedPresets, setSelectedPresets] = useState<string[]>([]);
    const [mode, setMode] = useState<'bulk' | 'single'>('bulk');

    // চেকবক্স/আইটেম টগল
    const togglePreset = (presetName: string) => {
        setSelectedPresets(prev => {
            if (prev.includes(presetName)) {
                return prev.filter(p => p !== presetName);
            } else {
                return [...prev, presetName];
            }
        });
    };

    // সিলেক্ট অল
    const selectAllPresets = () => {
        if (selectedPresets.length === COMMON_ICONS.length) {
            setSelectedPresets([]);
        } else {
            setSelectedPresets(COMMON_ICONS.map(i => i.name));
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    // সাবমিট হ্যান্ডলার
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            if (mode === 'bulk' && selectedPresets.length > 0) {
                // একাধিক সিলেক্ট করা অ্যামেনিটি লুপ করে সার্ভারে পাঠানো হচ্ছে
                const createPromises = selectedPresets.map(presetName => {
                    const preset = COMMON_ICONS.find(i => i.name === presetName);
                    return api.post("api/BusAmenities", {
                        name: presetName,
                        iconUrl: preset ? preset.icon : null,
                        isActive: Boolean(formData.isActive)
                    });
                });

                await Promise.all(createPromises);
                toast.success(`Successfully registered ${selectedPresets.length} amenities!`);
            } else {
                // একটি মাত্র কাস্টম অ্যামেনিটি সেভ করা হচ্ছে
                if (!formData.name.trim()) {
                    toast.error("Please enter an Amenity Name or select from presets!");
                    setSubmitting(false);
                    return;
                }

                await api.post("api/BusAmenities", {
                    name: formData.name.trim(),
                    iconUrl: formData.iconUrl?.trim() || null,
                    isActive: Boolean(formData.isActive)
                });

                toast.success("Bus Amenity registered successfully!");
            }

            navigate('/admin/bus-amenities');
        } catch (err: any) {
            console.error("Create error:", err);
            toast.error(err.response?.data?.message || err.response?.data?.title || "Failed to register amenities");
        } finally {
            setSubmitting(false);
        }
    };

    const isSelectAll = selectedPresets.length === COMMON_ICONS.length;

    return (
        <div className="container-fluid py-4 bg-light min-vh-100">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 shadow-sm rounded border-left border-primary" style={{ borderLeftWidth: '5px' }}>
                <div>
                    <h5 className="mb-0 text-primary font-weight-bold">
                        <i className="fas fa-plus-circle mr-2"></i> Register New Bus Amenity
                    </h5>
                    <small className="text-muted">Select multiple amenities to add in bulk, or create custom ones</small>
                </div>
                <button 
                    type="button" 
                    className="btn btn-outline-secondary px-4 shadow-sm"
                    onClick={() => navigate('/admin/bus-amenities')}
                >
                    BACK TO LIST
                </button>
            </div>

            <div className="row justify-content-center">
                <div className="col-lg-9">
                    {/* Mode Toggle */}
                    <div className="d-flex justify-content-center mb-3">
                        <div className="btn-group p-1 bg-white rounded shadow-sm border" role="group">
                            <button 
                                type="button" 
                                className={`btn btn-sm px-4 font-weight-bold ${mode === 'bulk' ? 'btn-primary shadow-sm' : 'btn-light text-muted'}`}
                                onClick={() => setMode('bulk')}
                            >
                                <i className="fas fa-layer-group mr-1"></i> Multi-Select Preset Amenities (Bulk)
                            </button>
                            <button 
                                type="button" 
                                className={`btn btn-sm px-4 font-weight-bold ${mode === 'single' ? 'btn-primary shadow-sm' : 'btn-light text-muted'}`}
                                onClick={() => setMode('single')}
                            >
                                <i className="fas fa-edit mr-1"></i> Single Custom Amenity
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="card shadow-sm border-0 rounded-lg">
                        <div className="card-body p-4">
                            {mode === 'bulk' ? (
                                <div>
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <label className="small font-weight-bold text-uppercase text-muted mb-0">
                                            Select Amenities to Register ({selectedPresets.length} selected)
                                        </label>
                                        <button 
                                            type="button" 
                                            className="btn btn-sm btn-outline-primary py-0 px-2 font-weight-bold"
                                            style={{ fontSize: '12px' }}
                                            onClick={selectAllPresets}
                                        >
                                            {isSelectAll ? "Deselect All" : "Select All"}
                                        </button>
                                    </div>

                                    {/* Multi-Select Cards Grid */}
                                    <div className="row g-2 mb-4">
                                        {COMMON_ICONS.map((item) => {
                                            const isSelected = selectedPresets.includes(item.name);
                                            return (
                                                <div key={item.id} className="col-md-4 col-sm-6">
                                                    <div 
                                                        onClick={() => togglePreset(item.name)}
                                                        className={`p-3 rounded border text-start d-flex align-items-center justify-content-between cursor-pointer transition ${
                                                            isSelected 
                                                                ? 'bg-primary text-white border-primary shadow-sm' 
                                                                : 'bg-white text-dark border-light-subtle hover-bg-light'
                                                        }`}
                                                        style={{ cursor: 'pointer', transition: 'all 0.15s ease-in-out' }}
                                                    >
                                                        <div className="d-flex align-items-center gap-2">
                                                            <i className={`${item.icon} fs-5 ${isSelected ? 'text-white' : 'text-primary'}`}></i>
                                                            <span className="font-weight-bold small ms-2">{item.name}</span>
                                                        </div>
                                                        <i className={`fas ${isSelected ? 'fa-check-circle text-white' : 'fa-circle text-muted opacity-25'}`}></i>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {selectedPresets.length > 0 && (
                                        <div className="alert alert-info py-2 px-3 small d-flex align-items-center justify-content-between">
                                            <span>
                                                <i className="fas fa-info-circle mr-2"></i> 
                                                <strong>{selectedPresets.length}</strong> amenities will be added to the database simultaneously.
                                            </span>
                                            <button 
                                                type="button" 
                                                className="btn btn-sm btn-link text-danger p-0" 
                                                onClick={() => setSelectedPresets([])}
                                            >
                                                Clear selection
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="row g-3 mb-3">
                                    <div className="col-md-12">
                                        <label className="small font-weight-bold mb-1">Amenity Name *</label>
                                        <input 
                                            name="name" 
                                            className="form-control" 
                                            placeholder="e.g. Luxury Sleeper Cushion" 
                                            value={formData.name} 
                                            onChange={handleChange} 
                                            maxLength={80}
                                        />
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
                                                placeholder="e.g. fas fa-couch" 
                                                value={formData.iconUrl} 
                                                onChange={handleChange} 
                                            />
                                        </div>
                                        <div className="mt-2 d-flex flex-wrap gap-1">
                                            {COMMON_ICONS.map((ic) => (
                                                <button 
                                                    key={ic.id} 
                                                    type="button" 
                                                    className={`btn btn-xs py-1 px-2 border ${formData.name === ic.name ? 'btn-primary' : 'btn-outline-secondary'}`}
                                                    style={{ fontSize: '11px' }}
                                                    onClick={() => {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            name: ic.name,
                                                            iconUrl: ic.icon
                                                        }));
                                                    }}
                                                >
                                                    <i className={ic.icon}></i> {ic.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="row mt-2">
                                <div className="col-md-6">
                                    <label className="small font-weight-bold mb-1">Status</label>
                                    <div className="form-check form-switch border p-2 rounded bg-light">
                                        <input 
                                            type="checkbox" 
                                            className="form-check-input ms-0 me-2" 
                                            id="isActiveCheck" 
                                            name="isActive" 
                                            checked={formData.isActive} 
                                            onChange={handleChange} 
                                        />
                                        <label className="form-check-label small font-weight-bold text-dark" htmlFor="isActiveCheck">
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
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                className="btn btn-primary px-4 font-weight-bold" 
                                disabled={submitting || (mode === 'bulk' && selectedPresets.length === 0 && !formData.name.trim())}
                            >
                                {submitting ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm mr-1"></span> Saving...
                                    </>
                                ) : mode === 'bulk' && selectedPresets.length > 0 ? (
                                    `Register ${selectedPresets.length} Selected Amenities`
                                ) : (
                                    "Save Amenity"
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default BusAmenitiesCreate;