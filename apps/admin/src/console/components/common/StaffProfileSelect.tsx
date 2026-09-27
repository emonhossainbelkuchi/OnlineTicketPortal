import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';

// Real backend contract (StaffProfilesController, GetAll):
//   GET api/StaffProfiles [Authorize] -> StaffProfileResponseDto[]
//   Already scoped server-side the same way DriverLicensesController is — an operator's own
//   Staff/Operator only sees their own operator's staff; Admin/platform-Staff see everyone.
//   This dropdown trusts that scoping rather than re-filtering client-side.

const StaffRoleLabel: Record<number, string> = {
  1: 'Super Admin',
  2: 'Admin',
  3: 'Manager',
  4: 'Operator',
  5: 'Counter Staff',
  6: 'Bus Owner',
  7: 'Driver',
  8: 'Supervisor',
  9: 'Helper',
  10: 'Finance',
};

interface StaffProfileOption {
  id: string;
  employeeCode: string;
  role: number;
  isActive: boolean;
}

interface StaffProfileSelectProps {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  /** Only show Driver-role staff by default — set false to show everyone. */
  driversOnly?: boolean;
  className?: string;
}

export const StaffProfileSelect: React.FC<StaffProfileSelectProps> = ({
  value,
  onChange,
  disabled = false,
  driversOnly = true,
  className = '',
}) => {
  const [options, setOptions] = useState<StaffProfileOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get('api/StaffProfiles');
        if (!cancelled) {
          const data: StaffProfileOption[] = res.data || [];
          setOptions(data.filter((s) => s.isActive));
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Could not load staff list.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = driversOnly ? options.filter((s) => s.role === 7) : options;

  return (
    <div>
      <select
        className={`form-select form-select-sm ${className}`}
        value={value}
        disabled={disabled || loading}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled>
          {loading ? 'Loading staff...' : 'Select a staff member...'}
        </option>
        {filtered.map((s) => (
          <option key={s.id} value={s.id}>
            {s.employeeCode} — {StaffRoleLabel[s.role] ?? 'Unknown role'}
          </option>
        ))}
      </select>
      {error && <div className="text-danger small mt-1">{error}</div>}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-muted small mt-1">
          No {driversOnly ? 'drivers' : 'staff'} found for your operator.
        </div>
      )}
    </div>
  );
};

export default StaffProfileSelect;
