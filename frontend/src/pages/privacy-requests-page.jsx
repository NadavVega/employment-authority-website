import React, { useEffect, useState } from "react";
import { useAuth } from "../context/auth-context";
import { privacyService } from "../services/interfaces/privacy-service";

const formatDate = (timestamp) => {
  if (!timestamp?.toDate) {
    return "לא צוין";
  }

  return timestamp.toDate().toLocaleDateString("he-IL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const PrivacyRequestsPage = () => {
  const { currentUser, userRole } = useAuth();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [message, setMessage] = useState("");

  const isAdmin = userRole === "admin";

  const loadRequests = async () => {
    setLoading(true);
    setMessage("");

    try {
      const data = await privacyService.getPendingPrivacyRequests();
      setRequests(data);
    } catch (error) {
      console.error("Failed to load privacy requests:", error);
      setMessage("Failed to load privacy requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = async (requestId) => {
    setActionLoadingId(requestId);
    setMessage("");

    try {
      await privacyService.approvePrivacyRequest(requestId, currentUser);
      setMessage("הבקשה אושרה בהצלחה.");
      await loadRequests();
    } catch (error) {
      console.error("Failed to approve privacy request:", error);
      setMessage("Failed to approve privacy request.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (requestId) => {
    setActionLoadingId(requestId);
    setMessage("");

    try {
      await privacyService.rejectPrivacyRequest(requestId, currentUser);
      setMessage("הבקשה נדחתה בהצלחה.");
      await loadRequests();
    } catch (error) {
      console.error("Failed to reject privacy request:", error);
      setMessage("Failed to reject privacy request.");
    } finally {
      setActionLoadingId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div
        dir="rtl"
        style={{
          padding: "40px",
          fontFamily: '"Assistant", "Heebo", "Arial", sans-serif',
        }}
      >
        <h1>אין הרשאה</h1>
        <p>רק מנהלת יכולה לצפות בבקשות גישה לפרטי קשר.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        dir="rtl"
        style={{
          padding: "40px",
          fontFamily: '"Assistant", "Heebo", "Arial", sans-serif',
        }}
      >
        טוען בקשות גישה...
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      style={{
        padding: "40px",
        maxWidth: "1100px",
        margin: "0 auto",
        fontFamily: '"Assistant", "Heebo", "Arial", sans-serif',
      }}
    >
      <h1
        style={{
          color: "#002b5c",
          fontSize: "38px",
          marginBottom: "12px",
          fontWeight: 700,
        }}
      >
        בקשות גישה לפרטי קשר
      </h1>

      <p style={{ color: "#555", fontSize: "17px", marginBottom: "28px" }}>
        כאן ניתן לאשר או לדחות בקשות של רכזים לצפייה בפרטי קשר פרטיים של מעסיקים.
      </p>

      {message && (
        <p
          style={{
            padding: "12px 16px",
            borderRadius: "10px",
            background: "#eef5ff",
            color: "#003f9e",
            marginBottom: "20px",
            fontWeight: 600,
          }}
        >
          {message}
        </p>
      )}

      {requests.length === 0 ? (
        <div
          style={{
            padding: "28px",
            border: "1px solid #dde3ec",
            borderRadius: "16px",
            background: "#fff",
            boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
          }}
        >
          אין בקשות ממתינות כרגע.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: "16px",
          }}
        >
          {requests.map((request) => (
            <div
              key={request.id}
              style={{
                padding: "22px",
                border: "1px solid #dde3ec",
                borderRadius: "16px",
                background: "#fff",
                boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
              }}
            >
              <h2
                style={{
                  marginTop: 0,
                  marginBottom: "14px",
                  color: "#002b5c",
                  fontSize: "22px",
                }}
              >
                בקשה מ־{request.requesterEmail}
              </h2>

              <p style={{ margin: "8px 0" }}>
                <strong>רכז מבקש:</strong> {request.requesterEmail}
              </p>

              <p style={{ margin: "8px 0" }}>
                <strong>מעסיק:</strong> {request.targetEmail}
              </p>

              <p style={{ margin: "8px 0" }}>
                <strong>סטטוס:</strong> {request.status}
              </p>

              <p style={{ margin: "8px 0" }}>
                <strong>נוצר בתאריך:</strong> {formatDate(request.createdAt)}
              </p>

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  marginTop: "18px",
                }}
              >
                <button
                  onClick={() => handleApprove(request.id)}
                  disabled={actionLoadingId === request.id}
                  style={{
                    padding: "10px 18px",
                    border: "none",
                    borderRadius: "999px",
                    background: "#0f7b35",
                    color: "white",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontFamily: "inherit",
                  }}
                >
                  {actionLoadingId === request.id ? "מאשר..." : "אשר"}
                </button>

                <button
                  onClick={() => handleReject(request.id)}
                  disabled={actionLoadingId === request.id}
                  style={{
                    padding: "10px 18px",
                    border: "none",
                    borderRadius: "999px",
                    background: "#b00020",
                    color: "white",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontFamily: "inherit",
                  }}
                >
                  {actionLoadingId === request.id ? "דוחה..." : "דחה"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PrivacyRequestsPage;