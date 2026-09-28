// useOperatorContracts.ts
// Realtime list hook for OperatorContracts — search, pagination, live
// polling + cross-tab BroadcastChannel sync via operatorContractService.
// No localStorage/sessionStorage anywhere: state is plain React state that
// lives only in memory for this tab.

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  startOperatorContractsPolling,
  subscribeToOperatorContracts,
  getOperatorContractById,
  extractErrorMessage,
} from '@/services/operatorContractService';
import { GatewayFeeBearerLabel } from '@/types/operatorContract.types';
import type { OperatorContractDisplayDto, OperatorContractResponseDto } from '@/types/operatorContract.types';

const PAGE_SIZE_DEFAULT = 10;
const POLL_INTERVAL_MS = 8000;

export function useOperatorContracts() {
  const [items, setItems] = useState<OperatorContractDisplayDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const [search, setSearch] = useState('');
  const [operatorFilter, setOperatorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(PAGE_SIZE_DEFAULT);

  useEffect(() => {
    const stopPolling = startOperatorContractsPolling((data) => {
      setItems(data);
      setLoading(false);
      setError(null);
      setLastSyncedAt(new Date());
    }, POLL_INTERVAL_MS);

    const unsubscribe = subscribeToOperatorContracts(() => {
      /* next poll tick (max 8s away) picks up the change; kept for future push wiring */
    });

    return () => {
      stopPolling();
      unsubscribe();
    };
  }, []);

  const refresh = useCallback(() => {
    // Polling already ticks on an interval; this just nudges state so a
    // manual "Refresh" button feels instant instead of waiting for the timer.
    setLoading(true);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, operatorFilter, statusFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((c) => {
      const haystack = [
        c.contractNo,
        c.busOperatorName,
        GatewayFeeBearerLabel[c.gatewayFeeBearer],
        c.notes || '',
      ]
        .join(' ')
        .toLowerCase();
      const matchesSearch = !q || haystack.includes(q);
      const matchesOperator = operatorFilter === 'all' || c.busOperatorId === operatorFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' ? c.isActive : !c.isActive);
      return matchesSearch && matchesOperator && matchesStatus;
    });
  }, [items, search, operatorFilter, statusFilter]);

  const operatorOptions = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((c) => map.set(c.busOperatorId, c.busOperatorName));
    return Array.from(map.entries());
  }, [items]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paged = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const stats = useMemo(() => {
    const active = items.filter((c) => c.isActive).length;
    const expiringSoon = items.filter((c) => {
      if (!c.effectiveTo) return false;
      const daysLeft = (new Date(c.effectiveTo).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return daysLeft >= 0 && daysLeft <= 30;
    }).length;
    const distinctOperators = new Set(items.map((c) => c.busOperatorId)).size;
    return { total: items.length, active, inactive: items.length - active, expiringSoon, distinctOperators };
  }, [items]);

  return {
    items: paged,
    allCount: items.length,
    filteredCount: filtered.length,
    stats,
    operatorOptions,
    loading,
    error,
    lastSyncedAt,
    refresh,
    search,
    setSearch,
    operatorFilter,
    setOperatorFilter,
    statusFilter,
    setStatusFilter,
    page: currentPage,
    setPage,
    totalPages,
    pageSize,
  };
}

export function useOperatorContract(id: string | undefined) {
  const [item, setItem] = useState<OperatorContractResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      setNotFound(false);
      const data = await getOperatorContractById(id);
      setItem(data);
    } catch (err: any) {
      if (err?.response?.status === 404 || err?.status === 404) setNotFound(true);
      else setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Live-refresh a single record too, so an open Details tab reflects an
  // edit made from another tab/session without a manual reload.
  useEffect(() => {
    if (!id) return;
    const interval = window.setInterval(load, POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [id, load]);

  return { item, loading, error, notFound, refresh: load };
}

export default useOperatorContracts;
