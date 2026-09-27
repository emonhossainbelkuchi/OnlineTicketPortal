import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { 
    ArrowLeft, 
    Edit, 
    Shield, 
    User, 
    CreditCard, 
    DollarSign,
    Calendar,
    PhoneCall
} from 'lucide-react';

export default function CustomerProfilesDetails() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    const [profile, setProfile] = useState<any | null>(null);
    const [user, setUser] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            if (!id) return;
            setLoading(true);
            try {
                // C# GetById: [HttpGet("{id}")]
                const res = await api.get(`api/CustomerProfiles/${id}`);
                setProfile(res.data);

                if (res.data?.userId) {
                    try {
                        const userRes = await api.get(`api/Users/${res.data.userId}`).catch(() => 
                            api.get('api/Users').then(r => ({ data: (r.data || []).find((u: any) => u.id === res.data.userId) }))
                        );
                        setUser(userRes.data || null);
                    } catch {
                        setUser(null);
                    }
                }
            } catch (err: any) {
                if (err.response?.status === 403) {
                    toast.error('Forbidden: You can only inspect your own CustomerProfile.');
                } else if (err.response?.status === 404) {
                    toast.error('Customer profile not found.');
                } else {
                    toast.error('Failed to load profile details');
                }
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    if (loading) return <div className="p-12 text-center text-sm text-slate-500">Loading details...</div>;
    if (!profile) return <div className="p-12 text-center text-sm text-slate-500">Customer Profile Not Found.</div>;

    return (
        <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                        {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">{user?.fullName || 'Customer Profile'}</h1>
                        <span className="text-xs text-slate-500 font-mono">ID: {profile.id}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => navigate('/admin/customer-profiles')}
                        className="px-3.5 py-2 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center gap-1.5"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to List
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate(`/admin/customer-profiles/edit/${profile.id}`)}
                        className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 shadow-sm"
                    >
                        <Edit className="w-4 h-4" /> Edit Profile
                    </button>
                </div>
            </div>

            {/* Invariants & Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <span className="text-xs text-slate-500 block mb-1">Protected Wallet Balance</span>
                    <div className="text-2xl font-bold font-mono text-emerald-700">৳{Number(profile.walletBalance || 0).toFixed(2)} BDT</div>
                    <span className="text-[10px] text-slate-400 mt-1 block">Managed exclusively via CustomerWalletService</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <span className="text-xs text-slate-500 block mb-1">Gender & Language</span>
                    <div className="text-base font-bold text-slate-800">{profile.gender} ({profile.preferredLanguageCode || 'bn'})</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <span className="text-xs text-slate-500 block mb-1">Emergency Phone</span>
                    <div className="text-base font-bold text-slate-800 font-mono">{profile.emergencyContactPhone || 'Not Set'}</div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Identity Anchors (C# Scoped)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="text-slate-400 block mb-1">CustomerProfile.Id</span>
                        <span className="font-bold text-slate-900">{profile.id}</span>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <span className="text-blue-600 block mb-1">CustomerProfile.UserId</span>
                        <span className="font-bold text-blue-900">{profile.userId}</span>
                    </div>
                </div>

                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="text-slate-500 block">National ID (NID):</span>
                        <span className="font-semibold text-slate-800">{profile.nationalIdNumber || 'None'}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="text-slate-500 block">Date of Birth:</span>
                        <span className="font-semibold text-slate-800">{profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : 'None'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}