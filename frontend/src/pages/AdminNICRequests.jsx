
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  ShieldCheck
} from "lucide-react";

import {
  getPendingNICRequests,
  approveNIC,
  rejectNIC
} from "../services/verificationApi";

export default function AdminNICRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewNote, setReviewNote] = useState("");
  const [evidenceReviewed, setEvidenceReviewed] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadRequests = async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getPendingNICRequests();
      const data = result.data;

      setRequests(
        Array.isArray(data)
          ? data
          : Array.isArray(data?.requests)
            ? data.requests
            : []
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Failed to load NIC requests"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = async (id) => {
    if (!evidenceReviewed || reviewNote.trim().length < 10) {
      setError(
        "Confirm evidence review and enter at least 10 characters."
      );
      return;
    }

    const confirmed = window.confirm(
      `Approve NIC request #${id} after completing identity review?`
    );

    if (!confirmed) return;

    setProcessingId(id);
    setError("");
    setMessage("");

    try {
      await approveNIC(id, reviewNote.trim());

      setMessage(`NIC request #${id} approved successfully.`);
      setReviewingId(null);
      setReviewNote("");
      setEvidenceReviewed(false);

      await loadRequests();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Failed to approve NIC request"
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm(`Reject NIC request #${id}?`)) {
      return;
    }

    setProcessingId(id);
    setError("");
    setMessage("");

    try {
      await rejectNIC(id);
      setMessage(`NIC request #${id} rejected.`);
      await loadRequests();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Failed to reject NIC request"
      );
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>
              <ShieldCheck size={17} />
              ADMINISTRATION
            </p>

            <h1 style={styles.title}>
              Admin NIC Verification
            </h1>

            <p style={styles.subtitle}>
              Review customer identity submissions before
              granting verified access.
            </p>
          </div>

          <button
            type="button"
            onClick={loadRequests}
            disabled={loading || processingId !== null}
            style={styles.refresh}
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </header>

        {error && (
          <div role="alert" style={styles.error}>
            {error}
          </div>
        )}

        {message && (
          <div role="status" style={styles.success}>
            {message}
          </div>
        )}

        {loading ? (
          <p>Loading NIC requests...</p>
        ) : requests.length === 0 ? (
          <div style={styles.empty}>
            <CheckCircle2 size={36} color="#16a34a" />
            <h2>No Pending Requests</h2>
            <p>All NIC requests have been reviewed.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Request ID</th>
                  <th style={styles.th}>Customer</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Submitted</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td style={styles.td}>
                      <strong>#{request.id}</strong>
                    </td>

                    <td style={styles.td}>
                      <strong>
                        {request.full_name ||
                          `Customer #${request.user_id}`}
                      </strong>

                      <div style={styles.secondaryText}>
                        {request.email || ""}
                      </div>
                    </td>

                    <td style={styles.td}>
                      <span style={styles.pending}>
                        {request.status}
                      </span>
                    </td>

                    <td style={styles.td}>
                      {request.created_at
                        ? new Date(
                            request.created_at
                          ).toLocaleString()
                        : "—"}
                    </td>

                    <td style={styles.td}>
                      <div style={styles.actions}>
                        <button
                          type="button"
                          style={styles.approve}
                          disabled={processingId !== null}
                          onClick={() => {
                            setError("");
                            setReviewingId(
                              reviewingId === request.id
                                ? null
                                : request.id
                            );
                            setReviewNote("");
                            setEvidenceReviewed(false);
                          }}
                        >
                          <CheckCircle2 size={16} />
                          Review / Approve
                        </button>

                        <button
                          type="button"
                          style={styles.reject}
                          disabled={processingId !== null}
                          onClick={() =>
                            handleReject(request.id)
                          }
                        >
                          <XCircle size={16} />
                          {processingId === request.id
                            ? "Processing..."
                            : "Reject"}
                        </button>
                      </div>

                      {reviewingId === request.id && (
                        <div style={styles.reviewPanel}>
                          <p style={styles.reviewWarning}>
                            Verify the customer's identity using
                            an approved, secure review process.
                            NIC format alone is not sufficient.
                          </p>

                          <label
                            htmlFor={`note-${request.id}`}
                            style={styles.label}
                          >
                            Identity review note
                          </label>

                          <textarea
                            id={`note-${request.id}`}
                            rows={3}
                            value={reviewNote}
                            onChange={(event) =>
                              setReviewNote(event.target.value)
                            }
                            placeholder="Describe the evidence reviewed"
                            style={styles.textarea}
                          />

                          <label style={styles.checkboxLabel}>
                            <input
                              type="checkbox"
                              checked={evidenceReviewed}
                              onChange={(event) =>
                                setEvidenceReviewed(
                                  event.target.checked
                                )
                              }
                            />
                            I confirm that identity evidence
                            has been reviewed.
                          </label>

                          <button
                            type="button"
                            style={styles.approve}
                            disabled={
                              processingId !== null ||
                              !evidenceReviewed ||
                              reviewNote.trim().length < 10
                            }
                            onClick={() =>
                              handleApprove(request.id)
                            }
                          >
                            {processingId === request.id
                              ? "Approving..."
                              : "Confirm Approval"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p style={styles.note}>
          Only approve NIC requests after genuine identity
          evidence has been checked. Email verification
          is also required for customer purchasing access.
        </p>
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "32px 20px",
    background: "#f4f6f9"
  },
  card: {
    maxWidth: "1200px",
    margin: "0 auto",
    background: "#fff",
    padding: "30px",
    borderRadius: "14px",
    boxShadow: "0 8px 28px rgba(15,23,42,0.05)"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap",
    marginBottom: "25px"
  },
  eyebrow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "#f58a24",
    fontWeight: 700,
    fontSize: "13px"
  },
  title: {
    fontSize: "32px",
    color: "#10233d",
    margin: "10px 0"
  },
  subtitle: {
    color: "#64748b",
    fontSize: "15px"
  },
  refresh: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "11px 17px",
    background: "#10233d",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
    minWidth: "800px"
  },
  th: {
    padding: "16px",
    background: "#f4f6f9",
    color: "#64748b",
    fontSize: "12px",
    textTransform: "uppercase"
  },
  td: {
    padding: "17px 16px",
    borderBottom: "1px solid #e2e8f0",
    verticalAlign: "top"
  },
  secondaryText: {
    color: "#64748b",
    fontSize: "12px",
    marginTop: "5px"
  },
  pending: {
    background: "#fff7ed",
    color: "#c2410c",
    padding: "6px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 700
  },
  actions: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap"
  },
  approve: {
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    padding: "10px 14px",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer"
  },
  reject: {
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    padding: "10px 14px",
    background: "#dc2626",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer"
  },
  reviewPanel: {
    marginTop: "14px",
    padding: "16px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    minWidth: "260px"
  },
  reviewWarning: {
    fontSize: "13px",
    color: "#92400e"
  },
  label: {
    display: "block",
    fontWeight: 600,
    marginBottom: "8px"
  },
  textarea: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px",
    border: "1px solid #cbd5e1",
    borderRadius: "7px",
    marginBottom: "12px"
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
    fontSize: "13px",
    marginBottom: "14px"
  },
  note: {
    marginTop: "24px",
    color: "#64748b",
    fontSize: "13px"
  },
  error: {
    padding: "13px",
    background: "#fee2e2",
    color: "#991b1b",
    borderRadius: "8px",
    marginBottom: "15px"
  },
  success: {
    padding: "13px",
    background: "#dcfce7",
    color: "#166534",
    borderRadius: "8px",
    marginBottom: "15px"
  },
  empty: {
    textAlign: "center",
    padding: "55px 20px",
    color: "#64748b"
  }
};
