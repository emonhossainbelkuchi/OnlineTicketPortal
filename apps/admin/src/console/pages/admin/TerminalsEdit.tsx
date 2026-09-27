import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getTerminalById, updateTerminal, deleteTerminal, getCurrentUserRole, extractErrorMessage } from '@/services/terminalService';
import type { TerminalCreateDto } from '@/types/terminal.types';

const DIVISIONS = ['Dhaka', 'Chattogram', 'Rajshahi', 'Khulna', 'Barishal', 'Sylhet', 'Rangpur', 'Mymensingh'];

export const TerminalsEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentRole = getCurrentUserRole();
  const canWrite = currentRole === 'Admin';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notFound, setNotFound] = useState(false);

  const [form, setForm] = useState<TerminalCreateDto>({
    name: '', code: '', city: '', district: '', division: '', country: 'Bangladesh',
    address: '', latitude: null, longitude: null, isActive: true,
  });
  const [rowVersion, setRowVersion] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const set = <K extends keyof TerminalCreateDto>(key: K, value: TerminalCreateDto[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setConflictError(false);
    setNotFound(false);
    try {
      const t = await getTerminalById(id);
      if (!t) { setNotFound(true); return; }
      setForm({
        name: t.name, code: t.code, city: t.city, district: t.district, division: t.division,
        country: t.country, address: t.address, latitude: t.latitude ?? null, longitude: t.longitude ?? null,
        isActive: t.isActive,
      });
      setRowVersion(t.rowVersion);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [id]);

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Name is required.';
    if (!form.code.trim()) errs.code = 'Code is required.';
    if (!form.city.trim()) errs.city = 'City is required.';
    if (!form.district.trim()) errs.district = 'District is required.';
    if (!form.division.trim()) errs.division = 'Division is required.';
    if (!form.address.trim()) errs.address = 'Address is required.';
    if (form.latitude != null && (form.latitude < -90 || form.latitude > 90)) errs.latitude = 'Must be between -90 and 90.';
    if (form.longitude != null && (form.longitude < -180 || form.longitude > 180)) errs.longitude = 'Must be between -180 and 180.';
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    setError(null);
    setConflictError(false);
    try {
      const updated = await updateTerminal(id, { ...form, rowVersion });
      navigate(`/admin/terminals/${updated.id}`);
    } catch (err) {
      const msg = extractErrorMessage(err);
      if (msg.toLowerCase().includes('changed by another') || msg.toLowerCase().includes('conflict')) {
        setConflictError(true);
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteTerminal(id);
      navigate('/admin/terminals');
    } catch (err) {
      alert(extractErrorMessage(err));
    }
  };

  const mapPreviewUrl =
    form.latitude != null && form.longitude != null
      ? `https://www.google.com/maps?q=${form.latitude},${form.longitude}&output=embed`
      : null;

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-slate-500">
        <i className="fa-solid fa-circle-notch fa-spin text-blue-600 mb-2 d-block" style={{ fontSize: 20 }} />
        Loading terminal for editing...
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto space-y-3">
        <div className="alert alert-danger text-xs">Terminal not found.</div>
        <Link to="/admin/terminals" className="text-xs text-blue-600">&larr; Back to Terminals</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link to="/admin" className="hover:text-blue-600">Admin</Link>
            <span>/</span>
            <Link to="/admin/terminals" className="hover:text-blue-600">Terminals</Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">{form.code}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <i className="fa-solid fa-bus-simple text-indigo-600" />
            Edit Terminal: {form.name}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/admin/terminals/${id}`} className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium rounded-lg flex items-center gap-1.5 shadow-xs">
            <i className="fa-solid fa-arrow-up-right-from-square" /> <span>View</span>
          </Link>
          <Link to="/admin/terminals" className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium rounded-lg flex items-center gap-1.5 shadow-xs">
            <i className="fa-solid fa-arrow-left" /> <span>Cancel</span>
          </Link>
        </div>
      </div>

      {conflictError && (
        <div className="alert alert-warning d-flex align-items-center justify-content-between gap-3 text-xs mb-0">
          <div className="d-flex align-items-start gap-2">
            <i className="fa-solid fa-triangle-exclamation mt-0.5" />
            <div><strong>409 Conflict:</strong> This Terminal was modified by another request. Reload to get the latest data.</div>
          </div>
          <button type="button" onClick={loadData} className="btn btn-sm btn-warning">Reload Latest</button>
        </div>
      )}

      {error && !conflictError && (
        <div className="alert alert-danger d-flex align-items-start gap-2 text-xs mb-0">
          <i className="fa-solid fa-circle-exclamation mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      <fieldset disabled={!canWrite}>
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-xs space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Terminal Name *</label>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} maxLength={120}
                className={`w-full text-xs px-3 py-2 bg-slate-50 border rounded-lg ${fieldErrors.name ? 'border-rose-400' : 'border-slate-200'}`} />
              {fieldErrors.name && <p className="text-[11px] text-rose-600">{fieldErrors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Code *</label>
              <input value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} maxLength={20}
                className={`w-full text-xs px-3 py-2 bg-slate-50 border rounded-lg font-mono uppercase ${fieldErrors.code ? 'border-rose-400' : 'border-slate-200'}`} />
              {fieldErrors.code && <p className="text-[11px] text-rose-600">{fieldErrors.code}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">City *</label>
              <input value={form.city} onChange={(e) => set('city', e.target.value)}
                className={`w-full text-xs px-3 py-2 bg-slate-50 border rounded-lg ${fieldErrors.city ? 'border-rose-400' : 'border-slate-200'}`} />
              {fieldErrors.city && <p className="text-[11px] text-rose-600">{fieldErrors.city}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">District *</label>
              <input value={form.district} onChange={(e) => set('district', e.target.value)}
                className={`w-full text-xs px-3 py-2 bg-slate-50 border rounded-lg ${fieldErrors.district ? 'border-rose-400' : 'border-slate-200'}`} />
              {fieldErrors.district && <p className="text-[11px] text-rose-600">{fieldErrors.district}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Division *</label>
              <input list="division-suggestions-edit" value={form.division} onChange={(e) => set('division', e.target.value)}
                className={`w-full text-xs px-3 py-2 bg-slate-50 border rounded-lg ${fieldErrors.division ? 'border-rose-400' : 'border-slate-200'}`} />
              <datalist id="division-suggestions-edit">{DIVISIONS.map((d) => <option key={d} value={d} />)}</datalist>
              {fieldErrors.division && <p className="text-[11px] text-rose-600">{fieldErrors.division}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Country *</label>
              <input value={form.country} onChange={(e) => set('country', e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg" />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Address *</label>
              <input value={form.address} onChange={(e) => set('address', e.target.value)} maxLength={250}
                className={`w-full text-xs px-3 py-2 bg-slate-50 border rounded-lg ${fieldErrors.address ? 'border-rose-400' : 'border-slate-200'}`} />
              {fieldErrors.address && <p className="text-[11px] text-rose-600">{fieldErrors.address}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Latitude</label>
              <input type="number" step="any" min={-90} max={90} value={form.latitude ?? ''}
                onChange={(e) => set('latitude', e.target.value ? Number(e.target.value) : null)}
                className={`w-full text-xs px-3 py-2 bg-slate-50 border rounded-lg ${fieldErrors.latitude ? 'border-rose-400' : 'border-slate-200'}`} />
              {fieldErrors.latitude && <p className="text-[11px] text-rose-600">{fieldErrors.latitude}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Longitude</label>
              <input type="number" step="any" min={-180} max={180} value={form.longitude ?? ''}
                onChange={(e) => set('longitude', e.target.value ? Number(e.target.value) : null)}
                className={`w-full text-xs px-3 py-2 bg-slate-50 border rounded-lg ${fieldErrors.longitude ? 'border-rose-400' : 'border-slate-200'}`} />
              {fieldErrors.longitude && <p className="text-[11px] text-rose-600">{fieldErrors.longitude}</p>}
            </div>
          </div>

          {mapPreviewUrl && (
            <div className="rounded-xl overflow-hidden border border-slate-200/80">
              <iframe title="map-preview" src={mapPreviewUrl} className="w-full" style={{ height: 220, border: 0 }} loading="lazy" />
            </div>
          )}

          <label className="inline-flex items-center gap-2 cursor-pointer pt-1">
            <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
            <span className="text-xs text-slate-800 font-medium">Active (selectable in Trip / Route dropdowns)</span>
          </label>

          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg text-[11px] text-slate-500 font-mono">
            RowVersion Token: <code className="text-indigo-700 font-bold">{rowVersion}</code>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200/80">
            <button type="button" onClick={() => setShowDeleteModal(true)} className="px-3.5 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold flex items-center gap-1.5">
              <i className="fa-solid fa-trash" /> <span>Delete Terminal</span>
            </button>
            <div className="flex items-center gap-2">
              <Link to="/admin/terminals" className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg">Cancel</Link>
              <button type="submit" disabled={submitting} className="px-5 py-2 bg-gradient-to-br from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 disabled:opacity-50">
                <i className={`fa-solid ${submitting ? 'fa-circle-notch fa-spin' : 'fa-floppy-disk'}`} />
                <span>{submitting ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </form>
      </fieldset>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Delete Terminal</h3>
            <p className="text-xs text-slate-600">Are you sure you want to delete <strong>{form.name}</strong>?</p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setShowDeleteModal(false)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="button" onClick={handleDelete} className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs">Confirm Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TerminalsEdit;
