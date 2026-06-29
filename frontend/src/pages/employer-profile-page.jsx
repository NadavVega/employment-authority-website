import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AssignmentIndOutlinedIcon from "@mui/icons-material/AssignmentIndOutlined";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import CorporateFareOutlinedIcon from "@mui/icons-material/CorporateFareOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import LocalPhoneOutlinedIcon from "@mui/icons-material/LocalPhoneOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import NotesOutlinedIcon from "@mui/icons-material/NotesOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import { useAuth } from "../context/auth-context";
import { PageHero } from "../components/layout/PageHero";
import { directoryService } from "../services/interfaces/directory-service";
import { privacyService } from "../services/interfaces/privacy-service";
import { CENTER_COLORS } from "../utils/centerColors";
import { getCenterIcon, getEventCenterName } from "../utils/centerIcons";
import eventsDecoration from "../assets/images/city-view.png";
import employmentLogo from "../assets/center-icons/taasuka-logo-color.png";

// Design files
import "../design/global-theme.css";
import "../design/employer-profile-page.css";

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const isVisibleValue = (value) => {
  return value && value !== "לא צוין" && String(value).trim() !== "";
};

const getAssignedCoordinatorEmail = (contact) =>
  normalizeEmail(
    contact?.assignedCoordinatorEmail ||
      contact?.profile?.assignedCoordinatorEmail ||
      contact?.coordinatorEmail ||
      contact?.profile?.coordinatorEmail
  );

const getContactCenterCandidates = (contact) => [
  contact?.centerName,
  contact?.center,
  contact?.organization,
  contact?.profile?.centerName,
  contact?.profile?.center,
  contact?.rawData?.profile?.centerName,
  contact?.rawData?.profile?.center,
  contact?.rawData?.centerName,
  contact?.rawData?.center,
];

