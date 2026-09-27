import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createTerminal, getCurrentUserRole, extractErrorMessage } from '@/services/terminalService';
import type { TerminalCreateDto } from '@/types/terminal.types';

const DIVISIONS = ['Dhaka', 'Chattogram', 'Rajshahi', 'Khulna', 'Barishal', 'Sylhet', 'Rangpur', 'Mymensingh'];

const initialForm: TerminalCreateDto = {
  name: '', code: '', city: '', district: '', division: '', country: 'Bangladesh',
  address: '', latitude: null, longitude: null, isActive: true,
};

export const TerminalsCreate: React.FC = () => {
  const navigate = useNavigate();
  const currentRole = getCurrentUserRole();
  const canWrite = currentRole === 'Admin';

  const [form, setForm] = useState<TerminalCreateDto>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof TerminalCreateDto>(key: K, value: TerminalCreateDto[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Name is required.';
    else if (form.name.length > 120) errs.name = 'Max 120 characters.';
    if (!form.code.trim()) errs.code = 'Code is required.';
    else if (form.code.length > 20) errs.code = 'Max 20 characters.';
    if (!form.city.trim()) errs.city = 'City is required.';
    if (!form.district.trim()) errs.district = 'District is required.';
    if (!form.division.trim()) errs.division = 'Division is required.';
    if (!form.country?.trim()) errs.country = 'Country is required.';
    if (!form.address.trim()) errs.address = 'Address is required.';
    else if (form.address.length > 250) errs.address = 'Max 250 characters.';
    if (form.latitude != null && (form.latitude < -90 || form.latitude > 90)) errs.latitude = 'Must be between -90 and 90.';
    if (form.longitude != null && (form.longitude < -180 || form.longitude > 180)) errs.longitude = 'Must be between -180 and 180.';
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    setError(null);
    try {
      const created = await createTerminal({
        ...form,
        code: form.code.trim().toUpperCase(),
        country: form.country?.trim() || 'Bangladesh',
      });
      navigate(`/admin/terminals/${created.id}`);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const mapPreviewUrl =
    form.latitude != null && form.longitude != null
      ? `https://www.google.com/maps?q=${form.latitude},${form.longitude}&output=embed`
      : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link to="/admin" className="hover:text-blue-600">Admin</Link>
            <span>/</span>
            <Link to="/admin/terminals" className="hover:text-blue-600">Terminals</Link>
            <span>/</span>
            <span className="text-slate-800 font-medium">Create</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-blue-500 text-white flex items-center justify-center shadow-sm">
              <i className="fa-solid fa-bus-simple text-sm" />
            </div>
            New Terminal
          </h1>
        </div>
        <Link to="/admin/terminals" className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium rounded-lg flex items-center gap-1.5 shadow-xs">
          <i className="fa-solid fa-arrow-left" /> <span>Back to Terminals</span>
        </Link>
      </div>

      {!canWrite && (
        <div className="alert alert-warning d-flex align-items-start gap-2 text-xs mb-0">
          <i className="fa-solid fa-triangle-exclamation mt-0.5" />
          <div>Only the Admin role can create Terminals. Currently simulating <strong>{currentRole}</strong>.</div>
        </div>
      )}

      {error && (
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
                className={`w-full text-xs px-3 py-2 bg-slate-50 border rounded-lg ${fieldErrors.name ? 'border-rose-400' : 'border-slate-200'}`} placeholder="e.g. Gabtoli Inter-district Bus Terminal" />
              {fieldErrors.name && <p className="text-[11px] text-rose-600">{fieldErrors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Code *</label>
              <input value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} maxLength={20}
                className={`w-full text-xs px-3 py-2 bg-slate-50 border rounded-lg font-mono uppercase ${fieldErrors.code ? 'border-rose-400' : 'border-slate-200'}`} placeholder="DHK-GBT" />
              {fieldErrors.code && <p className="text-[11px] text-rose-600">{fieldErrors.code}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">City *</label>
              <input value={form.city} onChange={(e) => set('city', e.target.value)}
                className={`w-full text-xs px-3 py-2 bg-slate-50 border rounded-lg ${fieldErrors.city ? 'border-rose-400' : 'border-slate-200'}`} placeholder="Dhaka" />
              {fieldErrors.city && <p className="text-[11px] text-rose-600">{fieldErrors.city}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">District *</label>
              <input value={form.district} onChange={(e) => set('district', e.target.value)}
                className={`w-full text-xs px-3 py-2 bg-slate-50 border rounded-lg ${fieldErrors.district ? 'border-rose-400' : 'border-slate-200'}`} placeholder="Dhaka" />
              {fieldErrors.district && <p className="text-[11px] text-rose-600">{fieldErrors.district}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Division *</label>
              <input list="division-suggestions" value={form.division} onChange={(e) => set('division', e.target.value)}
                className={`w-full text-xs px-3 py-2 bg-slate-50 border rounded-lg ${fieldErrors.division ? 'border-rose-400' : 'border-slate-200'}`} placeholder="Dhaka" />
              <datalist id="division-suggestions">{DIVISIONS.map((d) => <option key={d} value={d} />)}</datalist>
              {fieldErrors.division && <p className="text-[11px] text-rose-600">{fieldErrors.division}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Country *</label>
              <input value={form.country} onChange={(e) => set('country', e.target.value)}
                className={`w-full text-xs px-3 py-2 bg-slate-50 border rounded-lg ${fieldErrors.country ? 'border-rose-400' : 'border-slate-200'}`} />
              {fieldErrors.country && <p className="text-[11px] text-rose-600">{fieldErrors.country}</p>}
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Address *</label>
              <input value={form.address} onChange={(e) => set('address', e.target.value)} maxLength={250}
                className={`w-full text-xs px-3 py-2 bg-slate-50 border rounded-lg ${fieldErrors.address ? 'border-rose-400' : 'border-slate-200'}`} placeholder="Mirpur Road, Gabtoli, Dhaka-1216" />
              {fieldErrors.address && <p className="text-[11px] text-rose-600">{fieldErrors.address}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700"><i className="fa-solid fa-location-crosshairs text-slate-400 me-1" />Latitude</label>
              <input type="number" step="any" min={-90} max={90} value={form.latitude ?? ''}
                onChange={(e) => set('latitude', e.target.value ? Number(e.target.value) : null)}
                className={`w-full text-xs px-3 py-2 bg-slate-50 border rounded-lg ${fieldErrors.latitude ? 'border-rose-400' : 'border-slate-200'}`} placeholder="23.7828" />
              {fieldErrors.latitude && <p className="text-[11px] text-rose-600">{fieldErrors.latitude}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700"><i className="fa-solid fa-location-crosshairs text-slate-400 me-1" />Longitude</label>
              <input type="number" step="any" min={-180} max={180} value={form.longitude ?? ''}
                onChange={(e) => set('longitude', e.target.value ? Number(e.target.value) : null)}
                className={`w-full text-xs px-3 py-2 bg-slate-50 border rounded-lg ${fieldErrors.longitude ? 'border-rose-400' : 'border-slate-200'}`} placeholder="90.3456" />
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

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/80">
            <Link to="/admin/terminals" className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg">Cancel</Link>
            <button type="submit" disabled={submitting} className="px-5 py-2 bg-gradient-to-br from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm disabled:opacity-50">
              <i className={`fa-solid ${submitting ? 'fa-circle-notch fa-spin' : 'fa-floppy-disk'}`} />
              <span>{submitting ? 'Creating...' : 'Create Terminal'}</span>
            </button>
          </div>
        </form>
      </fieldset>
    </div>
  );
};

export default TerminalsCreate;
