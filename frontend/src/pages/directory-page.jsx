import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth-context";
import { PageHero } from "../components/layout/PageHero";
import { directoryService } from "../services/interfaces/directory-service";
import { CENTER_COLORS } from "../utils/centerColors";
import { getCenterIcon, getEventCenterName } from "../utils/centerIcons";
import eventsDecoration from "../assets/images/city-view.png";
import employmentLogo from "../assets/center-icons/taasuka-logo-color.png";

// Design files
import "../design/global-theme.css";
import "../design/directory-page.css";

const isVisibleValue = (value) => {
  return value && value !== "לא צוין" && String(value).trim() !== "";
};

const displayRole = (role) => {
  if (role === "employer") return "מעסיק";
  if (role === "coordinator") return "רכז";
  if (role === "admin") return "מנהלת";
  return role || "";
};

const displayProfileDate = (value) => {
  if (!value) return "לא צוין";

  if (value?.toDate) {
    return value.toDate().toLocaleDateString("he-IL");
  }

  return String(value);
};

const displayPhoneNumber = (phone) => {
  if (!phone) return "לא צוין";

  const cleanPhone = String(phone).trim();

  if (!cleanPhone) return "לא צוין";

  if (cleanPhone.startsWith("+")) return cleanPhone;
  if (cleanPhone.startsWith("0")) return cleanPhone;
  if (/^\d+$/.test(cleanPhone)) return `0${cleanPhone}`;

  return cleanPhone;
};

const FIELD_GROUPS = {
  "הייטק וטכנולוגיה": ["תוכנה", "סייבר", "IT ומחשוב", "דיגיטל", "אלקטרוניקה"],
  "בריאות וביומד": ["בריאות", "רפואה", "ביומד", "פארמה", "סיעוד"],
  "חינוך ואקדמיה": ["חינוך", "אקדמיה", "סטודנטים", "הכשרות"],
  "עמותות וחברה": ["עמותות", "קהילה", "שירותים חברתיים", "שילוב אוכלוסיות"],
  "ממשל ושירות ציבורי": ["עירייה", "ממשלתי", "שירות ציבורי", "רשות"],
  "פיננסים, ביטוח ומיסוי": ["ביטוח", "מיסוי", "ראיית חשבון", "בנקאות", "פיננסים"],
  "מסחר וקמעונאות": ["קמעונאות", "מסחר", "רשתות", "חנויות", "מוצרי נייר"],
  "שירותים, ייעוץ ומכירות": ["שיווק", "מכירות", "שירות לקוחות", "ייעוץ", "שירותים עסקיים"],
  "אירוח, מזון ותיירות": ["מסעדנות", "מזון", "משקאות", "מלונאות", "תיירות"],
  "תעשייה וייצור": ["ייצור", "מפעלים", "ייצור מסננים", "תעשייה"],
  "עיצוב, אופנה ואדריכלות": ["אופנה", "איפור וטיפוח", "עיצוב מוצר", "אדריכלות ועיצוב", "קוסמטיקה"],
  "אבטחה, ניקיון והסעדה": ["אבטחה", "שמירה", "ניקיון", "הסעדה"],
  "השמה ומשאבי אנוש": ["השמה", "גיוס", "משאבי אנוש", "תעסוקה"],
  "סיוע תעסוקתי ושירותים קהילתיים": [
    "מבקשי עבודה",
    "עולים ותושבים חוזרים",
    "קליטת מפונים",
    "קידום תהליכים",
  ],
  אחר: ["לא מסווג"],
};

