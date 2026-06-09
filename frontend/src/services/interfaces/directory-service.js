import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
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

    const decodedEmail = decodeURIComponent(contactEmail);

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
};