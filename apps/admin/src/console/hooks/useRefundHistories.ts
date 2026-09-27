// src/hooks/useRefundHistories.ts
//
// Same shape as useRefunds/the Payment Histories hook: search, status
// filter, group-by-status, sort, pagination, realtime polling, plus stats
// cards (total events / succeeded / needs-attention / distinct refunds).

import { useCallback, useEffect, useMemo, useState } from 'react';
import refundHistoryService from '../services/refundHistoryService';
import { RefundStatus, type RefundHistoryResponseDto } from '../types/refundHistory.types';

const POLL_INTERVAL_MS = 15000;

interface UseRefundHistoriesOptions {
  live?: boolean;
  pageSize?: number;
}

export function useRefundHistories(options: UseRefundHistoriesOptions = {}) {
  const { live = true, pageSize = 10 } = options;

  const [all, setAll] = useState<RefundHistoryResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<RefundStatus | 'all'>('all');
  const [groupByStatus, setGroupByStatus] = useState(false);
  const [sortBy, setSortBy] = useState<'changedAtUtc' | 'status'>('changedAtUtc');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await refundHistoryService.getAll();
      setAll(data);
      setLastSyncedAt(new Date());
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Failed to load refund histories.');
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
    let rows = all.filter((h) => {
      const matchesSearch =
        !q ||
        h.id.toLowerCase().includes(q) ||
        h.refundId.toLowerCase().includes(q) ||
        (h.remarks ?? '').toLowerCase().includes(q);
      const matchesStatus = status === 'all' || h.status === status;
      return matchesSearch && matchesStatus;
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
  }, [all, search, status, sortBy, sortDir]);

  const grouped = useMemo(() => {
    if (!groupByStatus) return null;
    const map = new Map<RefundStatus, RefundHistoryResponseDto[]>();
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
    const totalEvents = all.length;
    const succeeded = all.filter((h) => h.status === RefundStatus.Succeeded).length;
    const needsAttention = all.filter((h) =>
      [RefundStatus.Rejected, RefundStatus.Failed, RefundStatus.ReconciliationNeeded].includes(
        h.status
      )
    ).length;
    const distinctRefunds = new Set(all.map((h) => h.refundId)).size;
    return { totalEvents, succeeded, needsAttention, distinctRefunds };
  }, [all]);

  return {
    histories: paged,
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

export function useRefundHistory(id: string | undefined, { live = true }: { live?: boolean } = {}) {
  const [item, setItem] = useState<RefundHistoryResponseDto | null>(null);
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
      const data = await refundHistoryService.getById(id);
      setItem(data);
    } catch (err: any) {
      const s = err?.response?.status;
      if (s === 404) setNotFound(true);
      else if (s === 403) setForbidden(true);
      else setError(err?.message ?? 'Failed to load refund history entry.');
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
