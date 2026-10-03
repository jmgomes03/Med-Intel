"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import Navigation from "../components/Navigation";

type Patient = {
  id?: number;
  patient_id: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
};
type HistoryItem = {
  appointment_id?: string;
  department?: string;
  provider_id?: string;
  scheduled_time?: string;
  status?: string;
  priority?: string;
  cause?: string;
};

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

function statusLabel(status?: string) {
  if (!status) return "Unknown";

  return status
    .replace("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selected, setSelected] = useState<Patient | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const [activeTab, setActiveTab] = useState<"patients" | "new">("patients");

  const [newPatient, setNewPatient] = useState({
  first_name: "",
  last_name: "",
  date_of_birth: "",
});

const [creatingPatient, setCreatingPatient] = useState(false);
const [createdPatientId, setCreatedPatientId] = useState("");

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadPatients() {
      try {
        const data = await apiFetch("/patients");

        const list = Array.isArray(data)
          ? data
          : data.patients || [];

        setPatients(list);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load patients."
        );
      } finally {
        setLoading(false);
      }
    }

    loadPatients();
  }, []);

  async function selectPatient(patient: Patient) {
    setSelected(patient);
    setHistory([]);
    setHistoryLoading(true);
    setError("");

    try {
      const data = await apiFetch(
        `/patients/${patient.patient_id}/history`
      );

      const historyList = Array.isArray(data)
        ? data
        : data.history || data.appointments || [];

      setHistory(historyList);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load patient history."
      );
    } finally {
      setHistoryLoading(false);
    }
  }


async function createPatient(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  setCreatingPatient(true);
  setError("");
  setCreatedPatientId("");

  try {
    const created = await apiFetch("/patients", {
      method: "POST",
      body: JSON.stringify(newPatient),
    });

    setCreatedPatientId(created.patient_id);

    setNewPatient({
      first_name: "",
      last_name: "",
      date_of_birth: "",
    });

    const data = await apiFetch("/patients");
    const list = Array.isArray(data)
      ? data
      : data.patients || [];

    setPatients(list);
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Unable to create patient."
    );
  } finally {
    setCreatingPatient(false);
  }
}


const filteredPatients = patients.filter((patient) => {
  const query = search.trim().toLowerCase();

  const fullName =
    patient.full_name ||
    [patient.first_name, patient.last_name]
      .filter(Boolean)
      .join(" ");

  return (
    patient.patient_id?.toLowerCase().includes(query) ||
    fullName.toLowerCase().includes(query) ||
    patient.first_name?.toLowerCase().includes(query) ||
    patient.last_name?.toLowerCase().includes(query)
  );
});

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
                Patients
              </h1>

              <p className="text-xs text-slate-500">
                Patient Operations
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
    <p className="text-sm text-blue-400">Patient Records</p>
    <h2 className="mt-1 text-3xl font-bold">Patients</h2>
    <p className="mt-2 text-slate-400">
      Search patients, review appointment history, or create a new patient.
    </p>
  </div>

  <div className="mb-6 flex gap-2 border-b border-slate-800">
    <button
      type="button"
      onClick={() => setActiveTab("patients")}
      className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
        activeTab === "patients"
          ? "border-blue-500 text-blue-400"
          : "border-transparent text-slate-500 hover:text-slate-300"
      }`}
    >
      Patients
    </button>

    <button
      type="button"
      onClick={() => {
        setActiveTab("new");
        setCreatedPatientId("");
      }}
      className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
        activeTab === "new"
          ? "border-blue-500 text-blue-400"
          : "border-transparent text-slate-500 hover:text-slate-300"
      }`}
    >
      New Patient
    </button>
  </div>

        {error && (
  <div className="mb-6 rounded-xl border border-red-900 bg-red-950/40 px-5 py-4 text-sm text-red-300">
    {error}
  </div>
)}

