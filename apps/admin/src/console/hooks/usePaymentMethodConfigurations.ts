// src/hooks/usePaymentMethodConfigurations.ts
//
// One hook family, usable from ANY page/dropdown that needs this data:
//   - usePaymentMethodConfigurations(): list w/ search, method filter, active
//     filter, group-by-method, sort, pagination, realtime polling.
//   - usePaymentMethodConfiguration(id): single record for Details/Edit.
//   - usePaymentProviders(): the dropdown source for Create/Edit's provider
//     picker — polls much slower since providers change rarely.
//
// "Realtime" = polling (no websocket/SignalR endpoint exists on this backend
// today). If one gets added later, swap the setInterval loop below for a
// subscription without touching any consumer of these hooks.

import { useCallback, useEffect, useMemo, useState } from 'react';
import paymentMethodConfigurationService, {
  getPaymentProviders,
} from '../services/paymentMethodConfigurationService';
import type {
  PaymentMethod,
  PaymentMethodConfigurationResponseDto,
  PaymentProviderSummary,
} from '../types/paymentMethodConfiguration.types';

const POLL_INTERVAL_MS = 15000;
const PROVIDERS_POLL_INTERVAL_MS = 60000;

interface UseListOptions {
  live?: boolean;
  pageSize?: number;
}

export function usePaymentMethodConfigurations(options: UseListOptions = {}) {
  const { live = true, pageSize = 10 } = options;

  const [all, setAll] = useState<PaymentMethodConfigurationResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const [search, setSearch] = useState('');
  const [method, setMethod] = useState<PaymentMethod | 'all'>('all');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [groupByMethod, setGroupByMethod] = useState(false);
  const [sortBy, setSortBy] = useState<
    'displayName' | 'method' | 'fixedFee' | 'percentageFee' | 'createdAtUtc'
  >('displayName');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    try {
      setError(null);
      setForbidden(false);
      const data = await paymentMethodConfigurationService.getAll();
      setAll(data);
    } catch (err: any) {
      if (err?.response?.status === 403) setForbidden(true);
      else setError(err?.response?.data?.message ?? err?.message ?? 'Failed to load payment methods.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load();
    if (!live) return;
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [load, live]);

  useEffect(() => {
    setPage(1);
  }, [search, method, status, groupByMethod, sortBy, sortDir]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = all.filter((c) => {
      const matchesSearch = !q || c.displayName.toLowerCase().includes(q);
      const matchesMethod = method === 'all' || c.method === method;
      const matchesStatus =
        status === 'all' || (status === 'active' ? c.isActive : !c.isActive);
      return matchesSearch && matchesMethod && matchesStatus;
    });

    rows = [...rows].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      const va = a[sortBy] ?? 0;
      const vb = b[sortBy] ?? 0;
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });

    return rows;
  }, [all, search, method, status, sortBy, sortDir]);

  const grouped = useMemo(() => {
    if (!groupByMethod) return null;
    const map = new Map<PaymentMethod, PaymentMethodConfigurationResponseDto[]>();
    for (const row of filtered) {
      const bucket = map.get(row.method) ?? [];
      bucket.push(row);
      map.set(row.method, bucket);
    }
    return Array.from(map.entries()).map(([m, rows]) => ({ method: m, rows }));
  }, [filtered, groupByMethod]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paged = useMemo(() => {
    if (groupByMethod) return filtered; // pagination doesn't apply to grouped view
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize, groupByMethod]);

  return {
    items: paged,
    grouped,
    allCount: all.length,
    filteredCount: total,
    loading,
    error,
    forbidden,
    refresh: load,
    search,
    setSearch,
    method,
    setMethod,
    status,
    setStatus,
    groupByMethod,
    setGroupByMethod,
    sortBy,
    setSortBy,
    sortDir,
    setSortDir,
    page: currentPage,
    setPage,
    totalPages,
    pageSize,
  };
}

export function usePaymentMethodConfiguration(
  id: string | undefined,
  { live = true }: { live?: boolean } = {}
) {
  const [item, setItem] = useState<PaymentMethodConfigurationResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      setNotFound(false);
      setForbidden(false);
      const data = await paymentMethodConfigurationService.getById(id);
      setItem(data);
    } catch (err: any) {
      const s = err?.response?.status;
      if (s === 404) setNotFound(true);
      else if (s === 403) setForbidden(true);
      else setError(err?.message ?? 'Failed to load payment method configuration.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    load();
    if (!live || !id) return;
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load, live, id]);

  return { item, loading, error, notFound, forbidden, refresh: load };
}

/** Dropdown data source for Create/Edit's PaymentProviderId field. */
export function usePaymentProviders({ live = true }: { live?: boolean } = {}) {
  const [providers, setProviders] = useState<PaymentProviderSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await getPaymentProviders();
    setProviders(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    if (!live) return;
    const id = setInterval(load, PROVIDERS_POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [load, live]);

  return { providers, loading, refresh: load };
}
