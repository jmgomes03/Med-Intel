const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function apiFetch(
  path: string,
  options: RequestInit = {}
) {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("medintel_token")
      : null;

  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("medintel_token");
      localStorage.removeItem("medintel_user");
      window.location.href = "/";
    }

    throw new Error("Your session has expired.");
  }

  if (!response.ok) {
    let message = "Request failed.";

    try {
      const errorData = await response.json();
      message = errorData.detail || message;
    } catch {
      // Keep the default message.
    }

    throw new Error(message);
  }

  return response.json();
}