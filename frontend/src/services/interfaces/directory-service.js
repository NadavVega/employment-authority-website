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

        return {
          id: docSnap.id,
          email: docSnap.id,

          role: data.role || "",
          isWhitelisted: data.isWhitelisted === true,

          name: profile.fullName || data.fullName || "לא צוין",
          organization: profile.company || data.company || "לא צוין",
          address: profile.address || data.address || "לא צוין",
          field: profile.field || data.field || "לא צוין",

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

    return {
      id: contactSnap.id,
      email: contactSnap.id,

      role: data.role || "",
      isWhitelisted: data.isWhitelisted === true,

      name: profile.fullName || data.fullName || "לא צוין",
      organization: profile.company || data.company || "לא צוין",
      address: profile.address || data.address || "לא צוין",
      field: profile.field || data.field || "לא צוין",

      rawData: data,
    };
  },
};
