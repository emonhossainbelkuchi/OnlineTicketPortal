import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { 
    Plus, 
    Search, 
    Filter, 
    User, 
    Trash2, 
    Edit, 
    Eye, 
    RotateCcw, 
    Copy, 
    Check, 
    Shield, 
    AlertCircle 
} from 'lucide-react';

export enum Gender {
    Male = 'Male',
    Female = 'Female',
    Other = 'Other',
    Unknown = 'Unknown'
}

export default function CustomerProfilesList() {
    const navigate = useNavigate();
    const [profiles, setProfiles] = useState<any[]>([]);
    const [users, setUsers] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState<boolean>(true);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [genderFilter, setGenderFilter] = useState<string>('ALL');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // C# GetAll: [HttpGet]
    // সাধারণ কাস্টমার হলে ব্যাকএন্ড শুধু তার নিজের প্রোফাইল ফিল্টার করে পাঠাবে,
    // আর Admin/Staff/Operator হলে সবার প্রোফাইল লিস্ট রিটার্ন করবে।
    const loadData = async () => {
        setLoading(true);
        try {
            const [profilesRes, usersRes] = await Promise.all([
                api.get('api/CustomerProfiles'),
                api.get('api/Users').catch(() => api.get('api/Admin/Users')).catch(() => ({ data: [] }))
            ]);

            setProfiles(profilesRes.data || []);

            const userMap: Record<string, any> = {};
            (usersRes.data || []).forEach((u: any) => {
                userMap[u.id] = u;
            });
            setUsers(userMap);
        } catch (err: any) {
            console.error('Error loading customer profiles:', err);
            if (err.response?.status === 401) {
                toast.error('Session expired. Please log in again.');
            } else {
                toast.error('Failed to load customer profiles');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        toast.success('GUID copied to clipboard');
        setTimeout(() => setCopiedId(null), 2000);
    };

    // C# Delete: [HttpDelete("{id}")]
    // ব্যাকএন্ডে এটি সফট ডিলিট করে (item.MarkDeleted())
    const handleDelete = async (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this customer profile?')) {
            try {
                await api.delete(`api/CustomerProfiles/${id}`);
                toast.success('Customer profile deleted successfully');
                loadData();
            } catch (err: any) {
                if (err.response?.status === 403) {
                    toast.error('Forbidden: You can only delete your own profile unless you are an Admin.');
                } else if (err.response?.status === 409) {
                    toast.error(err.response?.data?.message || 'Cannot delete: referenced by other records.');
                } else {
                    toast.error('Failed to delete customer profile');
                }
            }
        }
    };

    const filteredProfiles = profiles.filter(p => {
        const matchesGender = genderFilter === 'ALL' || p.gender === genderFilter;
        const user = users[p.userId];
        const s = searchTerm.toLowerCase();
        const matchesSearch = 
            !searchTerm ||
            p.id.toLowerCase().includes(s) ||
            p.userId.toLowerCase().includes(s) ||
            (p.nationalIdNumber && p.nationalIdNumber.toLowerCase().includes(s)) ||
            (p.emergencyContactPhone && p.emergencyContactPhone.toLowerCase().includes(s)) ||
            (user && (
                user.fullName?.toLowerCase().includes(s) || 
                user.userName?.toLowerCase().includes(s) || 
                user.email?.toLowerCase().includes(s)
            ));
        return matchesGender && matchesSearch;
    });

    return (
        <div className="space-y-6">
            {/* Top Bar / Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                        <span>Customer Profiles</span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                            {profiles.length} {profiles.length === 1 ? 'Profile' : 'Profiles'}
                        </span>
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Scoped Customer Profile directory with one-to-one user anchors and wallet invariants.
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={loadData}
                        className="px-3.5 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                        <RotateCcw className="w-3.5 h-3.5" /> Refresh
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/admin/customer-profiles/create')}
                        className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 shadow-sm transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Create Profile
                    </button>
                </div>
            </div>

            {/* Filter & Search Controls */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search by NID, Name, Email, Phone, or GUID..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <span className="text-xs text-slate-500 font-medium">Gender:</span>
                    <select
                        value={genderFilter}
                        onChange={e => setGenderFilter(e.target.value)}
                        className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        <option value="ALL">All Genders</option>
                        <option value={Gender.Male}>Male</option>
                        <option value={Gender.Female}>Female</option>
                        <option value={Gender.Other}>Other</option>
                    </select>
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-slate-500 text-sm font-medium">
                        Loading customer profiles...
                    </div>
                ) : filteredProfiles.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 text-sm">
                        {searchTerm || genderFilter !== 'ALL' 
                            ? 'No customer profiles match your filter criteria.' 
                            : 'No customer profiles found in database.'}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                                <tr>
                                    <th className="px-5 py-3">Customer Identity</th>
                                    <th className="px-5 py-3">User Anchor (GUID)</th>
                                    <th className="px-5 py-3">Demographics & NID</th>
                                    <th className="px-5 py-3">Protected Wallet</th>
                                    <th className="px-5 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredProfiles.map(profile => {
                                    const user = users[profile.userId];
                                    return (
                                        <tr key={profile.id} className="hover:bg-slate-50/75 transition-colors">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs uppercase">
                                                        {user?.fullName ? user.fullName.charAt(0) : 'C'}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-slate-900 leading-snug">
                                                            {user?.fullName || user?.userName || 'Customer User'}
                                                        </div>
                                                        <div className="text-xs text-slate-500">{user?.email || 'No email'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-mono text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                                        {profile.userId.substring(0, 8)}...{profile.userId.substring(profile.userId.length - 4)}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        title="Copy full UserId GUID"
                                                        onClick={() => copyToClipboard(profile.userId, profile.id)}
                                                        className="p-1 text-slate-400 hover:text-slate-600 rounded"
                                                    >
                                                        {copiedId === profile.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 font-medium">
                                                        {profile.gender}
                                                    </span>
                                                    <span className="text-xs text-slate-400 uppercase">
                                                        [{profile.preferredLanguageCode || 'bn'}]
                                                    </span>
                                                </div>
                                                {profile.nationalIdNumber && (
                                                    <div className="text-xs font-mono text-slate-600 mt-1">
                                                        NID: {profile.nationalIdNumber}
                                                    </div>
                                                )}
                                                {profile.emergencyContactPhone && (
                                                    <div className="text-[11px] text-slate-500 mt-0.5">
                                                        Phone: {profile.emergencyContactPhone}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="font-mono font-bold text-slate-900 text-sm">
                                                    ৳{Number(profile.walletBalance || 0).toFixed(2)} BDT
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-mono">Read-Only Anchor</div>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(`/admin/customer-profiles/${profile.id}`)}
                                                        className="px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition-colors"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" /> Details
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(`/admin/customer-profiles/edit/${profile.id}`)}
                                                        className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition-colors"
                                                    >
                                                        <Edit className="w-3.5 h-3.5" /> Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleDelete(profile.id, e)}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                        title="Soft Delete Profile"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}