const getContactCenterIdentity = (contact) => {
  const matchedCenterName = getContactCenterCandidates(contact)
    .filter(isVisibleValue)
    .map((candidate) => getEventCenterName(candidate))
    .find((centerName) => Boolean(getCenterIcon(centerName)));

  const rawCenterName = getContactCenterCandidates(contact)
    .filter(isVisibleValue)
    .map((candidate) => String(candidate || "").trim())
    .find(Boolean);

  const centerName = matchedCenterName || rawCenterName || "מרכז לא מזוהה";

  return {
    centerName,
    icon: matchedCenterName ? getCenterIcon(centerName) : employmentLogo,
    color: matchedCenterName
      ? CENTER_COLORS[centerName] || "var(--color-brand)"
      : "#64748B",
    isMatched: Boolean(matchedCenterName),
  };
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

const DetailItem = ({ icon, label, value, ltr = false, children }) => {
  if (value !== undefined && !isVisibleValue(value)) return null;
  if (value === undefined && !children) return null;

  return (
    <div className="employer-profile-detail-item">
      <span className="employer-profile-detail-icon" aria-hidden="true">
        {icon}
      </span>
      <div className="employer-profile-detail-content">
        <span className="employer-profile-detail-label">{label}</span>
        <span
          className="employer-profile-detail-value"
          dir={ltr ? "ltr" : undefined}
          style={ltr ? ltrValueStyle : undefined}
        >
          {children || value}
        </span>
      </div>
    </div>
  );
};

const SectionCard = ({ title, icon, children, className = "" }) => (
  <section className={`employer-profile-section-card ${className}`}>
    <div className="employer-profile-section-heading">
      <span className="employer-profile-section-icon" aria-hidden="true">
        {icon}
      </span>
      <h2>{title}</h2>
    </div>
    {children}
  </section>
);

const EmptyState = ({ icon, children }) => (
  <div className="employer-profile-empty-state">
    <span aria-hidden="true">{icon}</span>
    <p>{children}</p>
  </div>
);

const ContactIdentityCard = ({
  employer,
  isCoordinatorContact,
  isEmployerContact,
  centerIdentity,
  displayRole,
}) => {
  const accentColor = isCoordinatorContact
    ? centerIdentity.color
    : "var(--color-brand)";
  const logoSrc = isCoordinatorContact ? centerIdentity.icon : employer.logoUrl;
  const organizationName = isCoordinatorContact
    ? centerIdentity.centerName
    : employer.organization;
  const contactName =
    employer.name || (isCoordinatorContact ? employer.email : "") || "איש קשר";
  const roleLine = [
    displayRole(employer.role),
    isCoordinatorContact && employer.population,
  ]
    .filter(isVisibleValue)
    .join(" · ");

  return (
    <section
      className="employer-profile-identity-card"
      style={{ "--contact-accent": accentColor }}
    >
      <div className="employer-profile-identity-accent" aria-hidden="true" />
      <div className="employer-profile-identity-logo">
        {isVisibleValue(logoSrc) ? (
          <img
            src={logoSrc}
            alt={
              isCoordinatorContact
                ? `לוגו ${organizationName}`
                : `לוגו ${organizationName || "חברה"}`
            }
          />
        ) : (
          <BusinessOutlinedIcon fontSize="large" />
        )}
      </div>
      <div className="employer-profile-identity-copy">
        {isVisibleValue(organizationName) && <p>{organizationName}</p>}
        <h1>{contactName}</h1>
        {isVisibleValue(roleLine) && <span>{roleLine}</span>}
      </div>
      {isEmployerContact && isVisibleValue(employer.status) && (
        <div className="employer-profile-status-chip">{employer.status}</div>
      )}
    </section>
  );
};

const ActionPanel = ({
  canAssignEmployer,
  canEditEmployer,
  assignmentLoading,
  requestLoading,
  handleAssignEmployerToCoordinator,
  handleRequestAccess,
  handleEditEmployer,
  canRequestAccess,
  accessStatus,
  hasApprovedAccess,
  isAdmin,
  isEmployerContact,
}) => (
  <SectionCard title="פעולות וסטטוס" icon={<InfoOutlinedIcon />}>
    <div className="employer-profile-action-list">
      {canAssignEmployer && (
        <button
          className="employer-profile-button employer-profile-button-primary"
          onClick={handleAssignEmployerToCoordinator}
          disabled={assignmentLoading}
        >
          {assignmentLoading
            ? "משייך מעסיק..."
            : "אני מרכז/ת את הקשר עם מעסיק זה"}
        </button>
      )}

      {canEditEmployer && (
        <button
          className="employer-profile-button employer-profile-button-primary"
          onClick={handleEditEmployer}
        >
          עריכת פרטי מעסיק
        </button>
      )}

      {canRequestAccess && accessStatus === "none" && (
        <button
          className="employer-profile-button employer-profile-button-secondary"
          onClick={handleRequestAccess}
          disabled={requestLoading}
        >
          {requestLoading ? "שולח בקשה..." : "בקשת גישה לפרטי קשר"}
        </button>
      )}

      {!canAssignEmployer &&
        !canEditEmployer &&
        !(canRequestAccess && accessStatus === "none") && (
          <p className="employer-profile-muted">אין פעולות זמינות כרגע.</p>
        )}

      {!isAdmin && accessStatus === "pending" && (
        <p className="employer-profile-warning">
          בקשת הגישה נשלחה וממתינה לאישורים הנדרשים.
        </p>
      )}

      {!isAdmin && accessStatus === "rejected" && (
        <p className="employer-profile-danger">בקשת הגישה נדחתה.</p>
      )}

      {isEmployerContact && !canRequestAccess && !hasApprovedAccess && (
        <p className="employer-profile-muted">
          רק רכז יכול לבקש גישה לפרטי קשר פרטיים.
        </p>
      )}
    </div>
  </SectionCard>
);

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
  const isOwnerEmployer =
    isEmployerContact &&
    currentUser?.email &&
    normalizeEmail(employer.email) === normalizeEmail(currentUser.email);

  const isAssignedCoordinator =
    isCoordinator &&
    getAssignedCoordinatorEmail(employer) &&
    currentUser?.email &&
    getAssignedCoordinatorEmail(employer) === normalizeEmail(currentUser.email);

  const canRequestAccess =
    isCoordinator && isEmployerContact && !isAssignedCoordinator;

  const hasApprovedAccess =
    isOwnerEmployer ||
    accessStatus === "approved" ||
    isAdmin ||
    isAssignedCoordinator;

  const canAssignEmployer =
    isCoordinator && isEmployerContact && !getAssignedCoordinatorEmail(employer);

  const canEditEmployer =
    isCoordinator &&
    isEmployerContact &&
    getAssignedCoordinatorEmail(employer) &&
    currentUser?.email &&
    getAssignedCoordinatorEmail(employer) === normalizeEmail(currentUser.email);

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
        const currentEmail = normalizeEmail(currentUser?.email);
        const targetEmail = normalizeEmail(employerData.email);
        const userIsOwnerEmployer =
          employerData.role === "employer" &&
          currentEmail &&
          currentEmail === targetEmail;
        const coordinatorIsAssigned =
          userRole === "coordinator" &&
          getAssignedCoordinatorEmail(employerData) &&
          currentEmail &&
          getAssignedCoordinatorEmail(employerData) === currentEmail;

        if (
          currentUser &&
          !isAdmin &&
          !userIsOwnerEmployer &&
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
          (userIsOwnerEmployer ||
            isAdmin ||
            coordinatorIsAssigned ||
            status === "approved");

        if (currentUser && shouldLoadPrivateDetails) {
          try {
            const details = await privacyService.getPrivateContactDetails(
              currentUser,
              employerData
            );

            setPrivateDetails(details);
          } catch (privateDetailsError) {
            if (privateDetailsError?.code !== "permission-denied") {
              console.error(
                "Failed to load private contact details:",
                privateDetailsError
              );
            }

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

  const centerIdentity = isCoordinatorContact
    ? getContactCenterIdentity(employer)
    : null;

  const hasCoordinatorContactDetails =
    isCoordinatorContact &&
    (isVisibleValue(displayEmail) || isVisibleValue(displayPhone));

  const hasEmployerBasicDetails =
    isEmployerContact &&
    (isVisibleValue(employer.name) ||
      isVisibleValue(employer.role) ||
      isVisibleValue(employer.organization) ||
      isVisibleValue(employer.field) ||
      isVisibleValue(employer.subField) ||
      isVisibleValue(employer.address) ||
      isVisibleValue(employer.notes) ||
      ((isCoordinator || isAdmin) &&
        (isVisibleValue(employer.assignedCoordinatorEmail) ||
          isVisibleValue(employer.assignedCoordinatorName) ||
          isEmployerContact)));

  const handleEditEmployer = () =>
    navigate(`/directory/${encodeURIComponent(employer.email)}/edit`);

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        background: "#f4f6f9",
        fontFamily: '"Assistant", "Heebo", "Arial", sans-serif',
      }}
    >
      <PageHero
        title="פרטי איש קשר"
        subtitle="מידע על מעסיק, רכז או איש קשר במערכת"
        logoSrc={employmentLogo}
        logoAlt="רשות התעסוקה ירושלים"
        decorationSrc={eventsDecoration}
      />

      <div className="employer-profile-shell">
        <ContactIdentityCard
          employer={employer}
          isCoordinatorContact={isCoordinatorContact}
          isEmployerContact={isEmployerContact}
          centerIdentity={centerIdentity}
          displayRole={displayRole}
        />

        <div className="employer-profile-layout">
          <main className="employer-profile-main-column">
            {isCoordinatorContact && (
              <SectionCard
                title="פרטי רכז"
                icon={<PersonOutlineOutlinedIcon />}
              >
                <div className="employer-profile-detail-grid">
                  <DetailItem
                    icon={<PersonOutlineOutlinedIcon />}
                    label="שם איש קשר"
                    value={employer.name}
                  />
                  <DetailItem
                    icon={<BadgeOutlinedIcon />}
                    label="תפקיד"
                    value={displayRole(employer.role)}
                  />
                  <DetailItem
                    icon={<BusinessOutlinedIcon />}
                    label="מרכז / ארגון"
                    value={centerIdentity?.centerName}
                  />
                  <DetailItem
                    icon={<GroupsOutlinedIcon />}
                    label="אוכלוסייה"
                    value={employer.population}
                  />
                  <DetailItem
                    icon={<EmailOutlinedIcon />}
                    label="אימייל"
                    value={displayEmail}
                    ltr
                  />
                  <DetailItem
                    icon={<LocalPhoneOutlinedIcon />}
                    label="טלפון"
                    value={displayPhone}
                    ltr
                  />
                </div>
                {!hasCoordinatorContactDetails && (
                  <EmptyState icon={<InfoOutlinedIcon />}>
                    לא נשמרו פרטי התקשרות נוספים לרכז זה.
                  </EmptyState>
                )}
              </SectionCard>
            )}

            {hasEmployerBasicDetails && (
              <SectionCard
                title="פרטי איש קשר"
                icon={<PersonOutlineOutlinedIcon />}
              >
                <div className="employer-profile-detail-grid">
                  <DetailItem
                    icon={<PersonOutlineOutlinedIcon />}
                    label="שם איש קשר"
                    value={employer.name}
                  />
                  <DetailItem
                    icon={<BadgeOutlinedIcon />}
                    label="תפקיד"
                    value={displayRole(employer.role)}
                  />
                  <DetailItem
                    icon={<BusinessOutlinedIcon />}
                    label="מרכז / ארגון"
                    value={employer.organization}
                  />
                  <DetailItem
                    icon={<CategoryOutlinedIcon />}
                    label="תחום"
                    value={employer.field}
                  />
                  <DetailItem
                    icon={<LayersOutlinedIcon />}
                    label="תת־תחום"
                    value={employer.subField}
                  />
                  <DetailItem
                    icon={<LocationOnOutlinedIcon />}
                    label="כתובת"
                    value={employer.address}
                  />
                  {isEmployerContact && (isCoordinator || isAdmin) && (
                    <DetailItem
                      icon={<AssignmentIndOutlinedIcon />}
                      label="רכז משויך"
                      value={
                        employer.assignedCoordinatorEmail
                          ? employer.assignedCoordinatorEmail
                          : "טרם שויך למרכז"
                      }
                      ltr={isVisibleValue(employer.assignedCoordinatorEmail)}
                    />
                  )}
                  <DetailItem
                    icon={<PersonOutlineOutlinedIcon />}
                    label="שם רכז"
                    value={employer.assignedCoordinatorName}
                  />
                  <DetailItem
                    icon={<NotesOutlinedIcon />}
                    label="הערות"
                    value={employer.notes}
                  />
                </div>
              </SectionCard>
            )}

            {hasCompanyDetails && (
              <SectionCard
                title="פרטי חברה"
                icon={<CorporateFareOutlinedIcon />}
              >
                <div className="employer-profile-detail-grid">
                  <DetailItem
                    icon={<CheckCircleOutlineOutlinedIcon />}
                    label="סטטוס קשר"
                    value={employer.status}
                  />
                  <DetailItem
                    icon={<BadgeOutlinedIcon />}
                    label="ח.פ / מזהה חברה"
                    value={employer.companyId}
                    ltr
                  />
                  <DetailItem
                    icon={<DescriptionOutlinedIcon />}
                    label="תיאור החברה"
                    value={employer.companyDescription}
                  />
                  <DetailItem
                    icon={<LinkOutlinedIcon />}
                    label="קישור לאזור משרות"
                    value={employer.jobsUrl}
                  >
                    <a
                      href={employer.jobsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="employer-profile-link"
                    >
                      מעבר לאזור המשרות
                    </a>
                  </DetailItem>
                  <DetailItem
                    icon={<NotesOutlinedIcon />}
                    label="תיעוד קשר אחרון"
                    value={employer.lastContactNote}
                  />
                  <DetailItem
                    icon={<CalendarMonthOutlinedIcon />}
                    label="תאריך קשר אחרון"
                    value={displayProfileDate(employer.lastContactDate)}
                  />
                </div>
              </SectionCard>
            )}

            {isEmployerContact && (
              <SectionCard
                title="פרטי קשר פרטיים"
                icon={<LockOutlinedIcon />}
              >
                {hasApprovedAccess ? (
                  isVisibleValue(displayEmail) || isVisibleValue(displayPhone) ? (
                    <div className="employer-profile-detail-grid">
                      <DetailItem
                        icon={<EmailOutlinedIcon />}
                        label="אימייל"
                        value={displayEmail}
                        ltr
                      />
                      <DetailItem
                        icon={<LocalPhoneOutlinedIcon />}
                        label="טלפון"
                        value={displayPhone}
                        ltr
                      />
                    </div>
                  ) : (
                    <EmptyState icon={<InfoOutlinedIcon />}>
                      אין פרטי קשר פרטיים שמורים עבור מעסיק זה.
                    </EmptyState>
                  )
                ) : (
                  <div className="employer-profile-locked-card">
                    <LockOutlinedIcon aria-hidden="true" />
                    <div>
                      <h3>פרטי הקשר מוסתרים</h3>
                      <p>
                        פרטי הקשר מוסתרים עד שהמעסיק יאשר את בקשת הגישה.
                      </p>
                    </div>
                  </div>
                )}
              </SectionCard>
            )}
          </main>

          <aside className="employer-profile-side-column">
            <ActionPanel
              canAssignEmployer={canAssignEmployer}
              canEditEmployer={canEditEmployer}
              assignmentLoading={assignmentLoading}
              requestLoading={requestLoading}
              handleAssignEmployerToCoordinator={
                handleAssignEmployerToCoordinator
              }
              handleRequestAccess={handleRequestAccess}
              handleEditEmployer={handleEditEmployer}
              canRequestAccess={canRequestAccess}
              accessStatus={accessStatus}
              hasApprovedAccess={hasApprovedAccess}
              isAdmin={isAdmin}
              isEmployerContact={isEmployerContact}
            />

            <SectionCard
              title={isCoordinatorContact ? "שיוך מרכז" : "זיהוי חברה"}
              icon={<BusinessOutlinedIcon />}
            >
              <div className="employer-profile-logo-panel">
                {isCoordinatorContact && centerIdentity?.icon ? (
                  <img
                    src={centerIdentity.icon}
                    alt={`לוגו ${centerIdentity.centerName}`}
                  />
                ) : isEmployerContact && isVisibleValue(employer.logoUrl) ? (
                  <img
                    src={employer.logoUrl}
                    alt={`לוגו ${employer.organization || "חברה"}`}
                  />
                ) : (
                  <BusinessOutlinedIcon fontSize="large" />
                )}
                <p>
                  {isCoordinatorContact
                    ? centerIdentity?.centerName
                    : employer.organization || "לא צוין ארגון"}
                </p>
              </div>
            </SectionCard>

            {isEmployerContact && !isAdmin && (
              <SectionCard title="סטטוס גישה" icon={<LockOutlinedIcon />}>
                <DetailItem
                  icon={<InfoOutlinedIcon />}
                  label="סטטוס גישה"
                  value={displayAccessStatus(accessStatus)}
                />
              </SectionCard>
            )}

            {message && (
              <div className="employer-profile-message">
                <strong>{message}</strong>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};

export default EmployerProfilePage;
