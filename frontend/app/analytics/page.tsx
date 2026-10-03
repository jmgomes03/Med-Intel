"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import Navigation from "../components/Navigation";

type DepartmentMetric = {
  department: string;
  appointment_count: number;
  no_show_count: number;
};

type BreakdownMetric = {
  cause?: string;
  priority?: string;
  count: number;
};

type Analytics = {
  total_appointments: number;
  completed_appointments: number;
  no_shows: number;
  cancelled: number;
  no_show_rate_percent: number;
  average_service_minutes: number;
  by_department: DepartmentMetric[];
  by_cause: BreakdownMetric[];
  by_priority: BreakdownMetric[];
};

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const data = await apiFetch("/analytics/summary");
        setAnalytics(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load analytics."
        );
      }
    }

    loadAnalytics();
  }, []);

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-xl border border-red-900 bg-red-950/40 p-6">
            <h1 className="text-xl font-semibold">Analytics unavailable</h1>
            <p className="mt-2 text-red-300">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  if (!analytics) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="text-slate-400">Loading analytics...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl"> 
        <div className="relative mb-8">
  <div className="absolute left-1/2 top-0 -translate-x-1/2">
    <Navigation />
  </div>

  <p className="text-sm font-medium uppercase tracking-wider text-blue-400"> 
    Operations Intelligence
  </p>
    
  <h1 className="mt-2 text-3xl font-bold">
    Analytics
  </h1>

  <p className="mt-2 text-slate-400">
    Operational performance metrics derived from appointment data.
  </p>
</div>

        {/* Summary cards */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <MetricCard
            label="Total Appointments"
            value={analytics.total_appointments}
          />

          <MetricCard
            label="Completed"
            value={analytics.completed_appointments}
          />

          <MetricCard
            label="No-Shows"
            value={analytics.no_shows}
          />

          <MetricCard
            label="Cancelled"
            value={analytics.cancelled}
          />

          <MetricCard
            label="No-Show Rate"
            value={`${analytics.no_show_rate_percent}%`}
          />

          <MetricCard
            label="Avg. Service Time"
            value={`${analytics.average_service_minutes} min`}
          />
        </section>

        {/* Department breakdown */}
        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">
              Department Performance
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Appointment volume and no-show activity by department.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-800 text-sm text-slate-400">
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Appointments</th>
                  <th className="px-4 py-3">No-Shows</th>
                  <th className="px-4 py-3">No-Show Rate</th>
                </tr>
              </thead>

              <tbody>
                {analytics.by_department.map((department) => {
                  const rate =
                    department.appointment_count > 0
                      ? (
                          (department.no_show_count /
                            department.appointment_count) *
                          100
                        ).toFixed(1)
                      : "0.0";

                  return (
                    <tr
                      key={department.department}
                      className="border-b border-slate-800/70"
                    >
                      <td className="px-4 py-4 font-medium">
                        {department.department}
                      </td>

                      <td className="px-4 py-4 text-slate-300">
                        {department.appointment_count}
                      </td>

                      <td className="px-4 py-4 text-slate-300">
                        {department.no_show_count}
                      </td>

                      <td className="px-4 py-4">
                        <span className="rounded-full bg-slate-800 px-3 py-1 text-sm">
                          {rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Breakdowns */}
        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <BreakdownCard
            title="Appointment Causes"
            description="Recorded operational reasons associated with appointments."
            items={analytics.by_cause.map((item) => ({
              label: formatLabel(item.cause || "Unknown"),
              count: item.count,
            }))}
          />

          <BreakdownCard
            title="Priority Distribution"
            description="Appointment volume grouped by operational priority."
            items={analytics.by_priority.map((item) => ({
              label: formatLabel(item.priority || "Unknown"),
              count: item.count,
            }))}
          />
        </section>

        {/* Operational interpretation */}
        <section className="mt-8 rounded-2xl border border-blue-900/50 bg-blue-950/20 p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-blue-500/10 px-3 py-2 text-blue-400">
              AI
            </div>

            <div>
              <h2 className="text-lg font-semibold">
                Operations Intelligence
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Med-Intel separates authoritative operational calculations
                from AI-generated interpretation. Metrics on this page come
                directly from the application database; Ollama is used to
                explain patterns rather than determine the underlying numbers.
              </p>

              <a
                href="/dashboard"
                className="mt-4 inline-block text-sm font-medium text-blue-400 hover:text-blue-300"
              >
                View AI Operations Insight →
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{label}</p>

      <p className="mt-3 text-3xl font-bold tracking-tight">
        {value}
      </p>
    </div>
  );
}

function BreakdownCard({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: {
    label: string;
    count: number;
  }[];
}) {
  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-xl font-semibold">{title}</h2>

      <p className="mt-1 text-sm text-slate-400">
        {description}
      </p>

      <div className="mt-6 space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">
            No data available.
          </p>
        ) : (
          items.map((item) => {
            const percentage =
              total > 0 ? (item.count / total) * 100 : 0;

            return (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-slate-300">
                    {item.label}
                  </span>

                  <span className="font-medium text-white">
                    {item.count}
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function formatLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}