// src/pages/admin/ScheduleList.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { scheduleApi } from "@/services/scheduleApi";
import { ScheduleResponseDto, DAY_OPTIONS, DayOfWeekFlag } from "@/types/schedule.types";

function formatDays(mask: DayOfWeekFlag): string {
  if (mask === DayOfWeekFlag.Everyday) return "Everyday";
  const active = DAY_OPTIONS.filter((d) => (mask & d.value) === d.value);
  return active.length ? active.map((d) => d.label).join(", ") : "None";
}

export default function ScheduleList() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ScheduleResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await scheduleApi.getAll();
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load schedules.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this schedule? This cannot be undone from here.")) return;
    setDeletingId(id);
    try {
      await scheduleApi.remove(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Schedules</h1>
        <button
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          onClick={() => navigate("/admin/schedules/create")}
        >
          + New Schedule
        </button>
      </div>

      {loading && <p>Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto border rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-2">Code</th>
                <th className="text-left p-2">Departure</th>
                <th className="text-left p-2">Arrival</th>
                <th className="text-left p-2">Days</th>
                <th className="text-left p-2">Effective From</th>
                <th className="text-left p-2">Effective To</th>
                <th className="text-left p-2">Base Fare</th>
                <th className="text-left p-2">Active</th>
                <th className="text-right p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td className="p-4 text-gray-500" colSpan={9}>
                    No schedules found.
                  </td>
                </tr>
              )}
              {items.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="p-2">{s.scheduleCode}</td>
                  <td className="p-2">{s.departureTimeOfDay}</td>
                  <td className="p-2">{s.arrivalTimeOfDay ?? "—"}</td>
                  <td className="p-2">{formatDays(s.operatingDays)}</td>
                  <td className="p-2">{s.effectiveFrom}</td>
                  <td className="p-2">{s.effectiveTo ?? "—"}</td>
                  <td className="p-2">
                    {s.baseFare.toFixed(2)} {s.currency}
                  </td>
                  <td className="p-2">{s.isActive ? "Yes" : "No"}</td>
                  <td className="p-2 text-right space-x-2">
                    <button
                      className="text-blue-600 hover:underline"
                      onClick={() => navigate(`/admin/schedules/${s.id}`)}
                    >
                      View
                    </button>
                    <button
                      className="text-amber-600 hover:underline"
                      onClick={() => navigate(`/admin/schedules/${s.id}/edit`)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-red-600 hover:underline disabled:opacity-50"
                      disabled={deletingId === s.id}
                      onClick={() => handleDelete(s.id)}
                    >
                      {deletingId === s.id ? "Deleting…" : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