{activeTab === "patients" ? (
  <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
      <div className="border-b border-slate-800 p-5">
        <label className="mb-2 block text-sm font-medium text-slate-300">
          Search Patients
        </label>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Name or patient ID"
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
        />
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400">
          Loading patients...
        </div>
      ) : filteredPatients.length === 0 ? (
        <div className="p-8 text-center text-slate-400">
          No patients found.
        </div>
      ) : (
        <div className="max-h-[650px] divide-y divide-slate-800 overflow-y-auto">
          {filteredPatients.map((patient) => (
            <button
              key={patient.patient_id}
              type="button"
              onClick={() => selectPatient(patient)}
              className={`block w-full px-5 py-4 text-left transition ${
                selected?.patient_id === patient.patient_id
                  ? "bg-blue-600/10"
                  : "hover:bg-slate-800/50"
              }`}
            >
              <p className="font-medium text-white">
                {patient.full_name ||
                  [patient.first_name, patient.last_name]
                    .filter(Boolean)
                    .join(" ") ||
                  patient.patient_id}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {patient.patient_id}
              </p>

              {patient.date_of_birth && (
                <p className="mt-1 text-xs text-slate-600">
                  DOB:{" "}
                  {new Date(
                    patient.date_of_birth
                  ).toLocaleDateString()}
                </p>
              )}
            </button>
          ))}
        </div>
      )}
    </section>

    <section className="rounded-2xl border border-slate-800 bg-slate-900">
      {!selected ? (
        <div className="flex min-h-[500px] items-center justify-center p-8 text-center">
          <div>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-xl">
              P
            </div>

            <h3 className="mt-4 font-semibold">
              Select a patient
            </h3>

            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
              Select a patient from the list to view their appointment
              history.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="border-b border-slate-800 p-6">
            <p className="text-sm text-blue-400">
              Patient Profile
            </p>

            <h3 className="mt-1 text-2xl font-bold">
              {selected.full_name ||
                [selected.first_name, selected.last_name]
                  .filter(Boolean)
                  .join(" ") ||
                selected.patient_id}
            </h3>

            <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-400">
              <span>ID: {selected.patient_id}</span>

              {selected.date_of_birth && (
                <span>
                  DOB:{" "}
                  {new Date(
                    selected.date_of_birth
                  ).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          <div className="p-6">
            <div className="mb-5">
              <h4 className="font-semibold">
                Appointment History
              </h4>

              <p className="mt-1 text-xs text-slate-500">
                Historical operational records for this patient.
              </p>
            </div>

            {historyLoading ? (
              <div className="py-10 text-center text-slate-400">
                Loading history...
              </div>
            ) : history.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-8 text-center">
                <p className="text-slate-400">
                  No appointment history found.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-800">
                <div className="divide-y divide-slate-800">
                  {history.map((item, index) => (
                    <div
                      key={item.appointment_id || index}
                      className="p-5"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium">
                            {item.appointment_id || "Appointment"}
                          </p>

                          <p className="mt-1 text-sm text-slate-500">
                            {item.department || "Unknown department"}
                            {" · "}
                            {item.provider_id || "No provider"}
                          </p>
                        </div>

                        <span
                          className={`self-start rounded-full border px-3 py-1 text-xs ${statusClass(
                            item.status
                          )}`}
                        >
                          {statusLabel(item.status)}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 text-xs text-slate-500 sm:grid-cols-3">
                        <div>
                          <span className="block text-slate-600">
                            Scheduled
                          </span>

                          <span className="text-slate-400">
                            {item.scheduled_time
                              ? new Date(
                                  item.scheduled_time
                                ).toLocaleString()
                              : "Not recorded"}
                          </span>
                        </div>

                        <div>
                          <span className="block text-slate-600">
                            Priority
                          </span>

                          <span className="text-slate-400 capitalize">
                            {item.priority || "Routine"}
                          </span>
                        </div>

                        <div>
                          <span className="block text-slate-600">
                            Cause
                          </span>

                          <span className="text-slate-400">
                            {item.cause || "Not recorded"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  </div>
) : (
  <section className="mx-auto max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6">
    <div className="mb-6">
      <p className="text-sm text-blue-400">Patient Registration</p>
      <h3 className="mt-1 text-2xl font-bold">
        Create New Patient
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Enter the patient&apos;s basic information. Med-Intel will
        automatically generate a unique patient ID.
      </p>
    </div>

    {createdPatientId && (
      <div className="mb-6 rounded-xl border border-emerald-900 bg-emerald-950/40 px-5 py-4">
        <p className="text-sm font-medium text-emerald-300">
          Patient created successfully.
        </p>

        <p className="mt-1 text-sm text-emerald-200">
          Patient ID:{" "}
          <span className="font-semibold">
            {createdPatientId}
          </span>
        </p>
      </div>
    )}

    <form onSubmit={createPatient} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            First Name
          </label>

          <input
            required
            value={newPatient.first_name}
            onChange={(event) =>
              setNewPatient({
                ...newPatient,
                first_name: event.target.value,
              })
            }
            placeholder="First name"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Last Name
          </label>

          <input
            required
            value={newPatient.last_name}
            onChange={(event) =>
              setNewPatient({
                ...newPatient,
                last_name: event.target.value,
              })
            }
            placeholder="Last name"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">
          Date of Birth
        </label>

        <input
          required
          type="date"
          value={newPatient.date_of_birth}
          onChange={(event) =>
            setNewPatient({
              ...newPatient,
              date_of_birth: event.target.value,
            })
          }
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
        />
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
        <p className="text-xs text-slate-500">
          Patient ID
        </p>

        <p className="mt-1 text-sm text-slate-400">
        
        </p>
      </div>

      <button
        type="submit"
        disabled={creatingPatient}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {creatingPatient ? "Creating Patient..." : "Create Patient"}
      </button>
    </form>
  </section>
)}
    </section>
  </main>
);
}