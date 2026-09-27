// src/pages/admin/ScheduleCreate.tsx
import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import { scheduleApi } from "@/services/scheduleApi";
import ScheduleForm, { ScheduleFormValues } from "@/pages/admin/ScheduleForm";
import { DayOfWeekFlag } from "@/types/schedule.types";

const emptyValues: ScheduleFormValues = {
  busOperatorId: "",
  busRouteId: "",
  operatorRouteId: null,
  busId: "",
  scheduleCode: "",
  departureTimeOfDay: "",
  arrivalTimeOfDay: null,
  operatingDays: DayOfWeekFlag.Everyday,
  effectiveFrom: new Date().toISOString().slice(0, 10),
  effectiveTo: null,
  baseFare: 0,
  currency: "BDT",
  isActive: true,
};

export default function ScheduleCreate() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: ScheduleFormValues) => {
    setSubmitting(true);
    setError(null);
    try {
      const created = await scheduleApi.create(values);
      navigate(`/admin/schedules/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create schedule.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">New Schedule</h1>
      <ScheduleForm
        initialValues={emptyValues}
        submitLabel="Create Schedule"
        submitting={submitting}
        errorMessage={error}
        onSubmit={handleSubmit}
        onCancel={() => navigate("/admin/schedules")}
      />
    </div>
  );
}