const getFieldClassification = (field) => {
  const normalizedField = String(field || "").trim().toLowerCase();

  if (!normalizedField) {
    return { mainCategory: "אחר", subCategory: "לא מסווג" };
  }

  if (
    normalizedField.includes("tech") ||
    normalizedField.includes("software") ||
    normalizedField.includes("תוכנה")
  ) {
    return { mainCategory: "הייטק וטכנולוגיה", subCategory: "תוכנה" };
  }

  if (normalizedField.includes("cyber") || normalizedField.includes("סייבר")) {
    return { mainCategory: "הייטק וטכנולוגיה", subCategory: "סייבר" };
  }

  if (normalizedField.includes("it") || normalizedField.includes("מחשוב")) {
    return { mainCategory: "הייטק וטכנולוגיה", subCategory: "IT ומחשוב" };
  }

  if (normalizedField.includes("דיגיטל") || normalizedField.includes("digital")) {
    return { mainCategory: "הייטק וטכנולוגיה", subCategory: "דיגיטל" };
  }

  if (
    normalizedField.includes("אלקטרוניקה") ||
    normalizedField.includes("electronics")
  ) {
    return { mainCategory: "הייטק וטכנולוגיה", subCategory: "אלקטרוניקה" };
  }

  if (normalizedField.includes("biomed") || normalizedField.includes("ביומד")) {
    return { mainCategory: "בריאות וביומד", subCategory: "ביומד" };
  }

  if (normalizedField.includes("health") || normalizedField.includes("בריאות")) {
    return { mainCategory: "בריאות וביומד", subCategory: "בריאות" };
  }

  if (
    normalizedField.includes("medical") ||
    normalizedField.includes("רפוא") ||
    normalizedField.includes("רפואה")
  ) {
    return { mainCategory: "בריאות וביומד", subCategory: "רפואה" };
  }

  if (normalizedField.includes("pharma") || normalizedField.includes("פארמה")) {
    return { mainCategory: "בריאות וביומד", subCategory: "פארמה" };
  }

  if (normalizedField.includes("סיעוד")) {
    return { mainCategory: "בריאות וביומד", subCategory: "סיעוד" };
  }

  if (normalizedField.includes("education") || normalizedField.includes("חינוך")) {
    return { mainCategory: "חינוך ואקדמיה", subCategory: "חינוך" };
  }

  if (
    normalizedField.includes("academy") ||
    normalizedField.includes("academic") ||
    normalizedField.includes("אקדמ")
  ) {
    return { mainCategory: "חינוך ואקדמיה", subCategory: "אקדמיה" };
  }

  if (normalizedField.includes("student") || normalizedField.includes("סטודנט")) {
    return { mainCategory: "חינוך ואקדמיה", subCategory: "סטודנטים" };
  }

  if (normalizedField.includes("הכשרה") || normalizedField.includes("לימוד")) {
    return { mainCategory: "חינוך ואקדמיה", subCategory: "הכשרות" };
  }

  if (normalizedField.includes("ngo") || normalizedField.includes("עמות")) {
    return { mainCategory: "עמותות וחברה", subCategory: "עמותות" };
  }

  if (normalizedField.includes("community") || normalizedField.includes("קהיל")) {
    return { mainCategory: "עמותות וחברה", subCategory: "קהילה" };
  }

  if (
    normalizedField.includes("social") ||
    normalizedField.includes("חברתי") ||
    normalizedField.includes("חברה")
  ) {
    return { mainCategory: "עמותות וחברה", subCategory: "שירותים חברתיים" };
  }

  if (
    normalizedField.includes("שילוב") ||
    normalizedField.includes("אנשים עם מוגבלות")
  ) {
    return { mainCategory: "עמותות וחברה", subCategory: "שילוב אוכלוסיות" };
  }

  if (
    normalizedField.includes("municipality") ||
    normalizedField.includes("עירייה")
  ) {
    return { mainCategory: "ממשל ושירות ציבורי", subCategory: "עירייה" };
  }

  if (normalizedField.includes("government") || normalizedField.includes("ממשל")) {
    return { mainCategory: "ממשל ושירות ציבורי", subCategory: "ממשלתי" };
  }

  if (normalizedField.includes("public") || normalizedField.includes("ציבור")) {
    return { mainCategory: "ממשל ושירות ציבורי", subCategory: "שירות ציבורי" };
  }

  if (normalizedField.includes("רשות")) {
    return { mainCategory: "ממשל ושירות ציבורי", subCategory: "רשות" };
  }

  if (
    normalizedField.includes("insurance") ||
    normalizedField.includes("ביטוח") ||
    normalizedField.includes("מנורה")
  ) {
    return { mainCategory: "פיננסים, ביטוח ומיסוי", subCategory: "ביטוח" };
  }

  if (
    normalizedField.includes("tax") ||
    normalizedField.includes("מיסוי") ||
    normalizedField === "מס" ||
    normalizedField.includes(" מס ")
  ) {
    return { mainCategory: "פיננסים, ביטוח ומיסוי", subCategory: "מיסוי" };
  }

  if (
    normalizedField.includes("ראיית חשבון") ||
    normalizedField.includes("חשבונ")
  ) {
    return { mainCategory: "פיננסים, ביטוח ומיסוי", subCategory: "ראיית חשבון" };
  }

  if (normalizedField.includes("bank") || normalizedField.includes("בנק")) {
    return { mainCategory: "פיננסים, ביטוח ומיסוי", subCategory: "בנקאות" };
  }

  if (normalizedField.includes("finance") || normalizedField.includes("פיננס")) {
    return { mainCategory: "פיננסים, ביטוח ומיסוי", subCategory: "פיננסים" };
  }

  if (normalizedField.includes("retail") || normalizedField.includes("קמעונ")) {
    return { mainCategory: "מסחר וקמעונאות", subCategory: "קמעונאות" };
  }

  if (
    normalizedField.includes("commerce") ||
    normalizedField.includes("trade") ||
    normalizedField.includes("מסחר")
  ) {
    return { mainCategory: "מסחר וקמעונאות", subCategory: "מסחר" };
  }

  if (normalizedField.includes("רשת") || normalizedField.includes("רשתות")) {
    return { mainCategory: "מסחר וקמעונאות", subCategory: "רשתות" };
  }

  if (
    normalizedField.includes("store") ||
    normalizedField.includes("shop") ||
    normalizedField.includes("חנות") ||
    normalizedField.includes("חנויות")
  ) {
    return { mainCategory: "מסחר וקמעונאות", subCategory: "חנויות" };
  }

  if (normalizedField.includes("מוצרי נייר")) {
    return { mainCategory: "מסחר וקמעונאות", subCategory: "מוצרי נייר" };
  }

  if (normalizedField.includes("marketing") || normalizedField.includes("שיווק")) {
    return { mainCategory: "שירותים, ייעוץ ומכירות", subCategory: "שיווק" };
  }

  if (normalizedField.includes("sales") || normalizedField.includes("מכירות")) {
    return { mainCategory: "שירותים, ייעוץ ומכירות", subCategory: "מכירות" };
  }

  if (
    normalizedField.includes("service") ||
    normalizedField.includes("שירות לקוחות") ||
    normalizedField.includes("לקוחות")
  ) {
    return { mainCategory: "שירותים, ייעוץ ומכירות", subCategory: "שירות לקוחות" };
  }

  if (
    normalizedField.includes("consulting") ||
    normalizedField.includes("ייעוץ") ||
    normalizedField.includes("יעוץ")
  ) {
    return { mainCategory: "שירותים, ייעוץ ומכירות", subCategory: "ייעוץ" };
  }

  if (normalizedField.includes("business") || normalizedField.includes("עסק")) {
    return { mainCategory: "שירותים, ייעוץ ומכירות", subCategory: "שירותים עסקיים" };
  }

  if (
    normalizedField.includes("restaurant") ||
    normalizedField.includes("מסעד") ||
    normalizedField.includes("אמריקן דיינר")
  ) {
    return { mainCategory: "אירוח, מזון ותיירות", subCategory: "מסעדנות" };
  }

  if (normalizedField.includes("food") || normalizedField.includes("מזון")) {
    return { mainCategory: "אירוח, מזון ותיירות", subCategory: "מזון" };
  }

  if (normalizedField.includes("משקאות")) {
    return { mainCategory: "אירוח, מזון ותיירות", subCategory: "משקאות" };
  }

  if (
    normalizedField.includes("hotel") ||
    normalizedField.includes("hospitality") ||
    normalizedField.includes("מלונ")
  ) {
    return { mainCategory: "אירוח, מזון ותיירות", subCategory: "מלונאות" };
  }

  if (normalizedField.includes("tourism") || normalizedField.includes("תיירות")) {
    return { mainCategory: "אירוח, מזון ותיירות", subCategory: "תיירות" };
  }

  if (
    normalizedField.includes("manufacturing") ||
    normalizedField.includes("production") ||
    normalizedField.includes("ייצור")
  ) {
    return { mainCategory: "תעשייה וייצור", subCategory: "ייצור" };
  }

  if (normalizedField.includes("factory") || normalizedField.includes("מפעל")) {
    return { mainCategory: "תעשייה וייצור", subCategory: "מפעלים" };
  }

  if (normalizedField.includes("filter") || normalizedField.includes("מסננים")) {
    return { mainCategory: "תעשייה וייצור", subCategory: "ייצור מסננים" };
  }

  if (
    normalizedField.includes("industry") ||
    normalizedField.includes("industrial") ||
    normalizedField.includes("תעש")
  ) {
    return { mainCategory: "תעשייה וייצור", subCategory: "תעשייה" };
  }

  if (normalizedField.includes("fashion") || normalizedField.includes("אופנה")) {
    return { mainCategory: "עיצוב, אופנה ואדריכלות", subCategory: "אופנה" };
  }

  if (
    normalizedField.includes("makeup") ||
    normalizedField.includes("beauty") ||
    normalizedField.includes("איפור") ||
    normalizedField.includes("יופי") ||
    normalizedField.includes("טיפוח") ||
    normalizedField.includes("קוסמטיקה")
  ) {
    return { mainCategory: "עיצוב, אופנה ואדריכלות", subCategory: "איפור וטיפוח" };
  }

  if (normalizedField.includes("עיצוב מוצר")) {
    return { mainCategory: "עיצוב, אופנה ואדריכלות", subCategory: "עיצוב מוצר" };
  }

  if (
    normalizedField.includes("architecture") ||
    normalizedField.includes("אדריכלות") ||
    normalizedField.includes("עיצוב")
  ) {
    return { mainCategory: "עיצוב, אופנה ואדריכלות", subCategory: "אדריכלות ועיצוב" };
  }

  if (normalizedField.includes("security") || normalizedField.includes("אבטחה")) {
    return { mainCategory: "אבטחה, ניקיון והסעדה", subCategory: "אבטחה" };
  }

  if (normalizedField.includes("שומר") || normalizedField.includes("שמירה")) {
    return { mainCategory: "אבטחה, ניקיון והסעדה", subCategory: "שמירה" };
  }

  if (normalizedField.includes("ניקיון") || normalizedField.includes("נקיון")) {
    return { mainCategory: "אבטחה, ניקיון והסעדה", subCategory: "ניקיון" };
  }

  if (normalizedField.includes("הסעדה")) {
    return { mainCategory: "אבטחה, ניקיון והסעדה", subCategory: "הסעדה" };
  }

  if (normalizedField.includes("השמה") || normalizedField.includes("השמות")) {
    return { mainCategory: "השמה ומשאבי אנוש", subCategory: "השמה" };
  }

  if (normalizedField.includes("גיוס") || normalizedField.includes("גיוסים")) {
    return { mainCategory: "השמה ומשאבי אנוש", subCategory: "גיוס" };
  }

  if (
    normalizedField.includes("hr") ||
    normalizedField.includes("משאבי אנוש") ||
    normalizedField.includes("כוח אדם") ||
    normalizedField.includes("כח אדם")
  ) {
    return { mainCategory: "השמה ומשאבי אנוש", subCategory: "משאבי אנוש" };
  }

  if (normalizedField.includes("תעסוקה")) {
    return { mainCategory: "השמה ומשאבי אנוש", subCategory: "תעסוקה" };
  }

  if (normalizedField.includes("מבקשי עבודה") || normalizedField.includes("קריירה")) {
    return {
      mainCategory: "סיוע תעסוקתי ושירותים קהילתיים",
      subCategory: "מבקשי עבודה",
    };
  }

  if (
    normalizedField.includes("עולים") ||
    normalizedField.includes("תושבים חוזרים")
  ) {
    return {
      mainCategory: "סיוע תעסוקתי ושירותים קהילתיים",
      subCategory: "עולים ותושבים חוזרים",
    };
  }

  if (normalizedField.includes("קליטת מפונים")) {
    return {
      mainCategory: "סיוע תעסוקתי ושירותים קהילתיים",
      subCategory: "קליטת מפונים",
    };
  }

  if (normalizedField.includes("קידום תהליכים")) {
    return {
      mainCategory: "סיוע תעסוקתי ושירותים קהילתיים",
      subCategory: "קידום תהליכים",
    };
  }

  return { mainCategory: "אחר", subCategory: "לא מסווג" };
};

