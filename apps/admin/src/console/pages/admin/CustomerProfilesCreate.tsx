import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { 
    UserCheck, 
    ArrowLeft, 
    ShieldCheck, 
    AlertCircle, 
    CheckCircle2 
} from 'lucide-react';

export enum Gender {
    Male = 'Male',
    Female = 'Female',
    Other = 'Other'
}

export default function CustomerProfilesCreate() {
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [availableUsers, setAvailableUsers] = useState<any[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [currentUser, setCurrentUser] = useState<any | null>(null);

    const [formData, setFormData] = useState({
        nationalIdNumber: '',
        dateOfBirth: '',
        gender: Gender.Male,
        emergencyContactPhone: '',
        preferredLanguageCode: 'bn',
    });

    useEffect(() => {
        const fetchPrerequisites = async () => {
            setLoadingUsers(true);
            try {
                // ১. বর্তমান লগইন ইউজার এবং রোল ডিটেক্ট করা
                let profileInfo = null;
                try {
                    const meRes = await api.get('api/Auth/Me').catch(() => api.get('api/Account/Profile'));
                    profileInfo = meRes.data;
                    setCurrentUser(profileInfo);
                } catch {
                    // Public/Admin session fallback
                }

                // ২. বিদ্যমান প্রোফাইল ও ইউজার লিস্ট আনা যাতে 409 Conflict না হয়
                const [usersRes, profilesRes] = await Promise.all([
                    api.get('api/Users').catch(() => api.get('api/Admin/Users')).catch(() => ({ data: [] })),
                    api.get('api/CustomerProfiles').catch(() => ({ data: [] }))
                ]);

                const existingProfileUserIds = new Set((profilesRes.data || []).map((p: any) => p.userId));
                
                // শুধুমাত্র সেই ইউজারদেরই সিলেক্ট করতে দেওয়া হবে যাদের কোনো প্রোফাইল এখনও তৈরি হয়নি
                const freeUsers = (usersRes.data || []).filter((u: any) => !existingProfileUserIds.has(u.id));
                setAvailableUsers(freeUsers);

                if (freeUsers.length > 0) {
                    setSelectedUserId(freeUsers[0].id);
                }
            } catch (err) {
                console.error(err);
                toast.error('Could not load user list');
            } finally {
                setLoadingUsers(false);
            }
        };

        fetchPrerequisites();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (availableUsers.length === 0 && !selectedUserId) {
            toast.error('No eligible user available without a profile. Please create a User first.');
            return;
        }

        setSubmitting(true);
        try {
            // C# DTO অনুযায়ী হুবহু পেলোড
            const payload = {
                userId: selectedUserId, // C# কন্ট্রোলারে Admin/Staff এর জন্য targetUserId হিসেবে যাবে
                nationalIdNumber: formData.nationalIdNumber?.trim() || null,
                dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString() : null,
                gender: formData.gender,
                emergencyContactPhone: formData.emergencyContactPhone?.trim() || null,
                preferredLanguageCode: formData.preferredLanguageCode?.trim() || 'bn',
            };

            await api.post('api/CustomerProfiles', payload);
            toast.success('Customer Profile successfully created!');
            navigate('/admin/customer-profiles');
        } catch (err: any) {
            if (err.response?.status === 409) {
                toast.error('Conflict: This user already has a CustomerProfile attached!');
            } else if (err.response?.status === 401) {
                toast.error('Unauthorized! Please log in with an Admin/Staff account.');
            } else {
                toast.error(err.response?.data?.message || 'Failed to create customer profile');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
            <div className="flex justify-between items-center bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3">
                    <span className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                        <UserCheck className="w-5 h-5" />
                    </span>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">Create Customer Profile</h1>
                        <p className="text-xs text-slate-500">Attach a one-to-one customer profile anchor to an account.</p>
                    </div>
                </div>
                <button 
                    type="button" 
                    onClick={() => navigate('/admin/customer-profiles')}
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to List
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* User Ownership Anchor Section */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                        <ShieldCheck className="w-4 h-4 text-blue-600" />
                        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                            1. Select User Login Account (1:1 Invariant)
                        </h2>
                    </div>

                    {loadingUsers ? (
                        <div className="py-4 text-xs text-slate-500">Validating available users...</div>
                    ) : availableUsers.length === 0 ? (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="text-xs text-amber-800">
                                <p className="font-semibold">All existing users already have an attached CustomerProfile!</p>
                                <p className="mt-0.5">As per backend policy, only one profile is allowed per user. Please register a new user in the system first.</p>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Select User Account *
                            </label>
                            <select
                                value={selectedUserId}
                                onChange={e => setSelectedUserId(e.target.value)}
                                required
                                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            >
                                {availableUsers.map(u => (
                                    <option key={u.id} value={u.id}>
                                        {u.fullName || u.userName} ({u.email || u.phone}) - ID: {u.id.substring(0, 8)}...
                                    </option>
                                ))}
                            </select>
                            <p className="text-[11px] text-slate-400 mt-1 font-mono">
                                Selected Anchor GUID: {selectedUserId}
                            </p>
                        </div>
                    )}
                </div>

                {/* Profile Demographics Section */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-3">
                        2. Customer Demographics
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">National ID (NID)</label>
                            <input 
                                type="text"
                                maxLength={30}
                                placeholder="e.g. 19882348234"
                                value={formData.nationalIdNumber}
                                onChange={e => setFormData({ ...formData, nationalIdNumber: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500"
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
                                placeholder="017xxxxxxxx"
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
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <button 
                        type="button" 
                        onClick={() => navigate('/admin/customer-profiles')}
                        className="px-5 py-2 text-sm font-medium bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        disabled={submitting || availableUsers.length === 0}
                        className="px-6 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                        {submitting ? 'Creating Profile...' : 'Save Customer Profile'}
                    </button>
                </div>
            </form>
        </div>
    );
}