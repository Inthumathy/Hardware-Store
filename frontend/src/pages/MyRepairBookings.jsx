
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ClipboardList,
  MapPin,
  RefreshCw,
  Wrench,
  UserRound,
  AlertCircle,
  ExternalLink,
  Plus
} from "lucide-react";

import "./MyRepairBookings.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5001/api";

const formatDate = (value) => {
  if (!value) return "Not scheduled";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-LK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
};

const getStatusClass = (status) => {
  const value = String(status || "").toUpperCase();

  if (["COMPLETED", "FINISHED"].includes(value)) {
    return "completed";
  }

  if (["CANCELLED", "REJECTED"].includes(value)) {
    return "cancelled";
  }

  if (["CONFIRMED", "ASSIGNED", "IN_PROGRESS"].includes(value)) {
    return "processing";
  }

  return "pending";
};

export default function MyRepairBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchBookings = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Please login to view your bookings.");
      }

      const response = await fetch(
        `${API_URL}/repairs/bookings/my`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message || "Unable to load bookings."
        );
      }

      const data = result.data || result.bookings || [];
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Unable to load bookings.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const pendingCount = bookings.filter(
    (booking) =>
      String(booking.status).toUpperCase() === "PENDING"
  ).length;

  const completedCount = bookings.filter((booking) =>
    ["COMPLETED", "FINISHED"].includes(
      String(booking.status).toUpperCase()
    )
  ).length;

  return (
    <main className="mrb-page">
      <div className="mrb-container">
        <div className="mrb-breadcrumb">
          <Link to="/customer">
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
          <span>/</span>
          <span>My Repair Bookings</span>
        </div>

        <header className="mrb-header">
          <div>
            <div className="mrb-eyebrow">
              <Wrench size={15} />
              CUSTOMER / REPAIR HISTORY
            </div>

            <h1>My Repair Bookings</h1>
            <p>
              Track your repair appointments, service locations,
              and assigned workers.
            </p>
          </div>

          <Link to="/repair-booking" className="mrb-new-btn">
            <Plus size={19} />
            Book New Service
            <ArrowRight size={17} />
          </Link>
        </header>

        <section className="mrb-stats">
          <article className="mrb-stat-card">
            <div className="mrb-stat-icon blue">
              <ClipboardList size={24} />
            </div>
            <div>
              <span>Total Bookings</span>
              <strong>{bookings.length}</strong>
              <small>All repair requests</small>
            </div>
          </article>

          <article className="mrb-stat-card">
            <div className="mrb-stat-icon orange">
              <Clock3 size={24} />
            </div>
            <div>
              <span>Pending Requests</span>
              <strong>{pendingCount}</strong>
              <small>Awaiting confirmation</small>
            </div>
          </article>

          <article className="mrb-stat-card">
            <div className="mrb-stat-icon green">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <span>Completed Repairs</span>
              <strong>{completedCount}</strong>
              <small>Finished services</small>
            </div>
          </article>
        </section>

        <section className="mrb-history">
          <div className="mrb-history-header">
            <div>
              <h2>Booking History</h2>
              <p>View the details of your repair service requests.</p>
            </div>

            <button
              type="button"
              className="mrb-refresh-btn"
              onClick={() => fetchBookings(true)}
              disabled={loading || refreshing}
            >
              <RefreshCw
                size={17}
                className={refreshing ? "mrb-spin" : ""}
              />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {error && (
            <div className="mrb-alert" role="alert">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {loading ? (
            <div className="mrb-empty">
              <RefreshCw size={30} className="mrb-spin" />
              <p>Loading your bookings...</p>
            </div>
          ) : !error && bookings.length === 0 ? (
            <div className="mrb-empty">
              <div className="mrb-empty-icon">
                <Wrench size={34} />
              </div>
              <h3>No Repair Bookings Yet</h3>
              <p>
                You haven't requested a repair service yet.
                Start by booking your first service.
              </p>
              <Link to="/repair-booking" className="mrb-new-btn">
                Book a Repair Service
                <ArrowRight size={17} />
              </Link>
            </div>
          ) : !error ? (
            <div className="mrb-booking-list">
              {bookings.map((booking) => {
                const status = String(
                  booking.status || "PENDING"
                ).toUpperCase();

                const worker =
                  booking.worker_name ||
                  booking.assigned_worker_name ||
                  "Not assigned yet";

                const address = [
                  booking.address || booking.address_line,
                  booking.city
                ]
                  .filter(Boolean)
                  .join(", ");

                const scheduled =
                  booking.preferred_datetime ||
                  booking.scheduled_at;

                const mapUrl =
                  booking.location_url &&
                  /^https?:\/\//i.test(booking.location_url)
                    ? booking.location_url
                    : booking.latitude != null &&
                        booking.longitude != null
                      ? `https://www.google.com/maps?q=${encodeURIComponent(
                          `${booking.latitude},${booking.longitude}`
                        )}`
                      : null;

                return (
                  <article className="mrb-booking-card" key={booking.id}>
                    <div className="mrb-card-top">
                      <div className="mrb-booking-title">
                        <div className="mrb-service-icon">
                          <Wrench size={23} />
                        </div>
                        <div>
                          <h3>
                            {booking.service_name ||
                              booking.name ||
                              `Repair Service #${booking.service_id}`}
                          </h3>
                          <span>Booking #{booking.id}</span>
                        </div>
                      </div>

                      <span
                        className={`mrb-status ${getStatusClass(status)}`}
                      >
                        <span className="mrb-status-dot" />
                        {status.replaceAll("_", " ")}
                      </span>
                    </div>

                    <div className="mrb-card-details">
                      <div className="mrb-detail">
                        <CalendarDays size={19} />
                        <div>
                          <small>Scheduled Date & Time</small>
                          <strong>{formatDate(scheduled)}</strong>
                        </div>
                      </div>

                      <div className="mrb-detail">
                        <MapPin size={19} />
                        <div>
                          <small>Service Location</small>
                          <strong>{address || "Not provided"}</strong>
                        </div>
                      </div>

                      <div className="mrb-detail">
                        <UserRound size={19} />
                        <div>
                          <small>Assigned Worker</small>
                          <strong>{worker}</strong>
                        </div>
                      </div>

                      <div className="mrb-detail">
                        <Clock3 size={19} />
                        <div>
                          <small>Booking Requested</small>
                          <strong>
                            {formatDate(booking.created_at)}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {booking.problem_description && (
                      <div className="mrb-description">
                        <strong>Problem Description</strong>
                        <p>{booking.problem_description}</p>
                      </div>
                    )}

                    {mapUrl && (
                      <a
                        href={mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mrb-map-link"
                      >
                        <MapPin size={16} />
                        View Map Location
                        <ExternalLink size={15} />
                      </a>
                    )}
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