const getContactFieldClassification = (contact) => {
  if (isVisibleValue(contact.field) && isVisibleValue(contact.subField)) {
    return {
      mainCategory: contact.field,
      subCategory: contact.subField,
    };
  }

  return getFieldClassification(contact.field);
};

const normalizeCompanyValue = (value) => {
  return String(value || "").toLowerCase().trim();
};

const getContactCompany = (contact) => {
  return (
    contact?.rawData?.profile?.company ||
    contact?.rawData?.company ||
    contact?.organization ||
    ""
  );
};

const getCoordinatorCenterCandidates = (contact) => [
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

const getCoordinatorCenterIdentity = (contact) => {
  const matchedCenterName = getCoordinatorCenterCandidates(contact)
    .filter(isVisibleValue)
    .map((candidate) => getEventCenterName(candidate))
    .find((centerName) => Boolean(getCenterIcon(centerName)));

  const rawCenterName = getCoordinatorCenterCandidates(contact)
    .filter(isVisibleValue)
    .map((candidate) => String(candidate || "").trim())
    .find(Boolean);

  const centerName = matchedCenterName || rawCenterName || "מרכז לא מזוהה";

  return {
    centerName,
    icon: matchedCenterName ? getCenterIcon(centerName) : employmentLogo,
    color: matchedCenterName ? CENTER_COLORS[centerName] || "#64748B" : "#64748B",
    isMatched: Boolean(matchedCenterName),
  };
};

const directoryCollator = new Intl.Collator("he", {
  numeric: true,
  sensitivity: "base",
});

const getContactSortValue = (contact, contactType) => {
  if (contactType === "coordinator") {
    return (
      contact.name ||
      contact.centerName ||
      contact.organization ||
      contact.email ||
      ""
    );
  }

  return (
    contact.organization ||
    contact.companyName ||
    contact.rawData?.profile?.company ||
    contact.rawData?.company ||
    contact.name ||
    contact.email ||
    ""
  );
};

const sortContacts = (contacts, contactType) => {
  return [...contacts].sort((firstContact, secondContact) => {
    const primaryComparison = directoryCollator.compare(
      getContactSortValue(firstContact, contactType),
      getContactSortValue(secondContact, contactType)
    );

    if (primaryComparison !== 0) return primaryComparison;

    return directoryCollator.compare(
      firstContact.email || "",
      secondContact.email || ""
    );
  });
};

const DirectoryPage = () => {
  const navigate = useNavigate();
  const { currentUser, userRole } = useAuth();

  const currentUserEmail = currentUser?.email
    ? currentUser.email.toLowerCase().trim()
    : "";

  const [contacts, setContacts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [employerAssignmentFilter, setEmployerAssignmentFilter] = useState("all");
  const [mainFieldFilter, setMainFieldFilter] = useState("all");
  const [subFieldFilter, setSubFieldFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedSections, setExpandedSections] = useState({
    coordinator: false,
    employer: true,
  });

  useEffect(() => {
    const loadContacts = async () => {
      try {
        const data = await directoryService.getDirectoryContacts();
        setContacts(data);
      } catch (err) {
        console.error("Failed to load directory contacts:", err);
        setError("Failed to load directory contacts.");
      } finally {
        setLoading(false);
      }
    };

    loadContacts();
  }, []);

  const availableMainCategories = useMemo(() => {
    const categoriesInUse = contacts
      .map((contact) => getContactFieldClassification(contact).mainCategory)
      .filter(isVisibleValue);

    const uniqueCategories = [...new Set(categoriesInUse)];

    return Object.keys(FIELD_GROUPS).filter((category) =>
      uniqueCategories.includes(category)
    );
  }, [contacts]);

  const availableSubCategories = useMemo(() => {
    const subCategoriesInUse = contacts
      .map((contact) => getContactFieldClassification(contact))
      .filter(({ mainCategory }) => {
        return mainFieldFilter === "all" || mainCategory === mainFieldFilter;
      })
      .map(({ subCategory }) => subCategory)
      .filter(isVisibleValue);

    return [...new Set(subCategoriesInUse)].sort();
  }, [contacts, mainFieldFilter]);

  const handleMainFieldChange = (value) => {
    setMainFieldFilter(value);
    setSubFieldFilter("all");
  };

  const handleRoleFilterChange = (value) => {
    setRoleFilter(value);

    if (value === "coordinator") {
      setEmployerAssignmentFilter("all");
    }

    if (value !== "all") {
      setExpandedSections((currentSections) => ({
        ...currentSections,
        [value]: true,
      }));
    }
  };

  const filteredContacts = contacts.filter((contact) => {
    const searchText = searchQuery.toLowerCase().trim();
    const { mainCategory, subCategory } = getContactFieldClassification(contact);

    const matchesSearch =
      !searchText ||
      contact.name?.toLowerCase().includes(searchText) ||
      contact.organization?.toLowerCase().includes(searchText) ||
      contact.centerName?.toLowerCase().includes(searchText) ||
      contact.population?.toLowerCase().includes(searchText) ||
      contact.phone?.toLowerCase().includes(searchText) ||
      contact.assignedCoordinatorEmail?.toLowerCase().includes(searchText) ||
      contact.role?.toLowerCase().includes(searchText) ||
      displayRole(contact.role).toLowerCase().includes(searchText) ||
      contact.field?.toLowerCase().includes(searchText) ||
      contact.subField?.toLowerCase().includes(searchText) ||
      mainCategory.toLowerCase().includes(searchText) ||
      subCategory.toLowerCase().includes(searchText) ||
      contact.address?.toLowerCase().includes(searchText) ||
      contact.status?.toLowerCase().includes(searchText) ||
      contact.companyId?.toLowerCase().includes(searchText) ||
      contact.companyDescription?.toLowerCase().includes(searchText) ||
      contact.jobsUrl?.toLowerCase().includes(searchText) ||
      contact.lastContactNote?.toLowerCase().includes(searchText) ||
      contact.lastContactDate?.toLowerCase().includes(searchText);

    const matchesRole = roleFilter === "all" || contact.role === roleFilter;

    const matchesMainField =
      mainFieldFilter === "all" || mainCategory === mainFieldFilter;

    const matchesSubField =
      subFieldFilter === "all" || subCategory === subFieldFilter;

    return matchesSearch && matchesRole && matchesMainField && matchesSubField;
  });

  const coordinatorContacts = sortContacts(
    filteredContacts.filter((contact) => contact.role === "coordinator"),
    "coordinator"
  );

  const currentUserContact = contacts.find(
    (contact) =>
      contact.email?.toLowerCase().trim() === currentUserEmail
  );

  const currentEmployerCompany = getContactCompany(currentUserContact);

  const employerContacts = sortContacts(
    filteredContacts.filter((contact) => {
      if (contact.role !== "employer") return false;

      const assignedCoordinatorEmail = contact.assignedCoordinatorEmail
        ? contact.assignedCoordinatorEmail.toLowerCase().trim()
        : "";

      if (userRole === "admin") {
        return true;
      }

      if (userRole === "employer") {
        const isSelf =
          contact.email?.toLowerCase().trim() === currentUserEmail;

        const sameCompany =
          normalizeCompanyValue(currentEmployerCompany) &&
          normalizeCompanyValue(getContactCompany(contact)) &&
          normalizeCompanyValue(currentEmployerCompany) ===
            normalizeCompanyValue(getContactCompany(contact));

        return isSelf || sameCompany;
      }

      if (userRole !== "coordinator") return true;

      if (employerAssignmentFilter === "mine") {
        return assignedCoordinatorEmail === currentUserEmail;
      }

      if (employerAssignmentFilter === "unassigned") {
        return !assignedCoordinatorEmail;
      }

      return true;
    }),
    "employer"
  );

  const toggleSection = (sectionName) => {
    setExpandedSections((currentSections) => ({
      ...currentSections,
      [sectionName]: !currentSections[sectionName],
    }));
  };

  const renderContactsTable = (tableContacts, tableType, title) => {
    const isCoordinatorTable = tableType === "coordinator";
    const isExpanded = expandedSections[tableType];
    const sectionContentId = `directory-${tableType}-contacts`;

    return (
      <section className="directory-section">
        <button
          type="button"
          className="directory-section-header"
          onClick={() => toggleSection(tableType)}
          aria-expanded={isExpanded}
          aria-controls={sectionContentId}
        >
          <span className="directory-section-heading">
            <span>{title}</span>
            <span className="directory-section-count">{tableContacts.length}</span>
          </span>
          <span
            className={`directory-section-chevron${isExpanded ? " is-expanded" : ""}`}
            aria-hidden="true"
          >
            ▾
          </span>
        </button>

        {isExpanded && (
          <div id={sectionContentId} className="directory-section-content">
            {tableContacts.length === 0 ? (
              <p className="directory-section-empty">לא נמצאו אנשי קשר להצגה בקבוצה זו.</p>
            ) : (
              <div className="directory-table-wrapper">
          <table
            className="directory-table"
            style={{
              width: "100%",
              minWidth: isCoordinatorTable ? "980px" : "1400px",
              borderCollapse: "collapse",
              fontSize: "15px",
              textAlign: "right",
            }}
          >
            <thead>
              <tr
                style={{
                  background: "#f3f6fb",
                  color: "#002b5c",
                  borderBottom: "2px solid #dde3ec",
                }}
              >
                <th style={{ padding: "14px 12px" }}>
                  {isCoordinatorTable ? "מרכז / ארגון" : "חברה"}
                </th>
                <th style={{ padding: "14px 12px" }}>איש קשר</th>

                {isCoordinatorTable ? (
                  <>
                    <th style={{ padding: "14px 12px" }}>אוכלוסייה</th>
                    <th style={{ padding: "14px 12px" }}>טלפון</th>
                    <th style={{ padding: "14px 12px" }}>סוג</th>
                  </>
                ) : (
                  <>
                    <th style={{ padding: "14px 12px" }}>תחום</th>
                    <th style={{ padding: "14px 12px" }}>תת־תחום</th>
                    <th style={{ padding: "14px 12px" }}>סטטוס קשר</th>
                    <th style={{ padding: "14px 12px" }}>שיוך רכז</th>
                    <th style={{ padding: "14px 12px" }}>ח.פ / מזהה</th>
                    <th style={{ padding: "14px 12px" }}>כתובת</th>
                    <th style={{ padding: "14px 12px" }}>קישור משרות</th>
                    <th style={{ padding: "14px 12px" }}>קשר אחרון</th>
                    <th style={{ padding: "14px 12px" }}>תאריך קשר</th>
                  </>
                )}

                <th style={{ padding: "14px 12px" }}>פעולות</th>
                {isCoordinatorTable && (
                  <th
                    className="directory-center-identity-cell"
                    aria-label="זהות מרכז"
                  />
                )}
              </tr>
            </thead>

            <tbody>
              {tableContacts.map((contact) => {
                const { mainCategory, subCategory } =
                  getContactFieldClassification(contact);
                const centerIdentity = isCoordinatorTable
                  ? getCoordinatorCenterIdentity(contact)
                  : null;

                return (
                  <tr key={contact.id} style={{ borderBottom: "1px solid #edf0f5" }}>
                    <td
                      style={{
                        padding: "13px 12px",
                        fontWeight: 700,
                        color: "#002b5c",
                      }}
                    >
                      {isVisibleValue(contact.organization)
                        ? contact.organization
                        : "לא צוין"}
                    </td>

                    <td style={{ padding: "13px 12px" }}>
                      {isVisibleValue(contact.name) ? contact.name : "לא צוין"}
                    </td>

                    {isCoordinatorTable ? (
                      <>
                        <td style={{ padding: "13px 12px" }}>
                          {isVisibleValue(contact.population)
                            ? contact.population
                            : "לא צוין"}
                        </td>

                        <td
                          style={{
                            padding: "13px 12px",
                            direction: "ltr",
                            textAlign: "right",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {displayPhoneNumber(contact.phone)}
                        </td>

                        <td style={{ padding: "13px 12px" }}>
                          {displayRole(contact.role)}
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: "13px 12px" }}>
                          {isVisibleValue(mainCategory) ? mainCategory : "לא צוין"}
                        </td>

                        <td style={{ padding: "13px 12px" }}>
                          {isVisibleValue(subCategory) ? subCategory : "לא צוין"}
                        </td>

                        <td style={{ padding: "13px 12px" }}>
                          {isVisibleValue(contact.status)
                            ? contact.status
                            : "לא צוין"}
                        </td>

                        <td style={{ padding: "13px 12px" }}>
                          {isVisibleValue(contact.assignedCoordinatorEmail) ? (
                            <>
                              <div
                                style={{
                                  direction: "ltr",
                                  unicodeBidi: "plaintext",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                <strong>רכז משויך:</strong>{" "}
                                {contact.assignedCoordinatorEmail}
                              </div>

                              {isVisibleValue(contact.assignedCoordinatorName) && (
                                <div
                                  style={{
                                    marginTop: "4px",
                                    color: "#555",
                                    fontSize: "13px",
                                  }}
                                >
                                  <strong>שם רכז:</strong>{" "}
                                  {contact.assignedCoordinatorName}
                                </div>
                              )}
                            </>
                          ) : (
                            "לא משויך"
                          )}
                        </td>

                        <td
                          style={{
                            padding: "13px 12px",
                            direction: "ltr",
                            textAlign: "right",
                          }}
                        >
                          {isVisibleValue(contact.companyId)
                            ? contact.companyId
                            : "לא צוין"}
                        </td>

                        <td style={{ padding: "13px 12px" }}>
                          {isVisibleValue(contact.address)
                            ? contact.address
                            : "לא צוין"}
                        </td>

                        <td style={{ padding: "13px 12px" }}>
                          {isVisibleValue(contact.jobsUrl) ? (
                            <a
                              href={contact.jobsUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                color: "#003f9e",
                                fontWeight: 700,
                                textDecoration: "none",
                                whiteSpace: "nowrap",
                              }}
                            >
                              פתיחת משרות
                            </a>
                          ) : (
                            "לא צוין"
                          )}
                        </td>

                        <td
                          style={{
                            padding: "13px 12px",
                            maxWidth: "220px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                          title={contact.lastContactNote || ""}
                        >
                          {isVisibleValue(contact.lastContactNote)
                            ? contact.lastContactNote
                            : "לא צוין"}
                        </td>

                        <td style={{ padding: "13px 12px" }}>
                          {displayProfileDate(contact.lastContactDate)}
                        </td>
                      </>
                    )}

                    <td style={{ padding: "13px 12px" }}>
                      <button
                        onClick={() =>
                          navigate(`/directory/${encodeURIComponent(contact.id)}`)
                        }
                        style={{
                          padding: "8px 14px",
                          border: "none",
                          borderRadius: "999px",
                          background: "#003f9e",
                          color: "#fff",
                          cursor: "pointer",
                          fontWeight: "bold",
                          fontSize: "14px",
                          fontFamily: "inherit",
                          whiteSpace: "nowrap",
                        }}
                      >
                        צפייה בפרופיל
                      </button>
                    </td>

                    {isCoordinatorTable && (
                      <td className="directory-center-identity-cell">
                        <div
                          className="directory-center-identity"
                          style={{ "--center-color": centerIdentity.color }}
                          title={centerIdentity.centerName}
                        >
                          <span
                            className="directory-center-accent"
                            aria-hidden="true"
                          />
                          <span className="directory-center-logo">
                            <img
                              src={centerIdentity.icon}
                              alt={
                                centerIdentity.isMatched
                                  ? `לוגו ${centerIdentity.centerName}`
                                  : "לוגו ברירת מחדל"
                              }
                            />
                          </span>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
              </div>
            )}
          </div>
        )}
      </section>
    );
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
        טוען אלפון...
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="directory-page"
    >
      <PageHero
        title="אלפון מעסיקים ורכזים"
        subtitle="איתור אנשי קשר, מעסיקים ורכזים ברשות התעסוקה"
        logoSrc={employmentLogo}
        logoAlt="רשות התעסוקה ירושלים"
        decorationSrc={eventsDecoration}
      />

      <section className="directory-action-bar" aria-label="סינון אלפון">
        {userRole === "coordinator" && (
          <button
            type="button"
            className="directory-add-button"
            onClick={() => navigate("/directory/new")}
          >
            הוספת מעסיק חדש
          </button>
        )}

        <input
          className="directory-filter-control directory-search-input"
          type="text"
          placeholder="חיפוש לפי שם, חברה/מרכז, תפקיד, תחום, אוכלוסייה, טלפון, כתובת או ח.פ..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <select
          className="directory-filter-control"
          value={roleFilter}
          onChange={(e) => handleRoleFilterChange(e.target.value)}
        >
          <option value="all">כל התפקידים</option>
          <option value="employer">מעסיקים</option>
          <option value="coordinator">רכזים</option>
        </select>

        {userRole === "coordinator" && roleFilter !== "coordinator" && (
          <select
            className="directory-filter-control"
            value={employerAssignmentFilter}
            onChange={(e) => setEmployerAssignmentFilter(e.target.value)}
          >
            <option value="all">כל המעסיקים</option>
            <option value="mine">המעסיקים שלי</option>
            <option value="unassigned">מעסיקים לא משויכים</option>
          </select>
        )}

        <select
          className="directory-filter-control"
          value={mainFieldFilter}
          onChange={(e) => handleMainFieldChange(e.target.value)}
        >
          <option value="all">כל התחומים</option>
          {availableMainCategories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <select
          className="directory-filter-control"
          value={subFieldFilter}
          onChange={(e) => setSubFieldFilter(e.target.value)}
        >
          <option value="all">כל תתי התחומים</option>
          {availableSubCategories.map((subCategory) => (
            <option key={subCategory} value={subCategory}>
              {subCategory}
            </option>
          ))}
        </select>
      </section>

      <main className="directory-content">
        {error && (
          <p className="directory-error">
            {error}
          </p>
        )}

        {coordinatorContacts.length + employerContacts.length === 0 ? (
          <p className="directory-empty-state">
            לא נמצאו אנשי קשר להצגה.
          </p>
        ) : (
          <>
            {roleFilter === "coordinator" &&
              renderContactsTable(coordinatorContacts, "coordinator", "רכזים")}

            {roleFilter === "employer" &&
              renderContactsTable(employerContacts, "employer", "מעסיקים")}

            {roleFilter === "all" && (
              <>
                {renderContactsTable(coordinatorContacts, "coordinator", "רכזים")}
                {renderContactsTable(employerContacts, "employer", "מעסיקים")}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default DirectoryPage;
