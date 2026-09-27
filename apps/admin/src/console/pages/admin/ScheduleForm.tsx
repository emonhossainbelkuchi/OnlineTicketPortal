// src/pages/admin/ScheduleForm.tsx
// Shared form used by ScheduleCreate.tsx and ScheduleEdit.tsx.
// Not a route itself — imported by both.
import React, { useEffect, useState } from "react";
import { pickerApi } from "@/services/scheduleApi";
import {
  ScheduleCreateDto,
  DayOfWeekFlag,
  DAY_OPTIONS,
  BusOperatorOption,
  BusOption,
  BusRouteOption,
  OperatorRouteOption,
} from "@/types/schedule.types";

export interface ScheduleFormValues extends ScheduleCreateDto {}

interface Props {
  initialValues: ScheduleFormValues;
  submitLabel: string;
  submitting: boolean;
  errorMessage?: string | null;
  // Scoped operator staff never choose BusOperatorId themselves — backend ignores/derives it.
  // Pass false to hide that picker for scoped users; true (default) shows it for Admin/Staff.
  showBusOperatorPicker?: boolean;
  onSubmit: (values: ScheduleFormValues) => void | Promise<void>;
  onCancel: () => void;
}

export default function ScheduleForm({
  initialValues,
  submitLabel,
  submitting,
  errorMessage,
  showBusOperatorPicker = true,
  onSubmit,
  onCancel,
}: Props) {
  const [values, setValues] = useState<ScheduleFormValues>(initialValues);
  const [busOperators, setBusOperators] = useState<BusOperatorOption[]>([]);
  const [buses, setBuses] = useState<BusOption[]>([]);
  const [busRoutes, setBusRoutes] = useState<BusRouteOption[]>([]);
  const [operatorRoutes, setOperatorRoutes] = useState<OperatorRouteOption[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setValues(initialValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues.busOperatorId, initialValues.scheduleCode]);

  useEffect(() => {
    (async () => {
      setLoadingLookups(true);
      try {
        const [ops, routes] = await Promise.all([
          showBusOperatorPicker ? pickerApi.getBusOperators() : Promise.resolve([]),
          pickerApi.getBusRoutes(),
        ]);
        setBusOperators(ops);
        setBusRoutes(routes);
      } catch {
        // Lookup failures shouldn't block the form; user can still type / retry.
      } finally {
        setLoadingLookups(false);
      }
    })();
  }, [showBusOperatorPicker]);

  // Reload buses + operator routes whenever the effective operator changes.
  useEffect(() => {
    const opId = values.busOperatorId;
    if (!opId) {
      setBuses([]);
      setOperatorRoutes([]);
      return;
    }
    (async () => {
      try {
        const [b, r] = await Promise.all([
          pickerApi.getBuses(opId),
          pickerApi.getOperatorRoutes(opId),
        ]);
        setBuses(b);
        setOperatorRoutes(r);
      } catch {
        // ignore lookup errors, keep form usable
      }
    })();
  }, [values.busOperatorId]);

  const toggleDay = (day: DayOfWeekFlag) => {
    setValues((prev) => ({
      ...prev,
      operatingDays: (prev.operatingDays ^ day) as DayOfWeekFlag,
    }));
  };

  const handleChange = <K extends keyof ScheduleFormValues>(
    key: K,
    value: ScheduleFormValues[K]
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const validate = (): string | null => {
    if (!values.scheduleCode.trim()) return "Schedule Code is required.";
    if (showBusOperatorPicker && !values.busOperatorId) return "Bus Operator is required.";
    if (!values.busRouteId) return "Bus Route is required.";
    if (!values.busId) return "Bus is required.";
    if (!values.departureTimeOfDay) return "Departure time is required.";
    if (values.baseFare < 0) return "Base Fare cannot be negative.";
    if (values.currency.trim().length !== 3) return "Currency must be a 3-letter code.";
    if (
      values.effectiveTo &&
      values.effectiveFrom &&
      values.effectiveTo < values.effectiveFrom
    ) {
      return "Effective To cannot be before Effective From.";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    setValidationError(err);
    if (err) return;
    await onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
      {(errorMessage || validationError) && (
        <div className="p-3 rounded bg-red-50 text-red-700 text-sm">
          {errorMessage || validationError}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Schedule Code</label>
        <input
          className="w-full border rounded px-3 py-2"
          maxLength={40}
          value={values.scheduleCode}
          onChange={(e) => handleChange("scheduleCode", e.target.value)}
          required
        />
      </div>

      {showBusOperatorPicker && (
        <div>
          <label className="block text-sm font-medium mb-1">Bus Operator</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={values.busOperatorId}
            onChange={(e) => {
              handleChange("busOperatorId", e.target.value);
              handleChange("busId", "");
              handleChange("operatorRouteId", null);
            }}
            required
          >
            <option value="">
              {loadingLookups ? "Loading…" : "Select operator"}
            </option>
            {busOperators.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Bus Route (platform route)</label>
        <select
          className="w-full border rounded px-3 py-2"
          value={values.busRouteId}
          onChange={(e) => handleChange("busRouteId", e.target.value)}
          required
        >
          <option value="">{loadingLookups ? "Loading…" : "Select route"}</option>
          {busRoutes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Operator Route <span className="text-gray-400">(optional)</span>
        </label>
        <select
          className="w-full border rounded px-3 py-2"
          value={values.operatorRouteId ?? ""}
          onChange={(e) => handleChange("operatorRouteId", e.target.value || null)}
        >
          <option value="">None</option>
          {operatorRoutes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Bus</label>
        <select
          className="w-full border rounded px-3 py-2"
          value={values.busId}
          onChange={(e) => handleChange("busId", e.target.value)}
          required
        >
          <option value="">Select bus</option>
          {buses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        {values.busOperatorId && buses.length === 0 && !loadingLookups && (
          <p className="text-xs text-gray-500 mt-1">
            No buses found for the selected operator.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Departure Time</label>
          <input
            type="time"
            step={1}
            className="w-full border rounded px-3 py-2"
            value={values.departureTimeOfDay?.slice(0, 8) ?? ""}
            onChange={(e) =>
              handleChange(
                "departureTimeOfDay",
                e.target.value.length === 5 ? `${e.target.value}:00` : e.target.value
              )
            }
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Arrival Time <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="time"
            step={1}
            className="w-full border rounded px-3 py-2"
            value={values.arrivalTimeOfDay?.slice(0, 8) ?? ""}
            onChange={(e) =>
              handleChange(
                "arrivalTimeOfDay",
                e.target.value
                  ? e.target.value.length === 5
                    ? `${e.target.value}:00`
                    : e.target.value
                  : null
              )
            }
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Operating Days</label>
        <div className="flex flex-wrap gap-3">
          {DAY_OPTIONS.map((d) => (
            <label key={d.value} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={(values.operatingDays & d.value) === d.value}
                onChange={() => toggleDay(d.value)}
              />
              {d.label}
            </label>
          ))}
          <button
            type="button"
            className="text-xs text-blue-600 hover:underline ml-2"
            onClick={() => handleChange("operatingDays", DayOfWeekFlag.Everyday)}
          >
            Select all
          </button>
          <button
            type="button"
            className="text-xs text-blue-600 hover:underline"
            onClick={() => handleChange("operatingDays", DayOfWeekFlag.None)}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Effective From</label>
          <input
            type="date"
            className="w-full border rounded px-3 py-2"
            value={values.effectiveFrom}
            onChange={(e) => handleChange("effectiveFrom", e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Effective To <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="date"
            className="w-full border rounded px-3 py-2"
            value={values.effectiveTo ?? ""}
            onChange={(e) => handleChange("effectiveTo", e.target.value || null)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Base Fare</label>
          <input
            type="number"
            min={0}
            step="0.01"
            className="w-full border rounded px-3 py-2"
            value={values.baseFare}
            onChange={(e) => handleChange("baseFare", parseFloat(e.target.value) || 0)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Currency</label>
          <input
            className="w-full border rounded px-3 py-2 uppercase"
            maxLength={3}
            value={values.currency}
            onChange={(e) => handleChange("currency", e.target.value.toUpperCase())}
            required
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={values.isActive}
          onChange={(e) => handleChange("isActive", e.target.checked)}
        />
        Active
      </label>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Saving…" : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded border"
          disabled={submitting}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
