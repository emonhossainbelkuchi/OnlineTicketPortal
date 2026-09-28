// "Realtime" = polling (no websocket/SignalR endpoint on this backend today).
// Swap the setInterval loop for a subscription later without touching consumers.
import { useCallback, useEffect, useMemo, useState } from 'react';
import operatorSettingService from '@/services/operatorSettingService';
import type { OperatorSetting } from '@/types/operatorSetting';
import type { BusOperator } from '@/lib/api';

const POLL_INTERVAL_MS = 15000;
const OPERATORS_POLL_INTERVAL_MS = 60000;

export type SortField = 'key' | 'busOperatorId' | 'updatedAtUtc';
export type SortDir = 'asc' | 'desc';

interface UseListOptions {
  live?: boolean;
  pageSize?: number;
}

export function useOperatorSettings(options: UseListOptions = {}) {
  const { live = true, pageSize = 10 } = options;

  const [items, setItems] = useState<OperatorSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('key');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    try {
      setError(null);
      setForbidden(false);
      const data = await operatorSettingService.getAll();
      setItems(data);
      setLastSyncedAt(new Date());
    } catch (e: any) {
      if (e?.response?.status === 403) setForbidden(true);
      else setError(e?.response?.data?.message ?? e?.message ?? 'Failed to load operator settings.');
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
  }, [search, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = items;
    if (q) {
      rows = rows.filter((x) =>
        [x.key, x.value, x.description ?? '', x.busOperatorId].join(' ').toLowerCase().includes(q)
      );
    }
    return [...rows].sort((a, b) => {
      let av: any = sortField === 'updatedAtUtc' ? (a.updatedAtUtc ?? a.createdAtUtc) : a[sortField];
      let bv: any = sortField === 'updatedAtUtc' ? (b.updatedAtUtc ?? b.createdAtUtc) : b[sortField];
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [items, search, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  return {
    items,
    filtered,
    paged,
    loading,
    error,
    forbidden,
    refresh: load,
    lastSyncedAt,
    search,
    setSearch,
    sortField,
    sortDir,
    toggleSort,
    page: currentPage,
    setPage,
    totalPages,
    totalCount: filtered.length,
  };
}

/** Single record for Details/Edit. */
export function useOperatorSetting(id: string | undefined, { live = true }: { live?: boolean } = {}) {
  const [item, setItem] = useState<OperatorSetting | null>(null);
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
      const data = await operatorSettingService.getById(id);
      setItem(data);
    } catch (e: any) {
      const s = e?.response?.status;
      if (s === 404) setNotFound(true);
      else if (s === 403) setForbidden(true);
      else setError(e?.response?.data?.message ?? e?.message ?? 'Failed to load operator setting.');
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

/** Dropdown data source for Create/Edit's BusOperatorId picker. */
export function useBusOperatorOptions({ live = true }: { live?: boolean } = {}) {
  const [operators, setOperators] = useState<BusOperator[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await operatorSettingService.getBusOperators();
      setOperators(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    if (!live) return;
    const id = setInterval(load, OPERATORS_POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [load, live]);

  return { operators, loading, refresh: load };
}

export default useOperatorSettings;
