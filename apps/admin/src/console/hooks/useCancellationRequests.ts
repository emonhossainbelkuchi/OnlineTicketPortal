// useCancellationRequests.ts
// Shared list hook: live polling (4s), toast + highlight on newly-appeared
// Requested items, search, status filter, and client-side pagination. Used
// by CancellationRequestsList.tsx.
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  startCancellationRequestsPolling,
  subscribeToCancellationRequests,
} from '@/services/cancellationRequestService';
import type { CancellationRequestDisplayDto } from '@/types/cancellationRequest.types';

const PAGE_SIZE = 10;
const NEW_ROW_HIGHLIGHT_MS = 6000;

export function useCancellationRequests() {
  const [items, setItems] = useState<CancellationRequestDisplayDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  const knownIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    const stopPolling = startCancellationRequestsPolling((data) => {
      const currentIds = new Set(data.map((i) => i.id));

      if (knownIdsRef.current) {
        const fresh = data.filter((i) => i.status === 'Requested' && !knownIdsRef.current!.has(i.id));
        if (fresh.length > 0) {
          fresh.forEach((i) =>
            toast(`New cancellation request on ${i.bookingLabel}`, { icon: '📩', duration: 4500 })
          );
          setNewIds((prev) => {
            const next = new Set(prev);
            fresh.forEach((i) => next.add(i.id));
            return next;
          });
          fresh.forEach((i) => {
            window.setTimeout(() => {
              setNewIds((prev) => {
                const next = new Set(prev);
                next.delete(i.id);
                return next;
              });
            }, NEW_ROW_HIGHLIGHT_MS);
          });
        }
      }

      knownIdsRef.current = currentIds;
      setItems(data);
      setLoading(false);
      setError(null);
    }, 4000);

    const unsubscribe = subscribeToCancellationRequests(() => {});

    return () => {
      stopPolling();
      unsubscribe();
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      const matchesStatus = statusFilter === 'All' || i.status === statusFilter;
      const matchesSearch =
        !q ||
        i.bookingLabel.toLowerCase().includes(q) ||
        i.requestedByLabel.toLowerCase().includes(q) ||
        i.reason.toLowerCase().includes(q) ||
        i.status.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [items, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  return {
    loading,
    error,
    search,
    setSearch: (v: string) => {
      setSearch(v);
      setPage(1);
    },
    statusFilter,
    setStatusFilter: (v: string) => {
      setStatusFilter(v);
      setPage(1);
    },
    page,
    setPage,
    totalPages,
    pageItems,
    filteredCount: filtered.length,
    newIds,
    setItems, // exposed so the page can optimistically patch after an action
    pageSize: PAGE_SIZE,
  };
}
