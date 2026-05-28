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

    const requesterEmail = currentUser.email.toLowerCase();
    const targetEmail = targetEmployer.email.toLowerCase();

    console.log("Creating privacy request with:", {
      requesterEmail,
      targetEmail,
      status: "pending",
    });

    try {
      console.log("Checking for existing pending request...");

      const existingRequestQuery = query(
        collection(db, "privacy_requests"),
        where("requesterEmail", "==", requesterEmail),
        where("targetEmail", "==", targetEmail),
        where("status", "==", "pending")
      );

      const existingSnapshot = await getDocs(existingRequestQuery);

      console.log("Existing pending requests count:", existingSnapshot.size);

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

      console.log("About to add privacy request document:", requestData);

      const docRef = await addDoc(
        collection(db, "privacy_requests"),
        requestData
      );

      console.log("Privacy request created successfully:", docRef.id);

      return {
        id: docRef.id,
        status: "pending",
        message: "Access request sent successfully.",
      };
    } catch (error) {
      console.error("privacyService.requestContactAccess failed:", error);
      throw error;
    }
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

    const requesterEmail = currentUser.email.toLowerCase();
    const targetEmail = targetEmployer.email.toLowerCase();

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