import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  setDoc,
  arrayUnion,
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

  /**
   * Fetches private contact details for an employer.
   * Firestore Rules decide whether the current user is allowed to read it.
   *
   * @param {Object} currentUser - Current logged-in user.
   * @param {Object} targetEmployer - Employer profile.
   * @returns {Promise<Object|null>} Private contact details or null.
   */
  async getPrivateContactDetails(currentUser, targetEmployer) {
    if (!currentUser?.email || !targetEmployer?.email) {
      return null;
    }

    const privateInfoRef = doc(
      db,
      "users",
      targetEmployer.email,
      "private_info",
      "details"
    );

    const privateInfoSnap = await getDoc(privateInfoRef);

    if (!privateInfoSnap.exists()) {
      return null;
    }

    const data = privateInfoSnap.data();

    return {
      phone: data.phone || "",
      directEmail: data.directEmail || "",
      approvedViewers: data.approved_viewers || [],
    };
  },

  /**
   * Fetches all pending privacy requests.
   * This is intended for admin review.
   *
   * @returns {Promise<Array>} Pending privacy requests.
   */
  async getPendingPrivacyRequests() {
    const pendingRequestsQuery = query(
      collection(db, "privacy_requests"),
      where("status", "==", "pending")
    );

    const snapshot = await getDocs(pendingRequestsQuery);

    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();

      return {
        id: docSnap.id,
        requesterEmail: data.requesterEmail || "",
        targetEmail: data.targetEmail || "",
        status: data.status || "pending",
        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || null,
        reviewedAt: data.reviewedAt || null,
        reviewedBy: data.reviewedBy || null,
      };
    });
  },

  /**
   * Approves a pending privacy request.
   * In addition to changing the request status, the requester is added
   * to the target employer's approved_viewers list.
   *
   * @param {Object} request - Privacy request object.
   * @param {Object} currentUser - Current logged-in admin/employer user.
   * @returns {Promise<Object>} Result.
   */
  async approvePrivacyRequest(request, currentUser) {
    if (!request?.id) {
      throw new Error("Request id is missing.");
    }

    if (!request?.requesterEmail) {
      throw new Error("Requester email is missing.");
    }

    if (!request?.targetEmail) {
      throw new Error("Target employer email is missing.");
    }

    if (!currentUser?.email) {
      throw new Error("User must be logged in to approve a request.");
    }

    const requestRef = doc(db, "privacy_requests", request.id);

    const privateInfoRef = doc(
      db,
      "users",
      request.targetEmail,
      "private_info",
      "details"
    );

    await updateDoc(requestRef, {
      status: "approved",
      reviewedAt: serverTimestamp(),
      reviewedBy: currentUser.email,
      updatedAt: serverTimestamp(),
    });

    await setDoc(
      privateInfoRef,
      {
        approved_viewers: arrayUnion(request.requesterEmail),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return {
      status: "approved",
      message: "Privacy request approved successfully.",
    };
  },

  /**
   * Rejects a pending privacy request.
   *
   * @param {Object} request - Privacy request object.
   * @param {Object} currentUser - Current logged-in admin/employer user.
   * @returns {Promise<Object>} Result.
   */
  async rejectPrivacyRequest(request, currentUser) {
    if (!request?.id) {
      throw new Error("Request id is missing.");
    }

    if (!currentUser?.email) {
      throw new Error("User must be logged in to reject a request.");
    }

    const requestRef = doc(db, "privacy_requests", request.id);

    await updateDoc(requestRef, {
      status: "rejected",
      reviewedAt: serverTimestamp(),
      reviewedBy: currentUser.email,
      updatedAt: serverTimestamp(),
    });

    return {
      status: "rejected",
      message: "Privacy request rejected successfully.",
    };
  },
};