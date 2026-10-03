"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  username: string;
  full_name: string;
  role: "staff" | "admin";
};

export default function Navigation() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("medintel_user");

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser(null);
      }
    }
  }, []);

  function navigate(path: string) {
    setOpen(false);
    router.push(path);
  }

  function signOut() {
    localStorage.removeItem("medintel_token");
    localStorage.removeItem("medintel_user");
    router.push("/");
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
      >
        Navigate
        <span className="text-slate-400">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
          <div className="border-b border-slate-800 px-4 py-3">
            <p className="text-sm font-medium text-white">
              {user?.full_name || "User"}
            </p>
            <p className="text-xs capitalize text-slate-500">
              {user?.role || "staff"}
            </p>
          </div>

          <div className="p-2">
            <NavItem
              label="Dashboard"
              onClick={() => navigate("/dashboard")}
            />

            <NavItem
              label="Appointments"
              onClick={() => navigate("/appointments")}
            />

            <NavItem
              label="Patients"
              onClick={() => navigate("/patients")}
            />

            <NavItem
              label="Analytics"
              onClick={() => navigate("/analytics")}
            />

            {user?.role === "admin" && (
              <NavItem
                label="Administration"
                onClick={() => navigate("/admin")}
              />
            )}
          </div>

          <div className="border-t border-slate-800 p-2">
            <button
              type="button"
              onClick={signOut}
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-400 transition hover:bg-red-950/40"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NavItem({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
    >
      {label}
    </button>
  );
}