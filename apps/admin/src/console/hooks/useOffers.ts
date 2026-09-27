// src/hooks/useOffers.ts
//
// Same family shape as usePlatformLedgers/useRefunds: one hook usable from
// ANY page/dropdown. "Realtime" = polling (no websocket endpoint exists on
// this backend today) — swap the interval loop for a subscription later
// without touching any consumer of these hooks.

import { useCallback, useEffect, useMemo, useState } from 'react';
import offerService, { getBusOperators } from '../services/offerService';
import {
  OfferStatus,
  type BusOperatorSummary,
  type OfferResponseDto,
} from '../types/offer.types';

const POLL_INTERVAL_MS = 15000;
const OPERATORS_POLL_INTERVAL_MS = 60000;

interface UseOffersOptions {
  live?: boolean;
  pageSize?: number;
}

export function useOffers(options: UseOffersOptions = {}) {
  const { live = true, pageSize = 10 } = options;

  const [all, setAll] = useState<OfferResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<OfferStatus | 'all'>('all');
  const [groupByStatus, setGroupByStatus] = useState(false);
  const [sortBy, setSortBy] = useState<
    'title' | 'startDateUtc' | 'endDateUtc' | 'status' | 'createdAtUtc'
  >('startDateUtc');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await offerService.getAll();
      setAll(data);
      setLastSyncedAt(new Date());
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Failed to load offers.');
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
  }, [search, status, groupByStatus, sortBy, sortDir]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = all.filter((o) => {
      const matchesSearch =
        !q || o.title.toLowerCase().includes(q) || (o.description ?? '').toLowerCase().includes(q);
      const matchesStatus = status === 'all' || o.status === status;
      return matchesSearch && matchesStatus;
    });

    rows = [...rows].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      const va = a[sortBy] ?? '';
      const vb = b[sortBy] ?? '';
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });

    return rows;
  }, [all, search, status, sortBy, sortDir]);

  const grouped = useMemo(() => {
    if (!groupByStatus) return null;
    const map = new Map<OfferStatus, OfferResponseDto[]>();
    for (const row of filtered) {
      const bucket = map.get(row.status) ?? [];
      bucket.push(row);
      map.set(row.status, bucket);
    }
    return Array.from(map.entries()).map(([s, rows]) => ({ status: s, rows }));
  }, [filtered, groupByStatus]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paged = useMemo(() => {
    if (groupByStatus) return filtered;
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize, groupByStatus]);

  const stats = useMemo(() => {
    const now = Date.now();
    const active = all.filter(
      (o) => o.status === OfferStatus.Active && new Date(o.endDateUtc).getTime() >= now
    ).length;
    const expired = all.filter((o) => o.status === OfferStatus.Expired).length;
    const disabled = all.filter((o) => o.status === OfferStatus.Disabled).length;
    return { total: all.length, active, expired, disabled };
  }, [all]);

  return {
    offers: paged,
    grouped,
    allCount: all.length,
    filteredCount: total,
    stats,
    loading,
    error,
    lastSyncedAt,
    refresh: load,
    search,
    setSearch,
    status,
    setStatus,
    groupByStatus,
    setGroupByStatus,
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

export function useOffer(id: string | undefined, { live = true }: { live?: boolean } = {}) {
  const [offer, setOffer] = useState<OfferResponseDto | null>(null);
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
      const data = await offerService.getById(id);
      setOffer(data);
    } catch (err: any) {
      const s = err?.response?.status;
      if (s === 404) setNotFound(true);
      else if (s === 403) setForbidden(true);
      else setError(err?.message ?? 'Failed to load offer.');
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

  return { offer, loading, error, notFound, forbidden, refresh: load };
}

/** Dropdown data source for Create/Edit's BusOperatorId field. */
export function useBusOperatorsForOffers({ live = true }: { live?: boolean } = {}) {
  const [operators, setOperators] = useState<BusOperatorSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await getBusOperators();
    setOperators(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    if (!live) return;
    const id = setInterval(load, OPERATORS_POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [load, live]);

  return { operators, loading, refresh: load };
}
