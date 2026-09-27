import { ConsoleShortcuts } from '../components/ConsoleShortcuts';

// Backend: ActivityLogsController, AuditLogsController, LoginHistoriesController, NotificationLogsController.
export function AuditLogsPage() {
  return (
    <ConsoleShortcuts
      title="Audit & Activity Logs"
      message="Who did what and when, sign-in history, and notification delivery."
      links={[
        { label: 'Audit logs', resource: 'AuditLogs' },
        { label: 'Activity logs', resource: 'ActivityLogs' },
        { label: 'Login history', hint: 'Successful and failed sign-ins', resource: 'LoginHistories' },
        { label: 'Notification logs', resource: 'NotificationLogs' },
      ]}
    />
  );
}
