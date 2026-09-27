// useOperatorSettlements — list state: fetch/refresh, search, status filter, group-by,
// sort, pagination, and a "last synced" timestamp (mirrors the Operator Payouts screen).
import { useCallback, useEffect, useMemo, useState } from 'react';
import operatorSettlementService from '@/services/operatorSettlementService';
import {
  OperatorSettlement,
  SettlementStatus,
  SettlementStatusLabel,
  SettlementDirectionLabel,
} from '@/types/operatorSettlement.types';

export type GroupByField = 'none' | 'busOperatorId' | 'status' | 'direction';
export type SortField = 'settlementNo' | 'busOperatorId' | 'netAmount' | 'status' | 'createdAtUtc';
export type SortDir = 'asc' | 'desc';

const PAGE_SIZE_DEFAULT = 10;

export function useOperatorSettlements(busOperatorId?: string) {
  const [items, setItems] = useState<OperatorSettlement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SettlementStatus | 'all'>('all');
  const [groupBy, setGroupBy] = useState<GroupByField>('none');
  const [sortField, setSortField] = useState<SortField>('createdAtUtc');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await operatorSettlementService.getAll(busOperatorId);
      setItems(data);
      setLastSyncedAt(new Date());
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to load settlements.');
    } finally {
      setLoading(false);
    }
  }, [busOperatorId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const filtered = useMemo(() => {
    let list = items;
    if (statusFilter !== 'all') {
      list = list.filter((x) => x.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((x) =>
        [x.settlementNo, x.busOperatorId, SettlementStatusLabel[x.status], SettlementDirectionLabel[x.direction]]
          .join(' ')
          .toLowerCase()
          .includes(q)
      );
    }
    const sorted = [...list].sort((a, b) => {
      let av: any = a[sortField];
      let bv: any = b[sortField];
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [items, search, statusFilter, sortField, sortDir]);

  const grouped = useMemo(() => {
    if (groupBy === 'none') return { '': filtered };
    const groups: Record<string, OperatorSettlement[]> = {};
    for (const item of filtered) {
      let key: string;
      switch (groupBy) {
        case 'status':
          key = SettlementStatusLabel[item.status];
          break;
        case 'direction':
          key = SettlementDirectionLabel[item.direction];
          break;
        case 'busOperatorId':
        default:
          key = item.busOperatorId;
      }
      (groups[key] ??= []).push(item);
    }
    return groups;
  }, [filtered, groupBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages, page]);

  const stats = useMemo(() => {
    const draft = items.filter((x) => x.status === SettlementStatus.Draft).length;
    const approved = items.filter((x) => x.status === SettlementStatus.Approved).length;
    const paidNet = items
      .filter((x) => x.status === SettlementStatus.Paid)
      .reduce((sum, x) => sum + x.netAmount, 0);
    return { total: items.length, draft, approved, paidNet };
  }, [items]);

  return {
    items,
    filtered,
    grouped,
    paged,
    loading,
    error,
    refresh,
    lastSyncedAt,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    groupBy,
    setGroupBy,
    sortField,
    sortDir,
    toggleSort,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    totalCount: filtered.length,
    stats,
  };
}

export default useOperatorSettlements;
