import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/auth-context";
import { directoryService } from "../services/interfaces/directory-service";
import { privacyService } from "../services/interfaces/privacy-service";

// Design files
import "../design/global-theme.css";

const EmployerProfilePage = () => {
  const { employerId } = useParams();
  const navigate = useNavigate();
  const { currentUser, userRole } = useAuth();

  const [employer, setEmployer] = useState(null);
  const [privateDetails, setPrivateDetails] = useState(null);
  const [accessStatus, setAccessStatus] = useState("none");
  const [loading, setLoading] = useState(true);
  const [requestLoading, setRequestLoading] = useState(false);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [message, setMessage] = useState("");

  const isAdmin = userRole === "admin";
  const isCoordinator = userRole === "coordinator";

  const isEmployerContact = employer?.role === "employer";
  const isCoordinatorContact = employer?.role === "coordinator";

  const isAssignedCoordinator =
    isCoordinator &&
    employer?.assignedCoordinatorEmail &&
    currentUser?.email &&
    employer.assignedCoordinatorEmail.toLowerCase() ===
      currentUser.email.toLowerCase();

  const canRequestAccess =
    isCoordinator && isEmployerContact && !isAssignedCoordinator;

  const hasApprovedAccess =
    accessStatus === "approved" || isAdmin || isAssignedCoordinator;

  const canAssignEmployer =
    isCoordinator && isEmployerContact && !employer?.assignedCoordinatorEmail;

  const canEditEmployer =
    isCoordinator &&
    isEmployerContact &&
    employer?.assignedCoordinatorEmail &&
    currentUser?.email &&
    employer.assignedCoordinatorEmail.toLowerCase() ===
      currentUser.email.toLowerCase();

  const displayRole = (role) => {
    if (role === "employer") return "מעסיק";
    if (role === "coordinator") return "רכז";
    if (role === "admin") return "מנהלת";
    return role || "לא צוין";
  };

  const displayAccessStatus = (status) => {
    if (status === "none") return "אין בקשה";
    if (status === "pending") return "ממתין לאישור";
    if (status === "approved") return "מאושר";
    if (status === "rejected") return "נדחה";
    return status || "לא ידוע";
  };

  const displayProfileDate = (value) => {
    if (!value) return "";

    if (value?.toDate) {
      return value.toDate().toLocaleDateString("he-IL");
    }

    return String(value);
  };

  const displayPhoneNumber = (phone) => {
    if (!phone) return "";

    const cleanPhone = String(phone).trim();

    if (!cleanPhone) return "";

    if (cleanPhone.startsWith("+")) return cleanPhone;
    if (cleanPhone.startsWith("0")) return cleanPhone;
    if (/^\d+$/.test(cleanPhone)) return `0${cleanPhone}`;

    return cleanPhone;
  };

  const isVisibleValue = (value) => {
    return value && value !== "לא צוין" && String(value).trim() !== "";
  };

  const ltrValueStyle = {
    direction: "ltr",
    unicodeBidi: "plaintext",
    display: "inline-block",
    textAlign: "left",
    overflowWrap: "anywhere",
    wordBreak: "break-word",
    maxWidth: "100%",
  };

  useEffect(() => {
    const loadEmployerProfile = async () => {
      setLoading(true);
      setMessage("");
      setPrivateDetails(null);

      try {
        const employerData = await directoryService.getDirectoryContactById(
          employerId
        );

        if (!employerData) {
          setMessage("איש קשר לא נמצא.");
          return;
        }

        setEmployer(employerData);

        let status = "none";
        const coordinatorIsAssigned =
          userRole === "coordinator" &&
          employerData.assignedCoordinatorEmail &&
          currentUser?.email &&
          employerData.assignedCoordinatorEmail.toLowerCase() ===
            currentUser.email.toLowerCase();

        if (
          currentUser &&
          !isAdmin &&
          employerData.role === "employer" &&
          !coordinatorIsAssigned
        ) {
          status = await privacyService.getContactAccessStatus(
            currentUser,
            employerData
          );

          setAccessStatus(status);
        }

        if (coordinatorIsAssigned) {
          setAccessStatus("approved");
        }

        const shouldLoadPrivateDetails =
          employerData.role === "employer" &&
          (isAdmin || status === "approved" || coordinatorIsAssigned);

        if (currentUser && shouldLoadPrivateDetails) {
          try {
            const details = await privacyService.getPrivateContactDetails(
              currentUser,
              employerData
            );

            setPrivateDetails(details);
          } catch (privateDetailsError) {
            console.error(
              "Failed to load private contact details:",
              privateDetailsError
            );

            setPrivateDetails(null);
          }
        }
      } catch (error) {
        console.error("Failed to load contact profile:", error);
        setMessage("טעינת פרטי איש הקשר נכשלה.");
      } finally {
        setLoading(false);
      }
    };

    loadEmployerProfile();
  }, [employerId, currentUser, isAdmin, userRole]);

  const handleRequestAccess = async () => {
    setRequestLoading(true);
    setMessage("");

    try {
      const result = await privacyService.requestContactAccess(
        currentUser,
        employer
      );

      setAccessStatus("pending");
      setMessage(result.message || "בקשת הגישה נשלחה בהצלחה.");
    } catch (error) {
      console.error("Failed to request access:", error);
      setMessage(error.message || "שליחת בקשת הגישה נכשלה.");
    } finally {
      setRequestLoading(false);
    }
  };

  const handleAssignEmployerToCoordinator = async () => {
    setAssignmentLoading(true);
    setMessage("");

    try {
      const result = await directoryService.assignEmployerToCoordinator(
        employer.email,
        currentUser
      );

      const updatedEmployer = {
        ...employer,
        assignedCoordinatorEmail: result.assignedCoordinatorEmail,
        assignedBy: result.assignedBy,
      };

      setEmployer(updatedEmployer);

      const details = await privacyService.getPrivateContactDetails(
        currentUser,
        updatedEmployer
      );

      setPrivateDetails(details);
      setAccessStatus("approved");
      setMessage("המעסיק שויך אליך בהצלחה.");
    } catch (error) {
      console.error("Failed to assign employer to coordinator:", error);
      setMessage(error.message || "שיוך המעסיק לרכז נכשל.");
    } finally {
      setAssignmentLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        dir="rtl"
        style={{
          padding: "40px",
          fontFamily: '"Assistant", "Heebo", "Arial", sans-serif',
        }}
      >
        טוען פרטי איש קשר...
      </div>
    );
  }

  if (!employer) {
    return (
      <div
        dir="rtl"
        style={{
          padding: "40px",
          fontFamily: '"Assistant", "Heebo", "Arial", sans-serif',
        }}
      >
        <h1>איש קשר לא נמצא</h1>
        <p>{message}</p>
      </div>
    );
  }

  const displayEmail = isEmployerContact
    ? privateDetails?.directEmail || employer.email
    : employer.email;

  const rawPhone = isEmployerContact
    ? privateDetails?.phone ||
      privateDetails?.mobile ||
      privateDetails?.directPhone ||
      employer.phone ||
      ""
    : employer.phone || "";

  const displayPhone = displayPhoneNumber(rawPhone);

  const hasCompanyDetails =
    isEmployerContact &&
    (isVisibleValue(employer.logoUrl) ||
      isVisibleValue(employer.status) ||
      isVisibleValue(employer.companyId) ||
      isVisibleValue(employer.companyDescription) ||
      isVisibleValue(employer.jobsUrl) ||
      isVisibleValue(employer.lastContactNote) ||
      isVisibleValue(employer.lastContactDate));

  return (
    <div
      dir="rtl"
      style={{
        padding: "40px",
        maxWidth: "900px",
        margin: "0 auto",
        fontFamily: '"Assistant", "Heebo", "Arial", sans-serif',
      }}
    >
      <h1>פרטי איש קשר</h1>

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
        {isEmployerContact && isVisibleValue(employer.logoUrl) && (
          <div style={{ marginBottom: "18px", textAlign: "center" }}>
            <img
              src={employer.logoUrl}
              alt={`לוגו ${employer.organization || "חברה"}`}
              style={{
                maxWidth: "180px",
                maxHeight: "100px",
                objectFit: "contain",
                border: "1px solid #dde3ec",
                borderRadius: "12px",
                padding: "10px",
                background: "#fff",
              }}
            />
          </div>
        )}

        {isVisibleValue(employer.organization) && <h2>{employer.organization}</h2>}

        {isVisibleValue(employer.name) && (
          <p>
            <strong>שם איש קשר:</strong> {employer.name}
          </p>
        )}

        {isVisibleValue(employer.role) && (
          <p>
            <strong>תפקיד:</strong> {displayRole(employer.role)}
          </p>
        )}

        {isCoordinatorContact && isVisibleValue(employer.centerName) && (
          <p>
            <strong>מרכז / ארגון:</strong> {employer.centerName}
          </p>
        )}

        {isCoordinatorContact && isVisibleValue(employer.population) && (
          <p>
            <strong>אוכלוסייה:</strong> {employer.population}
          </p>
        )}

        {isCoordinatorContact && isVisibleValue(displayPhone) && (
          <p>
            <strong>טלפון:</strong>{" "}
            <span dir="ltr" style={ltrValueStyle}>
              {displayPhone}
            </span>
          </p>
        )}

        {isEmployerContact && isVisibleValue(employer.field) && (
          <p>
            <strong>תחום:</strong> {employer.field}
          </p>
        )}

        {isEmployerContact && isVisibleValue(employer.subField) && (
          <p>
            <strong>תת־תחום:</strong> {employer.subField}
          </p>
        )}

        {isEmployerContact && isVisibleValue(employer.address) && (
          <p>
            <strong>כתובת:</strong> {employer.address}
          </p>
        )}

        {isEmployerContact && (isCoordinator || isAdmin) && (
          <>
            <p>
              <strong>רכז משויך:</strong>{" "}
              {employer.assignedCoordinatorEmail
              ? employer.assignedCoordinatorEmail
              : "טרם שויך למרכז"}
            </p>

          {isVisibleValue(employer.assignedCoordinatorName) && (
           <p>
             <strong>שם רכז:</strong> {employer.assignedCoordinatorName}
          </p>
      )}
  </>
)}

        {canAssignEmployer && (
          <button
            onClick={handleAssignEmployerToCoordinator}
            disabled={assignmentLoading}
            style={{
              marginTop: "12px",
              padding: "10px 18px",
              border: "none",
              borderRadius: "999px",
              background: "#0f766e",
              color: "white",
              cursor: assignmentLoading ? "not-allowed" : "pointer",
              opacity: assignmentLoading ? 0.7 : 1,
              fontFamily: "inherit",
              fontWeight: 700,
            }}
          >
            {assignmentLoading
              ? "משייך מעסיק..."
              : "אני מרכז/ת את הקשר עם מעסיק זה"}
          </button>
        )}

        {canEditEmployer && (
          <button
            onClick={() =>
              navigate(`/directory/${encodeURIComponent(employer.email)}/edit`)
            }
            style={{
              marginTop: "12px",
              marginRight: "12px",
              padding: "10px 18px",
              border: "none",
              borderRadius: "999px",
              background: "#1976d2",
              color: "white",
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: 700,
            }}
          >
            עריכת פרטי מעסיק
          </button>
        )}

        {isVisibleValue(employer.notes) && (
          <p>
            <strong>הערות:</strong> {employer.notes}
          </p>
        )}

        {hasCompanyDetails && (
          <>
            <hr style={{ margin: "24px 0" }} />

            <h3>פרטי חברה</h3>

            {isVisibleValue(employer.status) && (
              <p>
                <strong>סטטוס קשר:</strong> {employer.status}
              </p>
            )}

            {isVisibleValue(employer.companyId) && (
              <p>
                <strong>ח.פ / מזהה חברה:</strong>{" "}
                <span dir="ltr" style={ltrValueStyle}>
                  {employer.companyId}
                </span>
              </p>
            )}

            {isVisibleValue(employer.companyDescription) && (
              <p>
                <strong>תיאור החברה:</strong> {employer.companyDescription}
              </p>
            )}

            {isVisibleValue(employer.jobsUrl) && (
              <p>
                <strong>קישור לאזור משרות:</strong>{" "}
                <a
                  href={employer.jobsUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    color: "#003f9e",
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  מעבר לאזור המשרות
                </a>
              </p>
            )}

            {isVisibleValue(employer.lastContactNote) && (
              <p>
                <strong>תיעוד קשר אחרון:</strong> {employer.lastContactNote}
              </p>
            )}

            {isVisibleValue(employer.lastContactDate) && (
              <p>
                <strong>תאריך קשר אחרון:</strong>{" "}
                {displayProfileDate(employer.lastContactDate)}
              </p>
            )}
          </>
        )}

        {isEmployerContact && (
          <>
            <hr style={{ margin: "24px 0" }} />

            <h3>פרטי קשר פרטיים</h3>

            {hasApprovedAccess ? (
              <>
                {isVisibleValue(displayEmail) && (
                  <p>
                    <strong>אימייל:</strong>{" "}
                    <span dir="ltr" style={ltrValueStyle}>
                      {displayEmail}
                    </span>
                  </p>
                )}

                {isVisibleValue(displayPhone) && (
                  <p>
                    <strong>טלפון:</strong>{" "}
                    <span dir="ltr" style={ltrValueStyle}>
                      {displayPhone}
                    </span>
                  </p>
                )}

                {!isVisibleValue(displayEmail) &&
                  !isVisibleValue(displayPhone) && (
                    <p style={{ color: "#666" }}>
                      אין פרטי קשר פרטיים שמורים עבור מעסיק זה.
                    </p>
                  )}
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
                <strong>סטטוס גישה:</strong>{" "}
                {displayAccessStatus(accessStatus)}
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
                  cursor: requestLoading ? "not-allowed" : "pointer",
                  opacity: requestLoading ? 0.7 : 1,
                  fontFamily: "inherit",
                }}
              >
                {requestLoading ? "שולח בקשה..." : "בקשת גישה לפרטי קשר"}
              </button>
            )}

            {!isAdmin && accessStatus === "pending" && (
              <p style={{ marginTop: "16px", color: "#b26a00" }}>
                בקשת הגישה נשלחה וממתינה לאישורים הנדרשים.
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
          </>
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