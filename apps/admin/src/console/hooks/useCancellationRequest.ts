// useCancellationRequest.ts
// Shared single-item hook: live polling (4s) for one CancellationRequest by
// id, plus the Approve/Reject/Complete actions with toast feedback. Used by
// CancellationRequestsDetails.tsx (and reusable from CancellationRequestsList
// row actions if needed).
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  getCancellationRequestById,
  enrichCancellationRequests,
  approveCancellationRequest,
  rejectCancellationRequest,
  completeCancellationRequest,
  extractErrorMessage,
} from '@/services/cancellationRequestService';
import type { CancellationRequestDisplayDto } from '@/types/cancellationRequest.types';

export function useCancellationRequest(id: string | undefined) {
  const [item, setItem] = useState<CancellationRequestDisplayDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      try {
        const raw = await getCancellationRequestById(id!);
        if (!raw) {
          if (!cancelled) setError('Cancellation request not found.');
          return;
        }
        const [enriched] = await enrichCancellationRequests([raw]);
        if (!cancelled) {
          setItem(enriched);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(extractErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const handle = window.setInterval(load, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(handle);
    };
  }, [id]);

  async function approve(approvedRefundAmount?: number | null, remarks?: string | null) {
    if (!id) return;
    setBusy(true);
    try {
      const updated = await approveCancellationRequest(id, approvedRefundAmount, remarks);
      setItem((prev) => (prev ? { ...prev, ...updated } : prev));
      toast.success('Cancellation approved');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function reject(rejectedReason: string) {
    if (!id) return;
    setBusy(true);
    try {
      await rejectCancellationRequest(id, rejectedReason);
      setItem((prev) => (prev ? { ...prev, status: 'Rejected', rejectedReason } : prev));
      toast.success('Cancellation rejected');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function complete() {
    if (!id) return;
    setBusy(true);
    try {
      const updated = await completeCancellationRequest(id);
      setItem((prev) => (prev ? { ...prev, ...updated } : prev));
      toast.success('Cancellation completed');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return { item, loading, error, busy, approve, reject, complete };
}
