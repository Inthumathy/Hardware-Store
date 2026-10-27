
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
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
  PackageCheck
} from "lucide-react";
import "./RepairBooking.css";

const API =
  import.meta.env.VITE_API_URL || "http://localhost:5001/api";

const initialForm = {
  service_id: "",
  address: "",
  city: "",
  preferred_datetime: "",
  problem_description: "",
  location_url: ""
};

const formatMoney = (value) =>
  `Rs. ${Number(value || 0).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

const formatDate = (value) => {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";

  return date.toLocaleString("en-LK", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
};

const getMinDateTime = () => {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};

export default function RepairBooking() {
  const [services, setServices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [form, setForm] = useState(initialForm);

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token") || ""}`
  });

  const fetchServices = async () => {
    setServicesLoading(true);

    try {
      const response = await axios.get(`${API}/repairs/services`);
      const data = response.data.data || response.data.services || [];
      setServices(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load repair services. Please try again."
      );
    } finally {
      setServicesLoading(false);
    }
  };

  const fetchBookings = async (refresh = false) => {
    if (!localStorage.getItem("token")) {
      setBookingsLoading(false);
      return;
    }

    if (refresh) setRefreshing(true);
    else setBookingsLoading(true);

    setHistoryError("");

    try {
      const response = await axios.get(`${API}/repairs/bookings/my`, {
        headers: getAuthHeaders()
      });

      const data = response.data.data || response.data.bookings || [];
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      setHistoryError(
        err.response?.data?.message || "Unable to load your bookings."
      );
    } finally {
      setBookingsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchServices();
    fetchBookings();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!localStorage.getItem("token")) {
      setError("Please login before booking a repair service.");
      return;
    }

    if (new Date(form.preferred_datetime).getTime() <= Date.now()) {
      setError("Please select a future appointment date and time.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${API}/repairs/bookings`,
        {
          ...form,
          service_id: Number(form.service_id)
        },
        { headers: getAuthHeaders() }
      );

      const bookingId =
        response.data?.data?.id ||
        response.data?.data?.bookingId ||
        response.data?.bookingId;

      setMessage(
        bookingId
          ? `Repair booking #${bookingId} created successfully!`
          : "Repair booking submitted successfully!"
      );

      setForm({ ...initialForm });
      await fetchBookings();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to submit repair booking. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const selectedService = services.find(
    (service) => String(service.id) === String(form.service_id)
  );

  const pendingCount = bookings.filter(
    (booking) => String(booking.status).toUpperCase() === "PENDING"
  ).length;

  const completedCount = bookings.filter((booking) =>
    ["COMPLETED", "FINISHED"].includes(
      String(booking.status).toUpperCase()
    )
  ).length;

  return (
    <main className="repair-page">
      <div className="repair-container">
        <div className="repair-breadcrumb">
          <Link to="/customer/dashboard">
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
          <span>/</span>
          <span>Repair Services</span>
        </div>

        <header className="repair-hero">
          <div>
            <div className="repair-eyebrow">
              <Wrench size={15} />
              CUSTOMER / REPAIR SERVICES
            </div>
            <h1>Book a Repair Service</h1>
            <p>
              Schedule a repair worker for your hardware maintenance
              and repair needs.
            </p>
          </div>

          <div className="repair-hero-icon">
            <Wrench size={32} />
          </div>
        </header>

        <div className="repair-info-strip">
          <div>
            <ShieldCheck size={20} />
            <span>Secure booking request</span>
          </div>
          <div>
            <CalendarDays size={20} />
            <span>Choose your preferred schedule</span>
          </div>
          <div>
            <MapPin size={20} />
            <span>Specify your service location</span>
          </div>
        </div>

        {message && (
          <div className="repair-alert repair-alert-success" role="status">
            <CheckCircle2 size={21} />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="repair-alert repair-alert-error" role="alert">
            <AlertCircle size={21} />
            <span>{error}</span>
          </div>
        )}

        <section className="repair-form-card">
          <div className="repair-section-header">
            <div className="repair-section-icon">
              <ClipboardList size={23} />
            </div>
            <div>
              <h2>New Repair Booking</h2>
              <p>Fill in the details below to request a repair service.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="repair-form">
            <div className="repair-field">
              <label htmlFor="repair-service">
                Repair Service <span>*</span>
              </label>
              <select
                id="repair-service"
                name="service_id"
                value={form.service_id}
                onChange={handleChange}
                disabled={servicesLoading}
                required
              >
                <option value="">
                  {servicesLoading
                    ? "Loading repair services..."
                    : "Select a repair service"}
                </option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} — {formatMoney(service.base_price)}
                  </option>
                ))}
              </select>

              {selectedService && (
                <div className="repair-selected-service">
                  <Wrench size={18} />
                  <span>{selectedService.name}</span>
                  <strong>
                    Base price: {formatMoney(selectedService.base_price)}
                  </strong>
                </div>
              )}
            </div>

            <div className="repair-form-grid">
              <div className="repair-field">
                <label htmlFor="repair-address">
                  Service Address <span>*</span>
                </label>
                <input
                  id="repair-address"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="House number, street, area"
                  required
                />
              </div>

              <div className="repair-field">
                <label htmlFor="repair-city">
                  City <span>*</span>
                </label>
                <input
                  id="repair-city"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  placeholder="Enter your city"
                  required
                />
              </div>
            </div>

            <div className="repair-field">
              <label htmlFor="repair-date">
                Preferred Date & Time <span>*</span>
              </label>
              <input
                id="repair-date"
                type="datetime-local"
                name="preferred_datetime"
                value={form.preferred_datetime}
                min={getMinDateTime()}
                onChange={handleChange}
                required
              />
              <small>
                Select the date and time you would prefer the worker to visit.
              </small>
            </div>

            <div className="repair-field">
              <label htmlFor="repair-description">
                Problem Description
              </label>
              <textarea
                id="repair-description"
                name="problem_description"
                value={form.problem_description}
                onChange={handleChange}
                placeholder="Describe the problem, affected area, and any important details..."
                rows={4}
              />
            </div>

            <div className="repair-field">
              <label htmlFor="repair-location">
                Google Maps Location Link
                <span className="repair-optional"> (Optional)</span>
              </label>
              <div className="repair-location-input">
                <MapPin size={19} />
                <input
                  id="repair-location"
                  name="location_url"
                  type="url"
                  value={form.location_url}
                  onChange={handleChange}
                  placeholder="https://maps.google.com/..."
                />
              </div>
              <small>
                Sharing a map link can help the worker locate your address.
              </small>
            </div>

            <div className="repair-form-footer">
              <p>
                <ShieldCheck size={18} />
                Your booking will be submitted for review.
              </p>

              <button
                type="submit"
                className="repair-submit-btn"
                disabled={loading || servicesLoading || services.length === 0}
              >
                {loading ? (
                  <>
                    <RefreshCw size={18} className="repair-spin" />
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

        <section className="repair-history-section">
          <div className="repair-history-heading">
            <div>
              <div className="repair-eyebrow">
                <PackageCheck size={15} />
                YOUR BOOKING ACTIVITY
              </div>
              <h2>My Repair Bookings</h2>
              <p>View your appointments and track their current status.</p>
            </div>

            <button
              type="button"
              className="repair-refresh-btn"
              onClick={() => fetchBookings(true)}
              disabled={refreshing || bookingsLoading}
            >
              <RefreshCw
                size={17}
                className={refreshing ? "repair-spin" : ""}
              />
              {refreshing ? "Refreshing..." : "Refresh Bookings"}
            </button>
          </div>

          <div className="repair-stats">
            <div className="repair-stat">
              <div className="repair-stat-icon blue">
                <ClipboardList size={23} />
              </div>
              <div>
                <span>Total Bookings</span>
                <strong>{bookings.length}</strong>
              </div>
            </div>

            <div className="repair-stat">
              <div className="repair-stat-icon orange">
                <Clock3 size={23} />
              </div>
              <div>
                <span>Pending</span>
                <strong>{pendingCount}</strong>
              </div>
            </div>

            <div className="repair-stat">
              <div className="repair-stat-icon green">
                <CheckCircle2 size={23} />
              </div>
              <div>
                <span>Completed</span>
                <strong>{completedCount}</strong>
              </div>
            </div>
          </div>

          {historyError && (
            <div className="repair-alert repair-alert-error" role="alert">
              <AlertCircle size={20} />
              <span>{historyError}</span>
            </div>
          )}

          {bookingsLoading ? (
            <div className="repair-empty">
              <RefreshCw size={29} className="repair-spin" />
              <p>Loading your repair bookings...</p>
            </div>
          ) : !historyError && bookings.length === 0 ? (
            <div className="repair-empty">
              <div className="repair-empty-icon">
                <Wrench size={32} />
              </div>
              <h3>No repair bookings yet</h3>
              <p>Your submitted repair requests will appear here.</p>
            </div>
          ) : !historyError ? (
            <div className="repair-booking-list">
              {bookings.map((booking) => {
                const status = String(
                  booking.status || "PENDING"
                ).toUpperCase();

                const statusClass = [
                  "COMPLETED",
                  "FINISHED"
                ].includes(status)
                  ? "completed"
                  : ["CANCELLED", "REJECTED"].includes(status)
                    ? "cancelled"
                    : ["CONFIRMED", "ASSIGNED", "IN_PROGRESS"].includes(
                        status
                      )
                      ? "processing"
                      : "pending";

                const worker =
                  booking.worker_name ||
                  booking.assigned_worker_name ||
                  "Not assigned yet";

                return (
                  <article className="repair-booking-card" key={booking.id}>
                    <div className="repair-booking-card-header">
                      <div className="repair-booking-identity">
                        <div className="repair-booking-icon">
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

                      <span className={`repair-status ${statusClass}`}>
                        <span className="repair-status-dot" />
                        {status.replaceAll("_", " ")}
                      </span>
                    </div>

                    <div className="repair-booking-details">
                      <div className="repair-booking-detail">
                        <CalendarDays size={19} />
                        <div>
                          <small>Preferred Schedule</small>
                          <strong>
                            {formatDate(booking.preferred_datetime)}
                          </strong>
                        </div>
                      </div>

                      <div className="repair-booking-detail">
                        <MapPin size={19} />
                        <div>
                          <small>Service Location</small>
                          <strong>
                            {[booking.address, booking.city]
                              .filter(Boolean)
                              .join(", ") || "Not provided"}
                          </strong>
                        </div>
                      </div>

                      <div className="repair-booking-detail">
                        <UserRound size={19} />
                        <div>
                          <small>Assigned Worker</small>
                          <strong>{worker}</strong>
                        </div>
                      </div>
                    </div>

                    {booking.problem_description && (
                      <div className="repair-booking-description">
                        <strong>Problem Description</strong>
                        <p>{booking.problem_description}</p>
                      </div>
                    )}

                    {booking.location_url &&
                      /^https?:\/\//i.test(booking.location_url) && (
                        <a
                          href={booking.location_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="repair-map-link"
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
