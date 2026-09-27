import React, { useState, useEffect } from 'react';
import { api } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { BusType, SeatType } from "@/config/enums.generated";

export interface SeatCreateDto {
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

const BusesCreate: React.FC = () => {
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const [operators, setOperators] = useState<BusOperator[]>([]);
    const [categories, setCategories] = useState<BusCategory[]>([]);

    // 1. Bus Master Specifications
    const [formData, setFormData] = useState({
        busOperatorId: '',
        busCategoryId: '',
        registrationNumber: '',
        coachNumber: '',
        brand: 'Hino',
        model: '1J Pluss / RM2',
        registrationDate: new Date().toISOString().split('T')[0],
        busType: 'Ac' as BusType,
        totalSeats: 40,
        hasWifi: true,
        hasToilet: false,
    });

    // 2. Seats Details List
    const [seats, setSeats] = useState<SeatCreateDto[]>([]);
    const [seatLayoutPreset, setSeatLayoutPreset] = useState<'2x2' | '2x1' | 'sleeper'>('2x2');

    // Auto-generate standard seat layout
    const generatePresetSeats = (preset: '2x2' | '2x1' | 'sleeper', count: number) => {
        const generated: SeatCreateDto[] = [];
        const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

        if (preset === '2x2') {
            // 4 seats per row (A1, A2, A3, A4)
            const rowsCount = Math.ceil(count / 4);
            let seatIdx = 0;
            for (let r = 1; r <= rowsCount; r++) {
                const rowLetter = letters[r - 1] || `R${r}`;
                for (let c = 1; c <= 4; c++) {
                    if (seatIdx >= count) break;
                    seatIdx++;
                    generated.push({
                        seatNumber: `${rowLetter}${c}`,
                        rowNumber: r,
                        columnNumber: c,
                        deckLevel: 1,
                        seatType: 'Regular',
                        isWindow: c === 1 || c === 4,
                        extraFare: 0
                    });
                }
            }
        } else if (preset === '2x1') {
            // 3 seats per row (Business class: A1, A2, A3)
            const rowsCount = Math.ceil(count / 3);
            let seatIdx = 0;
            for (let r = 1; r <= rowsCount; r++) {
                const rowLetter = letters[r - 1] || `R${r}`;
                for (let c = 1; c <= 3; c++) {
                    if (seatIdx >= count) break;
                    seatIdx++;
                    generated.push({
                        seatNumber: `${rowLetter}${c}`,
                        rowNumber: r,
                        columnNumber: c,
                        deckLevel: 1,
                        seatType: 'Business',
                        isWindow: c === 1 || c === 3,
                        extraFare: 100
                    });
                }
            }
        } else {
            // Sleeper layout (Lower & Upper Decks)
            const rowsCount = Math.ceil(count / 2);
            let seatIdx = 0;
            for (let r = 1; r <= rowsCount; r++) {
                const rowLetter = letters[r - 1] || `R${r}`;
                for (let c = 1; c <= 2; c++) {
                    if (seatIdx >= count) break;
                    seatIdx++;
                    generated.push({
                        seatNumber: `${rowLetter}${c}`,
                        rowNumber: r,
                        columnNumber: c,
                        deckLevel: c === 1 ? 1 : 2,
                        seatType: c === 1 ? 'SleeperLower' : 'SleeperUpper',
                        isWindow: true,
                        extraFare: 200
                    });
                }
            }
        }

        setSeats(generated);
        setFormData(prev => ({ ...prev, totalSeats: generated.length }));
    };

    useEffect(() => {
        const loadPrerequisites = async () => {
            try {
                // Fetch Operators
                const opRes = await api.get("api/BusOperators");
                const opList = opRes.data || [];
                setOperators(opList);
                if (opList.length > 0) {
                    setFormData(prev => ({ ...prev, busOperatorId: opList[0].id }));
                }
            } catch (err) {
                console.warn("Could not load operators:", err);
            }

            try {
                // Fetch Categories
                const catRes = await api.get("api/BusCategories");
                setCategories(catRes.data || []);
            } catch (err) {
                console.warn("Could not load categories:", err);
            }
        };

        loadPrerequisites();
        generatePresetSeats('2x2', 40);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else if (name === 'totalSeats') {
            const num = parseInt(value) || 0;
            setFormData(prev => ({ ...prev, totalSeats: num }));
            generatePresetSeats(seatLayoutPreset, num);
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSeatChange = (index: number, field: keyof SeatCreateDto, val: any) => {
        setSeats(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: val };
            return next;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.busOperatorId) {
            toast.error("Please select a Bus Operator!");
            return;
        }

        if (!formData.registrationNumber.trim() || !formData.coachNumber.trim()) {
            toast.error("Registration Number and Coach Number are required!");
            return;
        }

        if (seats.length === 0) {
            toast.error("At least 1 Seat must be defined in the bus layout!");
            return;
        }

        setSubmitting(true);
        try {
            // Matches C# BusCreateDto exactly (Master-Details create):
            const payload = {
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
                seats: seats.map(s => ({
                    seatNumber: s.seatNumber.trim(),
                    rowNumber: Number(s.rowNumber),
                    columnNumber: Number(s.columnNumber),
                    deckLevel: Number(s.deckLevel) || 1,
                    seatType: s.seatType,
                    isWindow: Boolean(s.isWindow),
                    extraFare: s.extraFare ? Number(s.extraFare) : null
                }))
            };

            await api.post("api/Buses", payload);
            toast.success("Bus coach and seat layout created successfully!");
            navigate('/admin/buses');
        } catch (err: any) {
            console.error("Create bus error:", err);
            toast.error(err.response?.data?.message || err.response?.data?.title || "Failed to create bus");
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
                        <i className="fas fa-plus-circle mr-2"></i> Register New Bus Coach
                    </h5>
                    <small className="text-muted">Configure coach vehicle specs and generate its physical seat layout together</small>
                </div>
                <button 
                    type="button" 
                    className="btn btn-outline-secondary px-4 shadow-sm"
                    onClick={() => navigate('/admin/buses')}
                >
                    BACK TO FLEET
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                {/* Master: Bus Vehicle Details */}
                <div className="card shadow-sm border-0 rounded-lg mb-4">
                    <div className="card-header bg-white py-3 border-bottom font-weight-bold text-dark">
                        <i className="fas fa-truck-moving mr-2 text-primary"></i> 1. Vehicle Specifications (Master)
                    </div>
                    <div className="card-body p-4">
                        <div className="row g-3">
                            <div className="col-md-6">
                                <label className="small font-weight-bold mb-1">Bus Operator *</label>
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
                                <label className="small font-weight-bold mb-1">Bus Category (Optional)</label>
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
                                    placeholder="e.g. EK-101 or SilkLine-01" 
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
                                    placeholder="e.g. DHAKA-METRO-BA-11-2233" 
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
                                <input 
                                    name="brand" 
                                    className="form-control" 
                                    placeholder="e.g. Scania / Hino / Hyundai" 
                                    value={formData.brand} 
                                    onChange={handleChange} 
                                />
                            </div>

                            <div className="col-md-4">
                                <label className="small font-weight-bold mb-1">Model</label>
                                <input 
                                    name="model" 
                                    className="form-control" 
                                    placeholder="e.g. K410 / RM2" 
                                    value={formData.model} 
                                    onChange={handleChange} 
                                />
                            </div>

                            <div className="col-md-4">
                                <label className="small font-weight-bold mb-1">Registration Date</label>
                                <input 
                                    type="date"
                                    name="registrationDate" 
                                    className="form-control" 
                                    value={formData.registrationDate} 
                                    onChange={handleChange} 
                                />
                            </div>

                            <div className="col-md-4 d-flex align-items-center mt-4">
                                <div className="form-check form-switch me-3">
                                    <input 
                                        type="checkbox" 
                                        className="form-check-input" 
                                        id="wifiCheck" 
                                        name="hasWifi" 
                                        checked={formData.hasWifi} 
                                        onChange={handleChange} 
                                    />
                                    <label className="form-check-label small font-weight-bold" htmlFor="wifiCheck">
                                        Has WiFi
                                    </label>
                                </div>
                                <div className="form-check form-switch">
                                    <input 
                                        type="checkbox" 
                                        className="form-check-input" 
                                        id="toiletCheck" 
                                        name="hasToilet" 
                                        checked={formData.hasToilet} 
                                        onChange={handleChange} 
                                    />
                                    <label className="form-check-label small font-weight-bold" htmlFor="toiletCheck">
                                        Has Toilet
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Details: Seat Layout Configuration */}
                <div className="card shadow-sm border-0 rounded-lg mb-4">
                    <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                        <div className="font-weight-bold text-dark">
                            <i className="fas fa-chair mr-2 text-primary"></i> 2. Seat Layout Configuration ({seats.length} Seats Defined)
                        </div>
                        <div className="d-flex gap-2 align-items-center">
                            <span className="small text-muted">Generate Preset:</span>
                            <button 
                                type="button" 
                                className={`btn btn-sm ${seatLayoutPreset === '2x2' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                onClick={() => { setSeatLayoutPreset('2x2'); generatePresetSeats('2x2', formData.totalSeats); }}
                            >
                                2x2 Regular
                            </button>
                            <button 
                                type="button" 
                                className={`btn btn-sm ${seatLayoutPreset === '2x1' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                onClick={() => { setSeatLayoutPreset('2x1'); generatePresetSeats('2x1', formData.totalSeats); }}
                            >
                                2x1 Business
                            </button>
                            <button 
                                type="button" 
                                className={`btn btn-sm ${seatLayoutPreset === 'sleeper' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                onClick={() => { setSeatLayoutPreset('sleeper'); generatePresetSeats('sleeper', formData.totalSeats); }}
                            >
                                Sleeper
                            </button>
                        </div>
                    </div>
                    <div className="card-body p-4">
                        <div className="row g-2 mb-3">
                            <div className="col-md-3">
                                <label className="small font-weight-bold">Total Seats to Generate</label>
                                <input 
                                    type="number" 
                                    name="totalSeats" 
                                    className="form-control" 
                                    value={formData.totalSeats} 
                                    onChange={handleChange} 
                                    min={1} 
                                    max={100} 
                                />
                            </div>
                        </div>

                        {/* Seat Preview & Edit Grid */}
                        <div className="table-responsive" style={{ maxHeight: '380px', overflowY: 'auto' }}>
                            <table className="table table-sm table-bordered align-middle text-center small">
                                <thead className="bg-light text-muted">
                                    <tr>
                                        <th>#</th>
                                        <th>Seat Number</th>
                                        <th>Row</th>
                                        <th>Column</th>
                                        <th>Deck Level</th>
                                        <th>Seat Type</th>
                                        <th>Window?</th>
                                        <th>Extra Fare (BDT)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {seats.map((s, idx) => (
                                        <tr key={idx}>
                                            <td>{idx + 1}</td>
                                            <td>
                                                <input 
                                                    className="form-control form-control-sm text-center font-weight-bold" 
                                                    value={s.seatNumber} 
                                                    onChange={(e) => handleSeatChange(idx, 'seatNumber', e.target.value)} 
                                                    required
                                                />
                                            </td>
                                            <td>
                                                <input 
                                                    type="number" 
                                                    className="form-control form-control-sm text-center" 
                                                    value={s.rowNumber} 
                                                    onChange={(e) => handleSeatChange(idx, 'rowNumber', parseInt(e.target.value) || 1)} 
                                                />
                                            </td>
                                            <td>
                                                <input 
                                                    type="number" 
                                                    className="form-control form-control-sm text-center" 
                                                    value={s.columnNumber} 
                                                    onChange={(e) => handleSeatChange(idx, 'columnNumber', parseInt(e.target.value) || 1)} 
                                                />
                                            </td>
                                            <td>
                                                <select 
                                                    className="form-select form-select-sm text-center" 
                                                    value={s.deckLevel} 
                                                    onChange={(e) => handleSeatChange(idx, 'deckLevel', parseInt(e.target.value) || 1)}
                                                >
                                                    <option value={1}>Lower (1)</option>
                                                    <option value={2}>Upper (2)</option>
                                                </select>
                                            </td>
                                            <td>
                                                <select 
                                                    className="form-select form-select-sm" 
                                                    value={s.seatType} 
                                                    onChange={(e) => handleSeatChange(idx, 'seatType', e.target.value)}
                                                >
                                                    <option value="Regular">Regular</option>
                                                    <option value="Business">Business</option>
                                                    <option value="SleeperLower">Sleeper Lower</option>
                                                    <option value="SleeperUpper">Sleeper Upper</option>
                                                    <option value="Cabin">Cabin</option>
                                                </select>
                                            </td>
                                            <td>
                                                <input 
                                                    type="checkbox" 
                                                    className="form-check-input" 
                                                    checked={s.isWindow} 
                                                    onChange={(e) => handleSeatChange(idx, 'isWindow', e.target.checked)} 
                                                />
                                            </td>
                                            <td>
                                                <input 
                                                    type="number" 
                                                    className="form-control form-control-sm text-end" 
                                                    placeholder="0.00" 
                                                    value={s.extraFare ?? ''} 
                                                    onChange={(e) => handleSeatChange(idx, 'extraFare', e.target.value ? parseFloat(e.target.value) : null)} 
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="d-flex justify-content-end gap-2 pb-5">
                    <button 
                        type="button" 
                        className="btn btn-outline-secondary px-4 shadow-sm"
                        onClick={() => navigate('/admin/buses')}
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        className="btn btn-primary px-5 font-weight-bold shadow-sm"
                        disabled={submitting}
                    >
                        {submitting ? "Registering Bus..." : "Save Bus Coach & Seats"}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default BusesCreate;