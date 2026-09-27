// useCommissionRules — list state: fetch/refresh, search, group-by, pagination.
// Backend GetAll has no query params (Admin-only, returns full set), so search/group/paginate
// run client-side here. Swap to server params later if the endpoint grows them.
import { useCallback, useEffect, useMemo, useState } from 'react';
import commissionRuleService from '@/services/commissionRuleService';
import {
  CommissionRule,
  CommissionTypeLabel,
  SaleChannelLabel,
} from '@/types/commissionRule.types';

export type GroupByField = 'none' | 'busOperatorId' | 'saleChannel' | 'commissionType' | 'isActive';

const PAGE_SIZE_DEFAULT = 10;

export function useCommissionRules() {
  const [items, setItems] = useState<CommissionRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [groupBy, setGroupBy] = useState<GroupByField>('none');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await commissionRuleService.getAll();
      setItems(data);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to load commission rules.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.trim().toLowerCase();
    return items.filter((x) =>
      [
        x.busOperatorId,
        x.operatorContractId ?? '',
        x.busRouteId ?? '',
        CommissionTypeLabel[x.commissionType],
        SaleChannelLabel[x.saleChannel],
        String(x.commissionValue),
        x.effectiveFrom,
        x.effectiveTo ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [items, search]);

  const grouped = useMemo(() => {
    if (groupBy === 'none') return { '': filtered };
    const groups: Record<string, CommissionRule[]> = {};
    for (const item of filtered) {
      let key: string;
      switch (groupBy) {
        case 'saleChannel':
          key = SaleChannelLabel[item.saleChannel];
          break;
        case 'commissionType':
          key = CommissionTypeLabel[item.commissionType];
          break;
        case 'isActive':
          key = item.isActive ? 'Active' : 'Inactive';
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

  // Reset to page 1 whenever the filtered set shrinks under the current page.
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [totalPages, page]);

  return {
    items,
    filtered,
    grouped,
    paged,
    loading,
    error,
    refresh,
    search,
    setSearch,
    groupBy,
    setGroupBy,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    totalCount: filtered.length,
  };
}

export default useCommissionRules;
