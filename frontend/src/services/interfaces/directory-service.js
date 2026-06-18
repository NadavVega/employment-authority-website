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
      const data = docSnap.data();
      const profile = data.profile || {};
      const role = data.role || profile.role || "";

      if (role === "coordinator") {
        coordinatorMap[docSnap.id.toLowerCase().trim()] = {
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
        const data = docSnap.data();
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

        const assignedCoordinatorData =
          assignedCoordinatorEmail
            ? coordinatorMap[assignedCoordinatorEmail.toLowerCase().trim()]
            : null;

        return {
          id: docSnap.id,
          email: docSnap.id,

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
    const phone = String(formData.phone || "").trim();

    if (!company || !address || !email || !phone) {
      throw new Error("שם חברה, כתובת חברה, אימייל וטלפון הם שדות חובה.");
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

    if (!company || !address) {
      throw new Error("שם חברה וכתובת חברה הם שדות חובה.");
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
        const existingData = privateInfoSnap.data();
        const finalPhone = inputPhone || existingData.phone || "";

        await setDoc(
          privateInfoRef,
          {
            phone: finalPhone,
            directEmail: normalizedEmployerEmail,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        await setDoc(privateInfoRef, {
          phone: inputPhone,
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