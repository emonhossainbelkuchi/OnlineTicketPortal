// src/hooks/usePlatformLedgers.ts
//
// Same shape as useRefundHistories/usePaymentHistories: search, item-type
// filter, sale-channel filter, group-by-item-type, sort, pagination,
// realtime polling, plus stats cards — here the natural stats are total
// debit / total credit / net (credit - debit) / distinct operators, since
// this is a double-entry ledger rather than a status trail.

import { useCallback, useEffect, useMemo, useState } from 'react';
import platformLedgerService from '../services/platformLedgerService';
import { SaleChannel, StatementItemType, type PlatformLedgerResponseDto } from '../types/platformLedger.types';

const POLL_INTERVAL_MS = 15000;

interface UsePlatformLedgersOptions {
  live?: boolean;
  pageSize?: number;
  /** Optionally scope to one operator (platform Admin/Staff only — see service comment). */
  busOperatorId?: string;
}

export function usePlatformLedgers(options: UsePlatformLedgersOptions = {}) {
  const { live = true, pageSize = 10, busOperatorId } = options;

  const [all, setAll] = useState<PlatformLedgerResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const [search, setSearch] = useState('');
  const [itemType, setItemType] = useState<StatementItemType | 'all'>('all');
  const [saleChannel, setSaleChannel] = useState<SaleChannel | 'all'>('all');
  const [groupByItemType, setGroupByItemType] = useState(false);
  const [sortBy, setSortBy] = useState<'createdAtUtc' | 'debitAmount' | 'creditAmount' | 'itemType'>(
    'createdAtUtc'
  );
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await platformLedgerService.getAll(busOperatorId);
      setAll(data);
      setLastSyncedAt(new Date());
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Failed to load platform ledger.');
    } finally {
      setLoading(false);
    }
  }, [busOperatorId]);

  useEffect(() => {
    setLoading(true);
    load();
    if (!live) return;
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [load, live]);

  useEffect(() => {
    setPage(1);
  }, [search, itemType, saleChannel, groupByItemType, sortBy, sortDir]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = all.filter((l) => {
      const matchesSearch =
        !q ||
        l.ledgerNo.toLowerCase().includes(q) ||
        (l.referenceNo ?? '').toLowerCase().includes(q) ||
        (l.description ?? '').toLowerCase().includes(q) ||
        (l.bookingId ?? '').toLowerCase().includes(q) ||
        (l.paymentId ?? '').toLowerCase().includes(q) ||
        (l.refundId ?? '').toLowerCase().includes(q);
      const matchesType = itemType === 'all' || l.itemType === itemType;
      const matchesChannel = saleChannel === 'all' || l.saleChannel === saleChannel;
      return matchesSearch && matchesType && matchesChannel;
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
  }, [all, search, itemType, saleChannel, sortBy, sortDir]);

  const grouped = useMemo(() => {
    if (!groupByItemType) return null;
    const map = new Map<StatementItemType, PlatformLedgerResponseDto[]>();
    for (const row of filtered) {
      const bucket = map.get(row.itemType) ?? [];
      bucket.push(row);
      map.set(row.itemType, bucket);
    }
    return Array.from(map.entries()).map(([t, rows]) => ({
      itemType: t,
      rows,
      subtotalDebit: rows.reduce((s, r) => s + r.debitAmount, 0),
      subtotalCredit: rows.reduce((s, r) => s + r.creditAmount, 0),
    }));
  }, [filtered, groupByItemType]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paged = useMemo(() => {
    if (groupByItemType) return filtered;
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize, groupByItemType]);

  const stats = useMemo(() => {
    const totalDebit = all.reduce((s, l) => s + l.debitAmount, 0);
    const totalCredit = all.reduce((s, l) => s + l.creditAmount, 0);
    const net = totalCredit - totalDebit;
    const distinctOperators = new Set(all.map((l) => l.busOperatorId).filter(Boolean)).size;
    return { totalEntries: all.length, totalDebit, totalCredit, net, distinctOperators };
  }, [all]);

  return {
    entries: paged,
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
    itemType,
    setItemType,
    saleChannel,
    setSaleChannel,
    groupByItemType,
    setGroupByItemType,
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

export function usePlatformLedger(id: string | undefined, { live = true }: { live?: boolean } = {}) {
  const [item, setItem] = useState<PlatformLedgerResponseDto | null>(null);
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
      const data = await platformLedgerService.getById(id);
      setItem(data);
    } catch (err: any) {
      const s = err?.response?.status;
      if (s === 404) setNotFound(true);
      else if (s === 403) setForbidden(true);
      else setError(err?.message ?? 'Failed to load ledger entry.');
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
