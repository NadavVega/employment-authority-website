import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth-context";
import { PageHero } from "../components/layout/PageHero";
import { privacyService } from "../services/interfaces/privacy-service";
import eventsDecoration from "../assets/images/city-view.png";
import employmentLogo from "../assets/center-icons/taasuka-logo-color.png";

import "../design/privacy-requests-page.css";

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const normalizeValue = (value) => String(value || "").trim().toLowerCase();

const formatDate = (timestamp) => {
  const date = timestamp?.toDate ? timestamp.toDate() : timestamp;

  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("he-IL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDateKey = (timestamp) => {
  const date = timestamp?.toDate ? timestamp.toDate() : timestamp;

  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const STATUS_LABELS = {
  pending: "ממתין",
  approved: "אושר",
  rejected: "נדחה",
};

const getStatusLabel = (status) => {
  const normalizedStatus = normalizeValue(status);

  return STATUS_LABELS[normalizedStatus] || status || "";
};

const getCoordinatorFilterValue = (request) =>
  [
    request.requesterName,
    request.requesterEmail,
    request.assignedCoordinatorEmail,
    request.targetAssignedCoordinatorEmail,
  ]
    .filter(Boolean)
    .join(" | ");

const isRequester = (request, currentEmail) =>
  normalizeEmail(request.requesterEmail) === currentEmail;

const isAssignedCoordinator = (request, currentEmail) =>
  normalizeEmail(request.assignedCoordinatorEmail) === currentEmail ||
  normalizeEmail(request.targetAssignedCoordinatorEmail) === currentEmail;

const getRequestLabels = (request) => ({
  requester: request.requesterName || request.requesterEmail,
  target: request.targetEmployerName || request.targetEmail,
  assignedCoordinator:
    request.targetAssignedCoordinatorEmail || request.assignedCoordinatorEmail,
});

const getStatusNote = (request, currentEmail, sectionType = "other") => {
  const requestStatus = normalizeValue(request.status);
  const employerApprovalStatus = normalizeValue(request.employerApprovalStatus);

  if (requestStatus === "approved") {
    return "הבקשה אושרה.";
  }

  if (requestStatus === "rejected") {
    return "הבקשה נדחתה.";
  }

  if (sectionType === "outgoing") {
    return "זו בקשה ששלחת. ממתינה לאישור הגורמים הרלוונטיים.";
  }

  if (isRequester(request, currentEmail)) {
    return "זו בקשה ששלחת. ממתינה לאישור הגורמים הרלוונטיים.";
  }

  if (isAssignedCoordinator(request, currentEmail) && employerApprovalStatus !== "approved") {
    return "ממתין לאישור המעסיק לפני אישור רכז.";
  }

  return "הבקשה ממתינה לאישור.";
};

const PrivacyRequestsPage = () => {
  const { currentUser, userRole } = useAuth();
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [message, setMessage] = useState("");
  const [filters, setFilters] = useState({
    status: "all",
    date: "",
    coordinator: "all",
  });

  const currentEmail = normalizeEmail(currentUser?.email);
  const normalizedUserRole = normalizeValue(userRole);
  const canUsePage =
    normalizedUserRole === "coordinator" || normalizedUserRole === "employer";

  const loadRequests = useCallback(async () => {
    if (!currentEmail || !normalizedUserRole) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const data = await privacyService.getPrivacyRequestsForCurrentUser({
        email: currentEmail,
        role: normalizedUserRole,
      });
      setRequests(data);
    } catch (error) {
      console.error("Failed to load privacy requests:", error);
      setMessage("Failed to load privacy requests.");
    } finally {
      setLoading(false);
    }
  }, [currentEmail, normalizedUserRole]);

  useEffect(() => {
    if (!currentEmail || !userRole) {
      return;
    }

    if (!canUsePage) {
      return;
    }

    Promise.resolve().then(loadRequests);
  }, [currentEmail, userRole, canUsePage, loadRequests]);

  const coordinatorOptions = useMemo(() => {
    const options = requests
      .map((request) => getCoordinatorFilterValue(request))
      .filter(Boolean);

    return Array.from(new Set(options)).sort((a, b) => a.localeCompare(b, "he"));
  }, [requests]);

  const filteredRequests = useMemo(
    () =>
      requests.filter((request) => {
        if (
          filters.status !== "all" &&
          normalizeValue(request.status) !== filters.status
        ) {
          return false;
        }

        if (filters.date && formatDateKey(request.createdAt) !== filters.date) {
          return false;
        }

        if (
          filters.coordinator !== "all" &&
          getCoordinatorFilterValue(request) !== filters.coordinator
        ) {
          return false;
        }

        return true;
      }),
    [filters, requests]
  );

  const canEmployerAct = (request) =>
    normalizedUserRole === "employer" &&
    normalizeEmail(request.targetEmail) === currentEmail &&
    normalizeValue(request.status) === "pending" &&
    normalizeValue(request.employerApprovalStatus) === "pending";

  const canCoordinatorAct = (request) =>
    normalizedUserRole === "coordinator" &&
    isAssignedCoordinator(request, currentEmail) &&
    !isRequester(request, currentEmail) &&
    normalizeValue(request.status) === "pending" &&
    normalizeValue(request.employerApprovalStatus) === "approved" &&
    normalizeValue(request.coordinatorApprovalStatus) === "pending";

  const isIncomingWaitingForEmployer = (request) =>
    normalizedUserRole === "coordinator" &&
    isAssignedCoordinator(request, currentEmail) &&
    !isRequester(request, currentEmail) &&
    normalizeValue(request.status) === "pending" &&
    normalizeValue(request.employerApprovalStatus) === "pending";

  const isIncomingRequest = (request) =>
    canEmployerAct(request) ||
    canCoordinatorAct(request) ||
    isIncomingWaitingForEmployer(request);

  const outgoingRequests = filteredRequests.filter((request) =>
    isRequester(request, currentEmail)
  );
  const incomingRequests = filteredRequests.filter(isIncomingRequest);

  const handleFilterChange = (field, value) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [field]: value,
    }));
  };

  const handleApprove = async (request) => {
    setActionLoadingId(request.id);
    setMessage("");

    try {
      if (canCoordinatorAct(request)) {
        await privacyService.approveAssignedCoordinatorPrivacyRequest(
          request,
          currentUser
        );
      } else {
        await privacyService.approvePrivacyRequest(request, currentUser);
      }
      setMessage("הבקשה אושרה בהצלחה.");
      await loadRequests();
    } catch (error) {
      console.error("Failed to approve privacy request:", error);
      setMessage("Failed to approve privacy request.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDecline = async (request) => {
    setActionLoadingId(request.id);
    setMessage("");

    try {
      if (canCoordinatorAct(request)) {
        await privacyService.rejectAssignedCoordinatorPrivacyRequest(
          request,
          currentUser
        );
      } else {
        await privacyService.rejectPrivacyRequest(request, currentUser);
      }
      setMessage("הבקשה נדחתה בהצלחה.");
      await loadRequests();
    } catch (error) {
      console.error("Failed to reject privacy request:", error);
      setMessage("Failed to reject privacy request.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const renderRequestCard = (request, sectionType) => {
    const canEmployerApprove = sectionType === "incoming" && canEmployerAct(request);
    const canCoordinatorApprove =
      sectionType === "incoming" && canCoordinatorAct(request);
    const canAct = canEmployerApprove || canCoordinatorApprove;
    const isActionLoading = actionLoadingId === request.id;
    const labels = getRequestLabels(request);
    const requestDate = formatDate(request.createdAt);

    return (
      <article className="privacy-request-card" key={request.id}>
        <div className="privacy-request-card-body">
          <h2>
            {labels.requester} מבקש/ת לצפות בפרטי {labels.target}
          </h2>

          <dl className="privacy-request-details">
            {labels.requester && (
              <div>
                <dt>המבקש</dt>
                <dd>{labels.requester}</dd>
              </div>
            )}
            {labels.target && (
              <div>
                <dt>המעסיק</dt>
                <dd>{labels.target}</dd>
              </div>
            )}
            {labels.assignedCoordinator && (
              <div>
                <dt>רכז מאשר</dt>
                <dd>{labels.assignedCoordinator}</dd>
              </div>
            )}
            {request.requesterCenterName && (
              <div>
                <dt>מרכז המבקש</dt>
                <dd>{request.requesterCenterName}</dd>
              </div>
            )}
            {request.requesterEmail && (
              <div>
                <dt>אימייל המבקש</dt>
                <dd>{request.requesterEmail}</dd>
              </div>
            )}
            {requestDate && (
              <div>
                <dt>נוצר בתאריך</dt>
                <dd>{requestDate}</dd>
              </div>
            )}
            <div>
              <dt>אישור מעסיק</dt>
              <dd>{getStatusLabel(request.employerApprovalStatus)}</dd>
            </div>
            <div>
              <dt>אישור רכז</dt>
              <dd>{getStatusLabel(request.coordinatorApprovalStatus)}</dd>
            </div>
            <div>
              <dt>סטטוס</dt>
              <dd>{getStatusLabel(request.status)}</dd>
            </div>
          </dl>
        </div>

        <div className="privacy-request-actions">
          {canAct ? (
            <>
              <button
                type="button"
                className="btn-primary pill-btn privacy-request-approve"
                onClick={() => handleApprove(request)}
                disabled={isActionLoading}
              >
                {isActionLoading
                  ? "מאשר..."
                  : canCoordinatorApprove
                    ? "אישור רכז"
                    : "אישור מעסיק"}
              </button>
              <button
                type="button"
                className="btn-secondary pill-btn privacy-request-decline"
                onClick={() => handleDecline(request)}
                disabled={isActionLoading}
              >
                {isActionLoading ? "דוחה..." : "דחייה"}
              </button>
            </>
          ) : (
            <p className="privacy-request-status-note">
              {getStatusNote(request, currentEmail, sectionType)}
            </p>
          )}
        </div>
      </article>
    );
  };

  const renderRequestSection = (title, sectionRequests, emptyText, sectionType) => (
    <section className="privacy-requests-section" aria-labelledby={`${sectionType}-privacy-requests`}>
      <div className="privacy-requests-section-header">
        <h2 id={`${sectionType}-privacy-requests`}>{title}</h2>
        <span className="privacy-requests-section-count">{sectionRequests.length}</span>
      </div>

      {sectionRequests.length === 0 ? (
        <div className="privacy-requests-empty">{emptyText}</div>
      ) : (
        <div className="privacy-requests-grid">
          {sectionRequests.map((request) => renderRequestCard(request, sectionType))}
        </div>
      )}
    </section>
  );

  if (!canUsePage && userRole) {
    return (
      <div className="privacy-requests-page" dir="rtl">
        <PageHero
          title="בקשות גישה לפרטי קשר"
          subtitle="ניהול בקשות פרטיות לרכזים ולמעסיקים"
          logoSrc={employmentLogo}
          logoAlt="רשות התעסוקה ירושלים"
          decorationSrc={eventsDecoration}
        />
        <main className="privacy-requests-content">
          <div className="privacy-requests-empty">
            העמוד הזה רלוונטי לרכזים ולמעסיקים בלבד.
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="privacy-requests-page" dir="rtl">
      <PageHero
        title="בקשות גישה לפרטי קשר"
        subtitle="בקשות שבהן נדרש אישורך או שבהן את/ה משתתף/ת"
        logoSrc={employmentLogo}
        logoAlt="רשות התעסוקה ירושלים"
        decorationSrc={eventsDecoration}
      />

      <section className="privacy-requests-filter-bar" aria-label="סינון בקשות פרטיות">
        <button
          type="button"
          className="btn-secondary pill-btn privacy-requests-return"
          onClick={() => navigate("/home")}
        >
          חזרה לעמוד הראשי
        </button>

        <select
          className="privacy-requests-filter-control"
          value={filters.status}
          onChange={(event) => handleFilterChange("status", event.target.value)}
          aria-label="סטטוס בקשה"
        >
          <option value="all">הכל</option>
          <option value="pending">ממתין</option>
          <option value="approved">אושר</option>
          <option value="rejected">נדחה</option>
        </select>

        <input
          className="privacy-requests-filter-control"
          type="date"
          value={filters.date}
          onChange={(event) => handleFilterChange("date", event.target.value)}
          aria-label="תאריך יצירת הבקשה"
          title="תאריך יצירת הבקשה"
        />

        <select
          className="privacy-requests-filter-control privacy-requests-coordinator-filter"
          value={filters.coordinator}
          onChange={(event) => handleFilterChange("coordinator", event.target.value)}
          aria-label="רכז"
        >
          <option value="all">כל הרכזים</option>
          {coordinatorOptions.map((coordinator) => (
            <option key={coordinator} value={coordinator}>
              {coordinator}
            </option>
          ))}
        </select>
      </section>

      <main className="privacy-requests-content">
        {loading ? (
          <div className="privacy-requests-empty">טוען בקשות גישה...</div>
        ) : (
          <>
            {message && <p className="privacy-requests-message">{message}</p>}

            {renderRequestSection(
              "בקשות שממתינות לאישור שלי",
              incomingRequests,
              "אין כרגע בקשות שממתינות לאישורך.",
              "incoming"
            )}

            {renderRequestSection(
              "בקשות ששלחתי",
              outgoingRequests,
              "לא שלחת בקשות גישה עדיין.",
              "outgoing"
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default PrivacyRequestsPage;
