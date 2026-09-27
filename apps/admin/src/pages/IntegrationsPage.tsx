import { Fragment, useEffect, useMemo, useState } from 'react';
import type {
  ApiError,
  BusOperator,
  IntegrationSyncLog,
  OperatorIntegration,
  TestConnectionResult,
} from '@ticketportal-mono/models';
import { apiFetch } from '../lib/apiClient';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatusPill } from '../components/StatusPill';

const RECENT_LOGS_PER_INTEGRATION = 8;

// Chunk 8 task 9 — Backend: OperatorIntegrationsController (GET/test-connection),
// IntegrationSyncLogsController (GET, read-only), BusOperatorsController (for operator
// names/inventory-mode badges). Both integration endpoints and the sync-log list are
// Admin-only server-side (Permissions.IntegrationsManage / IsPlatformStaffOrAdminAsync) — this
// whole page is the Admin-facing dashboard; the operator-manager-facing redacted equivalent is
// OperatorIntegrationsController.GetStatus (Permissions.IntegrationsRead), not built as a
// separate screen here since no operator-facing app in this codebase has a natural home for it
// yet.
//
// This replaces the generic-CRUD landing page that used to sit here (see git history) — record-
// level editing (BaseUrl, auth type, rotating the secret) is intentionally left to the console's
// generic CRUD (linked at the bottom) rather than rebuilt here twice; this page is the
// monitoring/health surface the plan asked for: mode badge, last sync, recent failures, a log
// table, and a "Test connection" button.
export function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<OperatorIntegration[]>([]);
  const [operators, setOperators] = useState<BusOperator[]>([]);
  const [logs, setLogs] = useState<IntegrationSyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestConnectionResult | { success: false; message: string }>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    setLoadError(null);
    try {
      const [integrationList, operatorList, logList] = await Promise.all([
        apiFetch<OperatorIntegration[]>('operatorintegrations'),
        apiFetch<BusOperator[]>('busoperators'),
        apiFetch<IntegrationSyncLog[]>('integrationsynclogs'),
      ]);
      setIntegrations(integrationList);
      setOperators(operatorList);
      setLogs(logList);
    } catch (err) {
      setLoadError((err as ApiError).message ?? 'Could not load integrations.');
    } finally {
      setLoading(false);
    }
  }

  const operatorsById = useMemo(() => {
    const map = new Map<string, BusOperator>();
    for (const op of operators) map.set(op.id, op);
    return map;
  }, [operators]);

  const logsByIntegration = useMemo(() => {
    const map = new Map<string, IntegrationSyncLog[]>();
    for (const log of logs) {
      const list = map.get(log.operatorIntegrationId) ?? [];
      list.push(log);
      map.set(log.operatorIntegrationId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(b.startedAtUtc).getTime() - new Date(a.startedAtUtc).getTime());
    }
    return map;
  }, [logs]);

  function recentFailureCount(integrationId: string): number {
    const since = Date.now() - 24 * 60 * 60 * 1000;
    return (logsByIntegration.get(integrationId) ?? []).filter(
      (l) => l.status === 'Failed' && new Date(l.startedAtUtc).getTime() >= since,
    ).length;
  }

  async function handleTestConnection(integrationId: string) {
    setTestingId(integrationId);
    try {
      const result = await apiFetch<TestConnectionResult>(`operatorintegrations/${integrationId}/test-connection`, {
        method: 'POST',
      });
      setTestResults((prev) => ({ ...prev, [integrationId]: result }));
      // The test itself wrote a new IntegrationSyncLog row server-side — refresh so it shows up
      // in this integration's log table immediately instead of only after the next page load.
      const logList = await apiFetch<IntegrationSyncLog[]>('integrationsynclogs');
      setLogs(logList);
    } catch (err) {
      const message = (err as ApiError).message ?? 'Could not reach the operator.';
      setTestResults((prev) => ({ ...prev, [integrationId]: { success: false, message } }));
    } finally {
      setTestingId(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Operator Integrations</h2>
          <p className="tp-muted">
            Every operator whose inventory is managed outside TicketPortal (ExternalApiManaged or
            Hybrid — see the Bus Operators page) connects here. Health, recent activity, and a
            manual connectivity check for each one.
          </p>
        </div>
      </div>

      <Card>
        {loading ? (
          <p className="tp-muted">Loading integrations…</p>
        ) : loadError ? (
          <p className="error">{loadError}</p>
        ) : integrations.length === 0 ? (
          <p className="tp-muted">
            No operator integrations configured yet. Add one from the console (link below) once
            an ExternalApiManaged or Hybrid operator needs one.
          </p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Operator</th>
                <th>Integration</th>
                <th>Mode</th>
                <th>Status</th>
                <th>Last successful sync</th>
                <th>Failures (24h)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {integrations.map((integration) => {
                const operator = operatorsById.get(integration.busOperatorId);
                const failures = recentFailureCount(integration.id);
                const isExpanded = expandedId === integration.id;
                const testResult = testResults[integration.id];
                const integrationLogs = (logsByIntegration.get(integration.id) ?? []).slice(0, RECENT_LOGS_PER_INTEGRATION);

                return (
                  <Fragment key={integration.id}>
                    <tr>
                      <td>
                        <div className="data-table__primary">{operator?.name ?? '—'}</div>
                        {operator && <div className="tp-muted data-table__secondary">{operator.city}</div>}
                      </td>
                      <td>
                        <div className="data-table__primary">{integration.name}</div>
                        <div className="tp-muted data-table__secondary">
                          {integration.baseUrl} · {integration.authType}
                          {integration.hasSecret && integration.secretReferenceMasked
                            ? ` · ${integration.secretReferenceMasked}`
                            : ''}
                        </div>
                      </td>
                      <td>{operator ? <StatusPill status={operator.inventoryMode} /> : '—'}</td>
                      <td>
                        <StatusPill status={integration.isActive ? 'Active' : 'Cancelled'} />
                      </td>
                      <td className="tp-muted">
                        {integration.lastSuccessfulSyncAtUtc
                          ? new Date(integration.lastSuccessfulSyncAtUtc).toLocaleString()
                          : 'Never'}
                      </td>
                      <td>
                        {failures > 0 ? (
                          <span className="error">{failures}</span>
                        ) : (
                          <span className="tp-muted">0</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={testingId === integration.id}
                            onClick={() => handleTestConnection(integration.id)}
                          >
                            {testingId === integration.id ? 'Testing…' : 'Test connection'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setExpandedId(isExpanded ? null : integration.id)}
                          >
                            {isExpanded ? 'Hide log' : 'View log'}
                          </Button>
                        </div>
                        {testResult && (
                          <div className={testResult.success ? 'success' : 'error'} style={{ marginTop: '0.35rem', fontSize: '0.85rem' }}>
                            {testResult.message}
                            {'durationMs' in testResult ? ` (${testResult.durationMs}ms)` : ''}
                          </div>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={7}>
                          {integrationLogs.length === 0 ? (
                            <p className="tp-muted">No sync attempts recorded yet.</p>
                          ) : (
                            <table className="data-table data-table--nested">
                              <thead>
                                <tr>
                                  <th>Started</th>
                                  <th>Operation</th>
                                  <th>Entity</th>
                                  <th>Status</th>
                                  <th>Error</th>
                                </tr>
                              </thead>
                              <tbody>
                                {integrationLogs.map((log) => (
                                  <tr key={log.id}>
                                    <td className="tp-muted">{new Date(log.startedAtUtc).toLocaleString()}</td>
                                    <td>{log.operation}</td>
                                    <td className="tp-muted">
                                      {log.entityName}
                                      {log.entityKey ? ` #${log.entityKey.slice(0, 8)}` : ''}
                                    </td>
                                    <td>
                                      <StatusPill status={log.status} />
                                    </td>
                                    <td className="tp-muted">{log.errorMessage ?? '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <p className="tp-muted" style={{ marginTop: '1rem' }}>
        Need to add a new integration, change a BaseUrl, or rotate a secret?{' '}
        <a href="/admin/resource/OperatorIntegrations">Manage integration records in the console →</a>
      </p>
    </div>
  );
}
