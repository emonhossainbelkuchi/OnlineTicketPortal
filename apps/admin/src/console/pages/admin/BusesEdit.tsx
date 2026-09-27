import React, { useState, useEffect } from 'react';
import { api } from "@/lib/api";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { BusType, SeatType } from "@/config/enums.generated";

export interface SeatEditDto {
    id?: string;
    seatNumber: string;
    rowNumber: number;
    columnNumber: number;
    deckLevel: number;
    seatType: SeatType;
    isWindow: boolean;
    extraFare?: number | null;
}

interface BusOperator {
    id: string;
    name: string;
}

interface BusCategory {
    id: string;
    name: string;
}

const BusesEdit: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    const [operators, setOperators] = useState<BusOperator[]>([]);
    const [categories, setCategories] = useState<BusCategory[]>([]);

    // Bus Master form
    const [formData, setFormData] = useState({
        id: '',
        busOperatorId: '',
        busCategoryId: '',
        registrationNumber: '',
        coachNumber: '',
        brand: '',
        model: '',
        registrationDate: '',
        busType: 'Ac' as BusType,
        totalSeats: 0,
        hasWifi: false,
        hasToilet: false,
        isActive: true,
        primaryImageUrl: null as string | null,
        rowVersion: null as string | null
    });

    // Seats Details
    const [seats, setSeats] = useState<SeatEditDto[]>([]);

    useEffect(() => {
        const loadData = async () => {
            if (!id) return;
            setLoading(true);
            try {
                // 1. Fetch Operators
                try {
                    const opRes = await api.get("api/BusOperators");
                    setOperators(opRes.data || []);
                } catch (e) {
                    console.warn("Could not load operators:", e);
                }

                // 2. Fetch Categories
                try {
                    const catRes = await api.get("api/BusCategories");
                    setCategories(catRes.data || []);
                } catch (e) {
                    console.warn("Could not load categories:", e);
                }

                // 3. Fetch Bus with Seats & Images
                const res = await api.get(`api/Buses/${id}`);
                const data = res.data;

                setFormData({
                    id: data.id || id,
                    busOperatorId: data.busOperatorId || '',
                    busCategoryId: data.busCategoryId || '',
                    registrationNumber: data.registrationNumber || '',
                    coachNumber: data.coachNumber || '',
                    brand: data.brand || '',
                    model: data.model || '',
                    registrationDate: data.registrationDate ? data.registrationDate.split('T')[0] : '',
                    busType: data.busType || 'Ac',
                    totalSeats: data.totalSeats || data.seats?.length || 0,
                    hasWifi: Boolean(data.hasWifi),
                    hasToilet: Boolean(data.hasToilet),
                    isActive: Boolean(data.isActive),
                    primaryImageUrl: data.primaryImageUrl || null,
                    rowVersion: data.rowVersion || null
                });

                setSeats((data.seats || []).map((s: any) => ({
                    id: s.id,
                    seatNumber: s.seatNumber,
                    rowNumber: s.rowNumber,
                    columnNumber: s.columnNumber,
                    deckLevel: s.deckLevel || 1,
                    seatType: s.seatType || 'Regular',
                    isWindow: Boolean(s.isWindow),
                    extraFare: s.extraFare
                })));
            } catch (err: any) {
                console.error("Load bus error:", err);
                toast.error("Failed to load bus details");
                navigate('/admin/buses');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [id, navigate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSeatChange = (index: number, field: keyof SeatEditDto, val: any) => {
        setSeats(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: val };
            return next;
        });
    };

    const handleAddSeat = () => {
        const nextNum = seats.length + 1;
        setSeats(prev => [
            ...prev,
            {
                seatNumber: `S${nextNum}`,
                rowNumber: Math.ceil(nextNum / 4),
                columnNumber: (nextNum % 4) || 4,
                deckLevel: 1,
                seatType: 'Regular',
                isWindow: false,
                extraFare: 0
            }
        ]);
    };

    const handleRemoveSeat = (index: number) => {
        setSeats(prev => prev.filter((_, i) => i !== index));
    };

    // Image Upload
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !id) return;

        const form = new FormData();
        form.append("file", file);

        setUploadingImage(true);
        try {
            const res = await api.post(`api/Buses/${id}/images`, form, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            const imgUrl = res.data?.imageUrl;
            setFormData(prev => ({ ...prev, primaryImageUrl: imgUrl }));
            toast.success("Coach image uploaded successfully!");
        } catch (err: any) {
            console.error("Image upload error:", err);
            toast.error(err.response?.data?.message || "Failed to upload image");
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.registrationNumber.trim() || !formData.coachNumber.trim()) {
            toast.error("Registration Number and Coach Number are required!");
            return;
        }

        if (seats.length === 0) {
            toast.error("At least 1 Seat must be defined in the bus layout!");
            return;
        }

        setSaving(true);
        try {
            const buildPayload = (versionToUse: any) => ({
                busOperatorId: formData.busOperatorId,
                busCategoryId: formData.busCategoryId || null,
                registrationNumber: formData.registrationNumber.trim(),
                coachNumber: formData.coachNumber.trim(),
                brand: formData.brand.trim() || null,
                model: formData.model.trim() || null,
                registrationDate: formData.registrationDate ? new Date(formData.registrationDate).toISOString() : null,
                busType: formData.busType,
                totalSeats: seats.length,
                hasWifi: Boolean(formData.hasWifi),
                hasToilet: Boolean(formData.hasToilet),
                isActive: Boolean(formData.isActive),
                rowVersion: versionToUse || formData.rowVersion || null,
                seats: seats.map(s => ({
                    seatNumber: s.seatNumber.trim(),
                    rowNumber: Number(s.rowNumber),
                    columnNumber: Number(s.columnNumber),
                    deckLevel: Number(s.deckLevel) || 1,
                    seatType: s.seatType,
                    isWindow: Boolean(s.isWindow),
                    extraFare: s.extraFare ? Number(s.extraFare) : null
                }))
            });

            try {
                // 1st attempt: PUT with current RowVersion
                await api.put(`api/Buses/${id}`, buildPayload(formData.rowVersion));
                toast.success("Bus and Seat layout updated successfully!");
                navigate('/admin/buses');
            } catch (firstErr: any) {
                // 409 Concurrency Conflict handling
                const isConflict = firstErr.response?.status === 409 || firstErr.response?.data?.message?.includes('changed');
                if (isConflict) {
                    console.warn("RowVersion mismatch detected. Auto-fetching fresh version token...");
                    const freshRes = await api.get(`api/Buses/${id}`);
                    const latestVersion = freshRes.data?.rowVersion;

                    if (latestVersion) {
                        setFormData(prev => ({ ...prev, rowVersion: latestVersion }));
                        await api.put(`api/Buses/${id}`, buildPayload(latestVersion));
                        toast.success("Updated successfully with fresh version!");
                        navigate('/admin/buses');
                        return;
                    }
                }
                throw firstErr;
            }

        } catch (err: any) {
            console.error("Save bus error:", err);
            toast.error(err.response?.data?.message || err.response?.data?.detail || "Failed to update bus");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="container-fluid py-5 text-center min-vh-100 d-flex align-items-center justify-content-center">
                <div className="spinner-border text-primary mr-2" role="status"></div>
                <span className="text-muted font-italic">Loading bus details...</span>
            </div>
        );
    }

    return (
        <div className="container-fluid py-4 bg-light min-vh-100">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 shadow-sm rounded border-left border-primary" style={{ borderLeftWidth: '5px' }}>
                <div>
                    <h5 className="mb-0 text-primary font-weight-bold">
                        <i className="fas fa-edit mr-2"></i> Edit Bus Coach & Seat Layout
                    </h5>
                    <div className="d-flex align-items-center gap-2 mt-1">
                        <small className="text-muted">Coach: <strong>{formData.coachNumber}</strong> | ID: <code>{id}</code></small>
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
                    onClick={() => navigate('/admin/buses')}
                >
                    CANCEL
                </button>
            </div>

            <form onSubmit={handleSave}>
                {/* Vehicle Specs & Image */}
                <div className="row g-4 mb-4">
                    <div className="col-lg-8">
                        <div className="card shadow-sm border-0 rounded-lg h-100">
                            <div className="card-header bg-white py-3 border-bottom font-weight-bold text-dark">
                                <i className="fas fa-truck-moving mr-2 text-primary"></i> 1. Vehicle Specifications
                            </div>
                            <div className="card-body p-4">
                                <div className="row g-3">
                                    <div className="col-md-6">
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

                                    <div className="col-md-6">
                                        <label className="small font-weight-bold mb-1">Bus Category</label>
                                        <select 
                                            name="busCategoryId" 
                                            className="form-select"
                                            value={formData.busCategoryId}
                                            onChange={handleChange}
                                        >
                                            <option value="">-- No Category --</option>
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="col-md-6">
                                        <label className="small font-weight-bold mb-1">Coach Number / Name *</label>
                                        <input 
                                            name="coachNumber" 
                                            className="form-control font-weight-bold" 
                                            value={formData.coachNumber} 
                                            onChange={handleChange} 
                                            maxLength={40}
                                            required 
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label className="small font-weight-bold mb-1">Registration / Number Plate *</label>
                                        <input 
                                            name="registrationNumber" 
                                            className="form-control font-monospace" 
                                            value={formData.registrationNumber} 
                                            onChange={handleChange} 
                                            maxLength={40}
                                            required 
                                        />
                                    </div>

                                    <div className="col-md-4">
                                        <label className="small font-weight-bold mb-1">Bus Type *</label>
                                        <select 
                                            name="busType" 
                                            className="form-select"
                                            value={formData.busType}
                                            onChange={handleChange}
                                        >
                                            <option value="Ac">AC</option>
                                            <option value="NonAc">Non-AC</option>
                                            <option value="Sleeper">Sleeper</option>
                                            <option value="DoubleDecker">Double Decker</option>
                                            <option value="LuxurySleeper">Luxury Sleeper</option>
                                        </select>
                                    </div>

                                    <div className="col-md-4">
                                        <label className="small font-weight-bold mb-1">Brand</label>
                                        <input name="brand" className="form-control" value={formData.brand} onChange={handleChange} />
                                    </div>

                                    <div className="col-md-4">
                                        <label className="small font-weight-bold mb-1">Model</label>
                                        <input name="model" className="form-control" value={formData.model} onChange={handleChange} />
                                    </div>

                                    <div className="col-md-6 d-flex align-items-center mt-3 gap-3">
                                        <div className="form-check form-switch">
                                            <input type="checkbox" className="form-check-input" id="wifiEdit" name="hasWifi" checked={formData.hasWifi} onChange={handleChange} />
                                            <label className="form-check-label small font-weight-bold" htmlFor="wifiEdit">WiFi</label>
                                        </div>
                                        <div className="form-check form-switch">
                                            <input type="checkbox" className="form-check-input" id="toiletEdit" name="hasToilet" checked={formData.hasToilet} onChange={handleChange} />
                                            <label className="form-check-label small font-weight-bold" htmlFor="toiletEdit">Toilet</label>
                                        </div>
                                        <div className="form-check form-switch">
                                            <input type="checkbox" className="form-check-input" id="activeEdit" name="isActive" checked={formData.isActive} onChange={handleChange} />
                                            <label className="form-check-label small font-weight-bold text-success" htmlFor="activeEdit">Active</label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Primary Image Upload */}
                    <div className="col-lg-4">
                        <div className="card shadow-sm border-0 rounded-lg h-100">
                            <div className="card-header bg-white py-3 border-bottom font-weight-bold text-dark">
                                <i className="fas fa-camera mr-2 text-primary"></i> Coach Photo
                            </div>
                            <div className="card-body p-3 text-center d-flex flex-column align-items-center justify-content-center">
                                <div className="rounded border bg-light w-100 mb-3 d-flex align-items-center justify-content-center overflow-hidden" style={{ height: '160px' }}>
                                    {formData.primaryImageUrl ? (
                                        <img src={formData.primaryImageUrl} alt="Coach" className="w-100 h-100 object-fit-cover" />
                                    ) : (
                                        <div className="text-muted small">
                                            <i className="fas fa-image fa-2x mb-1 text-secondary opacity-50"></i>
                                            <div>No primary image</div>
                                        </div>
                                    )}
                                </div>
                                <label className="btn btn-sm btn-outline-primary px-3 cursor-pointer">
                                    <i className="fas fa-upload mr-1"></i> {uploadingImage ? "Uploading..." : "Upload New Photo"}
                                    <input type="file" accept="image/*" className="d-none" onChange={handleImageUpload} disabled={uploadingImage} />
                                </label>
                                <small className="text-muted mt-2" style={{ fontSize: '11px' }}>
                                    Supported: JPG, PNG, WebP (Max 5MB)
                                </small>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Seats Details */}
                <div className="card shadow-sm border-0 rounded-lg mb-4">
                    <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                        <div className="font-weight-bold text-dark">
                            <i className="fas fa-chair mr-2 text-primary"></i> 2. Physical Seats ({seats.length} Configured)
                        </div>
                        <button type="button" className="btn btn-sm btn-outline-primary font-weight-bold" onClick={handleAddSeat}>
                            <i className="fas fa-plus mr-1"></i> Add Individual Seat
                        </button>
                    </div>
                    <div className="card-body p-4">
                        <div className="table-responsive" style={{ maxHeight: '360px', overflowY: 'auto' }}>
                            <table className="table table-sm table-bordered align-middle text-center small">
                                <thead className="bg-light text-muted">
                                    <tr>
                                        <th>#</th>
                                        <th>Seat No</th>
                                        <th>Row</th>
                                        <th>Col</th>
                                        <th>Deck</th>
                                        <th>Type</th>
                                        <th>Window</th>
                                        <th>Extra Fare</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {seats.map((s, idx) => (
                                        <tr key={idx}>
                                            <td>{idx + 1}</td>
                                            <td>
                                                <input className="form-control form-control-sm text-center font-weight-bold" value={s.seatNumber} onChange={(e) => handleSeatChange(idx, 'seatNumber', e.target.value)} required />
                                            </td>
                                            <td>
                                                <input type="number" className="form-control form-control-sm text-center" value={s.rowNumber} onChange={(e) => handleSeatChange(idx, 'rowNumber', parseInt(e.target.value) || 1)} />
                                            </td>
                                            <td>
                                                <input type="number" className="form-control form-control-sm text-center" value={s.columnNumber} onChange={(e) => handleSeatChange(idx, 'columnNumber', parseInt(e.target.value) || 1)} />
                                            </td>
                                            <td>
                                                <select className="form-select form-select-sm text-center" value={s.deckLevel} onChange={(e) => handleSeatChange(idx, 'deckLevel', parseInt(e.target.value) || 1)}>
                                                    <option value={1}>1 (Lower)</option>
                                                    <option value={2}>2 (Upper)</option>
                                                </select>
                                            </td>
                                            <td>
                                                <select className="form-select form-select-sm" value={s.seatType} onChange={(e) => handleSeatChange(idx, 'seatType', e.target.value)}>
                                                    <option value="Regular">Regular</option>
                                                    <option value="Business">Business</option>
                                                    <option value="SleeperLower">Sleeper Lower</option>
                                                    <option value="SleeperUpper">Sleeper Upper</option>
                                                    <option value="Cabin">Cabin</option>
                                                </select>
                                            </td>
                                            <td>
                                                <input type="checkbox" className="form-check-input" checked={s.isWindow} onChange={(e) => handleSeatChange(idx, 'isWindow', e.target.checked)} />
                                            </td>
                                            <td>
                                                <input type="number" className="form-control form-control-sm text-end" value={s.extraFare ?? ''} onChange={(e) => handleSeatChange(idx, 'extraFare', e.target.value ? parseFloat(e.target.value) : null)} />
                                            </td>
                                            <td>
                                                <button type="button" className="btn btn-xs btn-outline-danger p-1" onClick={() => handleRemoveSeat(idx)} title="Remove Seat">
                                                    <i className="fas fa-times"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Submit / Cancel Buttons */}
                <div className="d-flex justify-content-end gap-2 pb-5">
                    <button type="button" className="btn btn-outline-secondary px-4 shadow-sm" onClick={() => navigate('/admin/buses')}>
                        Back
                    </button>
                    <button type="submit" className="btn btn-primary px-5 font-weight-bold shadow-sm" disabled={saving}>
                        {saving ? "Updating Bus..." : "Update Bus Coach & Seats"}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default BusesEdit;