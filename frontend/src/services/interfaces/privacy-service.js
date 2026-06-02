import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "../firebase/config";

/**
 * privacyService handles private contact access requests.
 *
 * UC4 - Request Access (Double Opt-in):
 * A coordinator can request access to an employer's private contact details.
 * The employer/admin must approve the request before private details are revealed.
 */
export const privacyService = {
  /**
   * Creates a new pending access request from the current coordinator
   * to the selected employer.
   *
   * @param {Object} currentUser - The logged-in Firebase user.
   * @param {Object} targetEmployer - The employer profile being requested.
   * @returns {Promise<Object>} Request result.
   */
  async requestContactAccess(currentUser, targetEmployer) {
    if (!currentUser?.email) {
      throw new Error("User must be logged in to request access.");
    }

    if (!targetEmployer?.email) {
      throw new Error("Target employer email is missing.");
    }

    // Important:
    // requesterEmail must match request.auth.token.email exactly in Firestore Rules.
    const requesterEmail = currentUser.email;
    const targetEmail = targetEmployer.email;

    const existingRequestQuery = query(
      collection(db, "privacy_requests"),
      where("requesterEmail", "==", requesterEmail),
      where("targetEmail", "==", targetEmail),
      where("status", "==", "pending")
    );

    const existingSnapshot = await getDocs(existingRequestQuery);

    if (!existingSnapshot.empty) {
      return {
        status: "already_pending",
        message: "Access request already exists.",
      };
    }

    const requestData = {
      requesterEmail,
      targetEmail,
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      reviewedAt: null,
      reviewedBy: null,
    };

    const docRef = await addDoc(
      collection(db, "privacy_requests"),
      requestData
    );

    return {
      id: docRef.id,
      status: "pending",
      message: "Access request sent successfully.",
    };
  },

  /**
   * Checks the current access status between the logged-in user
   * and a target employer.
   *
   * Possible return values:
   * - "none"
   * - "pending"
   * - "approved"
   * - "rejected"
   */
  async getContactAccessStatus(currentUser, targetEmployer) {
    if (!currentUser?.email || !targetEmployer?.email) {
      return "none";
    }

    const requesterEmail = currentUser.email;
    const targetEmail = targetEmployer.email;

    const accessQuery = query(
      collection(db, "privacy_requests"),
      where("requesterEmail", "==", requesterEmail),
      where("targetEmail", "==", targetEmail)
    );

    const snapshot = await getDocs(accessQuery);

    if (snapshot.empty) {
      return "none";
    }

    const requests = snapshot.docs.map((docSnap) => docSnap.data());

    if (requests.some((request) => request.status === "approved")) {
      return "approved";
    }

    if (requests.some((request) => request.status === "pending")) {
      return "pending";
    }

    if (requests.some((request) => request.status === "rejected")) {
      return "rejected";
    }

    return "none";
  },
};