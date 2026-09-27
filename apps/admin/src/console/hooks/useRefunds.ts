// src/hooks/useRefunds.ts
//
// Same shape as the Payment Histories hook in the screenshot: search, status
// filter, group-by-status, sort, pagination, realtime polling, plus a small
// stats summary for the dashboard-style cards at the top of the list page.

import { useCallback, useEffect, useMemo, useState } from 'react';
import refundService from '../services/refundService';
import type { RefundResponseDto, RefundStatus } from '../types/refund.types';

const POLL_INTERVAL_MS = 15000;

interface UseRefundsOptions {
  live?: boolean;
  pageSize?: number;
}

export function useRefunds(options: UseRefundsOptions = {}) {
  const { live = true, pageSize = 10 } = options;

  const [all, setAll] = useState<RefundResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<RefundStatus | 'all'>('all');
  const [groupByStatus, setGroupByStatus] = useState(false);
  const [sortBy, setSortBy] = useState<'requestedAtUtc' | 'amount' | 'status' | 'refundedAtUtc'>(
    'requestedAtUtc'
  );
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await refundService.getAll();
      setAll(data);
      setLastSyncedAt(new Date());
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Failed to load refunds.');
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
    let rows = all.filter((r) => {
      const matchesSearch =
        !q ||
        r.id.toLowerCase().includes(q) ||
        r.paymentId.toLowerCase().includes(q) ||
        r.bookingId.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q) ||
        (r.gatewayRefundReference ?? '').toLowerCase().includes(q) ||
        (r.manualPayoutReference ?? '').toLowerCase().includes(q);
      const matchesStatus = status === 'all' || r.status === status;
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
    const map = new Map<RefundStatus, RefundResponseDto[]>();
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

  // Stats cards — mirrors the Payment Histories dashboard: total / succeeded
  // / failed-or-needs-attention / distinct bookings affected.
  const stats = useMemo(() => {
    const totalEvents = all.length;
    const succeeded = all.filter((r) => r.status === (4 as RefundStatus)).length; // Succeeded
    const needsAttention = all.filter((r) =>
      [5, 6, 8].includes(r.status as number) // Rejected, Failed, ReconciliationNeeded
    ).length;
    const distinctBookings = new Set(all.map((r) => r.bookingId)).size;
    return { totalEvents, succeeded, needsAttention, distinctBookings };
  }, [all]);

  return {
    refunds: paged,
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

export function useRefund(id: string | undefined, { live = true }: { live?: boolean } = {}) {
  const [refund, setRefund] = useState<RefundResponseDto | null>(null);
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
      const data = await refundService.getById(id);
      setRefund(data);
    } catch (err: any) {
      const s = err?.response?.status;
      if (s === 404) setNotFound(true);
      else if (s === 403) setForbidden(true);
      else setError(err?.message ?? 'Failed to load refund.');
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

  return { refund, loading, error, notFound, forbidden, refresh: load };
}
