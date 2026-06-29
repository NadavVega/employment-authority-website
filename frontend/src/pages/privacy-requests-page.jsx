import { useCallback, useEffect, useState } from "react";
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

  const currentEmail = String(currentUser?.email || "").trim().toLowerCase();
  const canUsePage = userRole === "coordinator" || userRole === "employer";

  const loadRequests = useCallback(async () => {
    if (!currentEmail || !userRole) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const data = await privacyService.getPrivacyRequestsForCurrentUser({
        email: currentEmail,
        role: userRole,
      });
      setRequests(data);
    } catch (error) {
      console.error("Failed to load privacy requests:", error);
      setMessage("Failed to load privacy requests.");
    } finally {
      setLoading(false);
    }
  }, [currentEmail, userRole]);

  useEffect(() => {
    if (!currentEmail || !userRole) {
      return;
    }

    if (!canUsePage) {
      return;
    }

    Promise.resolve().then(loadRequests);
  }, [currentEmail, userRole, canUsePage, loadRequests]);

  const canEmployerAct = (request) =>
    userRole === "employer" &&
    request.targetEmail === currentEmail &&
    request.status === "pending" &&
    request.employerApprovalStatus === "pending";

  const canCoordinatorAct = (request) =>
    userRole === "coordinator" &&
    (request.assignedCoordinatorEmail === currentEmail ||
      request.targetAssignedCoordinatorEmail === currentEmail) &&
    request.requesterEmail !== currentEmail &&
    request.status === "pending" &&
    request.employerApprovalStatus === "approved" &&
    request.coordinatorApprovalStatus === "pending";

  const canActOnRequest = (request) =>
    canEmployerAct(request) || canCoordinatorAct(request);

  const handleApprove = async (requestId) => {
    const request = requests.find((item) => item.id === requestId);

    if (!request) {
      setMessage("הבקשה לא נמצאה.");
      return;
    }

    setActionLoadingId(requestId);
    setMessage("");

    try {
      await privacyService.approvePrivacyRequest(request, currentUser);
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
    const request = requests.find((item) => item.id === requestId);

    if (!request) {
      setMessage("הבקשה לא נמצאה.");
      return;
    }

    setActionLoadingId(requestId);
    setMessage("");

    try {
      await privacyService.rejectPrivacyRequest(request, currentUser);
      setMessage("הבקשה נדחתה בהצלחה.");
      await loadRequests();
    } catch (error) {
      console.error("Failed to reject privacy request:", error);
      setMessage("Failed to reject privacy request.");
    } finally {
      setActionLoadingId(null);
    }
  };

  if (!canUsePage && userRole) {
    return (
      <div
        dir="rtl"
        style={{
          padding: "40px",
          fontFamily: '"Assistant", "Heebo", "Arial", sans-serif',
        }}
      >
        <h1>בקשות גישה לפרטי קשר</h1>
        <p>העמוד הזה רלוונטי לרכזים ולמעסיקים בלבד.</p>
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
        כאן ניתן לראות בקשות גישה שבהן את/ה משתתף/ת ולעדכן אותן כשנדרש אישורך.
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
          אין בקשות גישה להצגה כרגע.
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
                <strong>שם הרכז/ת:</strong>{" "}
                {request.requesterName || "לא צוין"}
              </p>

              <p style={{ margin: "8px 0" }}>
                <strong>מרכז:</strong>{" "}
                {request.requesterCenterName || "לא צוין"}
              </p>

              <p style={{ margin: "8px 0" }}>
                <strong>טלפון:</strong> {request.requesterPhone || "לא צוין"}
              </p>

              <p style={{ margin: "8px 0" }}>
                <strong>אימייל:</strong> {request.requesterEmail}
              </p>

              <p style={{ margin: "8px 0" }}>
                <strong>סטטוס אישור מעסיק:</strong>{" "}
                {request.employerApprovalStatus}
              </p>

              <p style={{ margin: "8px 0" }}>
                <strong>סטטוס אישור רכז משויך:</strong>{" "}
                {request.coordinatorApprovalStatus}
              </p>

              <p style={{ margin: "8px 0" }}>
                <strong>סטטוס:</strong> {request.status}
              </p>

              <p style={{ margin: "8px 0" }}>
                <strong>נוצר בתאריך:</strong> {formatDate(request.createdAt)}
              </p>

              {canActOnRequest(request) && (
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
                      cursor:
                        actionLoadingId === request.id
                          ? "not-allowed"
                          : "pointer",
                      fontWeight: "bold",
                      fontFamily: "inherit",
                      opacity: actionLoadingId === request.id ? 0.7 : 1,
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
                      cursor:
                        actionLoadingId === request.id
                          ? "not-allowed"
                          : "pointer",
                      fontWeight: "bold",
                      fontFamily: "inherit",
                      opacity: actionLoadingId === request.id ? 0.7 : 1,
                    }}
                  >
                    {actionLoadingId === request.id ? "דוחה..." : "דחה"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PrivacyRequestsPage;
