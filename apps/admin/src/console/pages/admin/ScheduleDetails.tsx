// src/pages/admin/ScheduleDetails.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from 'react-router-dom';
import { scheduleApi } from "@/services/scheduleApi";
import { ScheduleResponseDto, DAY_OPTIONS, DayOfWeekFlag } from "@/types/schedule.types";

function formatDays(mask: DayOfWeekFlag): string {
  if (mask === DayOfWeekFlag.Everyday) return "Everyday";
  const active = DAY_OPTIONS.filter((d) => (mask & d.value) === d.value);
  return active.length ? active.map((d) => d.label).join(", ") : "None";
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 py-2 border-b last:border-b-0">
      <div className="text-gray-500">{label}</div>
      <div className="col-span-2">{value}</div>
    </div>
  );
}

export default function ScheduleDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<ScheduleResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await scheduleApi.getById(id);
        setItem(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load schedule.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!item) return <div className="p-6">Schedule not found.</div>;

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Schedule: {item.scheduleCode}</h1>
        <div className="space-x-2">
          <button
            className="px-3 py-1.5 rounded bg-amber-500 text-white hover:bg-amber-600"
            onClick={() => navigate(`/admin/schedules/${item.id}/edit`)}
          >
            Edit
          </button>
          <button
            className="px-3 py-1.5 rounded border"
            onClick={() => navigate("/admin/schedules")}
          >
            Back to list
          </button>
        </div>
      </div>

      <div className="border rounded p-4 bg-white">
        <Row label="Schedule Code" value={item.scheduleCode} />
        <Row label="Bus Operator ID" value={item.busOperatorId} />
        <Row label="Bus Route ID" value={item.busRouteId} />
        <Row label="Operator Route ID" value={item.operatorRouteId ?? "—"} />
        <Row label="Bus ID" value={item.busId} />
        <Row label="Departure" value={item.departureTimeOfDay} />
        <Row label="Arrival" value={item.arrivalTimeOfDay ?? "—"} />
        <Row label="Operating Days" value={formatDays(item.operatingDays)} />
        <Row label="Effective From" value={item.effectiveFrom} />
        <Row label="Effective To" value={item.effectiveTo ?? "—"} />
        <Row label="Base Fare" value={`${item.baseFare.toFixed(2)} ${item.currency}`} />
        <Row label="Active" value={item.isActive ? "Yes" : "No"} />
        <Row label="Created (UTC)" value={item.createdAtUtc} />
        <Row label="Updated (UTC)" value={item.updatedAtUtc ?? "—"} />
      </div>
    </div>
  );
}
