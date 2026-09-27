// src/components/common/PaymentProviderSelect.tsx
//
// Dropdown source for PaymentMethodConfigurationCreate/Edit's PaymentProviderId
// field. Kept separate from PaymentMethodConfigurationSelect since it's a
// different entity (PaymentProvider, not PaymentMethodConfiguration) — reuse
// this anywhere else in the app that needs to pick a provider too.

import { usePaymentProviders } from '../../hooks/usePaymentMethodConfigurations';

interface PaymentProviderSelectProps {
  value: string | null | undefined;
  onChange: (id: string) => void;
  activeOnly?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export default function PaymentProviderSelect({
  value,
  onChange,
  activeOnly = true,
  disabled = false,
  className = '',
  placeholder = 'Select a payment provider...',
}: PaymentProviderSelectProps) {
  const { providers, loading } = usePaymentProviders();

  const options = providers.filter((p) => !activeOnly || p.isActive);

  return (
    <select
      className={`form-select ${className}`}
      value={value ?? ''}
      disabled={disabled || loading}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="" disabled>
        {loading ? 'Loading providers...' : placeholder}
      </option>
      {options.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name} ({p.code})
        </option>
      ))}
    </select>
  );
}
