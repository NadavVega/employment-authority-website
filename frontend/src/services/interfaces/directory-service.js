import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../firebase/config";
import {
  ISRAELI_PHONE_VALIDATION_ERROR,
  normalizeIsraeliPhone,
} from "../../utils/phone";

const VALID_APPLICATION_ROLES = ["admin", "coordinator", "employer"];
const MESSAGE_ROLE_ORDER = {
  admin: 0,
  coordinator: 1,
  employer: 2,
};

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const normalizeRole = (role) => {
  const value = String(role || "").trim().toLowerCase();

  if (value === "admin" || value === "manager" || value === "מנהל" || value === "מנהלת") {
    return "admin";
  }

  if (value === "coordinator" || value === "רכז" || value === "רכזת") {
    return "coordinator";
  }

  if (value === "employer" || value === "מעסיק" || value === "מעסיקה") {
    return "employer";
  }

  return value;
};

const getUserRole = (data = {}) => String(
  data.role ||
  data.profile?.role ||
  ""
).trim();

const getIsWhitelisted = (data = {}) => (
  data.isWhitelisted === true ||
  data.isWhiteListed === true ||
  data.contactHistory?.isWhitelisted === true ||
  data.contactHistory?.isWhiteListed === true
);

const mapMessageRecipient = (docSnap) => {
  const data = docSnap.data() || {};
  const profile = data.profile || {};
  const contactHistory = data.contactHistory || {};

  const email = normalizeEmail(
    data.email ||
    profile.email ||
    docSnap.id
  );

  const role = normalizeRole(
    data.role ||
    profile.role
  );

  const isWhitelisted =
    data.isWhitelisted === true ||
    data.isWhiteListed === true ||
    profile.isWhitelisted === true ||
    profile.isWhiteListed === true ||
    contactHistory.isWhitelisted === true ||
    contactHistory.isWhiteListed === true;

  const hasExplicitWhitelistFalse =
    !isWhitelisted &&
    (
      data.isWhitelisted === false ||
      data.isWhiteListed === false ||
      profile.isWhitelisted === false ||
      profile.isWhiteListed === false ||
      contactHistory.isWhitelisted === false ||
      contactHistory.isWhiteListed === false
    );

  return {
    id: docSnap.id,
    uid: data.uid || data.authUid || data.userId || "",
    email,
    name:
      data.displayName ||
      data.fullName ||
      data.name ||
      profile.displayName ||
      profile.fullName ||
      profile.name ||
      data.companyName ||
      data.company ||
      profile.company ||
      email,
    role,
    companyName:
      data.companyName ||
      data.company ||
      data.organization ||
      profile.company ||
      profile.organization ||
      "",
    centerName:
      data.centerName ||
      data.center ||
      profile.centerName ||
      profile.center ||
      "",
    isWhitelisted,
    hasExplicitWhitelistFalse,
  };
};

const isValidApplicationUser = (user) => (
  Boolean(user.email) &&
  VALID_APPLICATION_ROLES.includes(user.role) &&
  user.hasExplicitWhitelistFalse !== true
);

const sortMessageRecipients = (first, second) => {
  const roleDifference =
    (MESSAGE_ROLE_ORDER[first.role] ?? 99) -
    (MESSAGE_ROLE_ORDER[second.role] ?? 99);

  if (roleDifference !== 0) {
    return roleDifference;
  }

  const firstLabel = first.name || first.email || "";
  const secondLabel = second.name || second.email || "";

  return firstLabel.localeCompare(secondLabel, "he", { sensitivity: "base" });
};

/**
 * directoryService handles employer/coordinator directory data.
 *
 * Collection: users
 *
 * In this project, the users collection is also used as:
 * - Whitelist
 * - Role management
 * - General directory
 *
 * Document ID is the user's email.
 */
