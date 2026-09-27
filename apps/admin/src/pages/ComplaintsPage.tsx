import { ConsoleShortcuts } from '../components/ConsoleShortcuts';

export function ComplaintsPage() {
  return (
    <ConsoleShortcuts
      title="Complaints"
      message="Customer complaints, reviews and cancellation requests."
      links={[
        { label: 'Complaints', resource: 'Complaints' },
        { label: 'Reviews', resource: 'Reviews' },
        { label: 'Cancellation requests', resource: 'CancellationRequests' },
        { label: 'Refunds', resource: 'Refunds' },
      ]}
    />
  );
}
