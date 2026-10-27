
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
  ShieldCheck,
  Wrench,
  AlertCircle,
  UserRound,
  ExternalLink,
  Navigation,
  Check
} from "lucide-react";

import "./CustomerRepairBooking.css";

const API = `${
  (import.meta.env.VITE_API_URL || "http://localhost:5001/api")
    .replace(/\/+$/, "")
}/repairs`;

const initialForm = {
  service_id: "",
  address_line: "",
  city: "",
  latitude: "",
  longitude: "",
  scheduled_at: "",
  problem_description: ""
};

const formatMoney = (value) =>
  `Rs. ${Number(value || 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

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

const getMinDateTime = () => {
  const date = new Date();
  return new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  ).toISOString().slice(0, 16);
};

const getStatusClass = (status) => {
  const value = String(status || "PENDING").toUpperCase();

  if (["COMPLETED", "FINISHED"].includes(value)) return "completed";
  if (["CANCELLED", "REJECTED"].includes(value)) return "cancelled";
  if (["CONFIRMED", "ASSIGNED", "IN_PROGRESS"].includes(value)) {
    return "processing";
  }

  return "pending";
};

export default function CustomerRepairBooking() {
  const [services, setServices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [form, setForm] = useState(initialForm);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");

  const [loading, setLoading] = useState(false);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token") || ""}`
  });

  const loadServices = useCallback(async () => {
    setServicesLoading(true);

    try {
      const response = await fetch(`${API}/services`);
      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Unable to load services");
      }

      const items = data.data || data.services || [];
      setServices(Array.isArray(items) ? items : []);
    } catch (err) {
      setError(err.message || "Unable to load repair services.");
    } finally {
      setServicesLoading(false);
    }
  }, []);

  const loadBookings = useCallback(async (refresh = false) => {
    const token = localStorage.getItem("token");

    if (!token) {
      setBookingsLoading(false);
      return;
    }

    if (refresh) setRefreshing(true);
    else setBookingsLoading(true);

    setHistoryError("");

    try {
      const response = await fetch(`${API}/bookings/my`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Unable to load bookings");
      }

      const items = data.data || data.bookings || [];
      setBookings(Array.isArray(items) ? items : []);
    } catch (err) {
      setHistoryError(err.message || "Unable to load bookings.");
    } finally {
      setBookingsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadServices();
    loadBookings();
  }, [loadServices, loadBookings]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    const token = localStorage.getItem("token");

    if (!token) {
      setError("Please login before booking a repair service.");
      return;
    }

    if (
      !form.service_id ||
      !form.address_line.trim() ||
      !form.city.trim() ||
      !form.scheduled_at
    ) {
      setError("Please complete all required fields.");
      return;
    }

    const scheduledDate = new Date(form.scheduled_at);

    if (
      Number.isNaN(scheduledDate.getTime()) ||
      scheduledDate <= new Date()
    ) {
      setError("Please select a valid future date and time.");
      return;
    }

    const payload = {
      service_id: Number(form.service_id),
      address_line: form.address_line.trim(),
      city: form.city.trim(),
      scheduled_at: form.scheduled_at,
      problem_description:
        form.problem_description.trim() || null,
      latitude:
        form.latitude === "" ? null : Number(form.latitude),
      longitude:
        form.longitude === "" ? null : Number(form.longitude)
    };

    if (
      (payload.latitude !== null &&
        (!Number.isFinite(payload.latitude) ||
          payload.latitude < -90 ||
          payload.latitude > 90)) ||
      (payload.longitude !== null &&
        (!Number.isFinite(payload.longitude) ||
          payload.longitude < -180 ||
          payload.longitude > 180))
    ) {
      setError("Invalid location coordinates.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API}/bookings`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Booking failed");
      }

      const bookingId =
        data.data?.bookingId ||
        data.data?.id ||
        data.bookingId;

      setMessage(
        bookingId
          ? `Repair booking #${bookingId} created successfully!`
          : "Repair booking submitted successfully!"
      );

      setForm({ ...initialForm });
      await loadBookings();
    } catch (err) {
      setError(err.message || "Unable to submit repair booking.");
    } finally {
      setLoading(false);
    }
  };

  const selectedService = services.find(
    (service) => String(service.id) === String(form.service_id)
  );

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
    <main className="crb-page">
      <div className="crb-container">
        <nav className="crb-breadcrumb">
          <Link to="/customer">
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
          <span>/</span>
          <span>Repair Services</span>
        </nav>

        <header className="crb-hero">
          <div>
            <div className="crb-eyebrow">
              <Wrench size={15} />
              CUSTOMER / REPAIR SERVICES
            </div>

            <h1>Book a Repair Service</h1>
            <p>
              Schedule a repair worker for your hardware maintenance
              and repair needs.
            </p>
          </div>

          <div className="crb-hero-icon">
            <Wrench size={33} />
          </div>
        </header>

        <div className="crb-info-strip">
          <div>
            <ShieldCheck size={19} />
            <span>Secure booking request</span>
          </div>

          <div>
            <CalendarDays size={19} />
            <span>Flexible appointment scheduling</span>
          </div>

          <div>
            <MapPin size={19} />
            <span>Service at your location</span>
          </div>
        </div>

        {message && (
          <div className="crb-alert crb-alert-success" role="status">
            <CheckCircle2 size={21} />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="crb-alert crb-alert-error" role="alert">
            <AlertCircle size={21} />
            <span>{error}</span>
          </div>
        )}

        <section className="crb-form-card">
          <div className="crb-section-header">
            <div className="crb-section-icon">
              <ClipboardList size={24} />
            </div>

            <div>
              <h2>New Repair Booking</h2>
              <p>
                Complete the form below to request a repair service.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="crb-form">
            <div className="crb-field">
              <label htmlFor="crb-service">
                Repair Service <span>*</span>
              </label>

              <select
                id="crb-service"
                name="service_id"
                value={form.service_id}
                onChange={handleChange}
                disabled={servicesLoading}
                required
              >
                <option value="">
                  {servicesLoading
                    ? "Loading services..."
                    : "Select a repair service"}
                </option>

                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} — {formatMoney(service.base_price)}
                  </option>
                ))}
              </select>

              {selectedService && (
                <div className="crb-selected-service">
                  <Wrench size={18} />
                  <span>{selectedService.name}</span>
                  <strong>
                    Base price: {formatMoney(selectedService.base_price)}
                  </strong>
                </div>
              )}
            </div>

            <div className="crb-form-grid">
              <div className="crb-field">
                <label htmlFor="crb-address">
                  Service Address <span>*</span>
                </label>

                <input
                  id="crb-address"
                  name="address_line"
                  value={form.address_line}
                  onChange={handleChange}
                  placeholder="House number, street, area"
                  required
                />
              </div>

              <div className="crb-field">
                <label htmlFor="crb-city">
                  City <span>*</span>
                </label>

                <input
                  id="crb-city"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  placeholder="Enter your city"
                  required
                />
              </div>
            </div>

            <div className="crb-field">
              <label htmlFor="crb-schedule">
                Preferred Date & Time <span>*</span>
              </label>

              <input
                id="crb-schedule"
                type="datetime-local"
                name="scheduled_at"
                value={form.scheduled_at}
                min={getMinDateTime()}
                onChange={handleChange}
                required
              />

              <small>
                Choose a future date and time for the worker visit.
              </small>
            </div>

            <div className="crb-field">
              <label htmlFor="crb-description">
                Problem Description
              </label>

              <textarea
                id="crb-description"
                name="problem_description"
                value={form.problem_description}
                onChange={handleChange}
                rows={4}
                placeholder="Describe the repair problem and any important details..."
              />
            </div>

            <div className="crb-location-section">
              <div className="crb-location-heading">
                <div className="crb-location-icon">
                  <Navigation size={20} />
                </div>

                <div>
                  <h3>Location Coordinates</h3>
                  <p>
                    Optional — add GPS coordinates for accurate
                    service location.
                  </p>
                </div>
              </div>

              <div className="crb-form-grid">
                <div className="crb-field">
                  <label htmlFor="crb-latitude">
                    Latitude <span className="crb-optional">(Optional)</span>
                  </label>

                  <input
                    id="crb-latitude"
                    type="number"
                    step="any"
                    min="-90"
                    max="90"
                    name="latitude"
                    value={form.latitude}
                    onChange={handleChange}
                    placeholder="e.g. 9.6615"
                  />
                </div>

                <div className="crb-field">
                  <label htmlFor="crb-longitude">
                    Longitude <span className="crb-optional">(Optional)</span>
                  </label>

                  <input
                    id="crb-longitude"
                    type="number"
                    step="any"
                    min="-180"
                    max="180"
                    name="longitude"
                    value={form.longitude}
                    onChange={handleChange}
                    placeholder="e.g. 80.0255"
                  />
                </div>
              </div>
            </div>

            <div className="crb-form-footer">
              <p>
                <ShieldCheck size={18} />
                Your booking will be submitted for review.
              </p>

              <button
                type="submit"
                className="crb-submit-btn"
                disabled={
                  loading || servicesLoading || services.length === 0
                }
              >
                {loading ? (
                  <>
                    <RefreshCw size={18} className="crb-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CalendarDays size={19} />
                    Confirm Repair Booking
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        <section className="crb-history">
          <div className="crb-history-header">
            <div>
              <div className="crb-eyebrow">
                <ClipboardList size={15} />
                YOUR BOOKING ACTIVITY
              </div>

              <h2>My Repair Bookings</h2>
              <p>
                View your service requests and track their progress.
              </p>
            </div>

            <button
              type="button"
              className="crb-refresh-btn"
              onClick={() => loadBookings(true)}
              disabled={refreshing || bookingsLoading}
            >
              <RefreshCw
                size={17}
                className={refreshing ? "crb-spin" : ""}
              />
              {refreshing ? "Refreshing..." : "Refresh Bookings"}
            </button>
          </div>

          <div className="crb-stats">
            <div className="crb-stat-card">
              <div className="crb-stat-icon blue">
                <ClipboardList size={23} />
              </div>

              <div>
                <span>Total Bookings</span>
                <strong>{bookings.length}</strong>
              </div>
            </div>

            <div className="crb-stat-card">
              <div className="crb-stat-icon orange">
                <Clock3 size={23} />
              </div>

              <div>
                <span>Pending</span>
                <strong>{pendingCount}</strong>
              </div>
            </div>

            <div className="crb-stat-card">
              <div className="crb-stat-icon green">
                <CheckCircle2 size={23} />
              </div>

              <div>
                <span>Completed</span>
                <strong>{completedCount}</strong>
              </div>
            </div>
          </div>

          {historyError && (
            <div className="crb-alert crb-alert-error" role="alert">
              <AlertCircle size={20} />
              <span>{historyError}</span>
            </div>
          )}

          {bookingsLoading ? (
            <div className="crb-empty">
              <RefreshCw size={29} className="crb-spin" />
              <p>Loading your repair bookings...</p>
            </div>
          ) : !historyError && bookings.length === 0 ? (
            <div className="crb-empty">
              <div className="crb-empty-icon">
                <Wrench size={32} />
              </div>
              <h3>No Repair Bookings Yet</h3>
              <p>Your repair requests will appear here.</p>
            </div>
          ) : !historyError ? (
            <div className="crb-booking-list">
              {bookings.map((booking) => {
                const status = String(
                  booking.status || "PENDING"
                ).toUpperCase();

                const scheduled =
                  booking.scheduled_at ||
                  booking.preferred_datetime;

                const address = [
                  booking.address_line || booking.address,
                  booking.city
                ]
                  .filter(Boolean)
                  .join(", ");

                const worker =
                  booking.worker_name ||
                  booking.assigned_worker_name ||
                  "Not assigned yet";

                const hasCoordinates =
                  booking.latitude != null &&
                  booking.longitude != null;

                const mapUrl = hasCoordinates
                  ? `https://www.google.com/maps?q=${encodeURIComponent(
                      `${booking.latitude},${booking.longitude}`
                    )}`
                  : null;

                return (
                  <article
                    key={booking.id}
                    className="crb-booking-card"
                  >
                    <div className="crb-booking-card-header">
                      <div className="crb-booking-identity">
                        <div className="crb-booking-icon">
                          <Wrench size={22} />
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
                        className={`crb-status ${getStatusClass(status)}`}
                      >
                        <span className="crb-status-dot" />
                        {status.replaceAll("_", " ")}
                      </span>
                    </div>

                    <div className="crb-booking-details">
                      <div className="crb-booking-detail">
                        <CalendarDays size={19} />
                        <div>
                          <small>Scheduled Date & Time</small>
                          <strong>{formatDate(scheduled)}</strong>
                        </div>
                      </div>

                      <div className="crb-booking-detail">
                        <MapPin size={19} />
                        <div>
                          <small>Service Location</small>
                          <strong>{address || "Not provided"}</strong>
                        </div>
                      </div>

                      <div className="crb-booking-detail">
                        <UserRound size={19} />
                        <div>
                          <small>Assigned Worker</small>
                          <strong>{worker}</strong>
                        </div>
                      </div>
                    </div>

                    {booking.problem_description && (
                      <div className="crb-booking-description">
                        <strong>Problem Description</strong>
                        <p>{booking.problem_description}</p>
                      </div>
                    )}

                    {mapUrl && (
                      <a
                        href={mapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="crb-map-link"
                      >
                        <MapPin size={16} />
                        View Map Location
                        <ExternalLink size={14} />
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
