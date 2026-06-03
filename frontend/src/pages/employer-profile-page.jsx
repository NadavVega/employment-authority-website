import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/auth-context";
import { directoryService } from "../services/interfaces/directory-service";
import { privacyService } from "../services/interfaces/privacy-service";

const EmployerProfilePage = () => {
  const { employerId } = useParams();
  const { currentUser, userRole } = useAuth();

  const [employer, setEmployer] = useState(null);
  const [accessStatus, setAccessStatus] = useState("none");
  const [loading, setLoading] = useState(true);
  const [requestLoading, setRequestLoading] = useState(false);
  const [message, setMessage] = useState("");

  const isAdmin = userRole === "admin";
  const isCoordinator = userRole === "coordinator";

  // Only coordinators need to request access.
  // Admin has full access by role and should not see request/access-status UI.
  const canRequestAccess = isCoordinator;
  const hasApprovedAccess = accessStatus === "approved" || isAdmin;

  const displayRole = (role) => {
    if (role === "employer") return "מעסיק";
    if (role === "coordinator") return "רכז";
    if (role === "admin") return "מנהלת";
    return role || "לא צוין";
  };

  useEffect(() => {
    const loadEmployerProfile = async () => {
      try {
        const employerData = await directoryService.getDirectoryContactById(
          employerId
        );

        if (!employerData) {
          setMessage("Employer profile not found.");
          return;
        }

        setEmployer(employerData);

        if (currentUser && !isAdmin) {
          const status = await privacyService.getContactAccessStatus(
            currentUser,
            employerData
          );

          setAccessStatus(status);
        }
      } catch (error) {
        console.error("Failed to load employer profile:", error);
        setMessage("Failed to load employer profile.");
      } finally {
        setLoading(false);
      }
    };

    loadEmployerProfile();
  }, [employerId, currentUser, isAdmin]);

  const handleRequestAccess = async () => {
    setRequestLoading(true);
    setMessage("");

    try {
      const result = await privacyService.requestContactAccess(
        currentUser,
        employer
      );

      setAccessStatus("pending");
      setMessage(result.message || "Access request sent successfully.");
    } catch (error) {
      console.error("Failed to request access:", error);
      setMessage(error.message || "Failed to request access.");
    } finally {
      setRequestLoading(false);
    }
  };

  if (loading) {
    return (
      <div dir="rtl" style={{ padding: "40px" }}>
        טוען פרופיל מעסיק...
      </div>
    );
  }

  if (!employer) {
    return (
      <div dir="rtl" style={{ padding: "40px" }}>
        <h1>פרופיל לא נמצא</h1>
        <p>{message}</p>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      style={{
        padding: "40px",
        maxWidth: "900px",
        margin: "0 auto",
      }}
    >
      <h1>פרופיל מעסיק</h1>

      <div
        style={{
          marginTop: "24px",
          padding: "28px",
          border: "1px solid #ddd",
          borderRadius: "16px",
          background: "#fff",
          boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
        }}
      >
        <h2>{employer.organization}</h2>

        <p>
          <strong>שם איש קשר:</strong> {employer.name || "לא צוין"}
        </p>

        <p>
          <strong>תפקיד:</strong> {displayRole(employer.role)}
        </p>

        <p>
          <strong>תחום:</strong> {employer.field || "לא צוין"}
        </p>

        <p>
          <strong>כתובת:</strong> {employer.address || "לא צוין"}
        </p>

        {employer.notes && (
          <p>
            <strong>הערות:</strong> {employer.notes}
          </p>
        )}

        <hr style={{ margin: "24px 0" }} />

        <h3>פרטי קשר פרטיים</h3>

        {hasApprovedAccess ? (
          <>
            <p>
              <strong>אימייל:</strong> {employer.email || "לא צוין"}
            </p>

            <p>
              <strong>טלפון:</strong> {employer.phone || "לא צוין"}
            </p>
          </>
        ) : (
          <>
            <p>
              <strong>אימייל:</strong> מוסתר
            </p>

            <p>
              <strong>טלפון:</strong> מוסתר
            </p>

            <p style={{ color: "#666" }}>
              פרטי הקשר מוסתרים עד שהמעסיק יאשר את בקשת הגישה.
            </p>
          </>
        )}

        {!isAdmin && (
          <p>
            <strong>סטטוס גישה:</strong> {accessStatus}
          </p>
        )}

        {canRequestAccess && accessStatus === "none" && (
          <button
            onClick={handleRequestAccess}
            disabled={requestLoading}
            style={{
              marginTop: "16px",
              padding: "10px 18px",
              border: "none",
              borderRadius: "999px",
              background: "#1976d2",
              color: "white",
              cursor: "pointer",
            }}
          >
            {requestLoading ? "שולח בקשה..." : "Request Access"}
          </button>
        )}

        {!isAdmin && accessStatus === "pending" && (
          <p style={{ marginTop: "16px", color: "#b26a00" }}>
            בקשת הגישה נשלחה וממתינה לאישור המעסיק.
          </p>
        )}

        {!isAdmin && accessStatus === "rejected" && (
          <p style={{ marginTop: "16px", color: "#b00020" }}>
            בקשת הגישה נדחתה.
          </p>
        )}

        {!canRequestAccess && !hasApprovedAccess && (
          <p style={{ marginTop: "16px", color: "#777" }}>
            רק רכז יכול לבקש גישה לפרטי קשר פרטיים.
          </p>
        )}

        {message && (
          <p style={{ marginTop: "16px" }}>
            <strong>{message}</strong>
          </p>
        )}
      </div>
    </div>
  );
};

export default EmployerProfilePage;