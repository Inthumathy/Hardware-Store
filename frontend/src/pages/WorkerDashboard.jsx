
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Wrench,
  ClipboardList,
  Clock3,
  CheckCircle2,
  PlayCircle,
  CalendarDays,
  MapPin,
  Phone,
  UserRound,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Search,
  ArrowRight,
  ShieldCheck,
  Navigation,
  History,
  X
} from "lucide-react";

import {
  getWorkerJobs,
  updateWorkerJobStatus
} from "../services/workerApi";

import "./WorkerDashboard.css";

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

const statusLabel = (status) =>
  String(status || "UNKNOWN").replaceAll("_", " ");

const statusClass = (status) => {
  if (status === "COMPLETED") return "completed";
  if (status === "IN_PROGRESS") return "progress";
  if (status === "CONFIRMED") return "confirmed";
  return "other";
};

const getAddress = (job) =>
  [job.address_line, job.city].filter(Boolean).join(", ");

const getLocationUrls = (job) => {
  const hasCoordinates =
    job.latitude !== null &&
    job.latitude !== undefined &&
    job.latitude !== "" &&
    job.longitude !== null &&
    job.longitude !== undefined &&
    job.longitude !== "";

  const destination = hasCoordinates
    ? `${job.latitude},${job.longitude}`
    : getAddress(job);

  if (!destination) return null;

  return {
    view: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`,
    directions: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
  };
};

export default function WorkerDashboard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [completionJob, setCompletionJob] = useState(null);

  const loadJobs = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const data = await getWorkerJobs();
      setJobs(data);
    } catch (err) {
      setError(err.message || "Unable to load jobs.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const stats = useMemo(() => ({
    total: jobs.length,
    confirmed: jobs.filter(
      (job) => job.status === "CONFIRMED"
    ).length,
    inProgress: jobs.filter(
      (job) => job.status === "IN_PROGRESS"
    ).length,
    completed: jobs.filter(
      (job) => job.status === "COMPLETED"
    ).length
  }), [jobs]);

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return jobs.filter((job) => {
      if (job.status === "COMPLETED") return false;

      const matchesFilter =
        filter === "ALL" || job.status === filter;

      const searchable = [
        job.id,
        job.service_name,
        job.customer_name,
        job.address_line,
        job.city
      ].join(" ").toLowerCase();

      return matchesFilter && searchable.includes(query);
    });
  }, [jobs, filter, search]);

  const completedJobs = useMemo(
    () => jobs.filter((job) => job.status === "COMPLETED"),
    [jobs]
  );

  async function handleStatusUpdate(job, nextStatus) {
    if (updatingId !== null) return;

    setUpdatingId(job.id);
    setError("");
    setMessage("");

    try {
      await updateWorkerJobStatus(job.id, nextStatus);

      if (nextStatus === "COMPLETED") {
        setCompletionJob(null);
      }

      setMessage(
        `Job #${job.id} updated to ${statusLabel(nextStatus)} successfully.`
      );

      await loadJobs(true);
    } catch (err) {
      setError(err.message || "Unable to update job status.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <main className="wd-page">
      <div className="wd-container">

        {/* HEADER */}

        <header className="wd-hero">
          <div>
            <div className="wd-eyebrow">
              <Wrench size={15} />
              HARDWARE STORE / WORKER PORTAL
            </div>

            <h1>Worker Dashboard</h1>

            <p>
              Manage assigned repair jobs, customer visits
              and daily work progress.
            </p>
          </div>

          <div className="wd-hero-icon">
            <Wrench size={34} />
          </div>
        </header>

        <div className="wd-notice">
          <ShieldCheck size={19} />
          <span>
            You can view and update only repair jobs assigned to you.
          </span>
        </div>

        {/* MESSAGES */}

        {error && (
          <div className="wd-alert wd-alert-error" role="alert">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="wd-alert wd-alert-success" role="status">
            <CheckCircle2 size={20} />
            <span>{message}</span>
          </div>
        )}

        {/* STATISTICS */}

        <section className="wd-stats">
          {[
            {
              label: "Total Assigned Jobs",
              value: stats.total,
              icon: ClipboardList,
              color: "blue"
            },
            {
              label: "Confirmed Jobs",
              value: stats.confirmed,
              icon: Clock3,
              color: "orange"
            },
            {
              label: "In Progress",
              value: stats.inProgress,
              icon: PlayCircle,
              color: "purple"
            },
            {
              label: "Completed Jobs",
              value: stats.completed,
              icon: CheckCircle2,
              color: "green"
            }
          ].map((stat) => {
            const Icon = stat.icon;

            return (
              <div className="wd-stat-card" key={stat.label}>
                <div className={`wd-stat-icon ${stat.color}`}>
                  <Icon size={24} />
                </div>

                <div>
                  <span>{stat.label}</span>
                  <strong>{stat.value}</strong>
                </div>
              </div>
            );
          })}
        </section>

        {/* ACTIVE JOBS */}

        <section className="wd-jobs-section">
          <div className="wd-section-heading">
            <div>
              <div className="wd-eyebrow">
                <ClipboardList size={15} />
                MY WORK SCHEDULE
              </div>

              <h2>Assigned Repair Jobs</h2>

              <p>
                Review customer requests and update job progress.
              </p>
            </div>

            <button
              type="button"
              className="wd-refresh-btn"
              onClick={() => loadJobs(true)}
              disabled={refreshing || loading}
            >
              <RefreshCw
                size={17}
                className={refreshing ? "wd-spin" : ""}
              />

              {refreshing ? "Refreshing..." : "Refresh Jobs"}
            </button>
          </div>

          {/* SEARCH AND FILTER */}

          <div className="wd-toolbar">
            <div className="wd-search">
              <Search size={19} />

              <input
                type="search"
                placeholder="Search by job, service, customer, city..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <select
              className="wd-filter"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              aria-label="Filter jobs by status"
            >
              <option value="ALL">All Active Jobs</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="IN_PROGRESS">In Progress</option>
            </select>
          </div>

          {/* JOB CARDS */}

          {loading ? (
            <div className="wd-empty">
              <RefreshCw size={30} className="wd-spin" />
              <p>Loading your assigned repair jobs...</p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="wd-empty">
              <div className="wd-empty-icon">
                <ClipboardList size={30} />
              </div>

              <h3>No Active Repair Jobs Found</h3>

              <p>
                {jobs.length === 0
                  ? "Jobs assigned by admin will appear here."
                  : "No active jobs match your search or filter."}
              </p>
            </div>
          ) : (
            <div className="wd-job-list">
              {filteredJobs.map((job) => {
                const isUpdating = updatingId === job.id;
                const address = getAddress(job);
                const location = getLocationUrls(job);

                return (
                  <article className="wd-job-card" key={job.id}>
                    <div className="wd-job-header">
                      <div className="wd-job-title">
                        <div className="wd-job-icon">
                          <Wrench size={22} />
                        </div>

                        <div>
                          <h3>
                            {job.service_name || "Repair Service"}
                          </h3>
                          <span>Job #{job.id}</span>
                        </div>
                      </div>

                      <span
                        className={`wd-status ${statusClass(job.status)}`}
                      >
                        <span className="wd-status-dot" />
                        {statusLabel(job.status)}
                      </span>
                    </div>

                    <div className="wd-job-details">
                      <div className="wd-detail">
                        <UserRound size={19} />

                        <div>
                          <small>Customer</small>
                          <strong>
                            {job.customer_name || "Not available"}
                          </strong>
                        </div>
                      </div>

                      <div className="wd-detail">
                        <Phone size={19} />

                        <div>
                          <small>Contact Number</small>

                          {job.customer_phone ? (
                            <a href={`tel:${job.customer_phone}`}>
                              {job.customer_phone}
                            </a>
                          ) : (
                            <strong>Not available</strong>
                          )}
                        </div>
                      </div>

                      <div className="wd-detail">
                        <CalendarDays size={19} />

                        <div>
                          <small>Scheduled Visit</small>
                          <strong>
                            {formatDate(job.scheduled_at)}
                          </strong>
                        </div>
                      </div>

                      <div className="wd-detail">
                        <MapPin size={19} />

                        <div>
                          <small>Service Location</small>
                          <strong>
                            {address || "Not available"}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {job.problem_description && (
                      <div className="wd-description">
                        <strong>Repair Problem</strong>
                        <p>{job.problem_description}</p>
                      </div>
                    )}

                    <div className="wd-job-footer">
                      <div className="wd-contact-actions">

                        {job.customer_phone && (
                          <a
                            className="wd-contact-btn"
                            href={`tel:${job.customer_phone}`}
                          >
                            <Phone size={17} />
                            Call Customer
                          </a>
                        )}

                        {location && (
                          <>
                            <a
                              href={location.view}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="wd-map-btn"
                            >
                              <MapPin size={17} />
                              View Location
                              <ExternalLink size={15} />
                            </a>

                            <a
                              href={location.directions}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="wd-directions-btn"
                            >
                              <Navigation size={17} />
                              Get Directions
                            </a>
                          </>
                        )}
                      </div>

                      <div className="wd-actions">
                        {job.status === "CONFIRMED" && (
                          <button
                            type="button"
                            className="wd-action-btn wd-start-btn"
                            disabled={updatingId !== null}
                            onClick={() =>
                              handleStatusUpdate(job, "IN_PROGRESS")
                            }
                          >
                            {isUpdating ? (
                              <RefreshCw
                                size={17}
                                className="wd-spin"
                              />
                            ) : (
                              <PlayCircle size={18} />
                            )}

                            {isUpdating ? "Updating..." : "Start Job"}

                            {!isUpdating && (
                              <ArrowRight size={17} />
                            )}
                          </button>
                        )}

                        {job.status === "IN_PROGRESS" && (
                          <button
                            type="button"
                            className="wd-action-btn wd-complete-btn"
                            disabled={updatingId !== null}
                            onClick={() => setCompletionJob(job)}
                          >
                            <CheckCircle2 size={18} />
                            Mark as Completed
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* COMPLETED JOB HISTORY */}

        <section className="wd-history-section">
          <div className="wd-history-heading">
            <div>
              <div className="wd-eyebrow">
                <History size={15} />
                WORK HISTORY
              </div>

              <h2>Completed Job History</h2>
              <p>
                Repair jobs you have successfully completed.
              </p>
            </div>

            <span className="wd-history-count">
              <CheckCircle2 size={17} />
              {completedJobs.length} Completed
            </span>
          </div>

          {loading ? (
            <div className="wd-history-empty">
              Loading completed jobs...
            </div>
          ) : completedJobs.length === 0 ? (
            <div className="wd-history-empty">
              No completed repair jobs yet.
            </div>
          ) : (
            <div className="wd-history-grid">
              {completedJobs.map((job) => {
                const location = getLocationUrls(job);

                return (
                  <article
                    className="wd-history-card"
                    key={job.id}
                  >
                    <div className="wd-history-card-top">
                      <div>
                        <h3>
                          {job.service_name || "Repair Service"}
                        </h3>
                        <p>Job #{job.id}</p>
                      </div>

                      <span className="wd-status completed">
                        <CheckCircle2 size={14} />
                        COMPLETED
                      </span>
                    </div>

                    <p>
                      <strong>Customer:</strong>{" "}
                      {job.customer_name || "Not available"}
                    </p>

                    <p>
                      <strong>Scheduled Visit:</strong>{" "}
                      {formatDate(job.scheduled_at)}
                    </p>

                    <p>
                      <strong>Location:</strong>{" "}
                      {getAddress(job) || "Not available"}
                    </p>

                    <div className="wd-contact-actions">
                      {job.customer_phone && (
                        <a
                          className="wd-contact-btn"
                          href={`tel:${job.customer_phone}`}
                        >
                          <Phone size={16} />
                          Call Customer
                        </a>
                      )}

                      {location && (
                        <a
                          className="wd-directions-btn"
                          href={location.directions}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Navigation size={16} />
                          Get Directions
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* JOB COMPLETION CONFIRMATION */}

      {completionJob && (
        <div
          className="wd-modal-overlay"
          onClick={() => {
            if (updatingId === null) {
              setCompletionJob(null);
            }
          }}
        >
          <div
            className="wd-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wd-completion-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="wd-modal-icon">
              <CheckCircle2 size={32} />
            </div>

            <h2 id="wd-completion-title">
              Confirm Job Completion
            </h2>

            <p>
              Have you finished{" "}
              <strong>{completionJob.service_name}</strong>
              {" "}(Job #{completionJob.id})?
            </p>

            <p>
              Confirming will mark this job as completed
              and move it to your Completed Job History.
            </p>

            <div className="wd-modal-actions">
              <button
                type="button"
                className="wd-modal-cancel"
                disabled={updatingId !== null}
                onClick={() => setCompletionJob(null)}
              >
                <X size={17} />
                Cancel
              </button>

              <button
                type="button"
                className="wd-modal-confirm"
                disabled={updatingId !== null}
                onClick={() =>
                  handleStatusUpdate(
                    completionJob,
                    "COMPLETED"
                  )
                }
              >
                {updatingId !== null ? (
                  <RefreshCw
                    size={17}
                    className="wd-spin"
                  />
                ) : (
                  <CheckCircle2 size={17} />
                )}

                {updatingId !== null
                  ? "Saving..."
                  : "Yes, Complete Job"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
