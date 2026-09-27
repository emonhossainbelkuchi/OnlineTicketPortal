import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Lock, Shield } from 'lucide-react';

export enum Gender {
    Male = 'Male',
    Female = 'Female',
    Other = 'Other'
}

export default function CustomerProfilesEdit() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [profile, setProfile] = useState<any | null>(null);
    const [user, setUser] = useState<any | null>(null);

    const [formData, setFormData] = useState({
        nationalIdNumber: '',
        dateOfBirth: '',
        gender: Gender.Male,
        emergencyContactPhone: '',
        preferredLanguageCode: 'bn',
    });

    const loadProfile = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const res = await api.get(`api/CustomerProfiles/${id}`);
            const data = res.data;
            setProfile(data);

            setFormData({
                nationalIdNumber: data.nationalIdNumber || '',
                dateOfBirth: data.dateOfBirth ? data.dateOfBirth.split('T')[0] : '',
                gender: data.gender || Gender.Male,
                emergencyContactPhone: data.emergencyContactPhone || '',
                preferredLanguageCode: data.preferredLanguageCode || 'bn',
            });

            // ইউজার ইনফো আনা
            if (data.userId) {
                try {
                    const userRes = await api.get(`api/Users/${data.userId}`).catch(() => 
                        api.get('api/Users').then(r => ({ data: (r.data || []).find((u: any) => u.id === data.userId) }))
                    );
                    setUser(userRes.data || null);
                } catch {
                    setUser(null);
                }
            }
        } catch (err: any) {
            if (err.response?.status === 403) {
                toast.error('You are not authorized to view this profile');
            } else {
                toast.error('Failed to load profile');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProfile();
    }, [id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile || !id) return;

        setSubmitting(true);
        try {
            // C# Update DTO তে যা যা গ্রহণ করে
            const payload = {
                nationalIdNumber: formData.nationalIdNumber?.trim() || null,
                dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString() : null,
                gender: formData.gender,
                emergencyContactPhone: formData.emergencyContactPhone?.trim() || null,
                preferredLanguageCode: formData.preferredLanguageCode?.trim() || 'bn',
                rowVersion: profile.rowVersion, // ক্লিয়ার কনকারেন্সি টোকেন
            };

            await api.put(`api/CustomerProfiles/${id}`, payload);
            toast.success('Customer profile successfully updated!');
            navigate('/admin/customer-profiles');
        } catch (err: any) {
            if (err.response?.status === 409) {
                toast.error(err.response.data?.message || 'Concurrency Conflict: This record was modified elsewhere. Reloading...');
                loadProfile(); // লেটেস্ট ডাটা রিলোড করা
            } else if (err.response?.status === 403) {
                toast.error('Forbidden: You can only edit your own profile unless you are Admin/Staff.');
            } else {
                toast.error(err.response?.data?.message || 'Failed to update customer profile');
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-12 text-center text-sm text-slate-500">Loading profile...</div>;
    if (!profile) return <div className="p-12 text-center text-sm text-slate-500">Profile Not Found</div>;

    return (
        <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
            <div className="flex justify-between items-center bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">Edit Customer Profile</h1>
                    <p className="text-xs text-slate-500 font-mono">Profile ID: {profile.id}</p>
                </div>
                <button 
                    type="button" 
                    onClick={() => navigate('/admin/customer-profiles')}
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to List
                </button>
            </div>

            {/* Backend Protected Invariants Notice */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase">
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Protected Invariants (Handled by Server)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                        <span className="text-slate-400 block mb-0.5">Anchored Account:</span>
                        <div className="font-semibold text-slate-800">{user?.fullName || 'User'}</div>
                        <div className="font-mono text-slate-500 text-[11px] truncate">{profile.userId}</div>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-200">
                        <span className="text-slate-400 block mb-0.5">Wallet Balance (Read-Only):</span>
                        <div className="font-mono font-bold text-emerald-700 text-sm">৳{Number(profile.walletBalance || 0).toFixed(2)} BDT</div>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">National ID (NID)</label>
                        <input 
                            type="text" 
                            maxLength={30}
                            value={formData.nationalIdNumber} 
                            onChange={e => setFormData({ ...formData, nationalIdNumber: e.target.value })} 
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" 
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Gender *</label>
                        <select 
                            value={formData.gender} 
                            onChange={e => setFormData({ ...formData, gender: e.target.value as Gender })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" 
                        >
                            <option value={Gender.Male}>Male</option>
                            <option value={Gender.Female}>Female</option>
                            <option value={Gender.Other}>Other</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth</label>
                        <input 
                            type="date" 
                            value={formData.dateOfBirth} 
                            onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })} 
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" 
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Contact Phone</label>
                        <input 
                            type="tel" 
                            maxLength={30}
                            value={formData.emergencyContactPhone} 
                            onChange={e => setFormData({ ...formData, emergencyContactPhone: e.target.value })} 
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" 
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Preferred Language</label>
                        <select 
                            value={formData.preferredLanguageCode} 
                            onChange={e => setFormData({ ...formData, preferredLanguageCode: e.target.value })} 
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white" 
                        >
                            <option value="bn">Bengali (bn)</option>
                            <option value="en">English (en)</option>
                        </select>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button 
                        type="button" 
                        onClick={() => navigate('/admin/customer-profiles')}
                        className="px-4 py-2 text-sm font-medium bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        disabled={submitting}
                        className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                    >
                        {submitting ? 'Updating...' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    );
}