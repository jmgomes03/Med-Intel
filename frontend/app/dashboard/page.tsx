"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import Navigation from "../components/Navigation";


type User = {
  username: string;
  full_name: string;
  role: string;
};

type Summary = {
  total_appointments?: number;
  completed?: number;
  no_shows?: number;
  cancelled?: number;
  waiting?: number;
  in_progress?: number;
  scheduled?: number;
};

type Appointment = {
  id?: number;
  appointment_id: string;
  patient_id?: string;
  department?: string;
  provider_id?: string;
  scheduled_time?: string;
  status?: string;
  priority?: string;
  cause?: string;
};

type AiSummary = {
  summary?: string;
  analysis?: string;
  message?: string;
};

function StatCard({
  title,
  value,
  description,
}: {
  title: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm font-medium text-slate-400">{title}</p>

      <p className="mt-3 text-3xl font-bold text-white">
        {value}
      </p>

      <p className="mt-2 text-xs text-slate-500">
        {description}
      </p>
    </div>
  );
}

function statusLabel(status?: string) {
  if (!status) return "Unknown";

  return status
    .replace("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusClass(status?: string) {
  switch (status) {
    case "completed":
      return "bg-emerald-950 text-emerald-300 border-emerald-900";

    case "no_show":
      return "bg-red-950 text-red-300 border-red-900";

    case "cancelled":
      return "bg-slate-800 text-slate-300 border-slate-700";

    case "waiting":
      return "bg-amber-950 text-amber-300 border-amber-900";

    case "in_progress":
      return "bg-blue-950 text-blue-300 border-blue-900";

    default:
      return "bg-slate-800 text-slate-300 border-slate-700";
  }
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [summary, setSummary] = useState<Summary>({});
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [aiSummary, setAiSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("medintel_user");

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("medintel_user");
      }
    }

    async function loadDashboard() {
      try {
        setError("");

        const [summaryData, appointmentData] =
          await Promise.all([
            apiFetch("/analytics/summary"),
            apiFetch("/appointments"),
          ]);

        setSummary(summaryData);

        const appointmentList = Array.isArray(appointmentData)
          ? appointmentData
          : appointmentData.appointments || [];

        setAppointments(appointmentList.slice(0, 8));
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load dashboard."
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  async function generateAiSummary() {
    try {
      setAiLoading(true);

      const data: AiSummary = await apiFetch(
        "/analytics/ai-summary"
      );

      setAiSummary(
        data.summary ||
          data.analysis ||
          data.message ||
          "No AI summary was returned."
      );
    } catch (err) {
      setAiSummary(
        err instanceof Error
          ? err.message
          : "Unable to generate AI summary."
      );
    } finally {
      setAiLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("medintel_token");
    localStorage.removeItem("medintel_user");
    window.location.href = "/";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-blue-500" />

          <p className="mt-4 text-sm text-slate-400">
            Loading Med-Intel...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-950/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-bold">
              M
            </div>
        
        <div className="mb-8 flex items-start justify-between gap-4">
            <div>
                <p className="text-sm font-medium uppercase tracking-wider text-blue-400">
                Operations Intelligence
                </p>
                <h1 className="mt-2 text-3xl font-bold">Dashboard</h1>
                
                <p className="mt-2 text-slate-400">
                Hospital operations overview and real-time activity.
                </p>
                
            </div>
            <Navigation />
            
            </div>
                    </div>

          <div className="flex items-center gap-5">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-white">
                {user?.full_name || "Staff User"}
              </p>

              <p className="text-xs capitalize text-slate-500">
                {user?.role || "staff"}
              </p>
            </div>

            <button
              onClick={logout}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-600 hover:bg-slate-900 hover:text-white"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>
    
      <div className="mx-auto flex max-w-7xl">
        <aside className="hidden min-h-[calc(100vh-73px)] w-60 border-r border-slate-800 p-5 lg:block">
          <nav className="space-y-2">
            <a
              href="/dashboard"
              className="block rounded-lg bg-blue-600/10 px-4 py-3 text-sm font-medium text-blue-400"
            >
              Dashboard
            </a>

            <a
              href="/appointments"
              className="block rounded-lg px-4 py-3 text-sm text-slate-400 transition hover:bg-slate-900 hover:text-white"
            >
              Appointments
            </a>

            <a
              href="/patients"
              className="block rounded-lg px-4 py-3 text-sm text-slate-400 transition hover:bg-slate-900 hover:text-white"
            >
              Patients
            </a>

            <a
              href="/analytics"
              className="block rounded-lg px-4 py-3 text-sm text-slate-400 transition hover:bg-slate-900 hover:text-white"
            >
              Analytics
            </a>

            {user?.role === "admin" && (
              <a
                href="/admin"
                className="block rounded-lg px-4 py-3 text-sm text-slate-400 transition hover:bg-slate-900 hover:text-white"
              >
                Administration
              </a>
            )}
          </nav>
        </aside>
            
        <section className="min-w-0 flex-1 p-6 lg:p-8">
          <div className="mb-8">
            <p className="text-sm text-blue-400">
              Operations Overview
            </p>

            <h2 className="mt-1 text-3xl font-bold tracking-tight">
              Good evening
              {user?.full_name
                ? `, ${user.full_name.split(" ")[0]}`
                : ""}
              .
            </h2>

            <p className="mt-2 text-slate-400">
              Monitor appointment activity and operational performance.
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-900 bg-red-950/40 px-5 py-4 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total Appointments"
              value={summary.total_appointments ?? 0}
              description="All recorded appointments"
            />

            <StatCard
              title="Completed"
              value={summary.completed ?? 0}
              description="Appointments completed"
            />

            <StatCard
              title="No-Shows"
              value={summary.no_shows ?? 0}
              description="Patients who did not arrive"
            />

            <StatCard
              title="Cancelled"
              value={summary.cancelled ?? 0}
              description="Cancelled appointments"
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <StatCard
              title="Waiting"
              value={summary.waiting ?? 0}
              description="Patients currently waiting"
            />

            <StatCard
              title="In Progress"
              value={summary.in_progress ?? 0}
              description="Appointments currently active"
            />
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-3">
            <section className="rounded-2xl border border-slate-800 bg-slate-900 xl:col-span-2">
              <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
                <div>
                  <h3 className="font-semibold">
                    Recent Appointments
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Latest records from the operations database
                  </p>
                </div>

                <a
                  href="/appointments"
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  View all
                </a>
              </div>

              {appointments.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-slate-400">
                    No appointments found.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {appointments.map((appointment) => (
                    <div
                      key={
                        appointment.appointment_id ||
                        appointment.id
                      }
                      className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium text-white">
                          {appointment.appointment_id}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {appointment.patient_id || "Unknown patient"}
                          {" · "}
                          {appointment.department || "Unknown department"}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500">
                          {appointment.scheduled_time
                            ? new Date(
                                appointment.scheduled_time
                              ).toLocaleString()
                            : "No time"}
                        </span>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs ${statusClass(
                            appointment.status
                          )}`}
                        >
                          {statusLabel(appointment.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

       


          </div>
        </section>
      </div>
    </main>
  );
}