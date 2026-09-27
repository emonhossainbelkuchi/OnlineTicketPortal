// src/pages/admin/ScheduleEdit.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from 'react-router-dom';
import { scheduleApi } from "@/services/scheduleApi";
import ScheduleForm, { ScheduleFormValues } from "@/pages/admin/ScheduleForm";
import { ScheduleResponseDto } from "@/types/schedule.types";

function toFormValues(dto: ScheduleResponseDto): ScheduleFormValues {
  const { id, createdAtUtc, updatedAtUtc, rowVersion, ...rest } = dto;
  return rest;
}

export default function ScheduleEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [original, setOriginal] = useState<ScheduleResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await scheduleApi.getById(id);
        setOriginal(data);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Failed to load schedule.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleSubmit = async (values: ScheduleFormValues) => {
    if (!id || !original) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const updated = await scheduleApi.update(id, {
        ...values,
        rowVersion: original.rowVersion,
      });
      navigate(`/admin/schedules/${updated.id}`);
    } catch (e) {
      // 409 Conflict (stale RowVersion) surfaces here with the backend's message —
      // e.g. "This Schedule was changed by another request. Please GET the latest data and try again."
      setSubmitError(e instanceof Error ? e.message : "Failed to update schedule.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-6">Loading…</div>;
  if (loadError) return <div className="p-6 text-red-600">{loadError}</div>;
  if (!original) return <div className="p-6">Schedule not found.</div>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Edit Schedule: {original.scheduleCode}</h1>
      <ScheduleForm
        initialValues={toFormValues(original)}
        submitLabel="Save Changes"
        submitting={submitting}
        errorMessage={submitError}
        onSubmit={handleSubmit}
        onCancel={() => navigate(`/admin/schedules/${original.id}`)}
      />
    </div>
  );
}