export const directoryService = {
  /**
   * Fetch all whitelisted users that should appear in the directory.
   *
   * @returns {Promise<Array>} List of directory contacts.
   */
  async getDirectoryContacts() {
    const usersQuery = query(
      collection(db, "users"),
      where("isWhitelisted", "==", true)
    );

    const snapshot = await getDocs(usersQuery);

    const coordinatorMap = {};

    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data() || {};
      const profile = data.profile || {};
      const role = getUserRole(data);

      if (role === "coordinator") {
        const coordinatorEmail = normalizeEmail(data.email || profile.email || docSnap.id);

        coordinatorMap[coordinatorEmail] = {
          name: profile.fullName || data.fullName || "לא צוין",
          centerName:
            profile.centerName ||
            data.centerName ||
            profile.center ||
            data.center ||
            "",
        };
      }
    });

    return snapshot.docs
      .map((docSnap) => {
        const data = docSnap.data() || {};
        const profile = data.profile || {};

        const email = normalizeEmail(data.email || profile.email || docSnap.id);
        const role = getUserRole(data);

        const centerName =
          profile.centerName ||
          data.centerName ||
          profile.center ||
          data.center ||
          "";

        const population =
          profile.population ||
          data.population ||
          profile.targetPopulation ||
          data.targetPopulation ||
          "";

        const phone =
          profile.phone ||
          data.phone ||
          profile.mobile ||
          data.mobile ||
          "";

        const organization =
          profile.company ||
          data.company ||
          profile.organization ||
          data.organization ||
          centerName ||
          "לא צוין";

        const assignedCoordinatorEmail =
          data.assignedCoordinatorEmail ||
          profile.assignedCoordinatorEmail ||
          "";

        const assignedCoordinatorData =
          assignedCoordinatorEmail
            ? coordinatorMap[normalizeEmail(assignedCoordinatorEmail)]
            : null;

        return {
          id: docSnap.id,
          email,

          role,
          isWhitelisted: getIsWhitelisted(data),

          name: profile.fullName || data.fullName || "לא צוין",
          organization,
          address: profile.address || data.address || "לא צוין",
          field: profile.field || data.field || "לא צוין",
          subField: profile.subField || data.subField || "",

          // Coordinator fields
          centerName,
          population,
          phone,

          // Employer-to-coordinator assignment
          assignedCoordinatorEmail,
          assignedCoordinatorName: assignedCoordinatorData?.name || "",
          assignedCoordinatorCenterName: assignedCoordinatorData?.centerName || "",

          // Employer CRM fields
          status: profile.status || data.status || "",
          companyId: profile.companyId || data.companyId || "",
          logoUrl: profile.logoUrl || data.logoUrl || "",
          companyDescription:
            profile.companyDescription || data.companyDescription || "",
          jobsUrl: profile.jobsUrl || data.jobsUrl || "",
          lastContactNote:
            profile.lastContactNote || data.lastContactNote || "",
          lastContactDate:
            profile.lastContactDate || data.lastContactDate || "",

          rawData: data,
        };
      })
      .filter((user) => user.role === "employer" || user.role === "coordinator");
  },

  /**
   * Fetch only safe public recipient fields from public user documents.
   *
   * @param {Object} currentUser
   * @param {string} userRole
   * @returns {Promise<Array>}
   */
  async getPermittedMessageRecipients(currentUser, userRole) {
    const currentUserEmail = normalizeEmail(currentUser?.email);
    const normalizedUserRole = normalizeRole(
      userRole ||
      currentUser?.role ||
      currentUser?.profile?.role
    );

    if (!currentUserEmail) {
      return [];
    }

    const usersSnapshot = await getDocs(collection(db, "users"));
    const allUsers = usersSnapshot.docs
      .map(mapMessageRecipient)
      .filter(isValidApplicationUser);
    const currentUserContact = allUsers.find((user) => user.email === currentUserEmail);
    const users = allUsers.filter((user) => user.email !== currentUserEmail);

    if (normalizedUserRole === "admin" || normalizedUserRole === "coordinator") {
      return users.sort(sortMessageRecipients);
    }

    const currentEmployerCompany = String(
      currentUser?.companyName ||
      currentUser?.company ||
      currentUser?.organization ||
      currentUser?.profile?.company ||
      currentUser?.profile?.organization ||
      currentUserContact?.companyName ||
      ""
    ).toLowerCase().trim();

    if (normalizedUserRole === "employer") {
      return users.filter((user) => {
        if (user.role === "admin" || user.role === "coordinator") {
          return true;
        }

        if (user.role !== "employer") {
          return false;
        }

        const contactCompany = String(user.companyName || "").toLowerCase().trim();

        return Boolean(
          currentEmployerCompany &&
          contactCompany &&
          currentEmployerCompany === contactCompany
        );
      }).sort(sortMessageRecipients);
    }

    return users.filter((user) => {
      if (user.role === "admin" || user.role === "coordinator") {
        return true;
      }

      return false;
    }).sort(sortMessageRecipients);
  },

  /**
   * Fetch a single employer/contact by email.
   *
   * @param {string} contactEmail
   * @returns {Promise<Object|null>}
   */
  async getDirectoryContactById(contactEmail) {
    if (!contactEmail) {
      throw new Error("Contact email is missing.");
    }

    const decodedEmail = decodeURIComponent(contactEmail).toLowerCase().trim();

    const contactRef = doc(db, "users", decodedEmail);
    const contactSnap = await getDoc(contactRef);

    if (!contactSnap.exists()) {
      return null;
    }

    const data = contactSnap.data();
    const profile = data.profile || {};

    const role = data.role || profile.role || "";

    const centerName =
      profile.centerName ||
      data.centerName ||
      profile.center ||
      data.center ||
      "";

    const population =
      profile.population ||
      data.population ||
      profile.targetPopulation ||
      data.targetPopulation ||
      "";

    const phone =
      profile.phone ||
      data.phone ||
      profile.mobile ||
      data.mobile ||
      "";

    const organization =
      profile.company ||
      data.company ||
      profile.organization ||
      data.organization ||
      centerName ||
      "לא צוין";

    const assignedCoordinatorEmail =
      data.assignedCoordinatorEmail ||
      profile.assignedCoordinatorEmail ||
      "";
    let assignedCoordinatorName = "";
    let assignedCoordinatorCenterName = "";

    if (assignedCoordinatorEmail) {
    const coordinatorRef = doc(
    db,
    "users",
    assignedCoordinatorEmail.toLowerCase().trim()
  );

  const coordinatorSnap = await getDoc(coordinatorRef);

  if (coordinatorSnap.exists()) {
    const coordinatorData = coordinatorSnap.data();
    const coordinatorProfile = coordinatorData.profile || {};

    assignedCoordinatorName =
      coordinatorProfile.fullname || coordinatorData.fullname || "";

      assignedCoordinatorCenterName =
      coordinatorProfile.centerName ||
      coordinatorData.centerName ||
      coordinatorProfile.center ||
      coordinatorData.center ||
      "";
  }
}  

    return {
      id: contactSnap.id,
      email: contactSnap.id,

      role,
      isWhitelisted:
        data.isWhitelisted === true ||
        data.isWhiteListed === true ||
        data.contactHistory?.isWhitelisted === true ||
        data.contactHistory?.isWhiteListed === true,

      name: profile.fullName || data.fullName || "לא צוין",
      organization,
      address: profile.address || data.address || "לא צוין",
      field: profile.field || data.field || "לא צוין",
      subField: profile.subField || data.subField || "",

      // Coordinator fields
      centerName,
      population,
      phone,

      // Employer-to-coordinator assignment
      assignedCoordinatorEmail,
      assignedCoordinatorName,
      assignedCoordinatorCenterName,

      // Employer CRM fields
      status: profile.status || data.status || "",
      companyId: profile.companyId || data.companyId || "",
      logoUrl: profile.logoUrl || data.logoUrl || "",
      companyDescription:
        profile.companyDescription || data.companyDescription || "",
      jobsUrl: profile.jobsUrl || data.jobsUrl || "",
      lastContactNote:
        profile.lastContactNote || data.lastContactNote || "",
      lastContactDate:
        profile.lastContactDate || data.lastContactDate || "",

      rawData: data,
    };
  },

  /**
   * Assign an employer to the current coordinator.
   *
   * @param {string} employerEmail
   * @param {Object} coordinatorUser
   * @returns {Promise<Object>}
   */
  async assignEmployerToCoordinator(employerEmail, coordinatorUser) {
    if (!employerEmail) {
      throw new Error("Employer email is missing.");
    }

    if (!coordinatorUser?.email) {
      throw new Error("Coordinator email is missing.");
    }

    const normalizedEmployerEmail = decodeURIComponent(employerEmail)
      .toLowerCase()
      .trim();

    const coordinatorEmail = coordinatorUser.email.toLowerCase().trim();

    const employerRef = doc(db, "users", normalizedEmployerEmail);
    const employerSnap = await getDoc(employerRef);

    if (!employerSnap.exists()) {
      throw new Error("Employer was not found.");
    }

    const employerData = employerSnap.data();
    const employerProfile = employerData.profile || {};
    const employerRole = employerData.role || employerProfile.role || "";

    if (employerRole !== "employer") {
      throw new Error("Only employer contacts can be assigned to coordinators.");
    }

    const existingAssignedCoordinatorEmail =
      employerData.assignedCoordinatorEmail ||
      employerProfile.assignedCoordinatorEmail ||
      "";

    if (existingAssignedCoordinatorEmail) {
      throw new Error("This employer is already assigned to a coordinator.");
    }

    await updateDoc(employerRef, {
      assignedCoordinatorEmail: coordinatorEmail,
      assignedBy: coordinatorEmail,
      assignedAt: serverTimestamp(),
    });

    return {
      assignedCoordinatorEmail: coordinatorEmail,
      assignedBy: coordinatorEmail,
    };
  },

  /**
   * Create a new employer contact and automatically assign it
   * to the coordinator who created it.
   *
   * @param {Object} currentUser
   * @param {Object} formData
   * @returns {Promise<Object>}
   */
  async createEmployerContact(currentUser, formData) {
    if (!currentUser?.email) {
      throw new Error("Coordinator must be logged in.");
    }

    const coordinatorEmail = currentUser.email.toLowerCase().trim();

    const company = String(formData.company || "").trim();
    const address = String(formData.address || "").trim();
    const email = String(formData.email || "").toLowerCase().trim();
    const inputPhone = String(formData.phone || "").trim();

    if (!company || !address || !email || !inputPhone) {
      throw new Error("שם חברה, כתובת חברה, אימייל וטלפון הם שדות חובה.");
    }

    const phone = normalizeIsraeliPhone(inputPhone);

    if (!phone) {
      throw new Error(ISRAELI_PHONE_VALIDATION_ERROR);
    }

    const employerRef = doc(db, "users", email);
    const employerSnap = await getDoc(employerRef);

    if (employerSnap.exists()) {
      throw new Error("כבר קיים איש קשר עם כתובת האימייל הזו.");
    }

    const employerData = {
      email,
      role: "employer",
      isWhitelisted: true,

      assignedCoordinatorEmail: coordinatorEmail,
      assignedBy: coordinatorEmail,
      assignedAt: serverTimestamp(),

      createdBy: coordinatorEmail,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),

      profile: {
        role: "employer",
        company,
        organization: company,
        fullName: String(formData.fullName || "").trim(),
        address,
        field: String(formData.field || "").trim(),
        subField: String(formData.subField || "").trim(),
        status: String(formData.status || "").trim(),
        companyId: String(formData.companyId || "").trim(),
        logoUrl: String(formData.logoUrl || "").trim(),
        companyDescription: String(formData.companyDescription || "").trim(),
        jobsUrl: String(formData.jobsUrl || "").trim(),
        lastContactNote: String(formData.lastContactNote || "").trim(),
        lastContactDate: formData.lastContactDate || "",
      },
    };

    const privateInfoData = {
      directEmail: email,
      phone,
      approved_viewers: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(employerRef, employerData);

    await setDoc(
      doc(db, "users", email, "private_info", "details"),
      privateInfoData
    );

    return {
      id: email,
      email,
      assignedCoordinatorEmail: coordinatorEmail,
    };
  },

  /**
   * Update an employer contact assigned to the current coordinator.
   *
   * @param {Object} currentUser
   * @param {string} employerEmail
   * @param {Object} formData
   * @returns {Promise<Object>}
   */
  async updateAssignedEmployerContact(currentUser, employerEmail, formData) {
    if (!currentUser?.email) {
      throw new Error("Coordinator must be logged in.");
    }

    if (!employerEmail) {
      throw new Error("Employer email is missing.");
    }

    const coordinatorEmail = currentUser.email.toLowerCase().trim();
    const normalizedEmployerEmail = decodeURIComponent(employerEmail)
      .toLowerCase()
      .trim();

    const employerRef = doc(db, "users", normalizedEmployerEmail);
    const employerSnap = await getDoc(employerRef);

    if (!employerSnap.exists()) {
      throw new Error("Employer was not found.");
    }

    const employerData = employerSnap.data();
    const employerProfile = employerData.profile || {};
    const employerRole = employerData.role || employerProfile.role || "";
    const assignedCoordinatorEmail =
      employerData.assignedCoordinatorEmail ||
      employerProfile.assignedCoordinatorEmail ||
      "";

    if (employerRole !== "employer") {
      throw new Error("Only employer contacts can be edited here.");
    }

    if (assignedCoordinatorEmail.toLowerCase().trim() !== coordinatorEmail) {
      throw new Error("You can edit only employers assigned to you.");
    }

    const company = String(formData.company || "").trim();
    const address = String(formData.address || "").trim();
    const inputPhone = String(formData.phone || "").trim();

    if (!company || !address || !inputPhone) {
      throw new Error("שם חברה, כתובת חברה וטלפון הם שדות חובה.");
    }

    const phone = normalizeIsraeliPhone(inputPhone);

    if (!phone) {
      throw new Error(ISRAELI_PHONE_VALIDATION_ERROR);
    }

    // 1. נסיון עדכון פרופיל ציבורי
    try {
      await updateDoc(employerRef, {
        updatedAt: serverTimestamp(),
        "profile.company": company,
        "profile.organization": company,
        "profile.fullName": String(formData.fullName || "").trim(),
        "profile.address": address,
        "profile.field": String(formData.field || "").trim(),
        "profile.subField": String(formData.subField || "").trim(),
        "profile.status": String(formData.status || "").trim(),
        "profile.companyId": String(formData.companyId || "").trim(),
        "profile.logoUrl": String(formData.logoUrl || "").trim(),
        "profile.companyDescription": String(formData.companyDescription || "").trim(),
        "profile.jobsUrl": String(formData.jobsUrl || "").trim(),
        "profile.lastContactNote": String(formData.lastContactNote || "").trim(),
        "profile.lastContactDate": formData.lastContactDate || "",
      });
    } catch (error) {
      console.error("Profile Update Error:", error);
      throw new Error("שגיאת הרשאות בעדכון הפרופיל הציבורי: " + error.message);
    }

    // 2. נסיון עדכון טלפון ופרטים חסויים
    try {
      const privateInfoRef = doc(
        db,
        "users",
        normalizedEmployerEmail,
        "private_info",
        "details"
      );

      const privateInfoSnap = await getDoc(privateInfoRef);

      if (privateInfoSnap.exists()) {
        await setDoc(
          privateInfoRef,
          {
            phone,
            directEmail: normalizedEmployerEmail,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        await setDoc(privateInfoRef, {
          phone,
          directEmail: normalizedEmployerEmail,
          approved_viewers: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Private Info Update Error:", error);
      throw new Error("שגיאת הרשאות בעדכון הטלפון/פרטים חסויים: " + error.message);
    }

    return {
      id: normalizedEmployerEmail,
      email: normalizedEmployerEmail,
    };
  },

  /**
   * Fetch strictly the private info (like phone number) for a user.
   * Useful for pre-filling edit forms for coordinators.
   * * @param {string} contactEmail
   * * @returns {Promise<Object|null>}
   */
  async getPrivateContactInfo(contactEmail) {
    try {
      if (!contactEmail) return null;
      const normalizedEmail = decodeURIComponent(contactEmail).toLowerCase().trim();
      const privateRef = doc(db, "users", normalizedEmail, "private_info", "details");
      const snap = await getDoc(privateRef);
      
      if (snap.exists()) {
        return snap.data();
      }
      return null;
    } catch (error) {
      console.warn("Could not fetch private info. Permissions or missing doc.", error);
      return null;
    }
  }
};
