"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import Navigation from "../components/Navigation";

type Patient = {
  patient_id: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
};

type Appointment = {
  id?: number;
  appointment_id: string;
  patient_id?: string;
  department?: string;
  provider_id?: string;
  scheduled_time?: string;
  arrival_time?: string;
  completion_time?: string;
  status?: string;
  priority?: string;
  cause?: string;
  operational_notes?: string;
};

type Department = {
  department_id: string;
  name: string;
};

type Provider = {
  provider_id: string;
  first_name: string;
  last_name: string;
  department_id: string;
  department_name: string;
};

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

export default function AppointmentsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState("");

  const [departments, setDepartments] = useState<Department[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);


  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selected, setSelected] =
    useState<Appointment | null>(null);

  const [saving, setSaving] = useState(false);

  const [newAppointment, setNewAppointment] = useState({
    patient_id: "",
    department: "",
    provider_id: "",
    scheduled_time: "",
    status: "scheduled",
    priority: "routine",
    cause: "",
    operational_notes: "",
  });


  async function loadAppointments() {
    try {
      setError("");

      const data = await apiFetch("/appointments");

      const list = Array.isArray(data)
        ? data
        : data.appointments || [];

      setAppointments(list);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load appointments."
      );
    } finally {
      setLoading(false);
    }
  }

 useEffect(() => {
    
  async function loadFormData() {
    try {
      const [departmentData, providerData, patientData] =
        await Promise.all([
            apiFetch("/departments"),
            apiFetch("/providers"),
            apiFetch("/patients"),
        ]);

      setDepartments(departmentData.value || departmentData);
      setProviders(providerData.value || providerData);
      setPatients(patientData.value || patientData);
    } catch (err) {
      console.error("Unable to load appointment form data:", err);
    }
  }

  loadFormData();
}, []);

