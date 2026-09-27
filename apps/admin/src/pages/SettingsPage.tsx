import { ConsoleShortcuts } from '../components/ConsoleShortcuts';

export function SettingsPage() {
  return (
    <ConsoleShortcuts
      title="System Settings"
      message="Platform-wide configuration: settings, currencies, tax, payment providers and commission."
      links={[
        { label: 'System settings', resource: 'SystemSettings' },
        { label: 'Commission rules', hint: 'Online vs counter, by operator and date', resource: 'CommissionRules' },
        { label: 'Payment providers', resource: 'PaymentProviders' },
        { label: 'Payment methods', resource: 'PaymentMethodConfigurations' },
        { label: 'Tax rules', resource: 'TaxRules' },
        { label: 'Currencies', resource: 'Currencies' },
        { label: 'Languages', resource: 'Languages' },
        { label: 'Operator contracts', hint: 'Settlement interval, fee bearer', resource: 'OperatorContracts' },
      ]}
    />
  );
}
