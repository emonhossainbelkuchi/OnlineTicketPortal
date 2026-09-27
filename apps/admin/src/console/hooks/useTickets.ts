// src/hooks/useTickets.ts
//
// Reusable list hook for Tickets: fetch, client-side search + status filter +
// pagination, and "realtime" via polling (no websocket in this backend, so
// polling is the honest way to describe it — swap POLL_INTERVAL_MS or replace
// the interval with a SignalR/WebSocket push if one gets added later).
//
// Drop this hook into ANY page/dropdown that needs the ticket list —
// TicketsList.tsx, a booking's "tickets in this booking" panel, a dashboard
// widget, etc. — it always returns the same shape.

import { useCallback, useEffect, useMemo, useState } from 'react';
import ticketService from '../services/ticketService';
import type { TicketResponseDto, TicketStatus } from '../types/ticket.types';

const POLL_INTERVAL_MS = 15000; // 15s "realtime" refresh

interface UseTicketsOptions {
  /** Turn off the polling loop (e.g. inside a dropdown you only open once). */
  live?: boolean;
  pageSize?: number;
}

export function useTickets(options: UseTicketsOptions = {}) {
  const { live = true, pageSize = 10 } = options;

  const [all, setAll] = useState<TicketResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TicketStatus | 'all'>('all');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await ticketService.getAll();
      setAll(data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Failed to load tickets.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + polling for "realtime" updates.
  useEffect(() => {
    setLoading(true);
    load();
    if (!live) return;
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [load, live]);

  // Reset to page 1 whenever the filters change.
  useEffect(() => {
    setPage(1);
  }, [search, status]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((t) => {
      const matchesSearch =
        !q ||
        t.ticketNumber.toLowerCase().includes(q) ||
        t.seatNumberSnapshot.toLowerCase().includes(q) ||
        (t.externalTicketKey ?? '').toLowerCase().includes(q);
      const matchesStatus = status === 'all' || t.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [all, search, status]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paged = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  return {
    tickets: paged,
    allCount: all.length,
    filteredCount: total,
    loading,
    error,
    refresh: load,
    // filters
    search,
    setSearch,
    status,
    setStatus,
    // pagination
    page: currentPage,
    setPage,
    totalPages,
    pageSize,
  };
}

/**
 * Single-ticket variant for Details pages / edit-style drill-downs.
 * Also polls, so a status change (e.g. staff checks someone in from another
 * tab) shows up here without a manual refresh.
 */
export function useTicket(id: string | undefined, { live = true }: { live?: boolean } = {}) {
  const [ticket, setTicket] = useState<TicketResponseDto | null>(null);
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
      const data = await ticketService.getById(id);
      setTicket(data);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404) setNotFound(true);
      else if (status === 403) setForbidden(true);
      else setError(err?.message ?? 'Failed to load ticket.');
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

  return { ticket, loading, error, notFound, forbidden, refresh: load };
}