useEffect(() => {
  loadAppointments();
}, []);

  async function updateStatus(
    appointment: Appointment,
    status: string
  ) {
    try {
      setSaving(true);
      setError("");

      await apiFetch(
        `/appointments/${appointment.appointment_id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            status,
            actor:
                JSON.parse(
                    localStorage.getItem("medintel_user") || "{}"
                ).username || "unknown",

            operational_notes:
              status === "no_show"
                ? "Patient did not arrive for scheduled appointment."
                : appointment.operational_notes || "",
          }),
        }
      );

      await loadAppointments();

      const updated = {
        ...appointment,
        status,
      };

      setSelected(updated);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update appointment."
      );
    } finally {
      setSaving(false);
    }
  }

 async function createAppointment(
  event: FormEvent<HTMLFormElement>
) {
  event.preventDefault();

  const selectedProvider = providers.find(
    (provider) =>
      provider.provider_id === newAppointment.provider_id
  );

  if (!selectedProvider) {
    setError("Please select a valid provider.");
    return;
  }

  if (
    selectedProvider.department_id !==
    newAppointment.department
  ) {
    setError(
      "The selected provider does not belong to the selected department."
    );
    return;
  }

  try {
      setSaving(true);
      setError("");

      await apiFetch("/appointments", {
        method: "POST",
        body: JSON.stringify({
          ...newAppointment,
          scheduled_time: new Date(
            newAppointment.scheduled_time
          ).toISOString(),
        }),
      });

      setNewAppointment({
        patient_id: "",
        department: "",
        provider_id: "",
        scheduled_time: "",
        status: "scheduled",
        priority: "routine",
        cause: "",
        operational_notes: "",
        
      });

      setPatientSearch("");
      
      await loadAppointments();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create appointment."
      );
    } finally {
      setSaving(false);
    }
  }

  const filteredAppointments = appointments.filter(
    (appointment) => {
      const searchText = search.toLowerCase();

      const matchesSearch =
        appointment.appointment_id
          ?.toLowerCase()
          .includes(searchText) ||
        appointment.patient_id
          ?.toLowerCase()
          .includes(searchText) ||
        appointment.department
          ?.toLowerCase()
          .includes(searchText);

      const matchesStatus =
        statusFilter === "all" ||
        appointment.status === statusFilter;

      return matchesSearch && matchesStatus;
    }
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <a
              href="/dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-bold"
            >
              M
            </a>

            <div>
              <h1 className="font-semibold">
                Appointments    
                
              </h1>

              <p className="text-xs text-slate-500">
                Hospital Operations
              </p>
            </div>
           
          </div>
        <Navigation />
          <a
            href="/dashboard"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-900 hover:text-white"
          >
            Dashboard
          </a>
        </div>
      </header>
      

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <p className="text-sm text-blue-400">
            Operations
          </p>

          <h2 className="mt-1 text-3xl font-bold">
            Appointment Management
          </h2>

          <p className="mt-2 text-slate-400">
            View, create, and update appointment records.
        
          </p>
        </div>
        
        {error && (
          <div className="mb-6 rounded-xl border border-red-900 bg-red-950/40 px-5 py-4 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mb-6 grid gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-[1fr_200px]">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Search
            </label>

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Appointment ID, patient ID, or department"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Status
            </label>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
            >
              <option value="all">All statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="waiting">Waiting</option>
              <option value="in_progress">
                In Progress
              </option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No-Show</option>
            </select>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            <div className="border-b border-slate-800 px-6 py-5">
              <h3 className="font-semibold">
                Appointments
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                {filteredAppointments.length} records shown
              </p>
            </div>

            {loading ? (
              <div className="px-6 py-12 text-center text-slate-400">
                Loading appointments...
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-slate-400">
                  No appointments match your filters.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {filteredAppointments.map(
                  (appointment) => (
                    <button
                      key={
                        appointment.appointment_id ||
                        appointment.id
                      }
                      onClick={() =>
                        setSelected(appointment)
                      }
                      className="block w-full px-6 py-5 text-left transition hover:bg-slate-800/50"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium text-white">
                            {appointment.appointment_id}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {appointment.patient_id ||
                              "Unknown patient"}
                            {" · "}
                            {appointment.department ||
                              "Unknown department"}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500">
                            {appointment.scheduled_time
                              ? new Date(
                                  appointment.scheduled_time
                                ).toLocaleString()
                              : "No date"}
                          </span>

                          <span
                            className={`rounded-full border px-3 py-1 text-xs ${statusClass(
                              appointment.status
                            )}`}
                          >
                            {statusLabel(
                              appointment.status
                            )}
                          </span>
                        </div>
                      </div>
                    </button>
                  )
                )}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900">
            <div className="border-b border-slate-800 px-6 py-5">
              <h3 className="font-semibold">
                {selected
                  ? "Appointment Details"
                  : "Create Appointment"}
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                {selected
                  ? "Update the selected appointment."
                  : "Add a new synthetic appointment."}
              </p>
            </div>

            {selected ? (
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-slate-500">
                      Appointment
                    </p>

                    <p className="mt-1 font-medium">
                      {selected.appointment_id}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Patient
                    </p>

                    <p className="mt-1">
                      {selected.patient_id || "Not assigned"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Department
                    </p>

                    <p className="mt-1">
                      {selected.department || "Not assigned"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Provider
                    </p>

                    <p className="mt-1">
                      {selected.provider_id || "Not assigned"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Current Status
                    </p>

                    <span
                      className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs ${statusClass(
                        selected.status
                      )}`}
                    >
                      {statusLabel(selected.status)}
                    </span>
                  </div>
                </div>

                <div className="mt-8 border-t border-slate-800 pt-6">
                  <p className="mb-3 text-sm font-medium text-slate-300">
                    Update Status
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() =>
                        updateStatus(
                          selected,
                          "completed"
                        )
                      }
                      disabled={saving}
                      className="rounded-lg border border-emerald-900 bg-emerald-950/50 px-3 py-2 text-sm text-emerald-300 hover:bg-emerald-950 disabled:opacity-50"
                    >
                      Complete
                    </button>

                    <button
                      onClick={() =>
                        updateStatus(
                          selected,
                          "no_show"
                        )
                      }
                      disabled={saving}
                      className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300 hover:bg-red-950 disabled:opacity-50"
                    >
                      Mark No-Show
                    </button>

                    <button
                      onClick={() =>
                        updateStatus(
                          selected,
                          "waiting"
                        )
                      }
                      disabled={saving}
                      className="rounded-lg border border-amber-900 bg-amber-950/50 px-3 py-2 text-sm text-amber-300 hover:bg-amber-950 disabled:opacity-50"
                    >
                      Waiting
                    </button>

                    <button
                      onClick={() =>
                        updateStatus(
                          selected,
                          "cancelled"
                        )
                      }
                      disabled={saving}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setSelected(null)}
                  className="mt-6 w-full rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  Create New Appointment
                </button>
              </div>
            ) : (
              <form
                onSubmit={createAppointment}
                className="space-y-4 p-6"
              >
                <div className="space-y-2">

  <input
    required
    placeholder="Search patient by name or ID..."
    value={patientSearch}
    onChange={(event) => {
      setPatientSearch(event.target.value);

      // If the user starts a new search,
      // clear the previously selected patient.
      if (newAppointment.patient_id) {
        setNewAppointment({
          ...newAppointment,
          patient_id: "",
        });
      }
    }}
    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
  />

  {patientSearch.trim() && !newAppointment.patient_id && (
    <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-700 bg-slate-950">
      {patients
        .filter((patient) => {
          const search = patientSearch.toLowerCase().trim();

          const name =
            patient.full_name ||
            [patient.first_name, patient.last_name]
              .filter(Boolean)
              .join(" ");

          return (
            name.toLowerCase().includes(search) ||
            patient.patient_id.toLowerCase().includes(search)
          );
        })
        .map((patient) => {
          const name =
            patient.full_name ||
            [patient.first_name, patient.last_name]
              .filter(Boolean)
              .join(" ");

          return (
            <button
              key={patient.patient_id}
              type="button"
              onClick={() => {
                setNewAppointment({
                  ...newAppointment,
                  patient_id: patient.patient_id,
                });

                setPatientSearch(
                  `${name} — ${patient.patient_id}`
                );
              }}
              className="w-full px-4 py-3 text-left text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              <span className="font-medium text-white">
                {name}
              </span>

              <span className="ml-2 text-slate-500">
                {patient.patient_id}
              </span>
            </button>
          );
        })}

      {patients.filter((patient) => {
        const search = patientSearch.toLowerCase().trim();

        const name =
          patient.full_name ||
          [patient.first_name, patient.last_name]
            .filter(Boolean)
            .join(" ");

        return (
          name.toLowerCase().includes(search) ||
          patient.patient_id.toLowerCase().includes(search)
        );
      }).length === 0 && (
        <p className="px-4 py-3 text-sm text-slate-500">
          No patients found.
        </p>
      )}
    </div>
  )}

  {newAppointment.patient_id && (
    <p className="text-xs text-slate-500">
      Selected patient:{" "}
      <span className="text-slate-300">
        {patientSearch}
      </span>
    </p>
  )}
</div>



            <select
  value={newAppointment.department}
  onChange={(event) =>
    setNewAppointment({
      ...newAppointment,
      department: event.target.value,
      provider_id: "",
    })
  }
  required
  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
>
  <option value="">Select department</option>

  {departments.map((department) => (
    <option
      key={department.department_id}
      value={department.department_id}
    >
      {department.name}
    </option>
  ))}
</select>

 <select
  value={newAppointment.provider_id}
  onChange={(event) =>
    setNewAppointment({
      ...newAppointment,
      provider_id: event.target.value,
    })
  }
  required
  disabled={!newAppointment.department}
  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
>
  <option value="">
    {newAppointment.department
      ? "Select provider"
      : "Select department first"}
  </option>

  {providers
    .filter(
      (provider) =>
        provider.department_id === newAppointment.department
    )
    .map((provider) => (
      <option
        key={provider.provider_id}
        value={provider.provider_id}
      >
        {provider.first_name} {provider.last_name}
      </option>
    ))}
</select>

                <div>
                  <label className="mb-2 block text-xs text-slate-500">
                    Scheduled Time
                  </label>

                  <input
                    required
                    type="datetime-local"
                    value={newAppointment.scheduled_time}
                    onChange={(event) =>
                      setNewAppointment({
                        ...newAppointment,
                        scheduled_time:
                          event.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                  />
                </div>

                <select
                  value={newAppointment.priority}
                  onChange={(event) =>
                    setNewAppointment({
                      ...newAppointment,
                      priority: event.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                >
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                </select>

                <input
                  placeholder="Cause (optional)"
                  value={newAppointment.cause}
                  onChange={(event) =>
                    setNewAppointment({
                      ...newAppointment,
                      cause: event.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                />

                <textarea
                  placeholder="Operational notes"
                  value={
                    newAppointment.operational_notes
                  }
                  onChange={(event) =>
                    setNewAppointment({
                      ...newAppointment,
                      operational_notes:
                        event.target.value,
                    })
                  }
                  rows={3}
                  className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                />

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Creating..."
                    : "Create Appointment"}
                </button>
              </form>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}