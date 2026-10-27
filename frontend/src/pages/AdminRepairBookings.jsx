
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  UserRoundPlus,
  Wrench,
  AlertCircle
} from "lucide-react";

import "./AdminRepairBookings.css";

const BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5001/api"
).replace(/\/+$/, "");

const API_URL = `${BASE_URL}/repairs`;

const formatDate = (value) => {
  if (!value) return "Not scheduled";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString("en-LK", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit"
      });
};

const getStatusClass = (status) => {
  const value = String(status || "").toUpperCase();

  if (value === "COMPLETED") return "completed";
  if (value === "IN_PROGRESS") return "progress";
  if (value === "CONFIRMED") return "confirmed";
  if (value === "CANCELLED") return "cancelled";
  return "pending";
};

export default function AdminRepairBookings() {
  const [bookings, setBookings] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [selectedWorkers, setSelectedWorkers] = useState({});

  const [loading, setLoading] = useState(true);
  const [workersLoading, setWorkersLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assigningId, setAssigningId] = useState(null);

  const [error, setError] = useState("");
  const [workersError, setWorkersError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token") || ""}`
  });

  const loadBookings = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const response = await fetch(`${API_URL}/admin/bookings`, {
        headers: getHeaders()
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || "Unable to load repair bookings"
        );
      }

      setBookings(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Requires a worker-list API returning verified, available
  // workers with user_id (users.id), name and related details.
  const loadWorkers = useCallback(async () => {
    setWorkersLoading(true);
    setWorkersError("");

    try {
      const response = await fetch(
        `${API_URL}/admin/workers`,
        { headers: getHeaders() }
      );

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || "Unable to load available workers"
        );
      }

      const items = Array.isArray(data.data) ? data.data : [];
      setWorkers(items);
    } catch (err) {
      setWorkersError(
        `${err.message}. Worker-list API may need to be added to the backend.`
      );
    } finally {
      setWorkersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
    loadWorkers();
  }, [loadBookings, loadWorkers]);

  const stats = useMemo(() => ({
    total: bookings.length,
    pending: bookings.filter(
      (booking) => booking.status === "PENDING"
    ).length,
    confirmed: bookings.filter(
      (booking) => booking.status === "CONFIRMED"
    ).length,
    completed: bookings.filter(
      (booking) => booking.status === "COMPLETED"
    ).length
  }), [bookings]);

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase();

    return bookings.filter((booking) => {
      const matchesFilter =
        filter === "ALL" || booking.status === filter;

      const searchable = [
        booking.id,
        booking.customer_name,
        booking.service_name,
        booking.city,
        booking.status
      ].join(" ").toLowerCase();

      return matchesFilter && searchable.includes(query);
    });
  }, [bookings, search, filter]);

  async function handleAssign(booking) {
    const workerId = Number(selectedWorkers[booking.id]);

    if (!Number.isInteger(workerId) || workerId <= 0) {
      setError("Please select a worker before assigning.");
      return;
    }

    const selectedWorker = workers.find(
      (worker) => Number(worker.user_id) === workerId
    );

    if (!selectedWorker) {
      setError("Please select a valid worker.");
      return;
    }

    if (!window.confirm(
      `Assign ${selectedWorker.full_name} to booking #${booking.id}?`
    )) {
      return;
    }

    setAssigningId(booking.id);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/admin/bookings/${booking.id}/assign`,
        {
          method: "PATCH",
          headers: {
            ...getHeaders(),
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ worker_id: workerId })
        }
      );

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Worker assignment failed");
      }

      setMessage(
        `Worker assigned successfully to booking #${booking.id}.`
      );

      setSelectedWorkers((previous) => ({
        ...previous,
        [booking.id]: ""
      }));

      await loadBookings(true);
      await loadWorkers();
    } catch (err) {
      setError(err.message);
    } finally {
      setAssigningId(null);
    }
  }

  return (
    <main className="arb-page">
      <div className="arb-container">
        <Link to="/admin" className="arb-back">
          <ArrowLeft size={17} />
          Back to Dashboard
        </Link>

        <header className="arb-hero">
          <div>
            <div className="arb-eyebrow">
              <Wrench size={15} />
              HARDWARE STORE / ADMIN
            </div>

            <h1>Repair Bookings Management</h1>
            <p>
              Review customer repair requests and assign
              verified workers to available jobs.
            </p>
          </div>

          <div className="arb-hero-icon">
            <ClipboardList size={33} />
          </div>
        </header>

        {error && (
          <div className="arb-alert arb-alert-error" role="alert">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {message && (
          <div className="arb-alert arb-alert-success" role="status">
            <CheckCircle2 size={20} />
            {message}
          </div>
        )}

        {workersError && (
          <div className="arb-alert arb-alert-warning">
            <AlertCircle size={20} />
            {workersError}
          </div>
        )}

        <section className="arb-stats">
          <div className="arb-stat">
            <div className="arb-stat-icon blue">
              <ClipboardList size={23} />
            </div>
            <div>
              <span>Total Bookings</span>
              <strong>{stats.total}</strong>
            </div>
          </div>

          <div className="arb-stat">
            <div className="arb-stat-icon orange">
              <Clock3 size={23} />
            </div>
            <div>
              <span>Pending</span>
              <strong>{stats.pending}</strong>
            </div>
          </div>

          <div className="arb-stat">
            <div className="arb-stat-icon purple">
              <UserRoundPlus size={23} />
            </div>
            <div>
              <span>Confirmed</span>
              <strong>{stats.confirmed}</strong>
            </div>
          </div>

          <div className="arb-stat">
            <div className="arb-stat-icon green">
              <CheckCircle2 size={23} />
            </div>
            <div>
              <span>Completed</span>
              <strong>{stats.completed}</strong>
            </div>
          </div>
        </section>

        <section className="arb-panel">
          <div className="arb-panel-header">
            <div>
              <h2>Customer Repair Requests</h2>
              <p>
                Manage bookings and assign workers to pending jobs.
              </p>
            </div>

            <button
              className="arb-refresh"
              type="button"
              onClick={() => {
                loadBookings(true);
                loadWorkers();
              }}
              disabled={refreshing}
            >
              <RefreshCw
                size={17}
                className={refreshing ? "arb-spin" : ""}
              />
              {refreshing ? "Refreshing..." : "Refresh Bookings"}
            </button>
          </div>

          <div className="arb-toolbar">
            <div className="arb-search">
              <Search size={18} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search bookings, customers, services..."
              />
            </div>

            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="arb-filter"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          {loading ? (
            <div className="arb-empty">
              <RefreshCw size={28} className="arb-spin" />
              <p>Loading repair bookings...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="arb-empty">
              <ClipboardList size={34} />
              <h3>No Repair Bookings Found</h3>
              <p>There are no bookings matching your filters.</p>
            </div>
          ) : (
            <div className="arb-booking-list">
              {filteredBookings.map((booking) => (
                <article className="arb-booking-card" key={booking.id}>
                  <div className="arb-card-header">
                    <div className="arb-booking-title">
                      <div className="arb-booking-icon">
                        <Wrench size={22} />
                      </div>

                      <div>
                        <h3>
                          {booking.service_name ||
                            `Service #${booking.service_id}`}
                        </h3>
                        <span>Booking #{booking.id}</span>
                      </div>
                    </div>

                    <span
                      className={`arb-status ${getStatusClass(booking.status)}`}
                    >
                      {String(booking.status).replaceAll("_", " ")}
                    </span>
                  </div>

                  <div className="arb-details">
                    <div className="arb-detail">
                      <UserRound size={18} />
                      <div>
                        <small>Customer</small>
                        <strong>
                          {booking.customer_name ||
                            `Customer #${booking.user_id}`}
                        </strong>
                      </div>
                    </div>

                    <div className="arb-detail">
                      <MapPin size={18} />
                      <div>
                        <small>City</small>
                        <strong>{booking.city || "Not provided"}</strong>
                      </div>
                    </div>

                    <div className="arb-detail">
                      <CalendarDays size={18} />
                      <div>
                        <small>Scheduled Visit</small>
                        <strong>{formatDate(booking.scheduled_at)}</strong>
                      </div>
                    </div>

                    <div className="arb-detail">
                      <ShieldCheck size={18} />
                      <div>
                        <small>Assigned Worker</small>
                        <strong>
                          {booking.worker_name || "Not assigned yet"}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {booking.status === "PENDING" && (
                    <div className="arb-assignment">
                      <div>
                        <h4>
                          <UserRoundPlus size={18} />
                          Assign a Worker
                        </h4>
                        <p>
                          Select a verified, available worker
                          for this booking.
                        </p>
                      </div>

                      <div className="arb-assignment-actions">
                        <select
                          value={selectedWorkers[booking.id] || ""}
                          onChange={(event) =>
                            setSelectedWorkers((previous) => ({
                              ...previous,
                              [booking.id]: event.target.value
                            }))
                          }
                          disabled={workersLoading}
                        >
                          <option value="">
                            {workersLoading
                              ? "Loading workers..."
                              : workers.length === 0
                                ? "No available workers"
                                : "Select Worker"}
                          </option>

                          {workers.map((worker) => (
                            <option
                              key={worker.user_id}
                              value={worker.user_id}
                            >
                              {worker.full_name}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => handleAssign(booking)}
                          disabled={
                            assigningId === booking.id ||
                            !selectedWorkers[booking.id]
                          }
                        >
                          {assigningId === booking.id
                            ? "Assigning..."
                            : "Assign Worker"}
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
