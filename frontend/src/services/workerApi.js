
const BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5001/api"
).replace(/\/+$/, "");

async function workerRequest(path, options = {}) {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("Please log in with your worker account.");
  }

  let response;

  try {
    response = await fetch(`${BASE_URL}/repairs${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers
      }
    });
  } catch {
    throw new Error(
      "Cannot connect to the server. Check that the backend is running on port 5001."
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(
      data.message || `Request failed (${response.status})`
    );
  }

  return data;
}

export async function getWorkerJobs() {
  const result = await workerRequest("/worker/jobs");
  return Array.isArray(result.data) ? result.data : [];
}

export async function updateWorkerJobStatus(bookingId, status) {
  return workerRequest(`/bookings/${bookingId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
}
